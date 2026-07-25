"""
StudentPerformanceSummary model — stores aggregate academic readiness metrics per student.
Updated by the adaptive assessment engine after completing quizzes.
"""

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class StudentPerformanceSummary(Base):
    __tablename__ = "student_performance_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    total_quizzes = Column(Integer, default=0, nullable=False)
    average_accuracy = Column(Float, default=0.0, nullable=False)
    
    # JSON list of weak topics, e.g. ["SQL Normalization", "Dijkstra's Algorithm"]
    weak_topics = Column(Text, nullable=True)
    
    # Estimated exam readiness from 0.0 to 100.0
    predicted_readiness = Column(Float, default=0.0, nullable=False)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("User")
    subject = relationship("Subject")
