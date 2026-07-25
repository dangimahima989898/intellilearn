import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class NoteSummary(Base):
    __tablename__ = "note_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    note_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Status: DRAFT, UNDER_REVIEW, APPROVED, REJECTED
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    current_version = Column(Integer, default=1, nullable=False)
    rejection_comment = Column(Text, nullable=True)
    
    # Analytics / Student Feedback tracking
    views_count = Column(Integer, default=0, nullable=False)
    avg_read_time_seconds = Column(Float, default=0.0, nullable=False)
    total_read_time_seconds = Column(Float, default=0.0, nullable=False)
    helpful_count = Column(Integer, default=0, nullable=False)
    not_helpful_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    note = relationship("UploadedNote", back_populates="summaries")
    versions = relationship("SummaryVersion", back_populates="summary", cascade="all, delete-orphan")
    feedbacks = relationship("SummaryFeedback", back_populates="summary", cascade="all, delete-orphan")
    review_logs = relationship("SummaryReviewLog", back_populates="summary", cascade="all, delete-orphan")
