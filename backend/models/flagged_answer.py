"""
FlaggedAnswer model — stores student-reported incorrect AI responses.
Each record links to a ChatLog entry and captures the student's reason
for flagging. Admins review via GET /admin/flagged-answers.
"""

import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class FlaggedAnswer(Base):
    __tablename__ = "flagged_answers"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # The specific chat message that was flagged
    chat_log_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Student who submitted the flag
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Free-text reason from the student
    flag_reason = Column(Text, nullable=False)

    # Admin review status: pending → approved (AI was wrong) | dismissed (AI was right)
    status = Column(
        Enum("pending", "approved", "dismissed", name="flag_status"),
        default="pending",
        nullable=False,
        index=True,
    )

    # Optional admin note when reviewing
    admin_note = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Admin who reviewed this flag
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships for eager loading
    student = relationship("User", foreign_keys=[student_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    chat_log = relationship("ChatLog")
