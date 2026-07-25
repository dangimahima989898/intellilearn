import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class SummaryVersion(Base):
    __tablename__ = "summary_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    summary_id = Column(UUID(as_uuid=True), ForeignKey("note_summaries.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    summary_text = Column(Text, nullable=False)  # Markdown text containing the summary sections
    
    created_by_ai = Column(Boolean, default=True, nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    summary = relationship("NoteSummary", back_populates="versions")
    approver = relationship("User")
