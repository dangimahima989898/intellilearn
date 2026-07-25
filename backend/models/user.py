import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, Integer, String, ForeignKey, Float
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
    role = Column(Enum("super_admin", "hod", "faculty", "student", name="user_role"), default="student", nullable=False)
    status = Column(Enum("pending", "approved", "rejected", "deactivated", name="user_status"), default="pending", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    fcm_token = Column(String(500), nullable=True)
    streak_count = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)

    # Legacy Course & Semester columns (will be mapped or moved to student_enrollments later)
    course_id        = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    current_semester = Column(Integer, default=1)          # We keep it as integer for legacy compat
    enrollment_no    = Column(String(30), unique=True, nullable=True)
    roll_number      = Column(String(20), nullable=True)
    section          = Column(String(5),  nullable=True)   # "A" or "B"
    cgpa             = Column(Float,      default=0.0)
    phone            = Column(String(15), nullable=True)
    dob              = Column(Date,       nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    admission_year   = Column(Integer,    nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    branch           = Column(String(100), nullable=True)
    department_id    = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"), nullable=True)
    designation      = Column(String(50), nullable=True)
    eligible_hod     = Column(Boolean, default=False, nullable=False)
    employee_id      = Column(String(50), nullable=True)

    # Relationships
    course = relationship("Course", back_populates="students", foreign_keys=[course_id])
    notes = relationship("Note", back_populates="uploader")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    doubts = relationship("Doubt", back_populates="student")
    notifications = relationship("Notification", back_populates="user")
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    
    # New relationships for University Role System
    enrollments = relationship("StudentEnrollment", back_populates="student", foreign_keys="[StudentEnrollment.student_id]")
    faculty_assignments = relationship("FacultySubjectAssignment", back_populates="faculty", foreign_keys="[FacultySubjectAssignment.faculty_id]")

