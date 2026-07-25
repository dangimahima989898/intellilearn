import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class AIAnswerReport(Base):
    __tablename__ = "ai_answer_reports"

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    question = Column(Text, nullable=False)
    ai_answer = Column(Text, nullable=False)
    student_reason = Column(String(100), nullable=False) # Incorrect Concept, Wrong Code, Incomplete Answer, Outdated Syllabus, Other
    faculty_decision = Column(String(50), nullable=True) # Correct, Incorrect, Needs Improvement
    faculty_comment = Column(Text, nullable=True)
    status = Column(String(30), default="pending", nullable=False, index=True) # pending, approved, rejected, escalated
    escalated_to_hod = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    subject = relationship("Subject", foreign_keys=[subject_id])
    faculty = relationship("User", foreign_keys=[faculty_id])
