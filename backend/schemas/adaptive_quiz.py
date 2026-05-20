from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from schemas.question import QuestionOut

class QuizStartRequest(BaseModel):
    subject_id: UUID
    topic: str

class QuizStartResponse(BaseModel):
    attempt_id: UUID
    questions: List[QuestionOut]
    difficulty_used: str
    topic: str
    subject_name: str
    reason: str

class AnswerSubmit(BaseModel):
    question_id: UUID
    selected_answer: str # a/b/c/d
    time_taken_seconds: int

class QuizSubmitRequest(BaseModel):
    attempt_id: UUID
    answers: List[AnswerSubmit]

class WeakChapter(BaseModel):
    subject: str
    topic: str
    correct_rate: float
    attempts: int

class QuestionResult(BaseModel):
    question_id: UUID
    correct_answer: str
    selected_answer: str
    is_correct: bool
    explanation: Optional[str]

class QuizSubmitResponse(BaseModel):
    score: float
    correct_count: int
    total: int
    difficulty_used: str
    weak_chapters: List[WeakChapter]
    recommendation: str
    next_difficulty: str
    per_question_results: List[QuestionResult]

class QuizHistoryItem(BaseModel):
    id: UUID
    subject_name: str
    topic: str
    score: Optional[float]
    difficulty_used: str
    started_at: datetime
    completed_at: Optional[datetime]
    correct_count: Optional[int]
    total_questions: int
