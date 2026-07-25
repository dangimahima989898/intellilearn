import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    topic = Column(String(200), nullable=False)
    unit = Column(String(100), nullable=True) # e.g. "Unit 1", "Unit 2"
    question_text = Column(Text, nullable=False)
    option_a = Column(String(500), nullable=False)
    option_b = Column(String(500), nullable=False)
    option_c = Column(String(500), nullable=False)
    option_d = Column(String(500), nullable=False)
    correct_answer = Column(
        Enum("a", "b", "c", "d", name="answer_enum"), nullable=False
    )
    explanation = Column(Text, nullable=True)
    difficulty = Column(
        Enum("easy", "medium", "hard", name="difficulty_enum"), nullable=False
    )
    estimated_time_seconds = Column(Integer, default=30, nullable=False)
    bloom_taxonomy_level = Column(String(100), default="Understand", nullable=False) # Remember, Understand, Apply, Analyze
    generated_by_ai = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    subject = relationship("Subject", back_populates="questions")
