from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "BookOpen"

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class SubjectOut(SubjectBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectWithStats(SubjectOut):
    notes_count: int = 0
    questions_count: int = 0
