import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    accepted_answer_id = Column(UUID(as_uuid=True), nullable=True)
    vote_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", back_populates="doubts")
    subject = relationship("Subject")
    answers = relationship("DoubtAnswer", back_populates="doubt")
