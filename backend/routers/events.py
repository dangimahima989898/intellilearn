from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.event import Event
from models.user import User
from schemas.event import EventCreate, EventOut
from utils.dependencies import get_current_user, require_admin
import uuid
from datetime import datetime, date

router = APIRouter()

@router.post("/", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(event_data: EventCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    new_event = Event(
        id=uuid.uuid4(),
        title=event_data.title,
        description=event_data.description,
        event_type=event_data.event_type,
        event_date=event_data.event_date.replace(tzinfo=None), # Ensure naive datetime for easy comparison
        reminder_lead_days=event_data.reminder_lead_days,
        created_by=current_user.id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Simulate Firebase push notification
    print(f"🔔 [Push Notification Simulator] Sent to all students: New Event '{new_event.title}' scheduled for {new_event.event_date}")
    
    days_until = (new_event.event_date.date() - date.today()).days
    
    return {
        **new_event.__dict__,
        "created_by_name": current_user.name,
        "days_until": days_until
    }

@router.get("/", response_model=list[EventOut])
def get_events(event_type: str = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Event, User.name.label("created_by_name")).join(User, Event.created_by == User.id)
    
    if event_type:
        query = query.filter(Event.event_type == event_type)
        
    results = query.order_by(Event.event_date.asc()).all()
    
    today = date.today()
    out = []
    for event, creator_name in results:
        days_until = (event.event_date.date() - today).days
        out.append({
            **event.__dict__,
            "created_by_name": creator_name,
            "days_until": days_until
        })
    return out

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    db.delete(event)
    db.commit()
    return None
