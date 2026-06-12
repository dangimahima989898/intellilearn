import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class StudentAccessRequest(Base):
    __tablename__ = "student_access_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    enrollment_number = Column(String(30), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    branch = Column(String(100), nullable=False)
    section = Column(String(5), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(
        Enum("pending", "approved", "rejected", name="access_request_status_enum"),
        default="pending",
        nullable=False,
    )
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reviewer = relationship("User", foreign_keys=[reviewed_by])
