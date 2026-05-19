import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("admin", "student", name="user_role"), default="student", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    fcm_token = Column(String(500), nullable=True)
    streak_count = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)

    # Relationships
    notes = relationship("Note", back_populates="uploader")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    doubts = relationship("Doubt", back_populates="student")
    notifications = relationship("Notification", back_populates="user")
