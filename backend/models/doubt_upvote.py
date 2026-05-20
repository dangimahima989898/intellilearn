import uuid
from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class DoubtUpvote(Base):
    __tablename__ = "doubt_upvotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    answer_id = Column(UUID(as_uuid=True), ForeignKey("doubt_answers.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "answer_id", name="uq_student_answer_upvote"),
    )
