from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from models.user import User
from models.quiz_attempt import QuizAttempt
from models.challenge_submission import ChallengeSubmission
from models.subject import Subject
from models.note import Note
from models.question import Question
from models.doubt import Doubt
from models.chat_log import ChatLog
from utils.dependencies import get_current_user, require_student, require_admin, require_role
import uuid

router = APIRouter()

@router.put("/students/update-streak", status_code=status.HTTP_200_OK)
def update_student_streak(db: Session = Depends(get_db), current_user = Depends(require_student)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.streak_count += 1
    db.commit()
    db.refresh(user)
    return {"message": "Streak updated", "streak_count": user.streak_count}

@router.get("/student/overview")
def get_student_overview(db: Session = Depends(get_db), current_user = Depends(require_student)):
    from sqlalchemy import select

    # Combine 5 counts/sums into a single roundtrip select statement
    stmt = select(
        select(func.count(QuizAttempt.id)).filter(QuizAttempt.student_id == current_user.id).scalar_subquery(),
        select(func.avg(QuizAttempt.score)).filter(QuizAttempt.student_id == current_user.id, QuizAttempt.completed_at.isnot(None)).scalar_subquery(),
        select(func.max(QuizAttempt.score)).filter(QuizAttempt.student_id == current_user.id, QuizAttempt.completed_at.isnot(None)).scalar_subquery(),
        select(func.count(ChallengeSubmission.id)).filter(ChallengeSubmission.student_id == current_user.id).scalar_subquery(),
        select(func.sum(ChallengeSubmission.score_earned)).filter(ChallengeSubmission.student_id == current_user.id).scalar_subquery()
    )
    
    result = db.execute(stmt).fetchone()
    
    total_quizzes = result[0] or 0
    avg_score = result[1] or 0
    best_score = result[2] or 0
    total_challenges = result[3] or 0
    challenge_score = result[4] or 0
    
    # 4. Subjects studied breakdown – filtered to student's current semester only
    subjects_studied_query = db.query(
        Subject.name.label("subject_name"),
        func.count(QuizAttempt.id).label("quiz_count"),
        func.avg(QuizAttempt.score).label("avg_score"),
        func.max(QuizAttempt.completed_at).label("last_attempted")
    ).join(Subject, QuizAttempt.subject_id == Subject.id)\
     .filter(
         QuizAttempt.student_id == current_user.id,
         Subject.is_archived == False,
         Subject.semester_number == current_user.current_semester
     )
    if current_user.course_id:
        subjects_studied_query = subjects_studied_query.filter(Subject.course_id == current_user.course_id)
    subjects_studied_data = subjects_studied_query.group_by(Subject.id, Subject.name).all()
    
    subjects_studied = [
        {
            "subject_name": row.subject_name,
            "quiz_count": row.quiz_count,
            "avg_score": round(row.avg_score or 0, 1),
            "last_attempted": row.last_attempted
        }
        for row in subjects_studied_data
    ]
            
    return {
        "total_quizzes": total_quizzes,
        "average_score": round(avg_score, 1),
        "best_score": round(best_score, 1),
        "streak_count": current_user.streak_count,
        "total_challenges_completed": total_challenges,
        "challenge_score": challenge_score,
        "subjects_studied": subjects_studied
    }


@router.get("/student/score-history")
def get_student_score_history(db: Session = Depends(get_db), current_user = Depends(require_student)):
    history_query = db.query(QuizAttempt, Subject.name.label("subject_name"))\
                .join(Subject, QuizAttempt.subject_id == Subject.id)\
                .filter(
                    QuizAttempt.student_id == current_user.id,
                    QuizAttempt.completed_at.isnot(None),
                    Subject.is_archived == False,
                    Subject.semester_number == current_user.current_semester
                )
    if current_user.course_id:
        history_query = history_query.filter(Subject.course_id == current_user.course_id)
    history = history_query.order_by(desc(QuizAttempt.completed_at)).limit(20).all()
                
    # Reverse so it's chronological for charts
    history.reverse()
                
    return [
        {
            "id": h[0].id,
            "date": h[0].completed_at,
            "subject_name": h[1],
            "topic": h[0].topic,
            "score": h[0].score,
            "difficulty_used": h[0].difficulty_used
        }
        for h in history
    ]

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Group by User, calculate avg score and count quizzes
    leaderboard_data = db.query(
        User,
        func.avg(QuizAttempt.score).label("avg_score"),
        func.count(QuizAttempt.id).label("total_quizzes")
    ).join(User, QuizAttempt.student_id == User.id)\
     .filter(QuizAttempt.completed_at.isnot(None))\
     .group_by(User.id)\
     .order_by(desc("avg_score"))\
     .limit(10)\
     .all()
     
    result = []
    rank = 1
    for user, avg_score, total_quizzes in leaderboard_data:
        result.append({
            "rank": rank,
            "name": user.name,
            "avg_score": round(avg_score, 1),
            "streak_count": user.streak_count,
            "total_quizzes": total_quizzes
        })
        rank += 1
            
    return result

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user = Depends(require_admin)):
    from sqlalchemy import select

    # Combine all 9 count queries into a single roundtrip select statement
    stmt = select(
        select(func.count(User.id)).filter(User.role == "student").scalar_subquery(),
        select(func.count(User.id)).filter(User.role == "admin").scalar_subquery(),
        select(func.count(Note.id)).scalar_subquery(),
        select(func.count(Question.id)).scalar_subquery(),
        select(func.count(QuizAttempt.id)).scalar_subquery(),
        select(func.count(Doubt.id)).scalar_subquery(),
        select(func.count(Doubt.id)).filter(Doubt.is_resolved == True).scalar_subquery(),
        select(func.count(ChatLog.id)).scalar_subquery(),
        select(func.count(ChallengeSubmission.id)).scalar_subquery()
    )
    
    result = db.execute(stmt).fetchone()
    
    total_students = result[0] or 0
    total_admins = result[1] or 0
    total_notes = result[2] or 0
    total_questions = result[3] or 0
    total_quiz_attempts = result[4] or 0
    total_doubts = result[5] or 0
    total_doubts_resolved = result[6] or 0
    total_chat_messages = result[7] or 0
    total_challenges = result[8] or 0
    
    # Consolidated queries to avoid N+1 loop overhead
    notes_counts = dict(db.query(Note.subject_id, func.count(Note.id)).group_by(Note.subject_id).all())
    questions_counts = dict(db.query(Question.subject_id, func.count(Question.id)).group_by(Question.subject_id).all())
    quiz_attempts_counts = dict(db.query(QuizAttempt.subject_id, func.count(QuizAttempt.id)).group_by(QuizAttempt.subject_id).all())

    subjects_data = []
    subjects = db.query(Subject).filter(Subject.is_archived == False).all()
    for sub in subjects:
        subjects_data.append({
            "name": sub.name,
            "notes_count": notes_counts.get(sub.id, 0),
            "questions_count": questions_counts.get(sub.id, 0),
            "quiz_attempts_count": quiz_attempts_counts.get(sub.id, 0)
        })
        
    return {
        "total_students": total_students,
        "total_admins": total_admins,
        "total_notes": total_notes,
        "total_questions_generated": total_questions,
        "total_quiz_attempts": total_quiz_attempts,
        "total_doubts": total_doubts,
        "total_doubts_resolved": total_doubts_resolved,
        "total_chat_messages": total_chat_messages,
        "total_challenge_submissions": total_challenges,
        "subjects": subjects_data
    }


@router.get("/faculty/analytics")
def get_faculty_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("faculty"))
):
    from models.faculty_subject_assignment import FacultySubjectAssignment
    from models.subject import Subject
    from models.user import User
    from models.quiz_attempt import QuizAttempt
    from models.quiz_answer import QuizAnswer
    from models.question import Question
    from models.ai_answer_report import AIAnswerReport
    from models.semester import Semester
    from sqlalchemy import or_, distinct, case, func, text
    from datetime import date, timedelta, datetime

    # Get all subjects assigned to the logged-in faculty
    assigned_assignments = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.faculty_id == current_user.id
    ).all()
    subject_ids = [a.subject_id for a in assigned_assignments]
    
    if not subject_ids:
        return {
            "avgQuizScore": None,
            "avgAttendance": None,
            "recentPerformance": []
        }

    # Query assigned subjects that belong to active semesters (current academic session)
    assigned_subjects = db.query(Subject).join(
        Semester, Subject.semester_id == Semester.id
    ).filter(
        Subject.id.in_(subject_ids),
        Subject.is_archived == False,
        Semester.is_active == True
    ).all()

    if not assigned_subjects:
        return {
            "avgQuizScore": None,
            "avgAttendance": None,
            "recentPerformance": []
        }

    active_subject_ids = [s.id for s in assigned_subjects]

    # 1. Average Quiz Score (SUM(obtained_marks) / SUM(maximum_marks) * 100 for submitted attempts and active students)
    score_query = db.query(
        func.sum(QuizAttempt.correct_count).label("obtained"),
        func.sum(QuizAttempt.total_questions).label("total")
    ).join(
        Subject, QuizAttempt.subject_id == Subject.id
    ).join(
        Semester, Subject.semester_id == Semester.id
    ).join(
        User, QuizAttempt.student_id == User.id
    ).filter(
        QuizAttempt.subject_id.in_(active_subject_ids),
        QuizAttempt.completed_at.isnot(None),
        Semester.is_active == True,
        User.role == "student",
        User.is_active == True,
        User.status == "approved"
    ).first()

    avg_quiz_score = None
    if score_query and score_query.total and score_query.total > 0:
        obtained = score_query.obtained or 0
        total = score_query.total
        avg_quiz_score = round((obtained / total) * 100, 1)

    # 2. Average Attendance
    attendance_stmt = text("""
        SELECT 
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
            COUNT(*) as total
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        JOIN semesters sem ON s.semester_id = sem.id
        JOIN users u ON a.student_id = u.id
        WHERE a.subject_id IN :subject_ids
          AND sem.is_active = True
          AND u.role = 'student'
          AND u.is_active = True
          AND u.status = 'approved'
    """)
    attendance_res = db.execute(attendance_stmt, {"subject_ids": tuple(active_subject_ids)}).first()
    avg_attendance = None
    if attendance_res and attendance_res.total and attendance_res.total > 0:
        present_count = attendance_res.present or 0
        total_count = attendance_res.total
        avg_attendance = round((present_count / total_count) * 100, 1)

    # 3. Recent Quiz Concept Performance (Grouped question performance filtered by assigned subjects and active records)
    query_results = db.query(
        Subject.name.label("subject_name"),
        Subject.semester_number.label("semester"),
        Question.topic.label("topic"),
        Question.question_text.label("concept"),
        func.count(QuizAnswer.id).label("total_responses"),
        func.sum(case((QuizAnswer.is_correct == False, 1), else_=0)).label("incorrect_responses"),
        func.max(QuizAnswer.created_at).label("latest_response_time")
    ).join(
        Question, QuizAnswer.question_id == Question.id
    ).join(
        QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id
    ).join(
        Subject, QuizAttempt.subject_id == Subject.id
    ).join(
        Semester, Subject.semester_id == Semester.id
    ).join(
        User, QuizAttempt.student_id == User.id
    ).filter(
        QuizAttempt.subject_id.in_(active_subject_ids),
        Semester.is_active == True,
        User.role == "student",
        User.is_active == True,
        User.status == "approved"
    ).group_by(
        Subject.id, Subject.name, Subject.semester_number, Question.topic, Question.question_text
    ).all()

    recent_performance = []
    for row in query_results:
        total = row.total_responses or 0
        incorrect = row.incorrect_responses or 0
        error_pct = round((incorrect / total * 100), 1) if total > 0 else 0.0
        recent_performance.append({
            "subject": row.subject_name,
            "semester": f"Semester {row.semester}" if row.semester else "N/A",
            "topic": row.topic,
            "concept": row.concept,
            "incorrect_responses": incorrect,
            "error_percentage": error_pct,
            "latest_time": row.latest_response_time.isoformat() if row.latest_response_time else None
        })

    # Sort by: error_percentage DESC, then latest_time DESC
    recent_performance.sort(key=lambda x: (-x["error_percentage"], x["latest_time"] or ""))

    return {
        "avgQuizScore": avg_quiz_score,
        "avgAttendance": avg_attendance,
        "recentPerformance": recent_performance
    }
