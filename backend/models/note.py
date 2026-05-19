import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(
        Enum("pdf", "docx", "ppt", "pptx", "other", name="file_type_enum"),
        nullable=False,
    )
    file_size_kb = Column(Integer, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    summary = Column(Text, nullable=True)
    download_count = Column(Integer, default=0)

    # Relationships
    subject = relationship("Subject", back_populates="notes")
    uploader = relationship("User", back_populates="notes")
