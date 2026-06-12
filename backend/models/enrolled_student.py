import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base


class EnrolledStudent(Base):
    __tablename__ = "enrolled_students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    enrollment_number = Column(String(30), unique=True, nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    branch = Column(String(100), nullable=False)
    section = Column(String(5), nullable=False)
    academic_year = Column(String(20), nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    credentials_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
