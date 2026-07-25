from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import uuid


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "student"
    course_id: Optional[str] = None        # required for students
    current_semester: Optional[int] = 1
    enrollment_no: Optional[str] = None
    roll_number: Optional[str] = None
    section: Optional[str] = None
    phone: Optional[str] = None
    admission_year: Optional[int] = None

    @field_validator('current_semester')
    @classmethod
    def validate_semester(cls, v):
        if v is not None and not (1 <= v <= 6):
            raise ValueError('Semester must be between 1 and 6')
        return v

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ["admin", "student", "faculty", "hod", "super_admin"]:
            raise ValueError("Invalid role")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    user_id: str
    email: str
    course_id: Optional[uuid.UUID] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    current_semester: Optional[int] = None
    enrollment_no: Optional[str] = None
    section: Optional[str] = None
    must_change_password: Optional[bool] = False



class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    streak_count: int
    fcm_token: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateFCMToken(BaseModel):
    fcm_token: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters")
        return v
