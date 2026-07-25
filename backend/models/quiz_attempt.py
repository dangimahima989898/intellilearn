import uuid
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False, index=True)
    topic = Column(String(200), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)
    total_questions = Column(Integer, default=10)
    correct_count = Column(Integer, nullable=True)
    difficulty_used = Column(
        Enum("easy", "medium", "hard", name="quiz_difficulty_enum"), nullable=False
    )
    current_difficulty = Column(String(50), default="medium", nullable=False)
    consecutive_correct = Column(Integer, default=0, nullable=False)
    consecutive_wrong = Column(Integer, default=0, nullable=False)

    # Relationships
    student = relationship("User", back_populates="quiz_attempts")
    subject = relationship("Subject")
    answers = relationship(
        "QuizAnswer", back_populates="attempt", cascade="all, delete-orphan"
    )
