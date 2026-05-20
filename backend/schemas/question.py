from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class QuestionCreate(BaseModel):
    subject_id: uuid.UUID
    topic: str
    difficulty: str  # easy/medium/hard
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # a/b/c/d
    explanation: Optional[str] = None

class QuestionOut(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    topic: str
    difficulty: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GenerateRequest(BaseModel):
    subject_code: str
    topic: str
    difficulty: str = Field(..., description="easy, medium, or hard")
    count: int = Field(5, ge=1, le=10)

class GenerateResponse(BaseModel):
    questions: List[QuestionOut]
    generated_count: int
    subject: str
    topic: str
    difficulty: str
