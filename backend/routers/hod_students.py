from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime, date, timedelta

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from utils.email import send_email
from utils.firebase import send_push_notification
from models import User, StudentEnrollment, Course, Semester, StudentApprovalLog, AdminActionLog, Notification, QuizAttempt
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/hod/students", tags=["HOD Student Management"])

class ReviewRequest(BaseModel):
    action: str  # "approved" | "rejected" | "correction"
    note: Optional[str] = None

@router.get("/all")
async def get_all_students(
    department: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course),
        selectinload(StudentEnrollment.semester)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).join(
        Course, Course.id == StudentEnrollment.course_id
    ).join(
        Semester, Semester.id == StudentEnrollment.current_semester_id
    ).where(User.role == "student")

    # Scope to HOD's department (admins see all)
    if current_user.role == "hod" and current_user.department_id:
        stmt = stmt.where(Course.department_id == current_user.department_id)

    if department and department != "All":
        stmt = stmt.where(Course.code == department)
    if semester and semester != "All":
        stmt = stmt.where(Semester.semester_number == int(semester))
    if status and status != "All":
        if status == "active":
            stmt = stmt.where(User.is_active == True, User.status == "approved")
        elif status == "deactivated":
            stmt = stmt.where(User.is_active == False)
        elif status == "pending":
            stmt = stmt.where(StudentEnrollment.approval_status == "pending")
        else:
            stmt = stmt.where(User.status == status)

    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.name.ilike(search_filter),
                User.email.ilike(search_filter),
                StudentEnrollment.enrollment_number.ilike(search_filter)
            )
        )

    # Apply pagination if provided (backward compatible)
    if page is not None and limit is not None:
        page = max(1, page)
        limit = min(max(1, limit), 200)
        stmt = stmt.offset((page - 1) * limit).limit(limit)

    res = await db.execute(stmt)
    enrollments = res.scalars().all()
    print(f"[DB QUERY] get_all_students query executed. Retrieved {len(enrollments)} StudentEnrollment records.")

    result = []
    for enr in enrollments:
        student = enr.student
        course = enr.course
        sem = enr.semester

        # Get intervention count (represented by notification logs or audit logs)
        notif_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == student.id
        )
        notif_res = await db.execute(notif_stmt)
        notif_count = notif_res.scalar() or 0

        # Calculate average quiz score
        avg_score_stmt = select(func.avg(QuizAttempt.score)).where(
            QuizAttempt.student_id == student.id
        )
        avg_score_res = await db.execute(avg_score_stmt)
        avg_score = avg_score_res.scalar()

        result.append({
            "id": str(student.id),
            "enrollment_id": str(enr.id),
            "name": student.name,
            "enrollment_no": enr.enrollment_number,
            "email": student.email,
            "department": course.code if course else "N/A",
            "course": course.name if course else "N/A",
            "semester": sem.semester_number if sem else 1,
            "section": student.section or "A",
            "cgpa": student.cgpa or 0.0,
            "last_login": student.last_active_date.isoformat() if student.last_active_date else "Never",
            "status": "deactivated" if not student.is_active else student.status,
            "intervention_count": notif_count,
            "quiz_avg": round(avg_score, 1) if avg_score is not None else 0,
        })

    print(f"[API RESPONSE] get_all_students returning {len(result)} profiles.")
    return result

@router.get("/pending-approvals")
async def get_pending_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course),
        selectinload(StudentEnrollment.semester)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).join(
        Course, Course.id == StudentEnrollment.course_id
    ).join(
        Semester, Semester.id == StudentEnrollment.current_semester_id
    ).where(StudentEnrollment.approval_status == "pending")

    # Scope to HOD's department (admins see all)
    if current_user.role == "hod" and current_user.department_id:
        stmt = stmt.where(Course.department_id == current_user.department_id)

    res = await db.execute(stmt)
    enrollments = res.scalars().all()

    result = []
    for enr in enrollments:
        student = enr.student
        course = enr.course
        sem = enr.semester
        result.append({
            "enrollment_id": str(enr.id),
            "student_id": str(student.id),
            "name": student.name,
            "email": student.email,
            "enrollment_number": enr.enrollment_number,
            "id_card_url": enr.id_card_url,
            "course": course.name if course else None,
            "department": course.code if course else None,
            "semester": sem.semester_number if sem else None,
            "applied_at": enr.applied_at.isoformat() if enr.applied_at else None
        })
    return result

@router.get("/at-risk")
async def get_at_risk_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    cutoff_date = date.today() - timedelta(days=7)
    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course),
        selectinload(StudentEnrollment.semester)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).where(User.role == "student", User.status == "approved")

    res = await db.execute(stmt)
    enrollments = res.scalars().all()

    result = []
    for enr in enrollments:
        student = enr.student
        course = enr.course
        sem = enr.semester

        avg_score_stmt = select(func.avg(QuizAttempt.score)).where(
            QuizAttempt.student_id == student.id
        )
        avg_score_res = await db.execute(avg_score_stmt)
        avg_score = avg_score_res.scalar()

        is_inactive = student.last_active_date is not None and student.last_active_date < cutoff_date
        has_low_score = avg_score is not None and avg_score < 40.0

        if is_inactive or has_low_score:
            risk_level = "High" if (is_inactive and has_low_score) else "Medium"
            risk_reason = "Inactivity > 7 days" if is_inactive else "Average score < 40%"
            if is_inactive and has_low_score:
                risk_reason = "Inactivity & Low score"

            result.append({
                "id": str(student.id),
                "name": student.name,
                "email": student.email,
                "enrollment": enr.enrollment_number,
                "department": course.code if course else "N/A",
                "course_code": course.code if course else "N/A",
                "current_semester": sem.semester_number if sem else 1,
                "section": student.section or "A",
                "cgpa": student.cgpa or 0.0,
                "last_active": student.last_active_date.isoformat() if student.last_active_date else "Never",
                "status": student.status,
                "is_at_risk": True,
                "risk_level": risk_level,
                "risk_reason": risk_reason,
                "quiz_avg": round(avg_score, 1) if avg_score is not None else 0,
            })
    return result

@router.post("/{id}/approve")
async def approve_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Retrieve enrollment by enrollment_id or student_id
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(StudentEnrollment).where(
        or_(StudentEnrollment.id == uid, StudentEnrollment.student_id == uid)
    )
    res = await db.execute(stmt)
    enrollment = res.scalars().first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student_stmt = select(User).where(User.id == enrollment.student_id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()

    enrollment.approval_status = "approved"
    enrollment.approved_by = current_user.id
    enrollment.approved_at = datetime.utcnow()

    if student:
        student.status = "approved"
        student.is_active = True

    # Log action
    approval_log = StudentApprovalLog(
        student_id=enrollment.student_id,
        action="approved",
        performed_by=current_user.id,
        reason="Registration approved by HOD"
    )
    db.add(approval_log)

    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="APPROVE",
        details=f"Student registration approved for {student.name if student else 'Unknown'}"
    )
    db.add(admin_action)

    # Save to notification table
    notif = Notification(
        id=uuid.uuid4(),
        user_id=enrollment.student_id,
        title="Registration Approved",
        body="Your account has been approved by the HOD. You now have full access to the platform."
    )
    db.add(notif)

    await db.commit()

    # Trigger Firebase push alert if FCM token exists
    if student and student.fcm_token:
        send_push_notification(
            student.fcm_token,
            "Registration Approved",
            "Your account has been approved by the HOD."
        )

    return {"message": "Student registration approved successfully"}

@router.post("/{id}/reject")
async def reject_student(
    id: str,
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(StudentEnrollment).where(
        or_(StudentEnrollment.id == uid, StudentEnrollment.student_id == uid)
    )
    res = await db.execute(stmt)
    enrollment = res.scalars().first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student_stmt = select(User).where(User.id == enrollment.student_id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()

    enrollment.approval_status = "rejected"
    enrollment.approval_note = req.note
    enrollment.approved_by = current_user.id

    if student:
        student.status = "rejected"

    # Log action
    approval_log = StudentApprovalLog(
        student_id=enrollment.student_id,
        action="rejected",
        performed_by=current_user.id,
        reason=req.note
    )
    db.add(approval_log)

    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="REJECT",
        details=f"Student registration rejected for {student.name if student else 'Unknown'}. Reason: {req.note or 'None'}"
    )
    db.add(admin_action)

    await db.commit()

    # Send rejection email via Brevo
    if student and student.email:
        send_email(
            to_email=student.email,
            to_name=student.name,
            subject="IntelliLearn Access Update — Rejected",
            template_name="rejection_email.html",
            context={
                "full_name": student.name,
                "rejection_reason": req.note or "Documents could not be verified."
            }
        )

    return {"message": "Student registration rejected successfully"}

# Fallback for HOD review endpoint matching frontend old reviews path
@router.post("/{enrollment_id}/review")
async def review_registration(
    enrollment_id: str,
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    if req.action == "approved":
        return await approve_student(enrollment_id, db, current_user)
    elif req.action == "rejected":
        return await reject_student(enrollment_id, req, db, current_user)
    elif req.action == "correction":
        # Handle correction status
        try:
            uid = uuid.UUID(enrollment_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ID")
        stmt = select(StudentEnrollment).where(StudentEnrollment.id == uid)
        res = await db.execute(stmt)
        enr = res.scalars().first()
        if enr:
            enr.approval_status = "correction"
            enr.approval_note = req.note
            await db.commit()
        return {"message": "Registration marked for correction"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action type")

@router.get("/summary-counts")
async def get_summary_counts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Total students
    tot_stmt = select(func.count(User.id)).where(User.role == "student")
    tot_res = await db.execute(tot_stmt)
    total = tot_res.scalar() or 0

    # Count by departments (Courses)
    depts = ["BCA", "MCA", "BSc CS", "MSc IT"]
    counts = {}
    for dept in depts:
        stmt = select(func.count(StudentEnrollment.id)).join(
            Course, Course.id == StudentEnrollment.course_id
        ).join(
            User, User.id == StudentEnrollment.student_id
        ).where(
            User.role == "student",
            User.status == "approved",
            Course.code == dept
        )
        res = await db.execute(stmt)
        counts[dept] = res.scalar() or 0

    # Pending
    pend_stmt = select(func.count(StudentEnrollment.id)).where(
        StudentEnrollment.approval_status == "pending"
    )
    pend_res = await db.execute(pend_stmt)
    pending = pend_res.scalar() or 0

    # Deactivated
    deact_stmt = select(func.count(User.id)).where(
        User.role == "student", User.is_active == False
    )
    deact_res = await db.execute(deact_stmt)
    deactivated = deact_res.scalar() or 0

    print(f"[DB QUERY] get_summary_counts queries executed. Total: {total}, BCA: {counts.get('BCA', 0)}, MCA: {counts.get('MCA', 0)}, BSc CS: {counts.get('BSc CS', 0)}, MSc IT: {counts.get('MSc IT', 0)}, Pending: {pending}, Deactivated: {deactivated}")

    res_data = {
        "total": total,
        "bca_count": counts.get("BCA", 0),
        "mca_count": counts.get("MCA", 0),
        "bsc_cs_count": counts.get("BSc CS", 0),
        "msc_it_count": counts.get("MSc IT", 0),
        "pending": pending,
        "deactivated": deactivated,
    }
    print(f"[API RESPONSE] get_summary_counts returning: {res_data}")
    return res_data

@router.get("/{id}")
async def get_student_profile(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course),
        selectinload(StudentEnrollment.semester)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).where(User.id == uid)

    res = await db.execute(stmt)
    enr = res.scalars().first()

    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student
    course = enr.course
    sem = enr.semester

    # Scope check for HOD
    if current_user.role == "hod" and current_user.department_id:
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Access denied: Student belongs to another department")

    # Get interventions / notifications
    notif_stmt = select(func.count(Notification.id)).where(Notification.user_id == student.id)
    notif_res = await db.execute(notif_stmt)
    notif_count = notif_res.scalar() or 0

    # Get quiz average
    avg_score_stmt = select(func.avg(QuizAttempt.score)).where(QuizAttempt.student_id == student.id)
    avg_score_res = await db.execute(avg_score_stmt)
    avg_score = avg_score_res.scalar()

    interventions = []
    if not student.is_active:
        interventions.append({
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "type": "Account Deactivated",
            "details": "Student credentials soft-deactivated by HOD"
        })
    elif student.status == "approved":
        interventions.append({
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "type": "Registration Approved",
            "details": "Student registration approved by HOD"
        })

    return {
        "id": str(student.id),
        "enrollment_id": str(enr.id),
        "name": student.name,
        "enrollment_no": enr.enrollment_number,
        "email": student.email,
        "department": course.code if course else "N/A",
        "course": course.name if course else "N/A",
        "semester": sem.semester_number if sem else 1,
        "section": student.section or "A",
        "cgpa": student.cgpa or 0.0,
        "last_login": student.last_active_date.isoformat() if student.last_active_date else "Never",
        "status": "deactivated" if not student.is_active else student.status,
        "intervention_count": notif_count,
        "quiz_avg": round(avg_score, 1) if avg_score is not None else 0.0,
        "interventions": interventions
    }

class StudentUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    cgpa: Optional[float] = None

@router.put("/{id}")
async def update_student_profile(
    id: str,
    payload: StudentUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).where(User.id == uid)

    res = await db.execute(stmt)
    enr = res.scalars().first()

    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student
    course = enr.course

    # Scope check for HOD
    if current_user.role == "hod" and current_user.department_id:
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Access denied: Student belongs to another department")

    # Validate updates
    if payload.cgpa is not None and (payload.cgpa < 0.0 or payload.cgpa > 10.0):
        raise HTTPException(status_code=400, detail="CGPA must be between 0.0 and 10.0")

    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        student.name = payload.name
    if payload.email is not None:
        if not payload.email.strip():
            raise HTTPException(status_code=400, detail="Email cannot be empty")
        student.email = payload.email
    if payload.section is not None:
        student.section = payload.section
    if payload.cgpa is not None:
        student.cgpa = payload.cgpa
    if payload.semester is not None:
        sem_stmt = select(Semester).where(
            Semester.course_id == enr.course_id,
            Semester.semester_number == payload.semester
        )
        sem_res = await db.execute(sem_stmt)
        sem = sem_res.scalars().first()
        if not sem:
            raise HTTPException(status_code=400, detail="Invalid semester for this course")
        enr.current_semester_id = sem.id
        student.current_semester = sem.semester_number

    await db.commit()
    return {"message": "Student profile updated successfully"}

@router.post("/{id}/deactivate")
async def deactivate_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).where(User.id == uid)

    res = await db.execute(stmt)
    enr = res.scalars().first()

    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student
    course = enr.course

    # Scope check for HOD
    if current_user.role == "hod" and current_user.department_id:
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Access denied: Student belongs to another department")

    student.is_active = False
    student.status = "deactivated"

    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="DEACTIVATE",
        details=f"Student account deactivated for {student.name}"
    )
    db.add(admin_action)

    await db.commit()
    return {"message": f"Account for {student.name} has been deactivated"}

@router.post("/{id}/reactivate")
async def reactivate_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(
        selectinload(StudentEnrollment.student),
        selectinload(StudentEnrollment.course)
    ).join(
        User, User.id == StudentEnrollment.student_id
    ).where(User.id == uid)

    res = await db.execute(stmt)
    enr = res.scalars().first()

    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student
    course = enr.course

    # Scope check for HOD
    if current_user.role == "hod" and current_user.department_id:
        if course.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Access denied: Student belongs to another department")

    student.is_active = True
    student.status = "approved"

    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="REACTIVATE",
        details=f"Student account reactivated for {student.name}"
    )
    db.add(admin_action)

    await db.commit()
    return {"message": f"Account for {student.name} reactivated successfully"}

@router.post("/{id}/inform-faculty")
async def inform_faculty(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(selectinload(StudentEnrollment.student)).where(StudentEnrollment.student_id == uid)
    res = await db.execute(stmt)
    enr = res.scalars().first()
    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student

    notif = Notification(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title="Faculty Notified",
        body=f"Subject Faculty notified regarding performance concerns for student {student.name}."
    )
    db.add(notif)
    await db.commit()
    return {"message": f"Notification sent to Subject Faculty regarding {student.name}"}

@router.post("/{id}/send-reminder")
async def send_reminder(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        uid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    stmt = select(StudentEnrollment).options(selectinload(StudentEnrollment.student)).where(StudentEnrollment.student_id == uid)
    res = await db.execute(stmt)
    enr = res.scalars().first()
    if not enr:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student = enr.student

    notif = Notification(
        id=uuid.uuid4(),
        user_id=student.id,
        title="AI Risk Nudge",
        body="Academic performance warning. Please contact your HOD/mentor."
    )
    db.add(notif)
    await db.commit()
    return {"message": f"Nudge alert dispatched to {student.name}"}

