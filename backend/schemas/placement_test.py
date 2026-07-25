from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# --- Question Schemas ---
class TestQuestionBase(BaseModel):
    question_text: str
    question_type: str  # mcq, coding, fill
    options: Optional[List[str]] = None
    starter_code: Optional[str] = None
    expected_output: Optional[str] = None
    marks: int
    section: str
    order_index: int

class TestQuestionCreate(TestQuestionBase):
    correct_answer: str

class TestQuestionOut(TestQuestionBase):
    id: uuid.UUID
    test_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class TestQuestionReviewOut(TestQuestionOut):
    correct_answer: str

    model_config = ConfigDict(from_attributes=True)

# --- Test Schemas ---
class PlacementTestBase(BaseModel):
    title: str
    category: str
    test_type: str  # aptitude, coding, mixed
    duration_minutes: int
    difficulty: str  # easy, medium, hard
    description: Optional[str] = None
    total_marks: int

class PlacementTestCreate(PlacementTestBase):
    pass

class PlacementTestOut(PlacementTestBase):
    id: uuid.UUID
    created_at: datetime
    questions_count: Optional[int] = 0
    attempted: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class PlacementTestDetailOut(PlacementTestOut):
    sections_breakdown: Optional[Dict[str, int]] = {}

    model_config = ConfigDict(from_attributes=True)

# --- Answer Schemas ---
class AttemptAnswerCreate(BaseModel):
    question_id: uuid.UUID
    user_answer: Optional[str] = None
    time_spent_seconds: Optional[int] = None
    marked_for_review: Optional[bool] = False

class AttemptAnswerOut(BaseModel):
    id: uuid.UUID
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    time_spent_seconds: Optional[int] = None
    marked_for_review: bool

    model_config = ConfigDict(from_attributes=True)

# --- Attempt Schemas ---
class TestAttemptOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    test_id: uuid.UUID
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    total_marks: int
    time_taken_seconds: Optional[int] = None
    status: str  # in_progress, submitted, timed_out
    section_scores: Optional[Dict[str, float]] = None
    tab_switches: int

    model_config = ConfigDict(from_attributes=True)

class TestAttemptSubmit(BaseModel):
    tab_switches: Optional[int] = None
    status: Optional[str] = "submitted"

# --- Result & Analysis Schemas ---
class AttemptAnswerReviewOut(AttemptAnswerOut):
    question: TestQuestionReviewOut

    model_config = ConfigDict(from_attributes=True)

class TestAttemptResultOut(BaseModel):
    attempt: TestAttemptOut
    percentage: float
    grade: str
    pass_status: bool
    insights: Dict[str, Any]
    answers: List[AttemptAnswerReviewOut]

    model_config = ConfigDict(from_attributes=True)

class DashboardStatsOut(BaseModel):
    total_tests_taken: int
    average_score: float
    best_score: float
    attempts: List[Dict[str, Any]]
