import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Time, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    day_of_week = Column(
        Enum(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
            name="day_enum",
        ),
        nullable=False,
    )
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Course & Semester columns
    course_id        = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    semester_number  = Column(Integer, nullable=True)

    # Relationships
    subject = relationship("Subject", back_populates="timetable")

