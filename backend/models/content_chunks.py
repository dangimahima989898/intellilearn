import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class ContentChunk(Base):
    __tablename__ = "content_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    topic_hint = Column(String(200), nullable=True)   # optional tag set by admin or extracted
    source_file = Column(String(255), nullable=True)  # original filename
    chunk_index = Column(Integer, default=0)          # ordering within source
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    embedding = Column(Vector(384), nullable=True)
    note_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_notes.id", ondelete="CASCADE"), nullable=True, index=True)
    processing_status = Column(String(20), default="pending")

    # Relationships
    subject = relationship("Subject", back_populates="content_chunks")
    note = relationship("UploadedNote", back_populates="chunks")
