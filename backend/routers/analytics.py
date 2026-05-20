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
from utils.dependencies import get_current_user, require_student, require_admin
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
    # 1. Total quizzes
    total_quizzes = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.user_id == current_user.id).scalar() or 0
    
    # 2. Average score & Best Score
    avg_score = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.completed_at != None).scalar() or 0
    best_score = db.query(func.max(QuizAttempt.score)).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.completed_at != None).scalar() or 0
    
    # 3. Challenges
    total_challenges = db.query(func.count(ChallengeSubmission.id)).filter(ChallengeSubmission.user_id == current_user.id).scalar() or 0
    challenge_score = db.query(func.sum(ChallengeSubmission.score_earned)).filter(ChallengeSubmission.user_id == current_user.id).scalar() or 0
    
    # 4. Subjects studied breakdown (complex query simplified for demonstration)
    # Get unique subject IDs attempted by user
    attempted_subject_ids = db.query(QuizAttempt.subject_id).filter(QuizAttempt.user_id == current_user.id).distinct().all()
    attempted_subject_ids = [sid[0] for sid in attempted_subject_ids]
    
    subjects_studied = []
    for sid in attempted_subject_ids:
        subject = db.query(Subject).filter(Subject.id == sid).first()
        if subject:
            sub_quiz_count = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.subject_id == sid).scalar() or 0
            sub_avg_score = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.subject_id == sid).scalar() or 0
            sub_last_attempt = db.query(func.max(QuizAttempt.completed_at)).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.subject_id == sid).scalar()
            
            subjects_studied.append({
                "subject_name": subject.name,
                "quiz_count": sub_quiz_count,
                "avg_score": round(sub_avg_score, 1),
                "last_attempted": sub_last_attempt
            })
            
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
    history = db.query(QuizAttempt, Subject.name.label("subject_name"))\
                .join(Subject, QuizAttempt.subject_id == Subject.id)\
                .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.completed_at != None)\
                .order_by(desc(QuizAttempt.completed_at))\
                .limit(20)\
                .all()
                
    # Reverse so it's chronological for charts
    history.reverse()
                
    return [
        {
            "id": h[0].id,
            "date": h[0].completed_at,
            "subject_name": h[1],
            "topic": h[0].topic_filter,
            "score": h[0].score,
            "difficulty_used": h[0].difficulty_used
        }
        for h in history
    ]

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Group by user_id, calculate avg score and count quizzes
    leaderboard_data = db.query(
        QuizAttempt.user_id,
        func.avg(QuizAttempt.score).label("avg_score"),
        func.count(QuizAttempt.id).label("total_quizzes")
    ).filter(QuizAttempt.completed_at != None)\
     .group_by(QuizAttempt.user_id)\
     .order_by(desc("avg_score"))\
     .limit(10)\
     .all()
     
    result = []
    rank = 1
    for item in leaderboard_data:
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            result.append({
                "rank": rank,
                "name": user.name,
                "avg_score": round(item.avg_score, 1),
                "streak_count": user.streak_count,
                "total_quizzes": item.total_quizzes
            })
            rank += 1
            
    return result

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user = Depends(require_admin)):
    total_students = db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    total_notes = db.query(func.count(Note.id)).scalar() or 0
    total_questions = db.query(func.count(Question.id)).scalar() or 0
    total_quiz_attempts = db.query(func.count(QuizAttempt.id)).scalar() or 0
    total_doubts = db.query(func.count(Doubt.id)).scalar() or 0
    total_doubts_resolved = db.query(func.count(Doubt.id)).filter(Doubt.is_resolved == True).scalar() or 0
    total_chat_messages = db.query(func.count(ChatLog.id)).scalar() or 0
    total_challenges = db.query(func.count(ChallengeSubmission.id)).scalar() or 0
    
    subjects_data = []
    subjects = db.query(Subject).all()
    for sub in subjects:
        nc = db.query(func.count(Note.id)).filter(Note.subject_id == sub.id).scalar() or 0
        qc = db.query(func.count(Question.id)).filter(Question.subject_id == sub.id).scalar() or 0
        q_att = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.subject_id == sub.id).scalar() or 0
        subjects_data.append({
            "name": sub.name,
            "notes_count": nc,
            "questions_count": qc,
            "quiz_attempts_count": q_att
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
