from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class NoteOut(BaseModel):
    id: uuid.UUID
    title: str
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    file_url: str
    file_type: str
    file_size_kb: int
    uploaded_by_name: Optional[str] = None
    created_at: datetime
    summary: Optional[str] = None
    download_count: int
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None

    class Config:
        from_attributes = True
