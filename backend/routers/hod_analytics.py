from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct, case, Date, extract
from typing import Optional, List
from datetime import datetime, date, timedelta
import uuid

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from models import (
    User, Subject, QuizAttempt, QuizAnswer, Doubt, ChatLog,
    DailyChallenge, ChallengeSubmission, FacultySubjectAssignment,
    Question, StudentEnrollment, Note, Course, Semester, Department
)

router = APIRouter(prefix="/hod/analytics", tags=["HOD Department Analytics"])

@router.get("/summary")
async def get_department_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Department analytics with resilient sectioned queries."""
    import asyncio
    from sqlalchemy import text
    today = date.today()
    eight_weeks_ago = datetime.utcnow() - timedelta(weeks=8)
    dept_id = current_user.department_id

    # Define all statements filtered by HOD department_id
    stmt_quiz_acc = select(
        func.count(QuizAnswer.id).label("t"),
        func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("c")
    ).join(
        QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id
    ).join(
        User, QuizAttempt.student_id == User.id
    ).where(
        User.department_id == dept_id
    )

    stmt_challenges = select(func.count(DailyChallenge.id))
    stmt_challenge_subs = select(func.count(ChallengeSubmission.id))

    stmt_doubts = select(
        func.count(Doubt.id).label("tot"),
        func.sum(case((Doubt.is_resolved == True, 1), else_=0)).label("res")
    ).join(
        Subject, Doubt.subject_id == Subject.id
    ).where(
        Subject.department_id == dept_id
    )

    stmt_chat_stats = select(
        func.count(distinct(ChatLog.student_id)).label("chatters"),
        func.count(ChatLog.id).label("total_q")
    ).join(
        User, ChatLog.student_id == User.id
    ).where(
        User.department_id == dept_id
    )

    stmt_chat_trend = select(
        func.cast(ChatLog.created_at, Date).label("day"),
        func.count(ChatLog.id).label("count")
    ).join(
        User, ChatLog.student_id == User.id
    ).where(
        and_(
            func.cast(ChatLog.created_at, Date) >= today - timedelta(days=6),
            User.department_id == dept_id
        )
    ).group_by(
        func.cast(ChatLog.created_at, Date)
    )

    stmt_subj_quiz = select(
        QuizAttempt.subject_id,
        func.count(QuizAnswer.id).label("total"),
        func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
    ).join(
        QuizAnswer, QuizAnswer.attempt_id == QuizAttempt.id
    ).join(
        Subject, QuizAttempt.subject_id == Subject.id
    ).where(
        Subject.department_id == dept_id
    ).group_by(
        QuizAttempt.subject_id
    )

    stmt_active_depts = select(func.count(Department.id)).where(Department.status == "Active")

    stmt_subjects = select(
        Subject.id, Subject.code, Subject.name, Subject.course_id
    ).join(
        Semester, Subject.semester_id == Semester.id
    ).where(
        and_(
            Subject.is_archived == False,
            Subject.department_id == dept_id,
            Semester.is_active == True
        )
    )

    stmt_courses = select(Course.id, Course.code).where(
        Course.department_id == dept_id
    )

    stmt_faculties = select(User.id, User.name, User.email).where(
        User.role == "faculty",
        User.is_active == True,
        User.department_id == dept_id
    )

    stmt_assignments = select(
        FacultySubjectAssignment.faculty_id,
        FacultySubjectAssignment.subject_id
    ).join(
        Subject, FacultySubjectAssignment.subject_id == Subject.id
    ).where(
        Subject.department_id == dept_id
    )

    stmt_enrollments = select(
        StudentEnrollment.student_id,
        StudentEnrollment.course_id
    ).join(
        User, StudentEnrollment.student_id == User.id
    ).where(
        User.department_id == dept_id
    )

    stmt_students = select(User.id, User.last_active_date).where(
        User.role == "student",
        User.is_active == True,
        User.department_id == dept_id
    )

    stmt_student_avg = select(
        QuizAttempt.student_id,
        func.avg(QuizAttempt.score).label("avg_score")
    ).join(
        User, QuizAttempt.student_id == User.id
    ).where(
        and_(
            QuizAttempt.score.isnot(None),
            User.department_id == dept_id
        )
    ).group_by(
        QuizAttempt.student_id
    )

    stmt_course_avg = select(
        StudentEnrollment.course_id,
        func.avg(QuizAttempt.score).label("avg_score")
    ).join(
        QuizAttempt, QuizAttempt.student_id == StudentEnrollment.student_id
    ).join(
        Course, StudentEnrollment.course_id == Course.id
    ).where(
        and_(
            QuizAttempt.score.isnot(None),
            Course.department_id == dept_id
        )
    ).group_by(
        StudentEnrollment.course_id
    )

    stmt_attempts_trend = select(
        QuizAttempt.started_at,
        QuizAttempt.score,
        StudentEnrollment.course_id,
        Course.code.label("course_code")
    ).join(
        User, User.id == QuizAttempt.student_id
    ).join(
        StudentEnrollment, StudentEnrollment.student_id == User.id
    ).join(
        Course, Course.id == StudentEnrollment.course_id
    ).where(
        and_(
            QuizAttempt.started_at >= eight_weeks_ago,
            QuizAttempt.score.isnot(None),
            Course.department_id == dept_id
        )
    )

    stmt_attendance = text("""
        SELECT 
            s.course_id,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
            COUNT(*) as total
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        JOIN semesters sem ON s.semester_id = sem.id
        JOIN users u ON a.student_id = u.id
        WHERE s.department_id = :dept_id
          AND sem.is_active = True
          AND u.role = 'student'
          AND u.is_active = True
          AND u.status = 'approved'
        GROUP BY s.course_id
    """)

    # Put all tasks in a list and execute concurrently
    tasks = [
        db.execute(stmt_quiz_acc),      # 0
        db.execute(stmt_challenges),    # 1
        db.execute(stmt_challenge_subs),# 2
        db.execute(stmt_doubts),        # 3
        db.execute(stmt_chat_stats),    # 4
        db.execute(stmt_chat_trend),    # 5
        db.execute(stmt_subj_quiz),     # 6
        db.execute(stmt_active_depts),  # 7
        db.execute(stmt_subjects),      # 8
        db.execute(stmt_courses),       # 9
        db.execute(stmt_faculties),     # 10
        db.execute(stmt_assignments),   # 11
        db.execute(stmt_enrollments),   # 12
        db.execute(stmt_students),      # 13
        db.execute(stmt_student_avg),   # 14
        db.execute(stmt_course_avg),    # 15
        db.execute(stmt_attempts_trend),# 16
        db.execute(stmt_attendance, {"dept_id": dept_id}) # 17
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    def get_result(index, default=None):
        res = results[index]
        if isinstance(res, Exception):
            return default
        return res

    # 1) Quiz accuracy for health score
    res_quiz_acc = get_result(0)
    if res_quiz_acc:
        try:
            r = res_quiz_acc.first()
            qa_total, qa_correct = (r.t or 0), (r.c or 0)
            quiz_acc = (qa_correct / qa_total * 100) if qa_total else 0.0
        except Exception:
            qa_total = qa_correct = 0
            quiz_acc = 0.0
    else:
        qa_total = qa_correct = 0
        quiz_acc = 0.0

    # 2) Student count + challenge + doubts
    res_challenges = get_result(1)
    res_challenge_subs = get_result(2)
    res_doubts = get_result(3)
    res_students = get_result(13)

    all_students = []
    if res_students:
        try:
            all_students = list(res_students.all())
        except Exception:
            pass
    total_students = len(all_students)

    try:
        total_challenges = res_challenges.scalar() or 0 if res_challenges else 0
        challenge_submissions = res_challenge_subs.scalar() or 0 if res_challenge_subs else 0
        challenge_rate = (challenge_submissions / (total_students * total_challenges) * 100) if (total_students and total_challenges) else 0.0
        
        if res_doubts:
            r2 = res_doubts.first()
            total_doubts, resolved_doubts = (r2.tot or 0), (r2.res or 0)
            resolved_rate = (resolved_doubts / total_doubts * 100) if total_doubts else 0.0
        else:
            total_doubts = resolved_doubts = 0
            resolved_rate = 0.0
    except Exception:
        challenge_rate = resolved_rate = 0.0
        total_doubts = resolved_doubts = 0

    health_score = max(0, min(100, int(0.4 * quiz_acc + 0.3 * challenge_rate + 0.3 * resolved_rate)))

    # 3) AI usage
    res_chat_stats = get_result(4)
    res_chat_trend = get_result(5)
    try:
        if res_chat_stats:
            r3 = res_chat_stats.first()
            chatting_students = r3.chatters or 0
            total_queries_count = r3.total_q or 0
        else:
            chatting_students = total_queries_count = 0
        ai_adoption_rate = (chatting_students / total_students * 100) if total_students else 0.0
        
        trend_rows = res_chat_trend.all() if res_chat_trend else []
        tc = {r.day: r.count for r in trend_rows}
        ai_queries_trend = [{"date": (today - timedelta(days=i)).strftime("%a"), "queries": tc.get(today - timedelta(days=i), 0)} for i in range(6, -1, -1)]
    except Exception:
        ai_adoption_rate = 0.0
        total_queries_count = 0
        ai_queries_trend = [{"date": (today - timedelta(days=i)).strftime("%a"), "queries": 0} for i in range(6, -1, -1)]

    # 4) Subject quiz stats (grouped)
    res_subj_quiz = get_result(6)
    try:
        subject_quiz_stats = {r.subject_id: (r.total, r.correct) for r in res_subj_quiz.all()} if res_subj_quiz else {}
    except Exception:
        subject_quiz_stats = {}

    # 5) Core entities
    res_active_depts = get_result(7)
    res_subjects = get_result(8)
    res_courses = get_result(9)
    res_faculties = get_result(10)
    res_assignments = get_result(11)

    try:
        total_active_departments = res_active_depts.scalar() or 0 if res_active_depts else 0
    except Exception:
        total_active_departments = 0
    try:
        subjects = list(res_subjects.all()) if res_subjects else []
    except Exception:
        subjects = []
    try:
        courses = list(res_courses.all()) if res_courses else []
    except Exception:
        courses = []
    try:
        faculties = list(res_faculties.all()) if res_faculties else []
        assignments_list = list(res_assignments.all()) if res_assignments else []
        faculty_subj_ids = {}
        for a in assignments_list:
            faculty_subj_ids.setdefault(a.faculty_id, []).append(a.subject_id)
    except Exception:
        faculties = []
        faculty_subj_ids = {}

    # 6) Dept summary data
    res_enrollments = get_result(12)
    res_student_avg = get_result(14)
    res_course_avg = get_result(15)
    res_attendance = get_result(17)

    try:
        enrollments = list(res_enrollments.all()) if res_enrollments else []
        student_avg_map = {r.student_id: r.avg_score for r in res_student_avg.all()} if res_student_avg else {}
        course_avg_scores = {r.course_id: r.avg_score for r in res_course_avg.all()} if res_course_avg else {}
        enr_map = {e.student_id: e.course_id for e in enrollments}
        course_students = {}
        for stu in all_students:
            cid = enr_map.get(stu.id)
            if cid:
                course_students.setdefault(cid, []).append(stu)
    except Exception:
        course_students = {}
        student_avg_map = {}
        course_avg_scores = {}

    course_attendance = {}
    if res_attendance:
        try:
            for r_att in res_attendance.all():
                pres = r_att.present or 0
                tot = r_att.total or 0
                course_attendance[r_att.course_id] = round((pres / tot) * 100) if tot > 0 else 0
        except Exception:
            pass

    # 7) Score trend (8 weeks of quiz attempts)
    res_attempts_trend = get_result(16)
    try:
        attempts_list = res_attempts_trend.all() if res_attempts_trend else []
    except Exception:
        attempts_list = []

    # ── Build response (pure Python, no more DB) ──────────────────────────────
    faculty_effectiveness = []
    for fac in faculties:
        fac_subjs = faculty_subj_ids.get(fac.id, [])
        tot = cor = 0
        for s_id in fac_subjs:
            st = subject_quiz_stats.get(s_id)
            if st:
                tot += st[0] or 0
                cor += st[1] or 0
        faculty_effectiveness.append({
            "id": str(fac.id), "name": fac.name, "email": fac.email,
            "assigned_subjects_count": len(fac_subjs),
            "effectiveness_index": round(cor / tot * 100, 1) if tot else 0.0
        })

    subject_difficulty = []
    intervention_recommendations = []
    for sub in subjects:
        st = subject_quiz_stats.get(sub.id)
        tot = st[0] if st else 0
        cor = st[1] if st else 0
        avg_acc = (cor / tot * 100) if tot else 0.0
        tier = "Hard" if avg_acc < 55 else ("Medium" if avg_acc < 75 else "Easy")
        if avg_acc < 55:
            intervention_recommendations.append({
                "subject_id": str(sub.id), "subject_name": sub.name,
                "reason": f"Low quiz score ({avg_acc:.1f}%)",
                "action": "Schedule a remedial session or release additional study notes."
            })
        subject_difficulty.append({
            "subject_id": str(sub.id), "subject_code": sub.code,
            "subject_name": sub.name, "avg_accuracy": round(avg_acc, 1),
            "difficulty_tier": tier
        })
    subject_difficulty.sort(key=lambda x: x["avg_accuracy"])

    cutoff = today - timedelta(days=7)
    dept_summary = []
    for c in courses:
        sl = course_students.get(c.id, [])
        sc = len(sl)
        av = course_avg_scores.get(c.id)
        active7 = sum(1 for s in sl if s.last_active_date and s.last_active_date >= cutoff)
        att_rate = course_attendance.get(c.id, 0)
        dept_summary.append({
            "dept": c.code, "students": sc,
            "avg_score": round(float(av)) if av else 0,
            "engagement": round(active7 / sc * 100) if sc else 0,
            "at_risk": sum(1 for s in sl if (student_avg_map.get(s.id) or 999) < 50),
            "attendance": att_rate
        })

    score_trend = []
    for w in range(7, -1, -1):
        ws = datetime.utcnow() - timedelta(weeks=w + 1)
        we = datetime.utcnow() - timedelta(weeks=w)
        row = {"week": f"Wk {8 - w}"}
        for c in courses:
            row[c.code] = 0
        cws: dict = {}
        for at, sc_val, _, cc in attempts_list:
            if at and at.tzinfo:
                at = at.replace(tzinfo=None)
            if ws <= at < we:
                cws.setdefault(cc, []).append(sc_val)
        for cc, scs in cws.items():
            if scs:
                row[cc] = round(sum(scs) / len(scs))
        score_trend.append(row)

    return {
        "department_health_score": health_score,
        "total_active_departments": total_active_departments,
        "ai_usage": {
            "adoption_rate": round(ai_adoption_rate, 1),
            "total_queries": total_queries_count,
            "queries_trend": ai_queries_trend
        },
        "faculty_effectiveness": faculty_effectiveness,
        "subject_difficulty": subject_difficulty,
        "intervention_recommendations": intervention_recommendations,
        "dept_summary": dept_summary,
        "score_trend": score_trend
    }

@router.get("/heatmap")
async def get_department_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    # 1. Fetch all subjects (specific columns only)
    subjects_stmt = select(Subject.id, Subject.name, Subject.code, Subject.course_id).where(Subject.is_archived == False)
    
    # 2. Bulk fetch all courses (specific columns only)
    courses_stmt = select(Course.id, Course.code)
    
    # 3. Bulk fetch stats for all subjects and units
    stats_stmt = select(
        QuizAttempt.subject_id,
        Question.unit,
        func.count(QuizAnswer.id).label("total"),
        func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
    ).join(
        Question, Question.id == QuizAnswer.question_id
    ).join(
        QuizAttempt, QuizAttempt.id == QuizAnswer.attempt_id
    ).group_by(
        QuizAttempt.subject_id, Question.unit
    )
    
    # Execute in parallel
    subjects_res, courses_res, stats_res = await asyncio.gather(
        db.execute(subjects_stmt),
        db.execute(courses_stmt),
        db.execute(stats_stmt)
    )
    
    subjects = subjects_res.all()
    courses_map = {c.id: c.code for c in courses_res.all()}
    stats_rows = stats_res.all()
    
    # Organize stats by subject and unit number in Python
    stats_map = {}
    for subject_id, unit, total, correct in stats_rows:
        if not unit:
            continue
        unit_num = None
        for u in range(1, 6):
            if f"unit {u}" in unit.lower():
                unit_num = u
                break
        if unit_num:
            stats_map.setdefault(subject_id, {})[unit_num] = (total, correct or 0)
            
    result = {}
    for sub in subjects:
        course_code = courses_map.get(sub.course_id, "General")
        
        if course_code not in result:
            result[course_code] = []
            
        row = {
            "subject": sub.name,
            "subject_code": sub.code,
            "u1": None,
            "u2": None,
            "u3": None,
            "u4": None,
            "u5": None
        }
        
        sub_stats = stats_map.get(sub.id, {})
        for u in range(1, 6):
            total, correct = sub_stats.get(u, (0, 0))
            if total > 0:
                row[f"u{u}"] = int(round((correct / total) * 100))
                
        result[course_code].append(row)
        
    return result

@router.get("/student-progress")
async def get_student_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    from models.student_enrollment import StudentEnrollment
    from models.course import Course
    from models.semester import Semester

    # 1. Fetch student info and enrollment in a single flat join query
    students_stmt = select(
        User.id.label("student_id"),
        User.name.label("student_name"),
        User.enrollment_no.label("legacy_enrollment_no"),
        User.current_semester.label("legacy_semester"),
        StudentEnrollment.enrollment_number.label("enrollment_number"),
        Course.code.label("course_code"),
        Semester.semester_number.label("semester_number")
    ).outerjoin(
        StudentEnrollment, StudentEnrollment.student_id == User.id
    ).outerjoin(
        Course, Course.id == StudentEnrollment.course_id
    ).outerjoin(
        Semester, Semester.id == StudentEnrollment.current_semester_id
    ).where(User.role == "student", User.is_active == True)
    
    # 2. Bulk fetch all graded quiz attempts for all students ordered by started_at
    attempts_stmt = select(QuizAttempt).where(QuizAttempt.score.isnot(None)).order_by(QuizAttempt.started_at.asc())
    
    # Execute in parallel
    students_res, attempts_res = await asyncio.gather(
        db.execute(students_stmt),
        db.execute(attempts_stmt)
    )
    
    students = students_res.all()
    attempts_list = attempts_res.scalars().all()
    
    student_attempts = {}
    for att in attempts_list:
        student_attempts.setdefault(att.student_id, []).append(att.score)
        
    result = []
    for s in students:
        dept = s.course_code or "MCA"
        sem = f"Sem {s.semester_number}" if s.semester_number else (f"Sem {s.legacy_semester}" if s.legacy_semester else "Sem 1")
        enrollment_number = s.enrollment_number or s.legacy_enrollment_no or "N/A"
        
        scores = student_attempts.get(s.student_id, [])
        quizzes_count = len(scores)
        avg_score = 0
        change = 0
        
        if quizzes_count > 0:
            avg_score = round(sum(scores) / quizzes_count)
            if quizzes_count > 1:
                change = round(scores[-1] - scores[0])
                
        status = "good" if avg_score >= 75 else ("average" if avg_score >= 50 else "at_risk")
        
        result.append({
            "id": str(s.student_id),
            "name": s.student_name,
            "enrollment": enrollment_number,
            "dept": dept,
            "sem": sem,
            "avg_score": avg_score,
            "change": change,
            "quizzes": quizzes_count,
            "status": status
        })
        
    return result

@router.get("/faculty-performance")
async def get_faculty_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    # 1. Fetch faculty and assignments in a single query
    faculty_users_stmt = select(
        User.id.label("faculty_id"),
        User.name.label("faculty_name"),
        User.branch.label("faculty_branch"),
        Subject.id.label("subject_id"),
        Subject.name.label("subject_name"),
        Subject.course_id.label("subject_course_id")
    ).outerjoin(
        FacultySubjectAssignment, FacultySubjectAssignment.faculty_id == User.id
    ).outerjoin(
        Subject, Subject.id == FacultySubjectAssignment.subject_id
    ).where(User.role == "faculty", User.is_active == True)
    
    # 2. Bulk fetch enrollment counts per course
    enrollments_stmt = select(StudentEnrollment.course_id, func.count(StudentEnrollment.id)).group_by(StudentEnrollment.course_id)
    
    # 3. Bulk fetch average score per subject
    avg_score_stmt = select(QuizAttempt.subject_id, func.avg(QuizAttempt.score)).where(QuizAttempt.score.isnot(None)).group_by(QuizAttempt.subject_id)
    
    # 4. Bulk fetch note counts per uploader
    notes_stmt = select(Note.uploaded_by, func.count(Note.id)).group_by(Note.uploaded_by)
    
    # 5. Bulk fetch doubts count and resolved count per subject
    doubts_stmt = select(
        Doubt.subject_id,
        func.count(Doubt.id).label("total"),
        func.sum(case((Doubt.is_resolved == True, 1), else_=0)).label("resolved")
    ).group_by(Doubt.subject_id)

    # Execute in parallel
    faculty_users_res, enrollments_res, avg_score_res, notes_res, doubts_res = await asyncio.gather(
        db.execute(faculty_users_stmt),
        db.execute(enrollments_stmt),
        db.execute(avg_score_stmt),
        db.execute(notes_stmt),
        db.execute(doubts_stmt)
    )
    
    enrollment_counts = {r[0]: r[1] for r in enrollments_res.all()}
    subject_avg_scores = {r[0]: r[1] for r in avg_score_res.all()}
    notes_counts = {r[0]: r[1] for r in notes_res.all()}
    doubts_stats = {r.subject_id: (r.total, r.resolved) for r in doubts_res.all()}
    
    # Group in memory
    faculty_map = {}
    for r in faculty_users_res.all():
        fid = r.faculty_id
        if fid not in faculty_map:
            faculty_map[fid] = {
                "id": str(fid),
                "name": r.faculty_name,
                "dept": r.faculty_branch or "MCA",
                "subjects": [],
                "subject_ids": [],
                "course_ids": []
            }
        if r.subject_id:
            faculty_map[fid]["subjects"].append(r.subject_name)
            faculty_map[fid]["subject_ids"].append(r.subject_id)
            if r.subject_course_id:
                faculty_map[fid]["course_ids"].append(r.subject_course_id)

    result = []
    for fid, f in faculty_map.items():
        subject_names = f["subjects"]
        subject_ids = f["subject_ids"]
        course_ids = f["course_ids"]
        
        # Students count across all courses taught by the faculty
        students_count = sum(enrollment_counts.get(cid, 0) for cid in set(course_ids))
        
        # Average quiz score across all subjects taught by this faculty member
        scores_sum = 0
        scores_count = 0
        for sid in subject_ids:
            if sid in subject_avg_scores:
                scores_sum += float(subject_avg_scores[sid])
                scores_count += 1
        avg_score = round(scores_sum / scores_count) if scores_count > 0 else 0
        
        # Uploaded notes
        notes_count = notes_counts.get(uuid.UUID(f["id"]), 0)
        
        # Doubt resolution percentage
        total_doubts = 0
        resolved_doubts = 0
        for sid in subject_ids:
            if sid in doubts_stats:
                total_doubts += doubts_stats[sid][0] or 0
                resolved_doubts += doubts_stats[sid][1] or 0
        doubt_resolution = round((resolved_doubts / total_doubts) * 100) if total_doubts > 0 else 0
        
        result.append({
            "id": f["id"],
            "name": f["name"],
            "dept": f["dept"],
            "subjects": subject_names,
            "students": students_count,
            "avg_score": avg_score,
            "notes": notes_count,
            "doubt_resolution": doubt_resolution
        })
        
    return result

@router.get("/comparative")
async def get_comparative_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    import asyncio
    subjects_stmt = select(Subject.id, Subject.name, Subject.course_id).where(Subject.is_archived == False)
    
    # Bulk fetch all courses to map course_id -> course code
    courses_stmt = select(Course.id, Course.code)
    
    this_sem_cutoff = datetime.utcnow() - timedelta(days=120)
    last_sem_cutoff = datetime.utcnow() - timedelta(days=240)
    
    # Bulk fetch quiz attempt scores for all subjects in the timeframe
    attempts_stmt = select(QuizAttempt.subject_id, QuizAttempt.score, QuizAttempt.started_at).where(
        and_(
            QuizAttempt.started_at >= last_sem_cutoff,
            QuizAttempt.score.isnot(None)
        )
    )

    # Execute in parallel
    subjects_res, courses_res, attempts_res = await asyncio.gather(
        db.execute(subjects_stmt),
        db.execute(courses_stmt),
        db.execute(attempts_stmt)
    )
    
    subjects = subjects_res.all()
    courses_map = {c.id: c.code for c in courses_res.all()}
    attempts = attempts_res.all()
    
    # Organize attempt scores by subject_id and semester timeframe in memory
    subject_scores = {}
    for subject_id, score, started_at in attempts:
        if started_at and started_at.tzinfo:
            started_at = started_at.replace(tzinfo=None)
            
        subject_scores.setdefault(subject_id, {"this_sem": [], "last_sem": []})
        if started_at >= this_sem_cutoff:
            subject_scores[subject_id]["this_sem"].append(score)
        else:
            subject_scores[subject_id]["last_sem"].append(score)
            
    result = []
    for sub in subjects:
        dept = courses_map.get(sub.course_id, "General")
        scores = subject_scores.get(sub.id, {"this_sem": [], "last_sem": []})
        
        this_sem_avg = round(sum(scores["this_sem"]) / len(scores["this_sem"])) if scores["this_sem"] else 0
        last_sem_avg = round(sum(scores["last_sem"]) / len(scores["last_sem"])) if scores["last_sem"] else 0
        
        result.append({
            "subject": sub.name,
            "last_sem": last_sem_avg,
            "this_sem": this_sem_avg,
            "dept": dept
        })
        
    return result

@router.get("/missed-questions")
async def get_missed_questions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    error_rate_expr = (func.sum(case((QuizAnswer.is_correct == False, 1), else_=0)) * 100.0) / func.count(QuizAnswer.id)
    stmt = (
        select(
            Question.id.label("question_id"),
            Question.question_text,
            Question.unit,
            Question.topic,
            Question.difficulty,
            Subject.name.label("subject_name"),
            Course.code.label("course_code"),
            func.count(QuizAnswer.id).label("total_attempts"),
            func.sum(case((QuizAnswer.is_correct == False, 1), else_=0)).label("wrong_attempts"),
            error_rate_expr.label("error_rate")
        )
        .join(QuizAnswer, QuizAnswer.question_id == Question.id)
        .outerjoin(Subject, Subject.id == Question.subject_id)
        .outerjoin(Course, Course.id == Subject.course_id)
        .group_by(Question.id, Subject.name, Course.code)
        .having(func.sum(case((QuizAnswer.is_correct == False, 1), else_=0)) > 0)
        .order_by(error_rate_expr.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    result = []
    for r in rows:
        result.append({
            "id": str(r.question_id),
            "question": r.question_text,
            "subject": r.subject_name or "N/A",
            "unit": r.unit or "N/A",
            "topic": r.topic,
            "department": r.course_code or "MCA",
            "difficulty": r.difficulty.capitalize() if r.difficulty else "Medium",
            "wrong_attempts": r.wrong_attempts,
            "attempts": r.total_attempts,
            "error_rate": round(r.error_rate)
        })
        
    return result

