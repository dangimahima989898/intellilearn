import uuid
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base


class ChallengeSubmission(Base):
    __tablename__ = "challenge_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("daily_challenges.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    selected_answer = Column(
        Enum("a", "b", "c", "d", name="submission_answer_enum"), nullable=True
    )
    is_correct = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    score_earned = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("challenge_id", "student_id", name="uq_challenge_student"),
    )
