import uuid
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case, distinct, Date

from database import get_db
from models import (
    User, Subject, QuizAttempt, QuizAnswer, Doubt, ChatLog,
    DailyChallenge, ChallengeSubmission, FacultySubjectAssignment,
    Question, StudentEnrollment, Note, Course
)
from utils.dependencies import require_hod_or_admin

router = APIRouter(prefix="/api/v1/dept-analytics", tags=["Department Analytics"])

@router.get("/summary")
def get_department_analytics_summary(db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    # 1. Calculate Department Health Score
    quiz_stats = db.query(
        func.count(QuizAnswer.id).label("total"),
        func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
    ).first()
    quiz_acc = 0.0
    if quiz_stats and quiz_stats.total and quiz_stats.total > 0:
        quiz_acc = (quiz_stats.correct / quiz_stats.total) * 100
        
    # Daily Challenge completion
    total_students = db.query(User).filter(User.role == "student", User.is_active == True).count()
    total_challenges = db.query(DailyChallenge).count()
    challenge_submissions = db.query(ChallengeSubmission).count()
    
    challenge_rate = 0.0
    if total_students > 0 and total_challenges > 0:
        max_possible_submissions = total_students * total_challenges
        challenge_rate = (challenge_submissions / max_possible_submissions) * 100
        
    # Resolved doubts percentage
    total_doubts = db.query(Doubt).count()
    resolved_doubts = db.query(Doubt).filter(Doubt.is_resolved == True).count()
    resolved_rate = 0.0
    if total_doubts > 0:
        resolved_rate = (resolved_doubts / total_doubts) * 100
        
    health_score = int(0.4 * quiz_acc + 0.3 * challenge_rate + 0.3 * resolved_rate)
    health_score = max(0, min(100, health_score))

    # 2. High-level AI Usage Metrics
    chatting_students = db.query(distinct(ChatLog.student_id)).count()
    ai_adoption_rate = (chatting_students / total_students * 100) if total_students > 0 else 0.0
    total_queries = db.query(ChatLog).count()
    
    # AI usage trend (last 7 days query count)
    today = date.today()
    ai_queries_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = db.query(ChatLog).filter(func.cast(ChatLog.created_at, Date) == day).count()
        ai_queries_trend.append({
            "date": day.strftime("%a"),
            "queries": count
        })

    # 3. Faculty Effectiveness Indexes
    faculties = db.query(User).filter(User.role == "faculty", User.is_active == True).all()
    faculty_effectiveness = []
    for fac in faculties:
        subjects_assigned = db.query(FacultySubjectAssignment).filter(FacultySubjectAssignment.faculty_id == fac.id).count()
        
        fac_subject_ids = [a.subject_id for a in db.query(FacultySubjectAssignment.subject_id).filter(FacultySubjectAssignment.faculty_id == fac.id).all()]
        
        fac_quiz_stats = db.query(
            func.count(QuizAnswer.id).label("total"),
            func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
        ).join(
            QuizAttempt, QuizAttempt.id == QuizAnswer.attempt_id
        ).filter(
            QuizAttempt.subject_id.in_(fac_subject_ids)
        ).first() if fac_subject_ids else None
        
        eff_index = 0.0
        if fac_quiz_stats and fac_quiz_stats.total and fac_quiz_stats.total > 0:
            eff_index = (fac_quiz_stats.correct / fac_quiz_stats.total) * 100
            
        faculty_effectiveness.append({
            "id": str(fac.id),
            "name": fac.name,
            "email": fac.email,
            "assigned_subjects_count": subjects_assigned,
            "effectiveness_index": round(eff_index, 1)
        })

    # 4. Subject Difficulty Rankings
    subjects = db.query(Subject).filter(Subject.is_archived == False).all()
    subject_difficulty = []
    intervention_recommendations = []
    
    for sub in subjects:
        sub_quiz_stats = db.query(
            func.count(QuizAnswer.id).label("total"),
            func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
        ).join(
            QuizAttempt, QuizAttempt.id == QuizAnswer.attempt_id
        ).filter(
            QuizAttempt.subject_id == sub.id
        ).first()
        
        avg_acc = 0.0
        if sub_quiz_stats and sub_quiz_stats.total and sub_quiz_stats.total > 0:
            avg_acc = (sub_quiz_stats.correct / sub_quiz_stats.total) * 100
            
        if avg_acc < 55.0:
            tier = "Hard"
            intervention_recommendations.append({
                "subject_id": str(sub.id),
                "subject_name": sub.name,
                "reason": f"Average quiz performance is low ({avg_acc:.1f}%)",
                "action": "Schedule a remedial session or release additional study notes."
            })
        elif avg_acc < 75.0:
            tier = "Medium"
        else:
            tier = "Easy"
            
        subject_difficulty.append({
            "subject_id": str(sub.id),
            "subject_code": sub.code,
            "subject_name": sub.name,
            "avg_accuracy": round(avg_acc, 1),
            "difficulty_tier": tier
        })
        
    subject_difficulty.sort(key=lambda x: x["avg_accuracy"])

    # 5. Course (Department) Summaries
    courses = db.query(Course).all()
    dept_summary = []
    for c in courses:
        students_q = db.query(User).join(StudentEnrollment, StudentEnrollment.student_id == User.id)\
            .filter(StudentEnrollment.course_id == c.id, User.role == "student", User.is_active == True)
        students_count = students_q.count()
        
        avg_score_val = db.query(func.avg(QuizAttempt.score))\
            .join(User, User.id == QuizAttempt.student_id)\
            .join(StudentEnrollment, StudentEnrollment.student_id == User.id)\
            .filter(StudentEnrollment.course_id == c.id).scalar()
        avg_score = round(float(avg_score_val)) if avg_score_val else 0
        
        at_risk_count = 0
        student_users = students_q.all()
        for stu in student_users:
            stu_avg = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.student_id == stu.id).scalar()
            if stu_avg and stu_avg < 50:
                at_risk_count += 1
                
        active_7d = 0
        cutoff = date.today() - timedelta(days=7)
        for stu in student_users:
            if stu.last_active_date and stu.last_active_date >= cutoff:
                active_7d += 1
        engagement = round((active_7d / students_count * 100)) if students_count > 0 else 0
        
        dept_summary.append({
            "dept": c.code,
            "students": students_count,
            "avg_score": avg_score,
            "engagement": engagement,
            "at_risk": at_risk_count
        })

    # 6. Score Trend
    score_trend = []
    for w in range(7, -1, -1):
        week_start = datetime.utcnow() - timedelta(weeks=w+1)
        week_end = datetime.utcnow() - timedelta(weeks=w)
        
        week_row = {"week": f"Wk {8-w}"}
        for c in courses:
            score_val = db.query(func.avg(QuizAttempt.score))\
                .join(User, User.id == QuizAttempt.student_id)\
                .join(StudentEnrollment, StudentEnrollment.student_id == User.id)\
                .filter(
                    StudentEnrollment.course_id == c.id,
                    QuizAttempt.started_at >= week_start,
                    QuizAttempt.started_at < week_end
                ).scalar()
            week_row[c.code] = round(float(score_val)) if score_val else 0
            
        score_trend.append(week_row)

    return {
        "department_health_score": health_score,
        "ai_usage": {
            "adoption_rate": round(ai_adoption_rate, 1),
            "total_queries": total_queries,
            "queries_trend": ai_queries_trend
        },
        "faculty_effectiveness": faculty_effectiveness,
        "subject_difficulty": subject_difficulty,
        "intervention_recommendations": intervention_recommendations,
        "dept_summary": dept_summary,
        "score_trend": score_trend
    }

@router.get("/heatmap")
def get_department_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Returns unit-wise accuracy heatmap data grouped by course code (department).
    Matches HEATMAP_DATA structure.
    """
    subjects = db.query(Subject).filter(Subject.is_archived == False).all()
    
    result = {}
    for sub in subjects:
        course_code = sub.course.code if sub.course else "General"
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
        
        for u in range(1, 6):
            stats = db.query(
                func.count(QuizAnswer.id).label("total"),
                func.sum(case((QuizAnswer.is_correct == True, 1), else_=0)).label("correct")
            ).join(
                Question, Question.id == QuizAnswer.question_id
            ).join(
                QuizAttempt, QuizAttempt.id == QuizAnswer.attempt_id
            ).filter(
                QuizAttempt.subject_id == sub.id,
                Question.unit.ilike(f"%Unit {u}%")
            ).first()
            
            total = stats.total or 0
            correct = stats.correct or 0
            
            if total > 0:
                row[f"u{u}"] = int(round((correct / total) * 100))
                
        result[course_code].append(row)
        
    return result

@router.get("/student-progress")
def get_student_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Returns progress analytics for all students:
    Average score, score change/improvement, and number of quizzes taken.
    """
    students = db.query(User).filter(User.role == "student", User.is_active == True).all()
    
    result = []
    for s in students:
        enr = db.query(StudentEnrollment).filter(StudentEnrollment.student_id == s.id).first()
        dept = enr.course.code if (enr and enr.course) else (s.branch or "MCA")
        sem = f"Sem {enr.semester.semester_number}" if (enr and enr.semester) else f"Sem {s.current_semester}"
        
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == s.id,
            QuizAttempt.score.isnot(None)
        ).order_by(QuizAttempt.started_at.asc()).all()
        
        quizzes_count = len(attempts)
        avg_score = 0
        change = 0
        
        if quizzes_count > 0:
            scores = [att.score for att in attempts]
            avg_score = round(sum(scores) / quizzes_count)
            
            if quizzes_count > 1:
                change = round(scores[-1] - scores[0])
            else:
                change = 0
                
        status = "good" if avg_score >= 75 else ("average" if avg_score >= 50 else "at_risk")
        
        result.append({
            "id": str(s.id),
            "name": s.name,
            "enrollment": enr.enrollment_number if enr else (s.enrollment_no or "N/A"),
            "dept": dept,
            "sem": sem,
            "avg_score": avg_score,
            "change": change,
            "quizzes": quizzes_count,
            "status": status
        })
        
    return result

@router.get("/faculty-performance")
def get_faculty_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Returns performance effectiveness and workload analytics for all faculty members.
    """
    faculty_users = db.query(User).filter(User.role == "faculty", User.is_active == True).all()
    
    result = []
    for f in faculty_users:
        assignments = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.faculty_id == f.id
        ).all()
        
        subject_names = [a.subject.name for a in assignments if a.subject]
        subject_ids = [a.subject_id for a in assignments if a.subject]
        
        course_ids = [a.subject.course_id for a in assignments if a.subject and a.subject.course_id]
        students_count = 0
        if course_ids:
            students_count = db.query(StudentEnrollment).filter(
                StudentEnrollment.course_id.in_(course_ids)
            ).count()
            
        avg_score = 0
        if subject_ids:
            scores = db.query(QuizAttempt.score).filter(
                QuizAttempt.subject_id.in_(subject_ids),
                QuizAttempt.score.isnot(None)
            ).all()
            if scores:
                avg_score = round(sum(s[0] for s in scores) / len(scores))
                
        notes_count = db.query(Note).filter(Note.uploaded_by == f.id).count()
        
        doubt_resolution = 0
        if subject_ids:
            total_doubts = db.query(Doubt).filter(Doubt.subject_id.in_(subject_ids)).count()
            if total_doubts > 0:
                resolved_doubts = db.query(Doubt).filter(
                    Doubt.subject_id.in_(subject_ids),
                    Doubt.is_resolved == True
                ).count()
                doubt_resolution = round((resolved_doubts / total_doubts) * 100)
                
        result.append({
            "id": str(f.id),
            "name": f.name,
            "dept": f.branch or "MCA",
            "subjects": subject_names,
            "students": students_count,
            "avg_score": avg_score,
            "notes": notes_count,
            "doubt_resolution": doubt_resolution
        })
        
    return result

@router.get("/comparative")
def get_comparative_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Comparative analytics of average quiz score between this semester and last semester per subject.
    """
    subjects = db.query(Subject).filter(Subject.is_archived == False).all()
    
    this_sem_cutoff = datetime.utcnow() - timedelta(days=120)
    last_sem_cutoff = datetime.utcnow() - timedelta(days=240)
    
    result = []
    for sub in subjects:
        dept = sub.course.code if sub.course else "General"
        
        this_sem_scores = db.query(QuizAttempt.score).filter(
            QuizAttempt.subject_id == sub.id,
            QuizAttempt.started_at >= this_sem_cutoff,
            QuizAttempt.score.isnot(None)
        ).all()
        
        last_sem_scores = db.query(QuizAttempt.score).filter(
            QuizAttempt.subject_id == sub.id,
            QuizAttempt.started_at >= last_sem_cutoff,
            QuizAttempt.started_at < this_sem_cutoff,
            QuizAttempt.score.isnot(None)
        ).all()
        
        this_sem_avg = round(sum(s[0] for s in this_sem_scores) / len(this_sem_scores)) if this_sem_scores else 0
        last_sem_avg = round(sum(s[0] for s in last_sem_scores) / len(last_sem_scores)) if last_sem_scores else 0
        
        result.append({
            "subject": sub.name,
            "last_sem": last_sem_avg,
            "this_sem": this_sem_avg,
            "dept": dept
        })
        
    return result

@router.get("/missed-questions")
def get_missed_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Returns the list of frequently incorrect questions.
    """
    rows = db.query(
        QuizAnswer.question_id,
        func.count(QuizAnswer.id).label("total_attempts"),
        func.sum(case((QuizAnswer.is_correct == False, 1), else_=0)).label("wrong_attempts")
    ).group_by(QuizAnswer.question_id).all()
    
    result = []
    for r in rows:
        if r.total_attempts == 0:
            continue
            
        error_rate = round((r.wrong_attempts / r.total_attempts) * 100)
        
        if r.wrong_attempts > 0:
            q_obj = db.query(Question).filter(Question.id == r.question_id).first()
            if q_obj:
                dept = q_obj.subject.course.code if (q_obj.subject and q_obj.subject.course) else "MCA"
                result.append({
                    "id": str(q_obj.id),
                    "question": q_obj.question_text,
                    "subject": q_obj.subject.name if q_obj.subject else "N/A",
                    "unit": q_obj.unit or "N/A",
                    "topic": q_obj.topic,
                    "department": dept,
                    "difficulty": q_obj.difficulty.capitalize() if q_obj.difficulty else "Medium",
                    "wrong_attempts": r.wrong_attempts,
                    "attempts": r.total_attempts,
                    "error_rate": error_rate
                })
                
    result.sort(key=lambda x: x["error_rate"], reverse=True)
    return result[:20]
