from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, text
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime, time, date

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from utils.firebase import send_push_notification
from models import User, Timetable, Subject, Course, Semester, ExamSchedule, StudentEnrollment, Notification
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/hod/schedule", tags=["HOD Schedule Management"])

class SlotAddRequest(BaseModel):
    subject_id: str
    faculty_id: Optional[str] = None
    day_of_week: str  # "Monday", "Tuesday", etc.
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    room: Optional[str] = None
    course_id: str
    semester_number: int
    is_lab: bool = False
    override: bool = False
    date: Optional[date] = None

class ExamAddRequest(BaseModel):
    subject_id: str
    semester_id: str
    exam_date: str    # "YYYY-MM-DDTHH:MM"
    room: str
    total_marks: int = 100

@router.get("/timetable")
async def get_timetable(
    department: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    start_week_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Timetable).options(
        selectinload(Timetable.subject).selectinload(Subject.course)
    ).join(
        Subject, Subject.id == Timetable.subject_id
    ).outerjoin(
        User, User.id == Timetable.faculty_id
    ).outerjoin(
        Course, Course.id == Timetable.course_id
    )

    if department and department != "All":
        stmt = stmt.where(Course.code == department)
    if semester and semester != "All":
        stmt = stmt.where(Timetable.semester_number == int(semester))
    if start_week_date:
        try:
            from datetime import timedelta
            start_dt = datetime.strptime(start_week_date, "%Y-%m-%d").date()
            end_dt = start_dt + timedelta(days=6)
            stmt = stmt.where(
                or_(
                    Timetable.date.is_(None),
                    and_(Timetable.date >= start_dt, Timetable.date <= end_dt)
                )
            )
        except ValueError:
            pass

    res = await db.execute(stmt)
    slots = res.scalars().all()

    result = []
    for s in slots:
        # Get faculty details if available
        fac_name = "Unassigned"
        if s.faculty_id:
            fac_stmt = select(User.name).where(User.id == s.faculty_id)
            fac_res = await db.execute(fac_stmt)
            fac_name = fac_res.scalar() or "Unassigned"

        result.append({
            "id": str(s.id),
            "day": s.day_of_week,
            "time_slot": f"{s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')}",
            "start_time": s.start_time.strftime('%H:%M'),
            "end_time": s.end_time.strftime('%H:%M'),
            "subject_id": str(s.subject_id),
            "subject_name": s.subject.name,
            "subject_code": s.subject.code,
            "faculty_id": str(s.faculty_id) if s.faculty_id else None,
            "faculty_name": fac_name,
            "room": s.room or "TBD",
            "class_type": "Lab" if s.is_lab else "Lecture",
            "is_lab": s.is_lab,
            "dept": s.subject.course.code if (s.subject and s.subject.course) else "N/A",
            "semester": s.semester_number,
            "status": s.status,
            "date": s.date.isoformat() if s.date else None,
            "course_id": str(s.course_id) if s.course_id else None
        })

    return result

@router.post("/add-slot")
async def add_slot(
    req: SlotAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Parse times
    try:
        sh, sm = map(int, req.start_time.split(":"))
        eh, em = map(int, req.end_time.split(":"))
        start_t = time(sh, sm)
        end_t = time(eh, em)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    sub_uuid = uuid.UUID(req.subject_id)
    fac_uuid = uuid.UUID(req.faculty_id) if req.faculty_id else None
    course_uuid = uuid.UUID(req.course_id)

    # 1. Conflict Check: Faculty overlap
    conflict_msg = []
    if fac_uuid:
        conds = [
            Timetable.faculty_id == fac_uuid,
            Timetable.day_of_week == req.day_of_week,
            or_(
                and_(Timetable.start_time <= start_t, Timetable.end_time > start_t),
                and_(Timetable.start_time < end_t, Timetable.end_time >= end_t),
                and_(Timetable.start_time >= start_t, Timetable.end_time <= end_t)
            )
        ]
        if req.date:
            conds.append(or_(Timetable.date.is_(None), Timetable.date == req.date))
        fac_conflict_stmt = select(Timetable).where(and_(*conds))
        fac_conflict_res = await db.execute(fac_conflict_stmt)
        fac_conflicts = fac_conflict_res.scalars().all()
        if fac_conflicts:
            conflict_msg.append(f"Faculty is already scheduled in slot {fac_conflicts[0].start_time.strftime('%H:%M')} - {fac_conflicts[0].end_time.strftime('%H:%M')} on {req.day_of_week}")

    # 2. Conflict Check: Room overlap
    if req.room:
        conds = [
            Timetable.room == req.room,
            Timetable.day_of_week == req.day_of_week,
            or_(
                and_(Timetable.start_time <= start_t, Timetable.end_time > start_t),
                and_(Timetable.start_time < end_t, Timetable.end_time >= end_t),
                and_(Timetable.start_time >= start_t, Timetable.end_time <= end_t)
            )
        ]
        if req.date:
            conds.append(or_(Timetable.date.is_(None), Timetable.date == req.date))
        room_conflict_stmt = select(Timetable).where(and_(*conds))
        room_conflict_res = await db.execute(room_conflict_stmt)
        room_conflicts = room_conflict_res.scalars().all()
        if room_conflicts:
            conflict_msg.append(f"Room {req.room} is already booked in slot {room_conflicts[0].start_time.strftime('%H:%M')} - {room_conflicts[0].end_time.strftime('%H:%M')} on {req.day_of_week}")

    if conflict_msg and not req.override:
        return {
            "conflict": True,
            "message": "Scheduling conflicts found. Overriding is required to save.",
            "warnings": conflict_msg
        }

    # Insert slot
    new_slot = Timetable(
        id=uuid.uuid4(),
        subject_id=sub_uuid,
        faculty_id=fac_uuid,
        day_of_week=req.day_of_week,
        start_time=start_t,
        end_time=end_t,
        room=req.room,
        course_id=course_uuid,
        semester_number=req.semester_number,
        is_lab=req.is_lab,
        status="released",
        date=req.date
    )
    db.add(new_slot)
    await db.commit()

    return {
        "conflict": False,
        "message": "Class slot scheduled successfully",
        "slot_id": str(new_slot.id),
        "warnings": conflict_msg if conflict_msg else None
    }

@router.get("/conflicts")
async def get_conflicts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Query conflicts using raw text comparison or nested select
    # Same day, overlapping times, same faculty or same room
    # We can fetch all timetable records and calculate overlaps in memory (safest for cross-db compat)
    stmt = select(Timetable).options(
        selectinload(Timetable.subject),
        selectinload(Timetable.faculty)
    )
    res = await db.execute(stmt)
    slots = res.scalars().all()

    conflicts = []
    for i in range(len(slots)):
        for j in range(i + 1, len(slots)):
            s1 = slots[i]
            s2 = slots[j]

            if s1.day_of_week != s2.day_of_week:
                continue

            # Check overlap
            overlap = (s1.start_time < s2.end_time) and (s1.end_time > s2.start_time)
            if not overlap:
                continue

            # Check conflict triggers
            faculty_conflict = s1.faculty_id is not None and s1.faculty_id == s2.faculty_id
            room_conflict = s1.room is not None and s1.room == s2.room

            if faculty_conflict or room_conflict:
                reason = "Faculty Overlap" if faculty_conflict else "Room Overlap"
                if faculty_conflict and room_conflict:
                    reason = "Faculty & Room Overlap"

                conflicts.append({
                    "id": f"{s1.id}_{s2.id}",
                    "reason": reason,
                    "day": s1.day_of_week,
                    "slot_1": {
                        "id": str(s1.id),
                        "subject": s1.subject.name if s1.subject else "Unknown",
                        "time": f"{s1.start_time.strftime('%H:%M')} - {s1.end_time.strftime('%H:%M')}",
                        "room": s1.room,
                        "faculty": s1.faculty.name if s1.faculty else "N/A"
                    },
                    "slot_2": {
                        "id": str(s2.id),
                        "subject": s2.subject.name if s2.subject else "Unknown",
                        "time": f"{s2.start_time.strftime('%H:%M')} - {s2.end_time.strftime('%H:%M')}",
                        "room": s2.room,
                        "faculty": s2.faculty.name if s2.faculty else "N/A"
                    }
                })
    return conflicts

@router.get("/exam-schedule")
async def get_exam_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(ExamSchedule).options(
        selectinload(ExamSchedule.subject),
        selectinload(ExamSchedule.semester)
    ).join(
        Subject, Subject.id == ExamSchedule.subject_id
    ).join(
        Semester, Semester.id == ExamSchedule.semester_id
    ).order_by(ExamSchedule.exam_date.asc())

    res = await db.execute(stmt)
    exams = res.scalars().all()

    result = []
    for e in exams:
        result.append({
            "id": str(e.id),
            "subject_name": e.subject.name,
            "subject_code": e.subject.code,
            "semester_number": e.semester.semester_number,
            "exam_date": e.exam_date.isoformat(),
            "room": e.room,
            "total_marks": e.total_marks
        })
    return result

@router.post("/add-exam")
async def add_exam(
    req: ExamAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    sub_uuid = uuid.UUID(req.subject_id)
    sem_uuid = uuid.UUID(req.semester_id)
    exam_dt = datetime.fromisoformat(req.exam_date)

    # Insert into exam_schedules
    new_exam = ExamSchedule(
        id=uuid.uuid4(),
        subject_id=sub_uuid,
        semester_id=sem_uuid,
        exam_date=exam_dt,
        room=req.room,
        total_marks=req.total_marks
    )
    db.add(new_exam)

    # Get subject info
    sub_stmt = select(Subject.name).where(Subject.id == sub_uuid)
    sub_res = await db.execute(sub_stmt)
    subject_name = sub_res.scalar() or "Subject"

    # Query all students enrolled in this course + semester to notify
    students_stmt = select(User).join(
        StudentEnrollment, StudentEnrollment.student_id == User.id
    ).where(
        StudentEnrollment.current_semester_id == sem_uuid,
        StudentEnrollment.approval_status == "approved"
    )
    students_res = await db.execute(students_stmt)
    students = students_res.scalars().all()

    # Create notifications
    for student in students:
        notif = Notification(
            id=uuid.uuid4(),
            user_id=student.id,
            title="New Exam Scheduled",
            body=f"An exam for {subject_name} has been scheduled on {exam_dt.strftime('%d %b %Y, %I:%M %p')} in room {req.room}."
        )
        db.add(notif)

        if student.fcm_token:
            send_push_notification(
                student.fcm_token,
                "New Exam Scheduled",
                f"Exam for {subject_name} is scheduled on {exam_dt.strftime('%d %B %Y')}."
            )

    await db.commit()
    return {"message": "Exam scheduled successfully", "exam_id": str(new_exam.id)}
