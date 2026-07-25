from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from typing import Optional, List
from pydantic import BaseModel
import uuid
import json
from datetime import datetime

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from models import (
    User, Subject, Semester, Course, FacultySubjectAssignment,
    UploadedNote, Question, StudentEnrollment, ArchivedItem,
    AdminActionLog, QuizAttempt
)
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/hod/subjects", tags=["HOD Subject Management"])

class SubjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    course_id: str
    semester_id: str
    credit_hours: int = 3
    color: str = "#3B82F6"
    icon: str = "BookOpen"
    syllabus_pdf_url: Optional[str] = None

class SubjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    credit_hours: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    syllabus_pdf_url: Optional[str] = None

@router.get("/all")
async def get_all_subjects(
    department: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Subject).options(
        selectinload(Subject.course),
        selectinload(Subject.semester)
    ).join(
        Course, Course.id == Subject.course_id
    ).join(
        Semester, Semester.id == Subject.semester_id
    )

    # Status filter
    if status == "archived":
        stmt = stmt.where(Subject.is_archived == True)
    elif status == "active":
        stmt = stmt.where(Subject.is_archived == False)
    else:
        # Default show all active or non-archived depending on filter
        stmt = stmt.where(Subject.is_archived == False)

    if department and department != "All":
        stmt = stmt.where(Course.code == department)
    if semester and semester != "All":
        stmt = stmt.where(Semester.semester_number == int(semester))

    res = await db.execute(stmt)
    subjects = res.scalars().all()

    result = []
    for s in subjects:
        # Get faculty assigned
        fac_stmt = select(User).join(
            FacultySubjectAssignment, FacultySubjectAssignment.faculty_id == User.id
        ).where(FacultySubjectAssignment.subject_id == s.id)
        fac_res = await db.execute(fac_stmt)
        faculty = fac_res.scalars().first()

        # Count notes
        notes_stmt = select(func.count(UploadedNote.id)).where(UploadedNote.subject_id == s.id)
        notes_res = await db.execute(notes_stmt)
        notes_count = notes_res.scalar() or 0

        # Count questions
        q_stmt = select(func.count(Question.id)).where(Question.subject_id == s.id)
        q_res = await db.execute(q_stmt)
        questions_count = q_res.scalar() or 0

        # Count students enrolled
        students_stmt = select(func.count(StudentEnrollment.id)).where(
            and_(
                StudentEnrollment.course_id == s.course_id,
                StudentEnrollment.current_semester_id == s.semester_id,
                StudentEnrollment.approval_status == "approved"
            )
        )
        students_res = await db.execute(students_stmt)
        students_count = students_res.scalar() or 0

        result.append({
            "id": str(s.id),
            "name": s.name,
            "code": s.code,
            "description": s.description,
            "course": s.course.name if s.course else "N/A",
            "department": s.course.code if s.course else "N/A",
            "semester_number": s.semester.semester_number if s.semester else s.semester_number,
            "credit_hours": s.credit_hours,
            "color": s.color,
            "icon": s.icon,
            "syllabus_pdf_url": s.syllabus_pdf_url,
            "faculty": {
                "id": str(faculty.id),
                "name": faculty.name,
                "email": faculty.email
            } if faculty else None,
            "notes_count": notes_count,
            "questions_count": questions_count,
            "students_count": students_count
        })

    return result

@router.get("/summary-counts")
async def get_subjects_summary_counts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Total active subjects
    tot_stmt = select(func.count(Subject.id)).where(Subject.is_archived == False)
    tot_res = await db.execute(tot_stmt)
    total = tot_res.scalar() or 0

    # Grouped by department
    courses_stmt = select(Course)
    courses_res = await db.execute(courses_stmt)
    courses = courses_res.scalars().all()

    by_dept = {}
    for c in courses:
        stmt = select(func.count(Subject.id)).where(
            Subject.course_id == c.id, Subject.is_archived == False
        )
        res = await db.execute(stmt)
        by_dept[c.code] = res.scalar() or 0

    # Subjects with no faculty assigned
    assigned_stmt = select(distinct(FacultySubjectAssignment.subject_id))
    assigned_res = await db.execute(assigned_stmt)
    assigned_ids = [r[0] for r in assigned_res.all()]

    no_fac_stmt = select(func.count(Subject.id)).where(
        and_(Subject.id.notin_(assigned_ids), Subject.is_archived == False)
    )
    no_fac_res = await db.execute(no_fac_stmt)
    no_faculty = no_fac_res.scalar() or 0

    # Subjects with notes count = 0
    notes_sub_stmt = select(distinct(UploadedNote.subject_id))
    notes_sub_res = await db.execute(notes_sub_stmt)
    with_notes_ids = [r[0] for r in notes_sub_res.all()]

    no_notes_stmt = select(func.count(Subject.id)).where(
        and_(Subject.id.notin_(with_notes_ids), Subject.is_archived == False)
    )
    no_notes_res = await db.execute(no_notes_stmt)
    no_notes = no_notes_res.scalar() or 0

    # Syllabus pdf url is null
    no_syl_stmt = select(func.count(Subject.id)).where(
        and_(Subject.syllabus_pdf_url == None, Subject.is_archived == False)
    )
    no_syl_res = await db.execute(no_syl_stmt)
    no_syllabus = no_syl_res.scalar() or 0

    return {
        "total": total,
        "by_department": by_dept,
        "no_faculty": no_faculty,
        "no_notes": no_notes,
        "no_syllabus": no_syllabus
    }

@router.post("/create", status_code=201)
async def create_subject(
    req: SubjectCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    course_uuid = uuid.UUID(req.course_id)
    sem_uuid = uuid.UUID(req.semester_id)

    # Get course details
    c_stmt = select(Course).where(Course.id == course_uuid)
    c_res = await db.execute(c_stmt)
    course = c_res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get semester details
    s_stmt = select(Semester).where(Semester.id == sem_uuid)
    s_res = await db.execute(s_stmt)
    semester = s_res.scalars().first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")

    # Generate subject code (e.g. MCA + SemesterNumber + count + 1)
    cnt_stmt = select(func.count(Subject.id)).where(Subject.course_id == course.id)
    cnt_res = await db.execute(cnt_stmt)
    count = cnt_res.scalar() or 0
    subject_code = f"{course.code}-{semester.semester_number}0{count + 1}"

    # Verify uniqueness of code
    code_stmt = select(Subject).where(Subject.code == subject_code)
    code_res = await db.execute(code_stmt)
    if code_res.scalars().first():
        # append a random suffix if collides
        import random
        subject_code += str(random.randint(10, 99))

    new_sub = Subject(
        id=uuid.uuid4(),
        name=req.name,
        code=subject_code,
        description=req.description,
        course_id=course_uuid,
        semester_id=sem_uuid,
        semester_number=semester.semester_number,
        credit_hours=req.credit_hours,
        color=req.color,
        icon=req.icon,
        syllabus_pdf_url=req.syllabus_pdf_url,
        is_archived=False
    )
    db.add(new_sub)

    action_log = AdminActionLog(
        admin_id=current_user.id,
        action_type="CREATE_SUBJECT",
        details=f"Created subject '{new_sub.name}' ({new_sub.code}) under course '{course.name}'"
    )
    db.add(action_log)

    await db.commit()
    return {
        "id": str(new_sub.id),
        "name": new_sub.name,
        "code": new_sub.code,
        "message": "Subject created successfully"
    }

@router.put("/{id}/update")
async def update_subject(
    id: str,
    req: SubjectUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_id = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(Subject).where(Subject.id == sub_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    if req.name is not None: sub.name = req.name
    if req.description is not None: sub.description = req.description
    if req.credit_hours is not None: sub.credit_hours = req.credit_hours
    if req.color is not None: sub.color = req.color
    if req.icon is not None: sub.icon = req.icon
    if req.syllabus_pdf_url is not None: sub.syllabus_pdf_url = req.syllabus_pdf_url

    action_log = AdminActionLog(
        admin_id=current_user.id,
        action_type="UPDATE_SUBJECT",
        details=f"Updated subject '{sub.name}' ({sub.code})"
    )
    db.add(action_log)

    await db.commit()
    return {"message": "Subject updated successfully"}

@router.put("/{id}/archive")
async def archive_subject(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_id = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(Subject).where(Subject.id == sub_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    sub.is_archived = True
    sub.archived_at = datetime.utcnow()

    # Move subject details to archived_items table
    course_code = "N/A"
    if sub.course_id:
        course_stmt = select(Course).where(Course.id == sub.course_id)
        course_res = await db.execute(course_stmt)
        c = course_res.scalars().first()
        if c:
            course_code = c.code

    archive_item = ArchivedItem(
        id=uuid.uuid4(),
        item_id=sub.id,
        item_type="subject",
        name=sub.name,
        department=course_code,
        details=f"Course ID: {sub.course_id}, Semester Number: {sub.semester_number}",
        archived_by=current_user.id,
        archived_at=datetime.utcnow(),
        original_data={
            "id": str(sub.id),
            "name": sub.name,
            "code": sub.code,
            "description": sub.description,
            "course_id": str(sub.course_id) if sub.course_id else None,
            "semester_id": str(sub.semester_id) if sub.semester_id else None,
            "semester_number": sub.semester_number,
            "credit_hours": sub.credit_hours,
            "color": sub.color,
            "icon": sub.icon,
            "syllabus_pdf_url": sub.syllabus_pdf_url
        }
    )
    db.add(archive_item)

    action_log = AdminActionLog(
        admin_id=current_user.id,
        action_type="ARCHIVE_SUBJECT",
        details=f"Archived subject '{sub.name}' ({sub.code})"
    )
    db.add(action_log)

    await db.commit()
    return {"message": "Subject archived successfully"}

@router.get("/{id}/detail")
async def get_subject_detail(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_id = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(Subject).options(
        selectinload(Subject.course),
        selectinload(Subject.semester)
    ).where(Subject.id == sub_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Faculty assigned
    fac_stmt = select(User).join(
        FacultySubjectAssignment, FacultySubjectAssignment.faculty_id == User.id
    ).where(FacultySubjectAssignment.subject_id == sub.id)
    fac_res = await db.execute(fac_stmt)
    faculty = fac_res.scalars().first()

    # Notes list
    notes_stmt = select(UploadedNote).options(
        selectinload(UploadedNote.uploader)
    ).where(UploadedNote.subject_id == sub.id)
    notes_res = await db.execute(notes_stmt)
    notes = notes_res.scalars().all()
    notes_list = [{
        "id": str(n.id),
        "title": n.title,
        "unit": n.unit,
        "file_url": n.file_url,
        "file_size_kb": n.file_size_kb,
        "uploaded_by_name": n.uploader.name if n.uploader else "Faculty",
        "created_at": n.created_at.isoformat() if n.created_at else None
    } for n in notes]

    # Questions count
    q_stmt = select(func.count(Question.id)).where(Question.subject_id == sub.id)
    q_res = await db.execute(q_stmt)
    questions_count = q_res.scalar() or 0

    # Performance summary (Average quiz score)
    perf_stmt = select(func.avg(QuizAttempt.score)).where(
        QuizAttempt.subject_id == sub.id
    )
    perf_res = await db.execute(perf_stmt)
    avg_score = perf_res.scalar() or 75.0

    # Get course details
    course_name = "N/A"
    course_code = "N/A"
    if sub.course_id:
        c_stmt = select(Course).where(Course.id == sub.course_id)
        c_res = await db.execute(c_stmt)
        c = c_res.scalars().first()
        if c:
            course_name = c.name
            course_code = c.code

    # Units parsed from topics list
    units = []
    topics = sub.get_topics()
    if topics:
        for idx, topic in enumerate(topics):
            units.append({
                "unit_number": idx + 1,
                "title": f"Unit {idx + 1}: {topic}",
                "topic": topic
            })
    else:
        units = [
            {"unit_number": 1, "title": "Unit 1: Introduction", "topic": "Introduction"},
            {"unit_number": 2, "title": "Unit 2: Core Concepts", "topic": "Core Concepts"}
        ]

    return {
        "id": str(sub.id),
        "name": sub.name,
        "code": sub.code,
        "description": sub.description,
        "course_name": course_name,
        "course_code": course_code,
        "semester_number": sub.semester_number,
        "credit_hours": sub.credit_hours,
        "color": sub.color,
        "icon": sub.icon,
        "syllabus_pdf_url": sub.syllabus_pdf_url,
        "faculty": {
            "id": str(faculty.id),
            "name": faculty.name,
            "email": faculty.email
        } if faculty else None,
        "notes": notes_list,
        "questions_count": questions_count,
        "performance": {
            "average_score": round(avg_score, 1),
            "status": "Good" if avg_score >= 75 else ("Average" if avg_score >= 50 else "At-Risk")
        },
        "units": units
    }
