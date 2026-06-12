import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class StudentAccessRequestCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    enrollment_number: str = Field(..., min_length=2, max_length=30)
    semester: int = Field(..., ge=1, le=8)
    branch: str = Field(..., min_length=2, max_length=100)
    section: str = Field(..., min_length=1, max_length=5)
    reason: Optional[str] = None


class StudentAccessRequestOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    enrollment_number: str
    semester: int
    branch: str
    section: str
    reason: Optional[str]
    status: str
    reviewed_by: Optional[uuid.UUID]
    reviewed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AccessRequestReview(BaseModel):
    rejection_reason: Optional[str] = None
    override: Optional[bool] = False


class EnrolledStudentOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    enrollment_number: str
    semester: int
    branch: str
    section: str
    academic_year: str
    is_approved: bool
    credentials_sent: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ManualEnrollmentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    enrollment_number: str = Field(..., min_length=2, max_length=30)
    semester: int = Field(..., ge=1, le=8)
    branch: str = Field(..., min_length=2, max_length=100)
    section: str = Field(..., min_length=1, max_length=5)
    academic_year: str = Field(..., min_length=4, max_length=20)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
