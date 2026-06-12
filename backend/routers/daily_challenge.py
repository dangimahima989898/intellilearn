from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, extract, cast, Integer
from typing import List, Optional
import uuid
import json
import re
from datetime import date, datetime

from database import get_db
from models.daily_challenge import DailyChallenge
from models.challenge_submission import ChallengeSubmission
from models.subject import Subject
from models.user import User
from utils.dependencies import require_student, get_current_user
from utils.llm_client import get_llm_response
from schemas.daily_challenge import (
    DailyChallengeResponse, DailyChallengeOut, ChallengeSubmissionOut,
    ChallengeSubmitRequest, ChallengeSubmitResponse, LeaderboardEntry,
    ChallengeHistoryItem
)

router = APIRouter(prefix="/daily-challenge", tags=["Daily Challenge"])

DAILY_CHALLENGE_PROMPT = """Generate ONE challenging multiple choice question suitable as a daily challenge for MCA students.
Choose a random subject from: DSA, DBMS, OS, CN, Java, Python.
The question should be HARD difficulty and thought-provoking.

Return ONLY a valid JSON object (no markdown):
{
  "subject": "DSA",
  "topic": "Specific topic name",
  "question": "The full question text?",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_answer": "b",
  "explanation": "Detailed explanation of the correct answer (3-4 sentences)"
}"""

@router.get("/today", response_model=DailyChallengeResponse)
async def get_today_challenge(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    today = date.today()
    
    # 1. Check if DailyChallenge exists for today's date
    challenge = db.query(DailyChallenge).filter(DailyChallenge.challenge_date == today).first()
    
    # 2. If NOT: generate one via LLM
    if not challenge:
        try:
            raw_response = await get_llm_response(
                messages=[{"role": "user", "content": "Generate today's challenge question."}],
                system_prompt=DAILY_CHALLENGE_PROMPT,
                max_tokens=2000
            )
            # Parse JSON
            cleaned_res = raw_response.strip()
            if cleaned_res.startswith("```"):
                cleaned_res = re.sub(r"^```(?:json)?", "", cleaned_res, flags=re.IGNORECASE)
                cleaned_res = re.sub(r"```$", "", cleaned_res).strip()
            
            start_idx = cleaned_res.find("{")
            end_idx = cleaned_res.rfind("}")
            if start_idx != -1 and end_idx != -1:
                cleaned_res = cleaned_res[start_idx:end_idx+1]
            
            data = json.loads(cleaned_res)
            
            # Find subject_id if possible (optional based on model)
            sub_name = data.get("subject", "General")
            subject = db.query(Subject).filter(func.lower(Subject.code) == sub_name.lower()).first()
            
            challenge = DailyChallenge(
                id=uuid.uuid4(),
                subject_id=subject.id if subject else None,
                question_text=data["question"],
                option_a=data["option_a"],
                option_b=data["option_b"],
                option_c=data["option_c"],
                option_d=data["option_d"],
                correct_answer=data["correct_answer"].lower(),
                explanation=data["explanation"],
                challenge_date=today
            )
            db.add(challenge)
            db.commit()
            db.refresh(challenge)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to generate challenge: {str(e)}")

    # 3. Check if current student has already submitted today
    submission = db.query(ChallengeSubmission).filter(
        ChallengeSubmission.challenge_id == challenge.id,
        ChallengeSubmission.student_id == current_user.id
    ).first()

    already_submitted = submission is not None
    
    # 4. Return results
    if already_submitted:
        challenge_out = DailyChallengeOut(
            id=challenge.id,
            subject=challenge.subject_id and db.query(Subject).get(challenge.subject_id).name or "General",
            topic="Daily Challenge",
            question=challenge.question_text,
            option_a=challenge.option_a,
            option_b=challenge.option_b,
            option_c=challenge.option_c,
            option_d=challenge.option_d,
            correct_answer=challenge.correct_answer,
            explanation=challenge.explanation,
            challenge_date=challenge.challenge_date
        )
        sub_out = ChallengeSubmissionOut(
            selected_answer=submission.selected_answer,
            is_correct=submission.is_correct,
            score_earned=submission.score_earned,
            submitted_at=submission.submitted_at
        )
    else:
        challenge_out = DailyChallengeOut(
            id=challenge.id,
            subject=challenge.subject_id and db.query(Subject).get(challenge.subject_id).name or "General",
            topic="Daily Challenge",
            question=challenge.question_text,
            option_a=challenge.option_a,
            option_b=challenge.option_b,
            option_c=challenge.option_c,
            option_d=challenge.option_d,
            correct_answer=None, # Hide it
            explanation=None, # Hide it
            challenge_date=challenge.challenge_date
        )
        sub_out = None

    return DailyChallengeResponse(
        challenge=challenge_out,
        already_submitted=already_submitted,
        submission=sub_out
    )

@router.post("/submit", response_model=ChallengeSubmitResponse)
def submit_challenge(
    req: ChallengeSubmitRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # 1. & 2. Check uniqueness
    existing = db.query(ChallengeSubmission).filter(
        ChallengeSubmission.challenge_id == req.challenge_id,
        ChallengeSubmission.student_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already completed today's challenge")

    # 3. Get challenge
    challenge = db.query(DailyChallenge).filter(DailyChallenge.id == req.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # 4. & 5. Scoring
    is_correct = (req.selected_answer.lower() == challenge.correct_answer.lower())
    score_earned = 10 if is_correct else 3

    # 6. Create record
    submission = ChallengeSubmission(
        id=uuid.uuid4(),
        challenge_id=challenge.id,
        student_id=current_user.id,
        selected_answer=req.selected_answer.lower(),
        is_correct=is_correct,
        score_earned=score_earned
    )
    db.add(submission)
    db.commit()

    message = "Correct! 🎉" if is_correct else "Not quite. Here's why..."
    
    return ChallengeSubmitResponse(
        is_correct=is_correct,
        correct_answer=challenge.correct_answer,
        explanation=challenge.explanation,
        score_earned=score_earned,
        message=message
    )

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    now = datetime.now()
    # Query top 10 students by SUM(score_earned) in current month
    results = db.query(
        User.name,
        func.sum(ChallengeSubmission.score_earned).label("total_score"),
        func.count(ChallengeSubmission.id).label("attempt_count"),
        func.sum(cast(ChallengeSubmission.is_correct, Integer)).label("correct_count")
    ).join(ChallengeSubmission, User.id == ChallengeSubmission.student_id)\
     .filter(extract('month', ChallengeSubmission.submitted_at) == now.month)\
     .filter(extract('year', ChallengeSubmission.submitted_at) == now.year)\
     .group_by(User.id)\
     .order_by(desc("total_score"))\
     .limit(10).all()

    leaderboard = []
    for i, (name, total, attempts, correct) in enumerate(results):
        leaderboard.append(LeaderboardEntry(
            rank=i+1,
            name=name,
            total_score=total,
            correct_count=correct or 0,
            attempt_count=attempts,
            accuracy_rate=(correct / attempts * 100) if attempts > 0 else 0
        ))
    return leaderboard

@router.get("/my-history", response_model=List[ChallengeHistoryItem])
def get_my_history(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # Last 30 submissions (approx 30 days)
    submissions = db.query(ChallengeSubmission, DailyChallenge).join(
        DailyChallenge, ChallengeSubmission.challenge_id == DailyChallenge.id
    ).filter(
        ChallengeSubmission.student_id == current_user.id
    ).order_by(desc(DailyChallenge.challenge_date)).limit(30).all()

    history = []
    for sub, chal in submissions:
        # Get subject name
        sub_name = "General"
        if chal.subject_id:
            subject = db.query(Subject).get(chal.subject_id)
            if subject: sub_name = subject.name

        history.append(ChallengeHistoryItem(
            challenge_date=chal.challenge_date,
            subject=sub_name,
            topic="Daily Challenge",
            is_correct=sub.is_correct,
            score_earned=sub.score_earned,
            selected_answer=sub.selected_answer,
            correct_answer=chal.correct_answer
        ))
    return history
