import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class DoubtAnswer(Base):
    __tablename__ = "doubt_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    doubt_id = Column(UUID(as_uuid=True), ForeignKey("doubts.id"), nullable=False)
    answered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    is_accepted = Column(Boolean, default=False)
    is_verified_by_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    doubt = relationship("Doubt", back_populates="answers")
    answerer = relationship("User")
