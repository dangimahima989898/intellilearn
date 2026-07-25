import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class SummaryFeedback(Base):
    __tablename__ = "summary_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    summary_id = Column(UUID(as_uuid=True), ForeignKey("note_summaries.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    is_helpful = Column(Boolean, nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    summary = relationship("NoteSummary", back_populates="feedbacks")
    student = relationship("User")
