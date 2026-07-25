import uuid
from sqlalchemy import Column, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class DailyActiveUsers(Base):
    __tablename__ = "daily_active_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    users_count = Column(Integer, default=0, nullable=False)
