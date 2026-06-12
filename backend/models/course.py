from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

class Course(Base):
    __tablename__ = "courses"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(100), nullable=False)     # "Master of Computer Applications"
    code             = Column(String(20),  unique=True, nullable=False)  # "MCA"
    total_semesters  = Column(Integer,     nullable=False)     # 6 for MCA, 4 for MSc
    duration_years   = Column(Integer,     nullable=False)     # 3 for MCA, 2 for MSc
    description      = Column(String(500), nullable=True)
    is_active        = Column(Boolean,     default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    students   = relationship("User",    back_populates="course")
    subjects   = relationship("Subject", back_populates="course")
