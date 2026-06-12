from pydantic import BaseModel
from typing import Optional
import uuid

class TimetableCreate(BaseModel):
    subject_id: uuid.UUID
    day_of_week: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None

class TimetableOut(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None

    class Config:
        from_attributes = True
