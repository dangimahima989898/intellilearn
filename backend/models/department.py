import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Department(Base):
    __tablename__ = "departments"

    department_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    department_name = Column(String(100), unique=True, nullable=False)
    department_code = Column(String(20), unique=True, nullable=False)
    department_type = Column(String(50), nullable=False, default="Science")
    total_semesters = Column(Integer, nullable=False, default=8)
    hod_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="Active", nullable=False)  # "Active" or "Inactive"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    subjects = relationship("Subject", back_populates="department")
    courses = relationship("Course", back_populates="department")
    hod = relationship("User", foreign_keys=[hod_id])
    users = relationship("User", back_populates="department", foreign_keys="[User.department_id]")

    @property
    def id(self):
        return self.department_id
