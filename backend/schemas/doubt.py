from pydantic import BaseModel, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from utils.sanitize import sanitize_text

class DoubtCreate(BaseModel):
    subject_id: UUID
    question_text: str

    @field_validator('question_text')
    @classmethod
    def sanitize_field(cls, v: str) -> str:
        sanitized = sanitize_text(v).strip()
        if not sanitized:
            raise ValueError("Question text cannot be blank")
        return sanitized

class DoubtOut(BaseModel):
    id: UUID
    student_id: UUID
    student_name: str
    subject_id: UUID
    subject_name: str
    subject_color: Optional[str] = None
    question_text: str
    is_resolved: bool
    vote_count: int
    answer_count: int
    created_at: datetime
    accepted_answer_id: Optional[UUID] = None
    current_user_upvoted: bool = False

    class Config:
        from_attributes = True

class DoubtAnswerCreate(BaseModel):
    answer_text: str

    @field_validator('answer_text')
    @classmethod
    def sanitize_field(cls, v: str) -> str:
        sanitized = sanitize_text(v).strip()
        if not sanitized:
            raise ValueError("Answer text cannot be blank")
        return sanitized

class DoubtAnswerOut(BaseModel):
    id: UUID
    doubt_id: UUID
    answered_by_id: UUID
    answered_by_name: str
    answer_text: str
    upvotes: int
    is_accepted: bool
    is_verified_by_admin: bool = False
    created_at: datetime
    current_user_upvoted: bool = False

    class Config:
        from_attributes = True
