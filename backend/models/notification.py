import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column("notification_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    recipient_user_id = Column("recipient_user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_role = Column(String(50), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column("message", Text, nullable=False)
    module = Column(String(50), nullable=True, index=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    priority = Column(String(20), default="Medium", nullable=False, index=True) # High, Medium, Low
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Backward compatibility synonyms
    user_id = synonym("recipient_user_id")
    body = synonym("message")
    sent_at = synonym("created_at")

    # Relationship
    user = relationship("User", foreign_keys=[recipient_user_id], back_populates="notifications")
