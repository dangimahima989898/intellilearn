from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from models import User, FacultySubjectAssignment, Subject, Timetable, FacultyLeaveRequest, Course, Semester

router = APIRouter(prefix="/hod/faculty", tags=["HOD Faculty Management"])

class SubjectAssignmentRequest(BaseModel):
    faculty_id: str
    subject_id: str
    role: str = "primary"

@router.get("/all")
async def get_all_faculty(
    page: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    from sqlalchemy.orm import selectinload
    # 1. Fetch all active faculty with their assignments and subjects pre-loaded
    stmt = select(User).options(
        selectinload(User.faculty_assignments).selectinload(FacultySubjectAssignment.subject)
    ).where(User.role == "faculty", User.is_active == True)

    # Apply pagination if provided (backward compatible)
    if page is not None and limit is not None:
        page = max(1, page)
        limit = min(max(1, limit), 200)
        stmt = stmt.offset((page - 1) * limit).limit(limit)
    
    # 2. Bulk fetch lecture counts from Timetable grouped by faculty_id
    tt_stmt = select(Timetable.faculty_id, func.count(Timetable.id)).group_by(Timetable.faculty_id)
    
    # Execute in parallel
    res, tt_res = await asyncio.gather(
        db.execute(stmt),
        db.execute(tt_stmt)
    )
    
    faculty_list = res.scalars().all()
    lecture_counts = {r[0]: r[1] for r in tt_res.all()}

    result = []
    for f in faculty_list:
        subjects = []
        for a in f.faculty_assignments:
            if a.subject:
                subjects.append({
                    "assignment_id": str(a.id),
                    "subject_id": str(a.subject_id),
                    "name": a.subject.name,
                    "code": a.subject.code,
                    "role": a.role
                })

        lecture_count = lecture_counts.get(f.id, 0)
        hours = len(subjects) * 4

        result.append({
            "id": str(f.id),
            "name": f.name,
            "email": f.email,
            "subjects": subjects,
            "lecture_count": lecture_count,
            "hours": hours,
            "is_active": f.is_active
        })

    return result

@router.get("/{id}/workload")
async def get_faculty_workload(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        fid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid faculty ID format")

    stmt = select(User).where(User.id == fid, User.role == "faculty")
    res = await db.execute(stmt)
    faculty = res.scalars().first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Count subjects assigned
    assign_stmt = select(FacultySubjectAssignment).where(
        FacultySubjectAssignment.faculty_id == fid
    )
    assign_res = await db.execute(assign_stmt)
    assignments = assign_res.scalars().all()
    assigned_count = len(assignments)

    # Count lectures/week from Timetable
    tt_stmt = select(func.count(Timetable.id)).where(
        Timetable.faculty_id == fid
    )
    tt_res = await db.execute(tt_stmt)
    lectures_per_week = tt_res.scalar() or 0

    # Each subject = 4 contact hours
    total_hours = assigned_count * 4

    LECTURE_LIMIT = 16
    is_overloaded = total_hours > LECTURE_LIMIT

    subjects_detail = []
    for a in assignments:
        sub_stmt = select(Subject).where(Subject.id == a.subject_id)
        sub_res = await db.execute(sub_stmt)
        sub = sub_res.scalars().first()
        if sub:
            subjects_detail.append({
                "assignment_id": str(a.id),
                "subject_id": str(sub.id),
                "subject_name": sub.name,
                "subject_code": sub.code,
                "role": a.role,
            })

    return {
        "faculty_id": str(faculty.id),
        "faculty_name": faculty.name,
        "faculty_email": faculty.email,
        "assigned_subjects_count": assigned_count,
        "lectures_per_week": lectures_per_week,
        "total_hours": total_hours,
        "lecture_limit": LECTURE_LIMIT,
        "is_overloaded": is_overloaded,
        "subjects": subjects_detail,
    }

@router.get("/unassigned-subjects")
async def get_unassigned_subjects(
    department_id: Optional[str] = Query(None),
    semester_number: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    from sqlalchemy.orm import selectinload
    conditions = [
        Subject.is_archived == False,
        Subject.id.notin_(select(distinct(FacultySubjectAssignment.subject_id)))
    ]
    if department_id and department_id != 'All':
        try:
            dep_uuid = uuid.UUID(department_id)
            conditions.append(or_(
                Subject.department_id == dep_uuid,
                Subject.course.has(Course.department_id == dep_uuid)
            ))
        except ValueError:
            pass
    if semester_number is not None:
        conditions.append(Subject.semester_number == semester_number)

    stmt = select(Subject).options(selectinload(Subject.course)).where(
        and_(*conditions)
    )
    res = await db.execute(stmt)
    subjects = res.scalars().all()

    result = []
    for s in subjects:
        result.append({
            "id": str(s.id),
            "name": s.name,
            "code": s.code,
            "course": s.course.name if s.course else "N/A",
            "department": s.course.code if s.course else "N/A",
            "department_id": str(s.department_id) if s.department_id else (str(s.course.department_id) if (s.course and s.course.department_id) else None),
            "semester_number": s.semester_number or 1,
        })
    return result

@router.post("/assign-subject")
async def assign_subject(
    req: SubjectAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        fid = uuid.UUID(req.faculty_id)
        sid = uuid.UUID(req.subject_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    # Verify faculty exists
    fac_stmt = select(User).where(User.id == fid, User.role == "faculty")
    fac_res = await db.execute(fac_stmt)
    faculty = fac_res.scalars().first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Verify subject exists
    sub_stmt = select(Subject).where(Subject.id == sid)
    sub_res = await db.execute(sub_stmt)
    subject = sub_res.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Exceed limit check: current assignments * 4 + 4 (this subject) > 16
    curr_assign_stmt = select(func.count(FacultySubjectAssignment.id)).where(
        FacultySubjectAssignment.faculty_id == fid
    )
    curr_assign_res = await db.execute(curr_assign_stmt)
    curr_count = curr_assign_res.scalar() or 0

    new_hours = (curr_count + 1) * 4
    warning = None
    if new_hours > 16:
        warning = f"Workload warning: Faculty member's teaching hours will reach {new_hours} hours/week, exceeding the 16-hour limit."

    # Create assignment
    assignment = FacultySubjectAssignment(
        id=uuid.uuid4(),
        faculty_id=fid,
        subject_id=sid,
        role=req.role,
        assigned_by_hod_id=current_user.id
    )
    db.add(assignment)
    await db.commit()

    return {
        "message": "Subject assigned successfully",
        "warning": warning,
        "assignment_id": str(assignment.id)
    }

@router.delete("/unassign-subject/{assignment_id}")
async def unassign_subject(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        aid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID format")

    stmt = select(FacultySubjectAssignment).where(FacultySubjectAssignment.id == aid)
    res = await db.execute(stmt)
    assignment = res.scalars().first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
    return {"message": "Subject assignment removed successfully"}

@router.get("/leave-requests")
async def get_faculty_leave_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    from sqlalchemy.orm import selectinload
    stmt = select(FacultyLeaveRequest).options(
        selectinload(FacultyLeaveRequest.faculty)
    ).join(
        User, User.id == FacultyLeaveRequest.faculty_id
    ).where(FacultyLeaveRequest.status == "pending")

    # Bulk query to count assignments for all faculty members grouped by faculty_id
    assign_stmt = select(FacultySubjectAssignment.faculty_id, func.count(FacultySubjectAssignment.id)).group_by(FacultySubjectAssignment.faculty_id)

    # Execute in parallel
    res, assign_res = await asyncio.gather(
        db.execute(stmt),
        db.execute(assign_stmt)
    )

    requests = res.scalars().all()
    assignment_counts = {r[0]: r[1] for r in assign_res.all()}

    result = []
    for r in requests:
        faculty = r.faculty
        subjects_assigned = assignment_counts.get(r.faculty_id, 0)
        affected_class_count = subjects_assigned * 3  # estimate 3 classes per week per subject

        result.append({
            "id": str(r.id),
            "faculty_name": faculty.name if faculty else "Unknown",
            "faculty_email": faculty.email if faculty else "Unknown",
            "leave_type": "Medical/Privilege Leave", # default representation
            "start_date": r.start_date.isoformat(),
            "end_date": r.end_date.isoformat(),
            "reason": r.reason,
            "affected_class_count": affected_class_count
        })

    return result
