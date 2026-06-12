import uuid
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(
        Enum(
            "exam", "assignment", "hackathon", "competition", "other",
            name="event_type_enum",
        ),
        nullable=False,
    )
    event_date = Column(DateTime(timezone=True), nullable=False)
    reminder_lead_days = Column(Integer, default=1)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Course & Semester columns
    course_id        = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    semester_number  = Column(Integer, nullable=True)   # null = all semesters

