import uuid
from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class DoubtQuestionUpvote(Base):
    __tablename__ = "doubt_question_upvotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    doubt_id = Column(UUID(as_uuid=True), ForeignKey("doubts.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "doubt_id", name="uq_user_doubt_upvote"),
    )
