from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, extract
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime, date

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from utils.firebase import send_push_notification
from models import User, FacultyLeaveRequest, FacultySubjectAssignment, Timetable, TimetableSubstitution, Notification, Subject
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/hod/leave", tags=["HOD Leave Requests"])

class ReviewLeaveRequest(BaseModel):
    rejection_reason: Optional[str] = None

class SubstituteItem(BaseModel):
    timetable_id: str
    date: str  # "YYYY-MM-DD"
    substitute_faculty_id: str

class ApproveLeavePayload(BaseModel):
    substitutions: Optional[List[SubstituteItem]] = None

@router.get("/pending")
async def get_pending_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
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
        affected_class_count = subjects_assigned * 3

        result.append({
            "id": str(r.id),
            "faculty_name": faculty.name if faculty else "Unknown",
            "faculty_email": faculty.email if faculty else "Unknown",
            "leave_type": "CL",  # Represent as Casual Leave
            "start_date": r.start_date.isoformat(),
            "end_date": r.end_date.isoformat(),
            "reason": r.reason,
            "affected_class_count": affected_class_count,
            "status": r.status,
            "applied_on": r.created_at.date().isoformat() if r.created_at else r.start_date.isoformat()
        })
    return result

@router.get("/all")
async def get_all_leaves(
    dept: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(FacultyLeaveRequest).options(
        selectinload(FacultyLeaveRequest.faculty),
        selectinload(FacultyLeaveRequest.reviewed_by)
    ).join(
        User, User.id == FacultyLeaveRequest.faculty_id
    )

    if status and status != "All":
        stmt = stmt.where(FacultyLeaveRequest.status == status.lower())
    if dept and dept != "All":
        stmt = stmt.where(User.branch == dept)
    if month and month != "All":
        # Convert month name/number to integer filter
        try:
            m_val = int(month)
            stmt = stmt.where(extract('month', FacultyLeaveRequest.start_date) == m_val)
        except ValueError:
            pass

    # Apply pagination if provided (backward compatible)
    if page is not None and limit is not None:
        page = max(1, page)
        limit = min(max(1, limit), 200)
        stmt = stmt.offset((page - 1) * limit).limit(limit)

    res = await db.execute(stmt)
    leaves = res.scalars().all()

    result = []
    for l in leaves:
        faculty = l.faculty
        
        # Get approver name
        approver_name = "N/A"
        if l.reviewed_by:
            approver_name = l.reviewed_by.name

        result.append({
            "id": str(l.id),
            "faculty_name": faculty.name if faculty else "Unknown",
            "faculty_email": faculty.email if faculty else "Unknown",
            "department": faculty.branch or "MCA",
            "leave_type": "CL",
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "reason": l.reason,
            "status": l.status,
            "approved_by": approver_name,
            "approval_date": l.updated_at.isoformat() if l.reviewed_by_hod_id and l.updated_at else None,
            "applied_on": l.created_at.date().isoformat() if l.created_at else l.start_date.isoformat()
        })
    return result

@router.post("/{id}/approve")
async def approve_leave(
    id: str,
    payload: ApproveLeavePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        lid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(FacultyLeaveRequest).where(FacultyLeaveRequest.id == lid)
    res = await db.execute(stmt)
    leave = res.scalars().first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != "pending":
        raise HTTPException(status_code=409, detail=f"Leave request has already been {leave.status}. Cannot approve again.")

    leave.status = "approved"
    leave.reviewed_by_hod_id = current_user.id
    leave.updated_at = datetime.utcnow()

    # Insert substitution assignments into timetable_substitutions
    substitute_ids = set()
    if payload.substitutions:
        for sub in payload.substitutions:
            tid = uuid.UUID(sub.timetable_id)
            fid = uuid.UUID(sub.substitute_faculty_id)
            substitute_ids.add(fid)
            s_date = date.fromisoformat(sub.date)

            # Check if substitution already exists
            exist_stmt = select(TimetableSubstitution).where(
                and_(
                    TimetableSubstitution.timetable_id == tid,
                    TimetableSubstitution.date == s_date
                )
            )
            exist_res = await db.execute(exist_stmt)
            existing = exist_res.scalars().first()

            if existing:
                existing.substitute_faculty_id = fid
            else:
                new_sub = TimetableSubstitution(
                    id=uuid.uuid4(),
                    timetable_id=tid,
                    original_faculty_id=leave.faculty_id,
                    substitute_faculty_id=fid,
                    date=s_date
                )
                db.add(new_sub)

    # Trigger Notifications:
    # 1. Faculty who applied
    faculty_stmt = select(User).where(User.id == leave.faculty_id)
    faculty_res = await db.execute(faculty_stmt)
    faculty = faculty_res.scalars().first()

    if faculty:
        db.add(Notification(
            id=uuid.uuid4(),
            user_id=faculty.id,
            title="Leave Approved",
            body="Your leave request has been approved by the HOD."
        ))
        if faculty.fcm_token:
            send_push_notification(faculty.fcm_token, "Leave Approved", "Your leave request has been approved.")

    # 2. Substitute faculty
    for s_fid in substitute_ids:
        s_fac_stmt = select(User).where(User.id == s_fid)
        s_fac_res = await db.execute(s_fac_stmt)
        s_fac = s_fac_res.scalars().first()
        if s_fac:
            db.add(Notification(
                id=uuid.uuid4(),
                user_id=s_fac.id,
                title="Timetable Substitution Assigned",
                body="You have been assigned as a substitute lecturer due to faculty leave."
            ))
            if s_fac.fcm_token:
                send_push_notification(s_fac.fcm_token, "Timetable Substitution", "You have been assigned a substitute class.")

    # 3. Enrolled students of affected classes
    # Query student enrollments for courses affected by timetable slots
    if payload.substitutions:
        for sub in payload.substitutions:
            tid = uuid.UUID(sub.timetable_id)
            slot_stmt = select(Timetable).options(
                selectinload(Timetable.subject).selectinload(Subject.course)
            ).where(Timetable.id == tid)
            slot_res = await db.execute(slot_stmt)
            slot = slot_res.scalars().first()
            if slot and slot.course_id:
                # notify students of this course + semester
                students_stmt = select(User).join(
                    StudentEnrollment, StudentEnrollment.student_id == User.id
                ).where(
                    StudentEnrollment.course_id == slot.course_id,
                    StudentEnrollment.current_semester_id == slot.semester_id,
                    StudentEnrollment.approval_status == "approved"
                )
                students_res = await db.execute(students_stmt)
                students = students_res.scalars().all()

                for student in students:
                    db.add(Notification(
                        id=uuid.uuid4(),
                        user_id=student.id,
                        title="Class Schedule Update",
                        body=f"Your lecture for '{slot.subject.name}' on {sub.date} will be taken by substitute faculty."
                    ))
                    if student.fcm_token:
                        send_push_notification(student.fcm_token, "Class Substitution Alert", f"Lecture on {sub.date} has substitute faculty assigned.")

    await db.commit()
    return {"message": "Leave request approved and substitution logged successfully"}

@router.post("/{id}/reject")
async def reject_leave(
    id: str,
    payload: ReviewLeaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        lid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(FacultyLeaveRequest).where(FacultyLeaveRequest.id == lid)
    res = await db.execute(stmt)
    leave = res.scalars().first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != "pending":
        raise HTTPException(status_code=409, detail=f"Leave request has already been {leave.status}. Cannot reject again.")

    leave.status = "rejected"
    leave.reviewed_by_hod_id = current_user.id
    leave.updated_at = datetime.utcnow()

    # Create notification to faculty
    faculty_stmt = select(User).where(User.id == leave.faculty_id)
    faculty_res = await db.execute(faculty_stmt)
    faculty = faculty_res.scalars().first()

    if faculty:
        db.add(Notification(
            id=uuid.uuid4(),
            user_id=faculty.id,
            title="Leave Request Rejected",
            body=f"Your leave request has been rejected. Reason: {payload.rejection_reason or 'No reason provided.'}"
        ))
        if faculty.fcm_token:
            send_push_notification(
                faculty.fcm_token,
                "Leave Rejected",
                f"Your leave request has been rejected: {payload.rejection_reason or ''}"
            )

    await db.commit()
    return {"message": "Leave request rejected successfully"}

@router.get("/calendar")
async def get_leave_calendar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(FacultyLeaveRequest).options(
        selectinload(FacultyLeaveRequest.faculty)
    ).where(FacultyLeaveRequest.status == "approved")
    res = await db.execute(stmt)
    leaves = res.scalars().all()

    result = []
    for l in leaves:
        faculty = l.faculty
        result.append({
            "faculty_name": faculty.name if faculty else "Unknown Faculty",
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "leave_type": "CL",
            "reason": l.reason
        })
    return result

@router.get("/faculty-balance/{faculty_id}")
async def get_faculty_balance(
    faculty_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        fid = uuid.UUID(faculty_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Count approved leave requests this year
    current_year = datetime.utcnow().year
    stmt = select(FacultyLeaveRequest).where(
        and_(
            FacultyLeaveRequest.faculty_id == fid,
            FacultyLeaveRequest.status == "approved",
            extract('year', FacultyLeaveRequest.start_date) == current_year
        )
    )
    res = await db.execute(stmt)
    approved_leaves = res.scalars().all()

    # Calculate used days per type (mock mapping to CL/ML/EL/OD)
    used_cl = 0
    used_ml = 0
    used_el = 0
    used_od = 0

    for l in approved_leaves:
        days = (l.end_date - l.start_date).days + 1
        # Mock distribute days to leave types based on reason
        reason_lower = l.reason.lower()
        if "sick" in reason_lower or "medical" in reason_lower or "doctor" in reason_lower:
            used_ml += days
        elif "official" in reason_lower or "conference" in reason_lower or "duty" in reason_lower:
            used_od += days
        elif "urgent" in reason_lower or "family" in reason_lower:
            used_cl += days
        else:
            used_el += days

    policy = {
        "CL": {"limit": 12, "used": used_cl, "balance": max(0, 12 - used_cl)},
        "ML": {"limit": 15, "used": used_ml, "balance": max(0, 15 - used_ml)},
        "EL": {"limit": 10, "used": used_el, "balance": max(0, 10 - used_el)},
        "OD": {"limit": 5, "used": used_od, "balance": max(0, 5 - used_od)}
    }
    return policy
