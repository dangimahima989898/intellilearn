import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Enum, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class FacultyLeaveRequest(Base):
    __tablename__ = "faculty_leave_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum("pending", "approved", "rejected", name="leave_status_enum"), default="pending", nullable=False)
    reviewed_by_hod_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_hod_id])
