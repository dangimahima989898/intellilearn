from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import uuid


class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "BookOpen"
    course_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None
    # RAG fields
    topics_list: Optional[List[str]] = []
    syllabus_text: Optional[str] = None
    co_po_mappings: Optional[str] = None
    revision_history: Optional[str] = None
    ownership_history: Optional[str] = None
    credit_hours: Optional[int] = 3


class SubjectCreate(SubjectBase):
    department_id: Optional[uuid.UUID] = None
    semester_number: int


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None
    # RAG fields
    topics_list: Optional[List[str]] = None
    syllabus_text: Optional[str] = None
    co_po_mappings: Optional[str] = None
    revision_history: Optional[str] = None
    ownership_history: Optional[str] = None
    credit_hours: Optional[int] = None


class FacultyAssignmentOut(BaseModel):
    id: uuid.UUID
    faculty_id: uuid.UUID
    faculty_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class SubjectOut(SubjectBase):
    id: uuid.UUID
    created_at: datetime
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    # topics_list is returned as a proper list
    topics_list: Optional[List[str]] = []
    faculty_assignments: Optional[List[FacultyAssignmentOut]] = []

    class Config:
        from_attributes = True


class SubjectWithStats(SubjectOut):
    notes_count: int = 0
    questions_count: int = 0
    chunks_count: int = 0   # number of RAG content chunks stored


class SubjectArchived(SubjectWithStats):
    is_archived: bool
    archived_at: Optional[datetime] = None
    remaining_days: int = 15
