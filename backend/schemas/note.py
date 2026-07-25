from pydantic import BaseModel
from typing import Optional, List
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

# New schemas for Smart Notes Summarizer
class UploadedNoteOut(BaseModel):
    id: uuid.UUID
    title: str
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    unit: str
    file_url: str
    file_size_kb: Optional[int] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NoteSummaryOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    status: str
    current_version: int
    rejection_comment: Optional[str] = None
    views_count: int
    avg_read_time_seconds: float
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SummaryVersionOut(BaseModel):
    id: uuid.UUID
    summary_id: uuid.UUID
    version_number: int
    summary_text: str
    created_by_ai: bool
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SummaryFeedbackSubmit(BaseModel):
    is_helpful: bool
    time_spent_seconds: int

class SummaryApproveRequest(BaseModel):
    summary_text: str

class SummaryRejectRequest(BaseModel):
    reason: str

class NoteAnalyticsItem(BaseModel):
    note_id: uuid.UUID
    title: str
    subject_name: str
    unit: str
    views_count: int
    avg_read_time_seconds: float
    helpfulness_percentage: float
    status: str
    helpful_count: int
    not_helpful_count: int

class NoteAnalyticsResponse(BaseModel):
    total_uploaded: int
    total_approved: int
    total_pending: int
    total_rejected: int
    items: List[NoteAnalyticsItem]
