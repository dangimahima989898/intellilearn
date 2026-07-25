import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Float, Boolean, DateTime, Enum, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class PlacementTest(Base):
    __tablename__ = "placement_tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    test_type = Column(Enum("aptitude", "coding", "mixed", name="placement_test_type"), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    difficulty = Column(Enum("easy", "medium", "hard", name="placement_test_difficulty"), nullable=False, index=True)
    description = Column(Text, nullable=True)
    total_marks = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")
    attempts = relationship("TestAttempt", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    test_id = Column(UUID(as_uuid=True), ForeignKey("placement_tests.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum("mcq", "coding", "fill", name="placement_question_type"), nullable=False)
    options = Column(JSON, nullable=True)  # JSONB on Postgres
    correct_answer = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=True)
    expected_output = Column(Text, nullable=True)
    marks = Column(Integer, nullable=False)
    section = Column(String(100), nullable=False)
    order_index = Column(Integer, nullable=False)

    # Relationships
    test = relationship("PlacementTest", back_populates="questions")
    answers = relationship("AttemptAnswer", back_populates="question", cascade="all, delete-orphan")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    test_id = Column(UUID(as_uuid=True), ForeignKey("placement_tests.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)
    total_marks = Column(Integer, nullable=False)
    time_taken_seconds = Column(Integer, nullable=True)
    status = Column(Enum("in_progress", "submitted", "timed_out", name="placement_attempt_status"), nullable=False)
    section_scores = Column(JSON, nullable=True)
    tab_switches = Column(Integer, default=0, nullable=False)

    # Relationships
    user = relationship("User")
    test = relationship("PlacementTest", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("test_attempts.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("test_questions.id"), nullable=False)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    marked_for_review = Column(Boolean, default=False, nullable=False)

    # Relationships
    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("TestQuestion", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
    )
