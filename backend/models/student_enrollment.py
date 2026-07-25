import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id           = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    current_semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"), nullable=False)
    enrollment_number   = Column(String(50), unique=True, nullable=True)
    id_card_url         = Column(String(500), nullable=True)
    approval_status     = Column(Enum("pending", "approved", "rejected", "correction", name="approval_status"), default="pending", nullable=False)
    approved_by         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approval_note       = Column(String(500), nullable=True)
    applied_at          = Column(DateTime(timezone=True), server_default=func.now())
    approved_at         = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], back_populates="enrollments")
    course = relationship("Course")
    semester = relationship("Semester")
