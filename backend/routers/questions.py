from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import uuid
import json
import re

from database import get_db
from models.question import Question
from models.subject import Subject
from utils.dependencies import get_current_user, require_student, require_admin
from utils.llm_client import get_llm_response
from utils.rate_limiter import check_rate_limit
from schemas.question import QuestionOut, GenerateRequest, GenerateResponse

router = APIRouter(prefix="/questions", tags=["Questions"])

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

Important rules:
- All 4 options must be plausible (not obviously wrong)
- For {difficulty} level: make the distractors (wrong options) appropriately tricky
- Explanations must be educational and helpful
- Questions must be relevant to MCA curriculum
"""

# Pydantic schema for practice submit
class AnswerItem(BaseModel):
    question_id: uuid.UUID
    selected_answer: str

class PracticeSubmitRequest(BaseModel):
    question_ids: List[uuid.UUID]
    answers: List[AnswerItem]

class PracticeResultItem(BaseModel):
    question_id: uuid.UUID
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None

class PracticeSubmitResponse(BaseModel):
    results: List[PracticeResultItem]
    score: float
    correct_count: int
    total: int


@router.post("/generate", response_model=GenerateResponse)
async def generate_questions(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # 0. Rate check (50 per hour)
    check_rate_limit(str(current_user.id), "question_gen", max_requests=50, window_seconds=3600)
    
    # Validate difficulty
    diff_lower = req.difficulty.lower()
    if diff_lower not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Difficulty must be easy, medium, or hard"
        )
    
    # Validate count
    if req.count < 1 or req.count > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Count must be between 1 and 10"
        )
    
    # Find subject by code
    subject = db.query(Subject).filter(func.lower(Subject.code) == req.subject_code.lower(), Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with code '{req.subject_code}' not found or is archived"
        )
        
    # Build prompt
    prompt = QUESTION_GENERATION_PROMPT.format(
        count=req.count,
        topic=req.topic,
        subject_name=subject.name,
        difficulty=req.difficulty.upper()
    )
    
    # Call LLM
    try:
        raw_response = await get_llm_response(
            messages=[{"role": "user", "content": "Please generate the JSON array of questions now."}],
            system_prompt=prompt,
            max_tokens=2500
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM generation failed: {str(e)}"
        )
        
    # Clean and parse JSON response
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
    except Exception as e:
        # Fallback to display the LLM output in case parsing failed
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse AI response as JSON. AI returned: {raw_response[:300]}"
        )
        
    if not isinstance(questions_list, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI did not return a JSON array."
        )
        
    saved_questions = []
    for item in questions_list:
        # Validate required fields inside item
        q_text = item.get("question") or item.get("question_text")
        opt_a = item.get("option_a")
        opt_b = item.get("option_b")
        opt_c = item.get("option_c")
        opt_d = item.get("option_d")
        corr = item.get("correct_answer", "a").lower().strip()
        expl = item.get("explanation")
        
        if not q_text or not opt_a or not opt_b or not opt_c or not opt_d:
            continue
            
        # Normalize correct answer to a, b, c, or d
        if corr not in ["a", "b", "c", "d"]:
            # Maybe it contains option prefix like "option_a" or "a)"
            match = re.search(r"\b([a-d])\b", corr)
            if match:
                corr = match.group(1)
            else:
                corr = "a"
                
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
            difficulty=diff_lower,
            generated_by_ai=True
        )
        db.add(new_q)
        db.commit()
        db.refresh(new_q)
        
        # Format output
        q_out = QuestionOut(
            id=new_q.id,
            subject_id=new_q.subject_id,
            subject_name=subject.name,
            topic=new_q.topic,
            difficulty=new_q.difficulty,
            question_text=new_q.question_text,
            option_a=new_q.option_a,
            option_b=new_q.option_b,
            option_c=new_q.option_c,
            option_d=new_q.option_d,
            correct_answer=new_q.correct_answer,
            explanation=new_q.explanation,
            created_at=new_q.created_at
        )
        saved_questions.append(q_out)
        
    return GenerateResponse(
        questions=saved_questions,
        generated_count=len(saved_questions),
        subject=subject.code,
        topic=req.topic,
        difficulty=diff_lower
    )


@router.get("/", response_model=List[QuestionOut])
def list_questions(
    subject_id: Optional[uuid.UUID] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    include_archived: bool = False,
    page: int = 1,
    size: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Question, Subject.name.label("subject_name")).join(Subject, Question.subject_id == Subject.id)
    if not include_archived:
        query = query.filter(Subject.is_archived == False)
    
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.lower())
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
        
    offset = (page - 1) * size
    results = query.offset(offset).limit(size).all()
    
    out_list = []
    for q, sub_name in results:
        q_out = QuestionOut(
            id=q.id,
            subject_id=q.subject_id,
            subject_name=sub_name,
            topic=q.topic,
            difficulty=q.difficulty,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            created_at=q.created_at
        )
        out_list.append(q_out)
        
    return out_list


@router.get("/{id}", response_model=QuestionOut)
def get_question(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = db.query(Question, Subject.name.label("subject_name")).join(
        Subject, Question.subject_id == Subject.id
    ).filter(Question.id == id, Subject.is_archived == False).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Question not found")
        
    q, sub_name = result
    return QuestionOut(
        id=q.id,
        subject_id=q.subject_id,
        subject_name=sub_name,
        topic=q.topic,
        difficulty=q.difficulty,
        question_text=q.question_text,
        option_a=q.option_a,
        option_b=q.option_b,
        option_c=q.option_c,
        option_d=q.option_d,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        created_at=q.created_at
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    q = db.query(Question).filter(Question.id == id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return None


@router.post("/practice-submit", response_model=PracticeSubmitResponse)
def practice_submit(
    req: PracticeSubmitRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    # Create a map of answers from request
    answer_map = {ans.question_id: ans.selected_answer.lower().strip() for ans in req.answers}
    
    results = []
    correct_count = 0
    total = len(req.question_ids)
    
    if total == 0:
        return PracticeSubmitResponse(results=[], score=0.0, correct_count=0, total=0)
        
    for q_id in req.question_ids:
        q = db.query(Question).filter(Question.id == q_id).first()
        if not q:
            continue
            
        selected = answer_map.get(q_id, "")
        correct = q.correct_answer.lower().strip()
        is_correct = (selected == correct)
        
        if is_correct:
            correct_count += 1
            
        results.append(PracticeResultItem(
            question_id=q_id,
            selected_answer=selected,
            correct_answer=correct,
            is_correct=is_correct,
            explanation=q.explanation
        ))
        
    score = round((correct_count / total) * 100.0, 2) if total > 0 else 0.0
    
    return PracticeSubmitResponse(
        results=results,
        score=score,
        correct_count=correct_count,
        total=total
    )
