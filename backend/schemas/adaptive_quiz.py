from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime
from schemas.question import QuestionOut

class QuizStartRequest(BaseModel):
    subject_id: UUID
    topic: Optional[str] = "mixed"

class QuizStartResponse(BaseModel):
    attempt_id: UUID
    questions: Optional[List[QuestionOut]] = []
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

# New Schemas for Real-Time Adaptive Quiz
class SingleAnswerSubmit(BaseModel):
    attempt_id: UUID
    question_id: UUID
    selected_answer: str
    time_taken_seconds: int

class SingleAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: Optional[str]
    next_difficulty: str
    questions_answered: int

class WeakTopicDetail(BaseModel):
    topic: str
    accuracy: float
    total_attempts: int

class TimeAnalysis(BaseModel):
    total_time_seconds: int
    avg_time_per_question_seconds: float
    time_efficiency: str

class DifficultyProgressionItem(BaseModel):
    question_num: int
    difficulty: str
    is_correct: bool
    topic: str

class QuizReportResponse(BaseModel):
    session_id: UUID
    score: float
    correct_count: int
    total_questions: int
    difficulty_accuracy: Dict[str, float]
    bloom_accuracy: Dict[str, float]
    unit_accuracy: Dict[str, float]
    weak_topics: List[WeakTopicDetail]
    strong_topics: List[str]
    recommended_revision_topics: List[str]
    difficulty_progression: List[DifficultyProgressionItem]
    time_analysis: TimeAnalysis
    predicted_readiness: float
    readiness_label: str
    subject_name: str

class ExplainRequest(BaseModel):
    question_id: UUID
    student_answer: str

class ExplainResponse(BaseModel):
    explanation: str

class FrequentlyWrongQuestion(BaseModel):
    question_text: str
    subject_name: str
    topic: str
    error_count: int
    total_attempts: int

class AdminQuizAnalyticsResponse(BaseModel):
    heatmap: List[Dict]
    frequently_wrong: List[FrequentlyWrongQuestion]

class AdaptiveQuestionOut(BaseModel):
    id: UUID
    subject_id: UUID
    subject_name: Optional[str] = None
    topic: str
    difficulty: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    unit: Optional[str] = None
    bloom_taxonomy_level: Optional[str] = None
    estimated_time_seconds: Optional[int] = 30
