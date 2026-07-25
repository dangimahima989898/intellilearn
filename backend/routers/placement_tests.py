from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
import csv
import io
import random
from datetime import datetime, timezone
from typing import List, Optional

from database import get_db
from models.user import User
from models.placement_test import PlacementTest, TestQuestion, TestAttempt, AttemptAnswer
from schemas.placement_test import (
    PlacementTestCreate, PlacementTestOut, PlacementTestDetailOut,
    TestQuestionCreate, TestQuestionOut, TestQuestionReviewOut,
    AttemptAnswerCreate, AttemptAnswerOut, TestAttemptOut, TestAttemptSubmit,
    TestAttemptResultOut, DashboardStatsOut
)
from utils.security import decode_token

router = APIRouter()

# Custom auth dependency to ensure unauthenticated requests return 401 (Requirement 15)
def get_current_user_placement(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token missing user ID")
    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return user

def require_role_placement(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user_placement)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker

@router.get("", response_model=List[PlacementTestOut])
def get_placement_tests(
    test_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    query = db.query(PlacementTest)
    if test_type:
        query = query.filter(PlacementTest.test_type == test_type)
    if difficulty:
        query = query.filter(PlacementTest.difficulty == difficulty)
    if category:
        query = query.filter(PlacementTest.category == category)
        
    tests = query.all()
    
    result = []
    for test in tests:
        q_count = db.query(func.count(TestQuestion.id)).filter(TestQuestion.test_id == test.id).scalar() or 0
        
        attempted = db.query(TestAttempt).filter(
            TestAttempt.test_id == test.id,
            TestAttempt.user_id == current_user.id,
            TestAttempt.status.in_(["submitted", "timed_out"])
        ).first() is not None
        
        result.append(
            PlacementTestOut(
                id=test.id,
                title=test.title,
                category=test.category,
                test_type=test.test_type,
                duration_minutes=test.duration_minutes,
                difficulty=test.difficulty,
                description=test.description,
                total_marks=test.total_marks,
                created_at=test.created_at,
                questions_count=q_count,
                attempted=attempted
            )
        )
    return result

@router.get("/dashboard/my-tests", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id
    ).order_by(TestAttempt.started_at.desc()).all()
    
    completed_attempts = [a for a in attempts if a.status in ["submitted", "timed_out"]]
    
    total_tests_taken = len(completed_attempts)
    
    percentages = []
    for a in completed_attempts:
        if a.total_marks > 0:
            percentages.append((a.score or 0) / a.total_marks * 100)
            
    average_score = round(sum(percentages) / len(percentages), 2) if percentages else 0.0
    best_score = round(max(percentages), 2) if percentages else 0.0
    
    attempts_formatted = []
    for a in attempts:
        test = db.query(PlacementTest).filter(PlacementTest.id == a.test_id).first()
        pct = round((a.score or 0) / a.total_marks * 100, 2) if a.total_marks > 0 else 0.0
        attempts_formatted.append({
            "id": a.id,
            "test_id": a.test_id,
            "test_name": test.title if test else "Unknown Test",
            "score": a.score,
            "total_marks": a.total_marks,
            "percentage": pct,
            "started_at": a.started_at,
            "submitted_at": a.submitted_at,
            "time_taken_seconds": a.time_taken_seconds,
            "status": a.status
        })
        
    return {
        "total_tests_taken": total_tests_taken,
        "average_score": average_score,
        "best_score": best_score,
        "attempts": attempts_formatted
    }

@router.get("/{id}", response_model=PlacementTestDetailOut)
def get_placement_test(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    test = db.query(PlacementTest).filter(PlacementTest.id == id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Placement test not found")
        
    sections = db.query(TestQuestion.section, func.count(TestQuestion.id)).filter(
        TestQuestion.test_id == id
    ).group_by(TestQuestion.section).all()
    
    sections_breakdown = {sect: count for sect, count in sections}
    q_count = db.query(func.count(TestQuestion.id)).filter(TestQuestion.test_id == id).scalar() or 0
    
    attempted = db.query(TestAttempt).filter(
        TestAttempt.test_id == test.id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.status.in_(["submitted", "timed_out"])
    ).first() is not None
    
    return PlacementTestDetailOut(
        id=test.id,
        title=test.title,
        category=test.category,
        test_type=test.test_type,
        duration_minutes=test.duration_minutes,
        difficulty=test.difficulty,
        description=test.description,
        total_marks=test.total_marks,
        created_at=test.created_at,
        questions_count=q_count,
        attempted=attempted,
        sections_breakdown=sections_breakdown
    )

@router.post("/{id}/start", response_model=TestAttemptOut)
def start_or_resume_test(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    test = db.query(PlacementTest).filter(PlacementTest.id == id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Placement test not found")
        
    active_attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == "in_progress"
    ).first()
    
    if active_attempt:
        return active_attempt
        
    new_attempt = TestAttempt(
        id=uuid.uuid4(),
        user_id=current_user.id,
        test_id=id,
        started_at=datetime.now(timezone.utc),
        status="in_progress",
        total_marks=test.total_marks,
        tab_switches=0
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    return new_attempt

@router.get("/{id}/questions", response_model=List[TestQuestionOut])
def get_test_attempt_questions(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == "in_progress"
    ).first()
    if not attempt:
        raise HTTPException(status_code=400, detail="No active attempt found for this test. Please start a test first.")
        
    questions = db.query(TestQuestion).filter(TestQuestion.test_id == id).all()
    
    random_gen = random.Random(attempt.id.int)
    random_gen.shuffle(questions)
    
    return questions

@router.post("/{id}/save-answer", response_model=AttemptAnswerOut)
def save_answer(
    id: uuid.UUID,
    answer_data: AttemptAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == "in_progress"
    ).first()
    if not attempt:
        raise HTTPException(status_code=400, detail="No active attempt for this test")
        
    question = db.query(TestQuestion).filter(
        TestQuestion.id == answer_data.question_id,
        TestQuestion.test_id == id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in this test")
        
    existing_answer = db.query(AttemptAnswer).filter(
        AttemptAnswer.attempt_id == attempt.id,
        AttemptAnswer.question_id == answer_data.question_id
    ).first()
    
    is_correct = False
    if answer_data.user_answer is not None:
        user_ans = answer_data.user_answer.strip().lower()
        corr_ans = question.correct_answer.strip().lower()
        is_correct = (user_ans == corr_ans)
            
    if existing_answer:
        existing_answer.user_answer = answer_data.user_answer
        existing_answer.is_correct = is_correct
        if answer_data.time_spent_seconds is not None:
            existing_answer.time_spent_seconds = (existing_answer.time_spent_seconds or 0) + answer_data.time_spent_seconds
        existing_answer.marked_for_review = answer_data.marked_for_review
        db.commit()
        db.refresh(existing_answer)
        return existing_answer
    else:
        new_answer = AttemptAnswer(
            id=uuid.uuid4(),
            attempt_id=attempt.id,
            question_id=answer_data.question_id,
            user_answer=answer_data.user_answer,
            is_correct=is_correct,
            time_spent_seconds=answer_data.time_spent_seconds or 0,
            marked_for_review=answer_data.marked_for_review
        )
        db.add(new_answer)
        db.commit()
        db.refresh(new_answer)
        return new_answer

@router.post("/{id}/submit", response_model=TestAttemptOut)
def submit_test(
    id: uuid.UUID,
    submit_data: TestAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == id,
        TestAttempt.user_id == current_user.id,
        TestAttempt.status == "in_progress"
    ).first()
    if not attempt:
        raise HTTPException(status_code=400, detail="No active attempt found for this test to submit")
        
    answers = db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
    questions = db.query(TestQuestion).filter(TestQuestion.test_id == id).all()
    
    questions_map = {q.id: q for q in questions}
    
    total_score = 0.0
    section_scores = {}
    
    for q in questions:
        if q.section not in section_scores:
            section_scores[q.section] = 0.0
            
    for ans in answers:
        q = questions_map.get(ans.question_id)
        if q:
            if ans.is_correct:
                total_score += q.marks
                section_scores[q.section] = section_scores.get(q.section, 0.0) + q.marks
                
    submitted_at = datetime.now(timezone.utc)
    
    started_at = attempt.started_at
    if started_at.tzinfo is not None:
        started_at = started_at.replace(tzinfo=None)
        
    submitted_at_naive = submitted_at.replace(tzinfo=None)
    time_taken = int((submitted_at_naive - started_at).total_seconds())
    
    attempt.submitted_at = submitted_at
    attempt.score = total_score
    attempt.time_taken_seconds = time_taken
    attempt.status = submit_data.status if submit_data.status in ["submitted", "timed_out"] else "submitted"
    attempt.section_scores = section_scores
    if submit_data.tab_switches is not None:
        attempt.tab_switches = submit_data.tab_switches
        
    db.commit()
    db.refresh(attempt)
    return attempt

@router.get("/{id}/result/{attempt_id}", response_model=TestAttemptResultOut)
def get_attempt_result(
    id: uuid.UUID,
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_placement)
):
    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == attempt_id,
        TestAttempt.test_id == id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
        
    if attempt.user_id != current_user.id and current_user.role not in ["super_admin", "hod"]:
        raise HTTPException(status_code=403, detail="You do not have permission to view this attempt result")
        
    percentage = 0.0
    if attempt.total_marks > 0:
        percentage = round((attempt.score / attempt.total_marks) * 100, 2)
        
    if percentage >= 85:
        grade = "A"
    elif percentage >= 70:
        grade = "B"
    elif percentage >= 55:
        grade = "C"
    elif percentage >= 40:
        grade = "D"
    else:
        grade = "F"
        
    pass_status = (percentage >= 40)
    
    answers = db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
    questions = db.query(TestQuestion).filter(TestQuestion.test_id == id).all()
    
    section_max_marks = {}
    for q in questions:
        section_max_marks[q.section] = section_max_marks.get(q.section, 0) + q.marks
        
    section_percentages = {}
    for section, score in (attempt.section_scores or {}).items():
        max_m = section_max_marks.get(section, 1)
        section_percentages[section] = (score / max_m) * 100
        
    strongest_section = None
    if section_percentages:
        strongest_section = max(section_percentages, key=section_percentages.get)
        
    section_time_spent = {}
    for ans in answers:
        q = next((q for q in questions if q.id == ans.question_id), None)
        if q:
            section_time_spent[q.section] = section_time_spent.get(q.section, 0) + (ans.time_spent_seconds or 0)
            
    most_time_spent_section = None
    if section_time_spent:
        most_time_spent_section = max(section_time_spent, key=section_time_spent.get)
        
    insights = {
        "strongest_section": strongest_section,
        "most_time_spent_section": most_time_spent_section,
        "section_max_marks": section_max_marks,
        "section_time_spent": section_time_spent
    }
    
    answers_review = []
    answers_map = {a.question_id: a for a in answers}
    for q in questions:
        ans = answers_map.get(q.id)
        if ans:
            answers_review.append({
                "id": ans.id,
                "attempt_id": ans.attempt_id,
                "question_id": ans.question_id,
                "user_answer": ans.user_answer,
                "is_correct": ans.is_correct,
                "time_spent_seconds": ans.time_spent_seconds,
                "marked_for_review": ans.marked_for_review,
                "question": q
            })
        else:
            answers_review.append({
                "id": uuid.uuid4(),
                "attempt_id": attempt.id,
                "question_id": q.id,
                "user_answer": None,
                "is_correct": False,
                "time_spent_seconds": 0,
                "marked_for_review": False,
                "question": q
            })
            
    return {
        "attempt": attempt,
        "percentage": percentage,
        "grade": grade,
        "pass_status": pass_status,
        "insights": insights,
        "answers": answers_review
    }

# Admin Endpoints
@router.post("/admin/create", response_model=PlacementTestOut)
def admin_create_test(
    test_data: PlacementTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_placement("super_admin", "hod"))
):
    new_test = PlacementTest(
        id=uuid.uuid4(),
        title=test_data.title,
        category=test_data.category,
        test_type=test_data.test_type,
        duration_minutes=test_data.duration_minutes,
        difficulty=test_data.difficulty,
        description=test_data.description,
        total_marks=test_data.total_marks
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    return new_test

@router.post("/admin/{id}/questions", response_model=TestQuestionReviewOut)
def admin_create_question(
    id: uuid.UUID,
    q_data: TestQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_placement("super_admin", "hod"))
):
    test = db.query(PlacementTest).filter(PlacementTest.id == id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Placement test not found")
        
    new_q = TestQuestion(
        id=uuid.uuid4(),
        test_id=id,
        question_text=q_data.question_text,
        question_type=q_data.question_type,
        options=q_data.options,
        correct_answer=q_data.correct_answer,
        starter_code=q_data.starter_code,
        expected_output=q_data.expected_output,
        marks=q_data.marks,
        section=q_data.section,
        order_index=q_data.order_index
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q

@router.post("/admin/{id}/csv-import")
def admin_csv_import(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_placement("super_admin", "hod"))
):
    test = db.query(PlacementTest).filter(PlacementTest.id == id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Placement test not found")
        
    content = file.file.read().decode("utf-8")
    csv_file = io.StringIO(content)
    reader = csv.DictReader(csv_file)
    
    imported_count = 0
    errors = []
    
    for idx, row in enumerate(reader):
        required_fields = ["question_text", "question_type", "correct_answer", "marks", "section", "order_index"]
        missing = [f for f in required_fields if f not in row or not row[f]]
        if missing:
            errors.append(f"Row {idx+1} is missing fields: {', '.join(missing)}")
            continue
            
        try:
            order_index = int(row["order_index"])
            existing_q = db.query(TestQuestion).filter(
                TestQuestion.test_id == id,
                TestQuestion.order_index == order_index
            ).first()
            if existing_q:
                continue
                
            options = None
            if row.get("options"):
                opts_str = row["options"].strip()
                if opts_str.startswith("[") and opts_str.endswith("]"):
                    import json
                    try:
                        options = json.loads(opts_str)
                    except Exception:
                        options = [o.strip() for o in opts_str[1:-1].split(",") if o.strip()]
                else:
                    options = [o.strip() for o in opts_str.split(",") if o.strip()]
                    
            new_q = TestQuestion(
                id=uuid.uuid4(),
                test_id=id,
                question_text=row["question_text"],
                question_type=row["question_type"],
                options=options,
                correct_answer=row["correct_answer"],
                starter_code=row.get("starter_code"),
                expected_output=row.get("expected_output"),
                marks=int(row["marks"]),
                section=row["section"],
                order_index=order_index
            )
            db.add(new_q)
            imported_count += 1
        except Exception as e:
            errors.append(f"Row {idx+1} failed to parse: {str(e)}")
            
    if errors:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail={"message": "CSV validation failed", "errors": errors}
        )
        
    db.commit()
    return {"message": f"Successfully imported {imported_count} questions"}
