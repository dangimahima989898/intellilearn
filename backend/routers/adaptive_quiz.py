from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Integer
from typing import List, Tuple
import uuid
import json
import re
from datetime import datetime

from database import get_db
from models.question import Question
from models.subject import Subject
from models.quiz_attempt import QuizAttempt
from models.quiz_answer import QuizAnswer
from utils.dependencies import require_student
from utils.llm_client import get_llm_response
from schemas.adaptive_quiz import (
    QuizStartRequest, QuizStartResponse, QuizSubmitRequest, 
    QuizSubmitResponse, WeakChapter, QuestionResult, AnswerSubmit, QuizHistoryItem
)
from schemas.question import QuestionOut

router = APIRouter(prefix="/adaptive-quiz", tags=["Adaptive Quiz"])

QUESTION_GENERATION_PROMPT = """Generate exactly {count} multiple choice questions about the topic "{topic}" within the subject "{subject_name}" for MCA (Master of Computer Applications) university students.

Difficulty: {difficulty}
- EASY: Basic definitions, simple concepts, straightforward recall questions
- MEDIUM: Application-based questions, moderate analysis, comparing concepts
- HARD: Complex analysis, edge cases, tricky variations, advanced implementation details

For each question, you MUST provide all 4 options and exactly one correct answer.

Return ONLY a valid JSON array. No markdown code blocks. No explanation. No preamble.
The response must start with [ and end with ].

JSON structure:
[
  {{
    "question": "The full question text here?",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "a",
    "explanation": "Brief explanation of why this answer is correct (2-3 sentences)"
  }}
]
"""

def determine_difficulty(student_id: uuid.UUID, subject_id: uuid.UUID, db: Session) -> Tuple[str, str]:
    # 1. Query last 5 QuizAttempts for this student + subject where completed_at is not null
    history = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.subject_id == subject_id,
        QuizAttempt.completed_at.isnot(None)
    ).order_by(desc(QuizAttempt.completed_at)).limit(5).all()

    # 2. If no history → return ("easy", "First quiz on this subject — starting with Easy level!")
    if not history:
        return "easy", "First quiz on this subject — starting with Easy level!"

    # 3. Calculate avg_score = average of those attempts' score
    avg_score = sum(h.score for h in history) / len(history)

    # 4. If avg_score >= 75 → return ("hard", ...)
    if avg_score >= 75:
        return "hard", f"Your recent average is {avg_score:.0f}% — Moving to Hard level!"
    # 5. If avg_score >= 50 → return ("medium", ...)
    elif avg_score >= 50:
        return "medium", f"Your recent average is {avg_score:.0f}% — Keeping at Medium level"
    # 6. Else → return ("easy", ...)
    else:
        return "easy", f"Your recent average is {avg_score:.0f}% — Let's practice with Easy level first"

def detect_weak_chapters(student_id: uuid.UUID, subject_id: uuid.UUID, db: Session) -> List[WeakChapter]:
    # 1. Get all QuizAnswers for this student + subject (join through QuizAttempt)
    # 2. Group by the topic of the related QuizAttempt
    query = db.query(
        QuizAttempt.topic,
        Subject.name.label("subject_name"),
        func.count(QuizAnswer.id).label("total"),
        func.sum(cast(QuizAnswer.is_correct, Integer)).label("correct")
    ).join(QuizAnswer, QuizAttempt.id == QuizAnswer.attempt_id)\
     .join(Subject, QuizAttempt.subject_id == Subject.id)\
     .filter(QuizAttempt.student_id == student_id, Subject.is_archived == False)
    
    if subject_id:
        query = query.filter(QuizAttempt.subject_id == subject_id)
        
    results = query.group_by(QuizAttempt.topic, Subject.name).all()

    weak = []
    for topic, sub_name, total, correct in results:
        if total >= 5:
            correct_rate = correct / total
            if correct_rate < 0.5:
                weak.append(WeakChapter(
                    subject=sub_name,
                    topic=topic,
                    correct_rate=correct_rate,
                    attempts=total
                ))
    
    # Sort by correct_rate ascending (weakest first)
    weak.sort(key=lambda x: x.correct_rate)
    return weak

@router.post("/start", response_model=QuizStartResponse)
async def start_adaptive_quiz(
    req: QuizStartRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # 1. Find subject by ID
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 2. Determine difficulty
    difficulty, reason = determine_difficulty(current_user.id, subject.id, db)

    # 3. Generate 10 questions via LLM
    prompt = QUESTION_GENERATION_PROMPT.format(
        count=10,
        topic=req.topic,
        subject_name=subject.name,
        difficulty=difficulty.upper()
    )

    try:
        raw_response = await get_llm_response(
            messages=[{"role": "user", "content": "Generate the JSON array of questions now."}],
            system_prompt=prompt,
            max_tokens=3000
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM generation failed: {str(e)}")

    # Parse JSON
    cleaned_res = raw_response.strip()
    if cleaned_res.startswith("```"):
        cleaned_res = re.sub(r"^```(?:json)?", "", cleaned_res, flags=re.IGNORECASE)
        cleaned_res = re.sub(r"```$", "", cleaned_res).strip()
    
    start_idx = cleaned_res.find("[")
    end_idx = cleaned_res.rfind("]")
    if start_idx != -1 and end_idx != -1:
        cleaned_res = cleaned_res[start_idx:end_idx+1]
        
    try:
        questions_list = json.loads(cleaned_res)
    except:
        raise HTTPException(status_code=502, detail="Failed to parse AI response")

    # 4. Save each generated question to DB
    saved_questions_out = []
    question_ids = []
    for item in questions_list:
        q_text = item.get("question") or item.get("question_text")
        opt_a = item.get("option_a")
        opt_b = item.get("option_b")
        opt_c = item.get("option_c")
        opt_d = item.get("option_d")
        corr = item.get("correct_answer", "a").lower().strip()
        expl = item.get("explanation")
        
        if not q_text or not opt_a or not opt_b or not opt_c or not opt_d:
            continue

        if corr not in ["a", "b", "c", "d"]:
            match = re.search(r"\b([a-d])\b", corr)
            corr = match.group(1) if match else "a"

        new_q = Question(
            id=uuid.uuid4(),
            subject_id=subject.id,
            topic=req.topic,
            question_text=q_text,
            option_a=opt_a,
            option_b=opt_b,
            option_c=opt_c,
            option_d=opt_d,
            correct_answer=corr,
            explanation=expl,
            difficulty=difficulty,
            generated_by_ai=True
        )
        db.add(new_q)
        question_ids.append(new_q.id)
        
        # Add to output list (WITHOUT correct_answer or explanation)
        saved_questions_out.append(QuestionOut(
            id=new_q.id,
            subject_id=subject.id,
            subject_name=subject.name,
            topic=req.topic,
            difficulty=difficulty,
            question_text=q_text,
            option_a=opt_a,
            option_b=opt_b,
            option_c=opt_c,
            option_d=opt_d,
            correct_answer="", # Hide it
            explanation=None, # Hide it
            created_at=datetime.utcnow()
        ))
    
    db.commit()

    # 5. Create QuizAttempt record
    attempt = QuizAttempt(
        id=uuid.uuid4(),
        student_id=current_user.id,
        subject_id=subject.id,
        topic=req.topic,
        difficulty_used=difficulty,
        started_at=datetime.utcnow(),
        total_questions=len(saved_questions_out)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # 6. Return QuizStartResponse
    return QuizStartResponse(
        attempt_id=attempt.id,
        questions=saved_questions_out,
        difficulty_used=difficulty,
        topic=req.topic,
        subject_name=subject.name,
        reason=reason
    )

@router.post("/submit", response_model=QuizSubmitResponse)
def submit_adaptive_quiz(
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # 1. Get QuizAttempt by attempt_id
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == req.attempt_id,
        QuizAttempt.student_id == current_user.id,
        QuizAttempt.completed_at.is_(None)
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Active quiz attempt not found")

    correct_count = 0
    per_question_results = []
    
    # 2. For each answer in request
    for ans in req.answers:
        # a. Get Question from DB
        question = db.query(Question).filter(Question.id == ans.question_id).first()
        if not question:
            continue
        
        # b. Compare selected_answer with question.correct_answer
        is_correct = (ans.selected_answer.lower() == question.correct_answer.lower())
        if is_correct:
            correct_count += 1
            
        # c. Create QuizAnswer record
        db_answer = QuizAnswer(
            id=uuid.uuid4(),
            attempt_id=attempt.id,
            question_id=question.id,
            selected_answer=ans.selected_answer.lower(),
            is_correct=is_correct,
            time_taken_seconds=ans.time_taken_seconds
        )
        db.add(db_answer)
        
        per_question_results.append(QuestionResult(
            question_id=question.id,
            correct_answer=question.correct_answer,
            selected_answer=ans.selected_answer,
            is_correct=is_correct,
            explanation=question.explanation
        ))

    # 3. Calculate score
    total = len(per_question_results)
    score = (correct_count / total * 100) if total > 0 else 0

    # 4. Update QuizAttempt
    attempt.completed_at = datetime.utcnow()
    attempt.score = score
    attempt.correct_count = correct_count
    db.commit()

    # 5. Detect weak chapters
    weak_chapters = detect_weak_chapters(current_user.id, attempt.subject_id, db)

    # 6. Build recommendation string
    recommendation = "Great job! Keep practicing."
    if weak_chapters:
        recommendation = f"You should focus more on {weak_chapters[0].topic}."

    # 7. Calculate next_difficulty
    if score >= 75:
        next_difficulty = "hard"
    elif score >= 50:
        next_difficulty = "medium"
    else:
        next_difficulty = "easy"

    return QuizSubmitResponse(
        score=score,
        correct_count=correct_count,
        total=total,
        difficulty_used=attempt.difficulty_used,
        weak_chapters=weak_chapters,
        recommendation=recommendation,
        next_difficulty=next_difficulty,
        per_question_results=per_question_results
    )

@router.get("/history", response_model=List[QuizHistoryItem])
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    attempts = db.query(QuizAttempt, Subject.name.label("subject_name")).join(
        Subject, QuizAttempt.subject_id == Subject.id
    ).filter(
        QuizAttempt.student_id == current_user.id,
        Subject.is_archived == False
    ).order_by(desc(QuizAttempt.started_at)).limit(20).all()
    
    history = []
    for attempt, subject_name in attempts:
        history.append(QuizHistoryItem(
            id=attempt.id,
            subject_name=subject_name,
            topic=attempt.topic or "Mixed",
            score=attempt.score,
            difficulty_used=attempt.difficulty_used,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            correct_count=attempt.correct_count,
            total_questions=attempt.total_questions
        ))
    return history

@router.get("/weak-areas", response_model=List[WeakChapter])
def get_weak_areas(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    return detect_weak_chapters(current_user.id, None, db)
