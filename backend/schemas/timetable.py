from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import date

class TimetableCreate(BaseModel):
    subject_id: uuid.UUID
    faculty_id: Optional[uuid.UUID] = None
    day_of_week: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None
    is_lab: Optional[bool] = False
    status: Optional[str] = "draft"
    substitute_faculty_id: Optional[uuid.UUID] = None
    date: Optional[date] = None

class TimetableOut(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    faculty_id: Optional[uuid.UUID] = None
    faculty_name: Optional[str] = None
    faculty_on_leave: Optional[bool] = False
    day_of_week: str
    start_time: str
    end_time: str
    room: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None
    is_lab: bool = False
    status: str = "draft"
    substitute_faculty_id: Optional[uuid.UUID] = None
    substitute_faculty_name: Optional[str] = None
    date: Optional[date] = None

    class Config:
        from_attributes = True


class TimetableUpdate(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    faculty_id: Optional[uuid.UUID] = None
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    course_id: Optional[uuid.UUID] = None
    semester_number: Optional[int] = None
    is_lab: Optional[bool] = None
    status: Optional[str] = None
    substitute_faculty_id: Optional[uuid.UUID] = None
    date: Optional[date] = None
