import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class FacultySubjectAssignment(Base):
    __tablename__ = "faculty_subject_assignments"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id       = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    role             = Column(Enum("primary", "secondary", name="faculty_role"), default="primary", nullable=False)
    assigned_by_hod_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_at      = Column(DateTime(timezone=True), server_default=func.now())
    approval_status  = Column(String(20), default="approved", nullable=False)

    # Relationships
    faculty = relationship("User", foreign_keys=[faculty_id], back_populates="faculty_assignments")
    subject = relationship("Subject", back_populates="faculty_assignments")
