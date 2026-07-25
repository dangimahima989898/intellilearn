import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Semester(Base):
    __tablename__ = "semesters"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id        = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    semester_number  = Column(Integer, nullable=False)     # e.g. 1, 2, 3, 4
    academic_year    = Column(String(20), nullable=True)   # e.g. "2024-2025"
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course = relationship("Course", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester")
