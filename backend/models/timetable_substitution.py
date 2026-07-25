import uuid
from sqlalchemy import Column, ForeignKey, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class TimetableSubstitution(Base):
    __tablename__ = "timetable_substitutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    timetable_id = Column(UUID(as_uuid=True), ForeignKey("timetable.id", ondelete="CASCADE"), nullable=False)
    original_faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    substitute_faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    timetable = relationship("Timetable")
    original_faculty = relationship("User", foreign_keys=[original_faculty_id])
    substitute_faculty = relationship("User", foreign_keys=[substitute_faculty_id])
