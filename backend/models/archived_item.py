import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ArchivedItem(Base):
    __tablename__ = "archived_items"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id      = Column(UUID(as_uuid=True), nullable=False, index=True)
    item_type    = Column(String(50), nullable=False, index=True)  # "subject", "note", "announcement"
    name         = Column(String(255), nullable=False)
    department   = Column(String(100), nullable=True)
    details      = Column(Text, nullable=True)  # Optional descriptive string or json
    archived_by  = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    archived_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    original_data = Column(JSON, nullable=True)  # To store serialization of the archived record

    archiver = relationship("User", foreign_keys=[archived_by])
