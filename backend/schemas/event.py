from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import uuid

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    event_date: datetime
    reminder_lead_days: int = 1

class EventOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    event_type: str
    event_date: datetime
    reminder_lead_days: int
    created_by_name: Optional[str] = None
    created_at: datetime
    days_until: Optional[int] = 0

    class Config:
        from_attributes = True
