from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class DoubtCreate(BaseModel):
    subject_id: UUID
    question_text: str

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

    class Config:
        from_attributes = True

class DoubtAnswerCreate(BaseModel):
    answer_text: str

class DoubtAnswerOut(BaseModel):
    id: UUID
    doubt_id: UUID
    answered_by_id: UUID
    answered_by_name: str
    answer_text: str
    upvotes: int
    is_accepted: bool
    created_at: datetime
    current_user_upvoted: bool = False

    class Config:
        from_attributes = True
