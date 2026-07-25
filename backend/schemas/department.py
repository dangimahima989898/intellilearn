from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class DepartmentBase(BaseModel):
    department_name: str = Field(..., min_length=3, max_length=100)
    department_code: str = Field(..., min_length=2, max_length=20)
    department_type: str = Field(..., description="Engineering, Management, Science, Arts, Commerce, Medical, Law, Other")
    total_semesters: int = Field(..., ge=2, le=10)
    description: Optional[str] = Field(None, max_length=300)
    status: Optional[str] = "Active"

class DepartmentCreate(DepartmentBase):
    hod_id: Optional[uuid.UUID] = None

class DepartmentUpdate(BaseModel):
    department_name: Optional[str] = Field(None, min_length=3, max_length=100)
    department_code: Optional[str] = Field(None, min_length=2, max_length=20)
    department_type: Optional[str] = Field(None)
    total_semesters: Optional[int] = Field(None, ge=2, le=10)
    hod_id: Optional[uuid.UUID] = None
    description: Optional[str] = Field(None, max_length=300)
    status: Optional[str] = None

class DepartmentOut(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    department_name: str
    department_code: str
    department_type: str
    total_semesters: int
    hod_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Extra HOD info
    hod_name: Optional[str] = None
    
    # Dynamic counts
    students: Optional[int] = 0
    faculty: Optional[int] = 0
    subjects: Optional[int] = 0

    class Config:
        from_attributes = True
