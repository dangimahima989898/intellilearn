import uuid
from sqlalchemy import Column, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class FacultyAvailability(Base):
    __tablename__ = "faculty_availabilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    unavailable_slots = Column(Text, nullable=True) # JSON string: [{"day_of_week": "Monday", "start_time": "09:00", "end_time": "11:00"}]
