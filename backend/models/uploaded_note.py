import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class UploadedNote(Base):
    __tablename__ = "uploaded_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    unit = Column(String(100), nullable=False)  # e.g., "Unit 1", "Unit 2"
    file_url = Column(String(500), nullable=False)
    file_size_kb = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)  # Extracted text from PDF
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processing_status = Column(String(20), default="pending")
    processing_error = Column(JSONB, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    subject = relationship("Subject")
    uploader = relationship("User")
    summaries = relationship("NoteSummary", back_populates="note", cascade="all, delete-orphan")
    chunks = relationship("ContentChunk", back_populates="note", cascade="all, delete-orphan")
