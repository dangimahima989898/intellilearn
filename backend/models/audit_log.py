import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action       = Column(String(100), nullable=False)
    entity_type  = Column(String(100), nullable=False)
    entity_id    = Column(String(100), nullable=True)
    details_json = Column(JSON, nullable=True)
    ip_address   = Column(String(50), nullable=True)
    timestamp    = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class StudentApprovalLog(Base):
    __tablename__ = "student_approval_log"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action       = Column(Enum("approved", "rejected", "correction", name="approval_action"), nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason       = Column(String(500), nullable=True)
    timestamp    = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User", foreign_keys=[student_id])
    performer = relationship("User", foreign_keys=[performed_by])
