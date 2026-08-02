from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, case
from datetime import datetime, date, timedelta
import uuid

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from models import (
    User, StudentEnrollment, Subject, FacultySubjectAssignment,
    FlaggedAnswer, FacultyLeaveRequest, Timetable, Course, Semester,
    UploadedNote, QuizAttempt, QuizAnswer, Question,
    DailyChallenge, ChallengeSubmission, Doubt
)

router = APIRouter(prefix="/hod/dashboard", tags=["HOD Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    today_day = datetime.now().strftime("%A")
    VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
    
    # Pre-calculate assigned subject IDs subquery
    assigned_sub_query = select(distinct(FacultySubjectAssignment.subject_id)).scalar_subquery()
    
    # Consolidate 10 count/aggregation queries into a single roundtrip select statement
    stmt = select(
        select(func.count(User.id)).where(User.role == "student", User.status == "approved").scalar_subquery(),
        select(func.count(StudentEnrollment.id)).where(StudentEnrollment.approval_status == "pending").scalar_subquery(),
        select(func.count(FlaggedAnswer.id)).where(FlaggedAnswer.status == "pending").scalar_subquery(),
        select(func.count(FacultyLeaveRequest.id)).where(FacultyLeaveRequest.status == "pending").scalar_subquery(),
        select(func.count(Subject.id)).where(and_(Subject.is_archived == False, Subject.id.notin_(assigned_sub_query))).scalar_subquery(),
        select(func.count(Timetable.id)).where(Timetable.day_of_week == today_day).scalar_subquery() if today_day in VALID_DAYS else select(func.val(0)).scalar_subquery(),
        select(func.count(QuizAnswer.id)).scalar_subquery(),
        select(func.sum(case((QuizAnswer.is_correct == True, 1), else_=0))).scalar_subquery(),
        select(func.count(User.id)).where(User.role == "student", User.is_active == True).scalar_subquery(),
        select(func.count(DailyChallenge.id)).scalar_subquery(),
        select(func.count(ChallengeSubmission.id)).scalar_subquery(),
        select(func.count(Doubt.id)).scalar_subquery(),
        select(func.count(Doubt.id)).where(Doubt.is_resolved == True).scalar_subquery(),
        select(func.avg(QuizAttempt.score)).where(QuizAttempt.score.isnot(None)).scalar_subquery()
    )
    
    res = await db.execute(stmt)
    row = res.fetchone()
    
    approved_students = row[0] or 0
    pending_approvals = row[1] or 0
    flagged_pending = row[2] or 0
    pending_leaves = row[3] or 0
    unassigned_subjects = row[4] or 0
    todays_classes = row[5] or 0
    
    # Quiz stats
    quiz_total = row[6] or 0
    quiz_correct = row[7] or 0
    quiz_acc = 0.0
    if quiz_total > 0:
        quiz_acc = (quiz_correct / quiz_total) * 100
        
    # Daily Challenge completion
    total_students = row[8] or 0
    total_challenges = row[9] or 0
    challenge_submissions = row[10] or 0
    challenge_rate = 0.0
    if total_students > 0 and total_challenges > 0:
        max_possible_submissions = total_students * total_challenges
        challenge_rate = (challenge_submissions / max_possible_submissions) * 100
        
    # Resolved doubts percentage
    total_doubts = row[11] or 0
    resolved_doubts = row[12] or 0
    resolved_rate = 0.0
    if total_doubts > 0:
        resolved_rate = (resolved_doubts / total_doubts) * 100
        
    health_score = int(0.4 * quiz_acc + 0.3 * challenge_rate + 0.3 * resolved_rate)
    health_score = max(0, min(100, health_score))
    
    avg_score = row[13] or 0.0


    return {
        "approved_students": approved_students,
        "total_students": total_students,
        "pending_approvals": pending_approvals,
        "unassigned_subjects": unassigned_subjects,
        "flagged_ai_answers": flagged_pending,
        "pending_leaves": pending_leaves,
        "todays_classes": todays_classes,
        "department_health_score": health_score,
        "avg_quiz_score": round(avg_score, 1),
    }

@router.get("/semester-progress")
async def get_semester_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Fetch all courses and semesters
    courses_stmt = select(Course)
    courses_res = await db.execute(courses_stmt)
    courses = courses_res.scalars().all()

    semesters_stmt = select(Semester)
    semesters_res = await db.execute(semesters_stmt)
    semesters = semesters_res.scalars().all()

    progress_data = []

    for course in courses:
        for sem in semesters:
            # Get total subjects in this course + semester
            subjects_stmt = select(Subject.id).where(
                and_(
                    Subject.course_id == course.id,
                    Subject.semester_id == sem.id,
                    Subject.is_archived == False
                )
            )
            subjects_res = await db.execute(subjects_stmt)
            subject_ids = [r[0] for r in subjects_res.all()]

            if not subject_ids:
                continue

            # Find how many subjects have at least one note uploaded
            notes_stmt = select(distinct(UploadedNote.subject_id)).where(
                UploadedNote.subject_id.in_(subject_ids)
            )
            notes_res = await db.execute(notes_stmt)
            completed_subjects_count = len(notes_res.all())

            total_subjects_count = len(subject_ids)
            completion_pct = int((completed_subjects_count / total_subjects_count) * 100) if total_subjects_count > 0 else 0

            status = "On-Track" if completion_pct >= 70 else ("Delayed" if completion_pct < 50 else "Attention")

            progress_data.append({
                "id": f"{course.code.lower()}_sem{sem.semester_number}",
                "dept": course.code,
                "course": f"{course.code} Semester {sem.semester_number}",
                "progress": completion_pct,
                "status": status,
                "total_subjects": total_subjects_count,
                "subjects_with_notes": completed_subjects_count
            })

    return progress_data

@router.get("/at-risk-students")
async def get_at_risk_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Inactive > 7 days OR quiz average < 40
    # Inactive > 7 days: User.last_active_date < today - 7 days
    cutoff_date = date.today() - timedelta(days=7)
    
    # Query all active students (filtered by HOD's department)
    students_stmt = select(User, StudentEnrollment).join(
        StudentEnrollment, StudentEnrollment.student_id == User.id
    ).where(
        User.role == "student",
        User.status == "approved",
        User.department_id == current_user.department_id
    )
    
    students_res = await db.execute(students_stmt)
    records = students_res.all()

    at_risk = []
    for user, enrollment in records:
        # Calculate student's average quiz score
        avg_score_stmt = select(func.avg(QuizAttempt.score)).where(
            QuizAttempt.student_id == user.id
        )
        avg_score_res = await db.execute(avg_score_stmt)
        avg_score = avg_score_res.scalar()

        is_inactive = user.last_active_date is not None and user.last_active_date < cutoff_date
        has_low_score = avg_score is not None and avg_score < 40.0

        if is_inactive or has_low_score:
            risk_reason = "Inactivity > 7 days" if is_inactive else "Average score < 40%"
            if is_inactive and has_low_score:
                risk_reason = "Inactivity & Low score"
                
            at_risk.append({
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "enrollment": enrollment.enrollment_number,
                "department": user.branch or "CS",
                "avg_score": round(avg_score, 1) if avg_score is not None else 0,
                "risk_reason": risk_reason,
                "last_active": user.last_active_date.isoformat() if user.last_active_date else "Never",
            })

    return at_risk

@router.get("/ai-suggestion")
async def get_ai_suggestion(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Calculate correctness per subject + unit from quiz responses (QuizAnswer)
    # Group by Question.subject_id, Question.unit
    stmt = select(
        Question.subject_id,
        Question.unit,
        func.count(QuizAnswer.id).label("total"),
        func.sum(case((QuizAnswer.is_correct == True, 1.0), else_=0.0)).label("correct")
    ).join(
        QuizAnswer, QuizAnswer.question_id == Question.id
    ).group_by(Question.subject_id, Question.unit)

    res = await db.execute(stmt)
    rows = res.all()

    if not rows:
        return {
            "subject_name": "N/A",
            "unit": "N/A",
            "avg_accuracy": 0,
            "suggestion": "No quiz data available to generate recommendations."
        }

    lowest_accuracy = 101.0
    lowest_row = None

    for row in rows:
        total = row.total or 0
        correct = row.correct or 0.0
        accuracy = (correct / total) * 100 if total > 0 else 100.0
        if accuracy < lowest_accuracy:
            lowest_accuracy = accuracy
            lowest_row = row

    if not lowest_row:
        return {
            "subject_name": "N/A",
            "unit": "N/A",
            "avg_accuracy": 0,
            "suggestion": "Keep monitoring students quiz responses."
        }

    # Fetch subject name
    subject_stmt = select(Subject.name).where(Subject.id == lowest_row.subject_id)
    subject_res = await db.execute(subject_stmt)
    subject_name = subject_res.scalar() or "Unknown Subject"

    unit = lowest_row.unit or "Unit 1"
    accuracy = round(lowest_accuracy, 1)

    suggestion = f"The accuracy for {subject_name} ({unit}) is currently very low ({accuracy}%). AI recommends scheduling a remedial lecture or providing extra notes for this unit."

    return {
        "subject_name": subject_name,
        "unit": unit,
        "avg_accuracy": accuracy,
        "suggestion": suggestion
    }


# ── NEW: Dashboard Summary ────────────────────────────────────────────────────
@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    from datetime import date as date_type
    today = date_type.today()
    today_day = datetime.now().strftime("%A")

    # Faculty counts
    total_faculty_res = await db.execute(
        select(func.count(User.id)).where(User.role == "faculty", User.is_active == True)
    )
    total_faculty = total_faculty_res.scalar() or 0

    # Faculty on leave today (approved leaves covering today)
    on_leave_res = await db.execute(
        select(func.count(FacultyLeaveRequest.id)).where(
            and_(
                FacultyLeaveRequest.status == "approved",
                FacultyLeaveRequest.start_date <= today,
                FacultyLeaveRequest.end_date >= today
            )
        )
    )
    faculty_on_leave = on_leave_res.scalar() or 0
    faculty_present = max(0, total_faculty - faculty_on_leave)

    # Pending leave requests
    pending_leaves_res = await db.execute(
        select(func.count(FacultyLeaveRequest.id)).where(FacultyLeaveRequest.status == "pending")
    )
    pending_leaves = pending_leaves_res.scalar() or 0

    # Student counts
    total_students_res = await db.execute(
        select(func.count(User.id)).where(User.role == "student")
    )
    total_students = total_students_res.scalar() or 0

    active_students_res = await db.execute(
        select(func.count(User.id)).where(
            User.role == "student", User.status == "approved", User.is_active == True
        )
    )
    active_students = active_students_res.scalar() or 0

    # Import Course for the join if not already imported at top
    # Pending student registrations — scoped to HOD's department
    if current_user.role == "hod" and current_user.department_id:
        pending_students_res = await db.execute(
            select(func.count(StudentEnrollment.id))
            .join(Course, Course.id == StudentEnrollment.course_id)
            .where(
                StudentEnrollment.approval_status == "pending",
                Course.department_id == current_user.department_id
            )
        )
    else:
        pending_students_res = await db.execute(
            select(func.count(StudentEnrollment.id)).where(StudentEnrollment.approval_status == "pending")
        )
    pending_students = pending_students_res.scalar() or 0

    # Subjects: total and unassigned
    total_subjects_res = await db.execute(
        select(func.count(Subject.id)).where(Subject.is_archived == False)
    )
    total_subjects = total_subjects_res.scalar() or 0

    assigned_ids_res = await db.execute(select(distinct(FacultySubjectAssignment.subject_id)))
    assigned_count = len(assigned_ids_res.all())
    unassigned_subjects = max(0, total_subjects - assigned_count)

    # Today's classes (only Mon-Sat are in the enum; guard against Sunday / holidays)
    VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
    todays_classes = 0
    no_faculty_slots = 0
    if today_day in VALID_DAYS:
        try:
            todays_classes_res = await db.execute(
                select(func.count(Timetable.id)).where(Timetable.day_of_week == today_day)
            )
            todays_classes = todays_classes_res.scalar() or 0

            no_faculty_res = await db.execute(
                select(func.count(Timetable.id)).where(
                    and_(Timetable.day_of_week == today_day, Timetable.faculty_id.is_(None))
                )
            )
            no_faculty_slots = no_faculty_res.scalar() or 0
        except Exception:
            pass  # Non-working day or enum mismatch — return 0

    total_pending = pending_leaves + pending_students + unassigned_subjects

    return {
        "faculty": {
            "total": total_faculty,
            "present": faculty_present,
            "on_leave": faculty_on_leave,
        },
        "students": {
            "total": total_students,
            "active": active_students,
            "pending": pending_students,
        },
        "pending_approvals": {
            "leave_requests": pending_leaves,
            "student_registrations": pending_students,
            "subject_allocation": unassigned_subjects,
            "total": total_pending,
        },
        "todays_classes": {
            "scheduled": todays_classes,
            "no_faculty_slots": no_faculty_slots,
        },
        "subjects": {
            "total": total_subjects,
            "unassigned": unassigned_subjects,
        },
    }


# ── NEW: Department Alerts ────────────────────────────────────────────────────
@router.get("/alerts")
async def get_department_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    alerts = []

    # Alert 1: Unassigned subjects
    assigned_res = await db.execute(select(distinct(FacultySubjectAssignment.subject_id)))
    assigned_ids = [r[0] for r in assigned_res.all()]
    unassigned_res = await db.execute(
        select(func.count(Subject.id)).where(
            and_(Subject.is_archived == False, Subject.id.notin_(assigned_ids) if assigned_ids else Subject.is_archived == False)
        )
    )
    unassigned_count = unassigned_res.scalar() or 0
    if unassigned_count > 0:
        alerts.append({
            "id": "unassigned_subjects",
            "type": "subject_allocation",
            "severity": "high",
            "title": "Unassigned Subjects",
            "message": f"{unassigned_count} subject{'s' if unassigned_count > 1 else ''} have no faculty assigned.",
            "action": "Assign Faculty",
            "action_path": "/admin/faculty",
        })

    # Alert 2: Faculty overloaded (>16 teaching hours)
    faculty_res = await db.execute(
        select(User).where(User.role == "faculty", User.is_active == True)
    )
    all_faculty = faculty_res.scalars().all()
    overloaded_count = 0
    for fac in all_faculty:
        cnt_res = await db.execute(
            select(func.count(FacultySubjectAssignment.id)).where(
                FacultySubjectAssignment.faculty_id == fac.id
            )
        )
        subject_count = cnt_res.scalar() or 0
        if subject_count * 4 > 16:
            overloaded_count += 1
    if overloaded_count > 0:
        alerts.append({
            "id": "faculty_overloaded",
            "type": "faculty_workload",
            "severity": "medium",
            "title": "Faculty Overload",
            "message": f"{overloaded_count} faculty member{'s' if overloaded_count > 1 else ''} exceed the 16 hr/week teaching limit.",
            "action": "Review Workload",
            "action_path": "/admin/faculty",
        })

    # Alert 3: Pending leave requests
    pending_leave_res = await db.execute(
        select(func.count(FacultyLeaveRequest.id)).where(FacultyLeaveRequest.status == "pending")
    )
    pending_leave_count = pending_leave_res.scalar() or 0
    if pending_leave_count > 0:
        alerts.append({
            "id": "pending_leaves",
            "type": "leave_approval",
            "severity": "medium",
            "title": "Pending Leave Requests",
            "message": f"{pending_leave_count} faculty leave request{'s' if pending_leave_count > 1 else ''} awaiting approval.",
            "action": "Review Leaves",
            "action_path": "/admin/leave-requests",
        })

    # Alert 4: Pending student registrations
    pending_enr_res = await db.execute(
        select(func.count(StudentEnrollment.id)).where(StudentEnrollment.approval_status == "pending")
    )
    pending_enr_count = pending_enr_res.scalar() or 0
    if pending_enr_count > 0:
        alerts.append({
            "id": "pending_registrations",
            "type": "student_approval",
            "severity": "low",
            "title": "Pending Student Registrations",
            "message": f"{pending_enr_count} student registration{'s' if pending_enr_count > 1 else ''} pending HOD approval.",
            "action": "Review Students",
            "action_path": "/admin/students",
        })

    return alerts


# ── NEW: Academic Progress (extended) ────────────────────────────────────────
@router.get("/academic-progress")
async def get_academic_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    courses_res = await db.execute(select(Course))
    courses = courses_res.scalars().all()

    semesters_res = await db.execute(select(Semester))
    semesters = semesters_res.scalars().all()

    progress_data = []

    for course in courses:
        for sem in semesters:
            subjects_res = await db.execute(
                select(Subject.id).where(
                    and_(
                        Subject.course_id == course.id,
                        Subject.semester_id == sem.id,
                        Subject.is_archived == False
                    )
                )
            )
            subject_ids = [r[0] for r in subjects_res.all()]
            if not subject_ids:
                continue

            total_subjects_count = len(subject_ids)

            # Coverage: subjects with at least one note uploaded
            notes_res = await db.execute(
                select(distinct(UploadedNote.subject_id)).where(
                    UploadedNote.subject_id.in_(subject_ids)
                )
            )
            covered_count = len(notes_res.all())
            coverage_pct = int((covered_count / total_subjects_count) * 100) if total_subjects_count > 0 else 0
            pending_subjects = total_subjects_count - covered_count

            # Faculty assignment completeness
            assigned_res = await db.execute(
                select(distinct(FacultySubjectAssignment.subject_id)).where(
                    FacultySubjectAssignment.subject_id.in_(subject_ids)
                )
            )
            assigned_count = len(assigned_res.all())
            internal_completed = assigned_count >= total_subjects_count

            status = "On-Track" if coverage_pct >= 70 else ("Delayed" if coverage_pct < 50 else "Attention")

            progress_data.append({
                "id": f"{course.code.lower()}_sem{sem.semester_number}",
                "course_code": course.code,
                "course_name": course.name,
                "semester": sem.semester_number,
                "total_subjects": total_subjects_count,
                "covered_subjects": covered_count,
                "pending_subjects": pending_subjects,
                "coverage_pct": coverage_pct,
                "internal_completed": internal_completed,
                "assigned_subjects": assigned_count,
                "status": status,
            })

    return progress_data
