import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id   = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    semester_id  = Column(UUID(as_uuid=True), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    exam_date    = Column(DateTime(timezone=True), nullable=False)
    room         = Column(String(50), nullable=False)
    total_marks  = Column(Integer, default=100, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject")
    semester = relationship("Semester")
