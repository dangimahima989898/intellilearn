import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class StudentActivityLog(Base):
    __tablename__ = "student_activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "login", "chatbot_query", "view_notes", "attempt_quiz"
    details = Column(Text, nullable=True)  # Optional JSON-encoded or descriptive details
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    student = relationship("User")
