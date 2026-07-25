from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Integer
from typing import List, Tuple, Optional
import uuid
import json
import re
from datetime import datetime, timezone

from database import get_db
from models.content_chunks import ContentChunk
from models.question import Question
from models.subject import Subject
from models.quiz_attempt import QuizAttempt
from models.quiz_answer import QuizAnswer
from utils.dependencies import require_student, require_admin, require_hod_or_admin
from utils.llm_client import get_llm_response
from utils.adaptive_engine import AdaptiveEngine
from schemas.adaptive_quiz import (
    QuizStartRequest, QuizStartResponse, QuizSubmitRequest, 
    QuizSubmitResponse, WeakChapter, QuestionResult, AnswerSubmit, QuizHistoryItem,
    SingleAnswerSubmit, SingleAnswerResponse, QuizReportResponse, WeakTopicDetail,
    ExplainRequest, ExplainResponse, FrequentlyWrongQuestion, AdminQuizAnalyticsResponse,
    AdaptiveQuestionOut
)

router = APIRouter(prefix="/adaptive-quiz", tags=["Adaptive Quiz"])

AI_GENERATION_PROMPT = """Generate exactly {count} multiple choice questions about the topic "{topic}" within the subject "{subject_name}" for MCA (Master of Computer Applications) university students.

You must distribute the questions as follows:
- Mix of difficulties: EASY, MEDIUM, HARD.
- Mix of units: "Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5".

For each question, you MUST provide:
1. "question": The full question text
2. "option_a", "option_b", "option_c", "option_d"
3. "correct_answer": "a", "b", "c", or "d"
4. "explanation": Brief explanation (2-3 sentences) referencing the subject, unit, and MCA syllabus context.
5. "difficulty": "easy", "medium", or "hard"
6. "unit": "Unit 1", "Unit 2", "Unit 3", "Unit 4", or "Unit 5"
7. "bloom_taxonomy_level": "Remember", "Understand", "Apply", or "Analyze"
8. "estimated_time_seconds": An integer representing typical reading and answering time (e.g., 20 to 60)

Return ONLY a valid JSON array. No markdown code blocks. No explanation. No preamble.
The response must start with [ and end with ].
"""

EXPLAIN_PROMPT = """You are an expert tutor for MCA (Master of Computer Applications) students at Mohanlal Sukhadia University (MLSU), Udaipur.
A student answered a question incorrectly. Please provide a clear, detailed, and syllabus-grounded explanation.

Question: {question_text}
Options:
A: {option_a}
B: {option_b}
C: {option_c}
D: {option_d}

Correct Answer: {correct_answer}
Student's Answer: {student_answer}

Subject: {subject_name}
Topic: {topic}
Unit: {unit}

Please write a structured explanation:
1. Identify the correct option and explain why it is correct.
2. Explain why the student's chosen option is incorrect.
3. Ground your explanation in the core concepts of the {subject_name} ({unit}) curriculum, referencing practical examples or applications.
4. Keep the explanation supportive, encouraging, and clear (max 4-5 sentences).
"""

def determine_difficulty(student_id: uuid.UUID, subject_id: uuid.UUID, db: Session) -> Tuple[str, str]:
    # Query last 5 QuizAttempts for this student + subject where completed_at is not null
    history = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.subject_id == subject_id,
        QuizAttempt.completed_at.isnot(None)
    ).order_by(desc(QuizAttempt.completed_at)).limit(5).all()

    if not history:
        return "easy", "First quiz on this subject — starting with Easy level!"

    avg_score = sum(h.score for h in history) / len(history)

    if avg_score >= 75:
        return "hard", f"Your recent average is {avg_score:.0f}% — Moving to Hard level!"
    elif avg_score >= 50:
        return "medium", f"Your recent average is {avg_score:.0f}% — Keeping at Medium level"
    else:
        return "easy", f"Your recent average is {avg_score:.0f}% — Let's practice with Easy level first"

def detect_weak_chapters(student_id: uuid.UUID, subject_id: uuid.UUID, db: Session) -> List[WeakChapter]:
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
    
    weak.sort(key=lambda x: x.correct_rate)
    return weak

def parse_ai_questions_json(raw_response: str) -> list:
    cleaned_res = raw_response.strip()
    if cleaned_res.startswith("```"):
        cleaned_res = re.sub(r"^```(?:json)?", "", cleaned_res, flags=re.IGNORECASE)
        cleaned_res = re.sub(r"```$", "", cleaned_res).strip()
    
    start_idx = cleaned_res.find("[")
    end_idx = cleaned_res.rfind("]")
    if start_idx != -1 and end_idx != -1:
        cleaned_res = cleaned_res[start_idx:end_idx+1]
    return json.loads(cleaned_res)

@router.get("/topics")
def get_topics_for_subject(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    chunks = db.query(ContentChunk.topic_hint, ContentChunk.chunk_index).filter(
        ContentChunk.subject_id == subject_id,
        ContentChunk.topic_hint.isnot(None),
        ContentChunk.topic_hint != ""
    ).all()

    if not chunks:
        return {}

    grouped = {}
    seen = set()
    for topic_hint, chunk_index in chunks:
        topic = topic_hint.strip()
        if not topic or topic in seen:
            continue
        seen.add(topic)
        unit_num = ((chunk_index or 0) // 20) + 1
        unit_label = f"Unit {unit_num}"
        if unit_label not in grouped:
            grouped[unit_label] = []
        grouped[unit_label].append(topic)

    for unit in grouped:
        grouped[unit].sort()

    return grouped


@router.post("/start", response_model=QuizStartResponse)
async def start_adaptive_quiz(
    req: QuizStartRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 1. Determine topic mode
    topic_filter = (req.topic or "mixed").strip()
    is_mixed = topic_filter.lower() == "mixed"

    # Get subject's syllabus topics from chatbot static config
    from routers.chatbot import SUBJECTS as STATIC_SUBJECTS
    static_meta = next(
        (s for s in STATIC_SUBJECTS if s["code"].lower() == subject.code.lower() or s["name"].lower() == subject.name.lower()),
        None
    )
    syllabus_topics = static_meta["topics"] if static_meta else []

    # 2. Check question bank size
    q_query = db.query(Question).filter(Question.subject_id == subject.id)
    if not is_mixed:
        q_query = q_query.filter(Question.topic.ilike(f"%{topic_filter}%"))
    q_count = q_query.count()

    reason = f"Starting adaptive quiz {'across mixed syllabus topics' if is_mixed else f'on {topic_filter}'}."

    # 3. Populate question bank if too small
    if q_count < 10:
        reason += " Populating question bank with AI-generated questions."
        import random as _random
        gen_topic = topic_filter
        if is_mixed and syllabus_topics:
            gen_topic = _random.choice(syllabus_topics)

        prompt = AI_GENERATION_PROMPT.format(
            count=15,
            topic=gen_topic,
            subject_name=subject.name
        )
        try:
            raw_response = await get_llm_response(
                messages=[{"role": "user", "content": "Generate the JSON array of questions now."}],
                system_prompt=prompt,
                max_tokens=4000
            )
            questions_list = parse_ai_questions_json(raw_response)
            for item in questions_list:
                q_topic = item.get("topic", gen_topic) if is_mixed else topic_filter
                new_q = Question(
                    id=uuid.uuid4(),
                    subject_id=subject.id,
                    topic=q_topic,
                    unit=item.get("unit", "Unit 1"),
                    question_text=item.get("question") or item.get("question_text"),
                    option_a=item.get("option_a"),
                    option_b=item.get("option_b"),
                    option_c=item.get("option_c"),
                    option_d=item.get("option_d"),
                    correct_answer=item.get("correct_answer", "a").lower().strip(),
                    explanation=item.get("explanation"),
                    difficulty=item.get("difficulty", "medium").lower().strip(),
                    estimated_time_seconds=int(item.get("estimated_time_seconds", 30)),
                    bloom_taxonomy_level=item.get("bloom_taxonomy_level", "Understand"),
                    generated_by_ai=True
                )
                db.add(new_q)
            db.commit()
        except Exception as e:
            print(f"Error generating questions: {e}")
            if q_count == 0:
                raise HTTPException(status_code=502, detail="Failed to populate question bank via AI")

    # 4. Get baseline difficulty from past performance
    difficulty, diff_reason = determine_difficulty(current_user.id, subject.id, db)

    # 5. Start session in DB via AdaptiveEngine
    attempt = AdaptiveEngine.start_session(
        db=db,
        student_id=current_user.id,
        subject_id=subject.id,
        topic=topic_filter,
        num_questions=10
    )
    attempt.current_difficulty = difficulty
    db.commit()

    return QuizStartResponse(
        attempt_id=attempt.id,
        questions=[],
        difficulty_used=difficulty,
        topic=topic_filter,
        subject_name=subject.name,
        reason=diff_reason
    )

@router.get("/next-question/{session_id}", response_model=Optional[AdaptiveQuestionOut])
def get_next_question(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == session_id).first()
    available_topics = []
    if attempt and attempt.subject:
        from routers.chatbot import SUBJECTS as STATIC_SUBJECTS
        static_meta = next(
            (s for s in STATIC_SUBJECTS if s["code"].lower() == attempt.subject.code.lower() or s["name"].lower() == attempt.subject.name.lower()),
            None
        )
        available_topics = static_meta["topics"] if static_meta else []

    q = AdaptiveEngine.get_next_question(db, session_id, available_topics=available_topics)
    if not q:
        return None

    return AdaptiveQuestionOut(
        id=q.id,
        subject_id=q.subject_id,
        subject_name=q.subject.name if q.subject else "Subject",
        topic=q.topic,
        difficulty=q.difficulty,
        question_text=q.question_text,
        option_a=q.option_a,
        option_b=q.option_b,
        option_c=q.option_c,
        option_d=q.option_d,
        unit=q.unit,
        bloom_taxonomy_level=q.bloom_taxonomy_level,
        estimated_time_seconds=q.estimated_time_seconds
    )

@router.post("/answer", response_model=SingleAnswerResponse)
def submit_single_answer(
    req: SingleAnswerSubmit,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    res = AdaptiveEngine.evaluate_answer(
        db=db,
        session_id=req.attempt_id,
        question_id=req.question_id,
        selected_option=req.selected_answer,
        time_taken_seconds=req.time_taken_seconds
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
        
    return SingleAnswerResponse(
        is_correct=res["is_correct"],
        correct_answer=res["correct_answer"],
        explanation=res["explanation"],
        next_difficulty=res["next_difficulty"],
        questions_answered=res["questions_answered"]
    )

@router.get("/report/{session_id}", response_model=QuizReportResponse)
def get_quiz_report(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    from schemas.adaptive_quiz import TimeAnalysis, DifficultyProgressionItem
    report = AdaptiveEngine.generate_session_report(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    ta = report.get("time_analysis", {})
    dp = report.get("difficulty_progression", [])

    return QuizReportResponse(
        session_id=uuid.UUID(report["session_id"]),
        score=report["score"],
        correct_count=report["correct_count"],
        total_questions=report["total_questions"],
        difficulty_accuracy=report["difficulty_accuracy"],
        bloom_accuracy=report["bloom_accuracy"],
        unit_accuracy=report["unit_accuracy"],
        weak_topics=[
            WeakTopicDetail(
                topic=w["topic"],
                accuracy=w["accuracy"],
                total_attempts=w["total_attempts"]
            ) for w in report["weak_topics"]
        ],
        strong_topics=report.get("strong_topics", []),
        recommended_revision_topics=report.get("recommended_revision_topics", []),
        difficulty_progression=[
            DifficultyProgressionItem(
                question_num=d["question_num"],
                difficulty=d["difficulty"],
                is_correct=d["is_correct"],
                topic=d["topic"]
            ) for d in dp
        ],
        time_analysis=TimeAnalysis(
            total_time_seconds=ta.get("total_time_seconds", 0),
            avg_time_per_question_seconds=ta.get("avg_time_per_question_seconds", 0.0),
            time_efficiency=ta.get("time_efficiency", "Optimal")
        ),
        predicted_readiness=report["predicted_readiness"],
        readiness_label=report["readiness_label"],
        subject_name=report["subject_name"]
    )

@router.get("/history", response_model=List[QuizHistoryItem])
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == current_user.id,
        QuizAttempt.completed_at.isnot(None)
    ).order_by(desc(QuizAttempt.started_at)).limit(20).all()
    
    history = []
    for attempt in attempts:
        history.append(QuizHistoryItem(
            id=attempt.id,
            subject_name=attempt.subject.name if attempt.subject else "Subject",
            topic=attempt.topic or "Mixed",
            score=attempt.score,
            difficulty_used=attempt.difficulty_used,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            correct_count=attempt.correct_count,
            total_questions=attempt.total_questions
        ))
    return history

@router.get("/history/{student_id}", response_model=List[QuizHistoryItem])
def get_student_quiz_history(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.completed_at.isnot(None)
    ).order_by(desc(QuizAttempt.started_at)).limit(20).all()
    
    history = []
    for attempt in attempts:
        history.append(QuizHistoryItem(
            id=attempt.id,
            subject_name=attempt.subject.name if attempt.subject else "Subject",
            topic=attempt.topic or "Mixed",
            score=attempt.score,
            difficulty_used=attempt.difficulty_used,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            correct_count=attempt.correct_count,
            total_questions=attempt.total_questions
        ))
    return history

@router.post("/explain", response_model=ExplainResponse)
async def explain_incorrect_answer(
    req: ExplainRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    prompt = EXPLAIN_PROMPT.format(
        question_text=question.question_text,
        option_a=question.option_a,
        option_b=question.option_b,
        option_c=question.option_c,
        option_d=question.option_d,
        correct_answer=question.correct_answer.upper(),
        student_answer=req.student_answer.upper(),
        subject_name=question.subject.name if question.subject else "Syllabus Subject",
        topic=question.topic,
        unit=question.unit or "General"
    )
    
    try:
        explanation = await get_llm_response(
            messages=[{"role": "user", "content": "Generate the explanation now."}],
            system_prompt=prompt,
            max_tokens=500
        )
        return ExplainResponse(explanation=explanation.strip())
    except Exception as e:
        return ExplainResponse(explanation=question.explanation or "No further explanation available.")

@router.get("/admin/quiz-analytics", response_model=AdminQuizAnalyticsResponse)
def get_admin_quiz_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    # 1. Heatmap: Subject (rows) vs Units (columns) with avg accuracy
    results = db.query(
        Subject.name.label("subject_name"),
        Question.unit,
        func.count(QuizAnswer.id).label("total"),
        func.sum(cast(QuizAnswer.is_correct, Integer)).label("correct")
    ).join(Question, QuizAnswer.question_id == Question.id)\
     .join(Subject, Question.subject_id == Subject.id)\
     .group_by(Subject.name, Question.unit).all()

    subject_units = {}
    for row in results:
        sub = row.subject_name
        unit = row.unit or "General"
        acc = (row.correct / row.total * 100) if row.total > 0 else 0.0
        if sub not in subject_units:
            subject_units[sub] = {"subject": sub}
        subject_units[sub][unit] = round(acc, 1)
    
    heatmap_data = list(subject_units.values())

    # 2. Frequently Wrong: Questions with error counts
    all_answers = db.query(
        Question.question_text,
        Subject.name.label("subject_name"),
        Question.topic,
        func.count(QuizAnswer.id).label("total_attempts"),
        func.sum(cast(QuizAnswer.is_correct, Integer)).label("correct_count")
    ).join(Question, QuizAnswer.question_id == Question.id)\
     .join(Subject, Question.subject_id == Subject.id)\
     .group_by(Question.id, Question.question_text, Subject.name, Question.topic)\
     .all()

    freq_wrong = []
    for row in all_answers:
        err_count = row.total_attempts - (row.correct_count or 0)
        if err_count > 0:
            freq_wrong.append(FrequentlyWrongQuestion(
                question_text=row.question_text,
                subject_name=row.subject_name,
                topic=row.topic,
                error_count=int(err_count),
                total_attempts=int(row.total_attempts)
            ))
    
    freq_wrong.sort(key=lambda x: x.error_count, reverse=True)
    freq_wrong = freq_wrong[:10]

    return AdminQuizAnalyticsResponse(
        heatmap=heatmap_data,
        frequently_wrong=freq_wrong
    )
