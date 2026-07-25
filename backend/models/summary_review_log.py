import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class SummaryReviewLog(Base):
    __tablename__ = "summary_review_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    summary_id = Column(UUID(as_uuid=True), ForeignKey("note_summaries.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    action = Column(String(50), nullable=False)  # APPROVED, REJECTED, EDITED & APPROVED
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    summary = relationship("NoteSummary", back_populates="review_logs")
    faculty = relationship("User")
