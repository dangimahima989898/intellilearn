from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.event import Event
from models.user import User
from schemas.event import EventCreate, EventOut
from utils.dependencies import get_current_user, require_admin, require_hod_or_admin
import uuid
from datetime import datetime, date
from utils.firebase import send_to_all_students

router = APIRouter()

def serialize_event(event: Event, created_by_name: str, days_until: int) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "event_date": event.event_date,
        "reminder_lead_days": event.reminder_lead_days,
        "created_by_name": created_by_name,
        "created_at": event.created_at,
        "days_until": days_until,
        "course_id": event.course_id,
        "semester_number": event.semester_number,
    }

@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(event_data: EventCreate, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
    new_event = Event(
        id=uuid.uuid4(),
        title=event_data.title,
        description=event_data.description,
        event_type=event_data.event_type.lower().strip(),
        event_date=event_data.event_date.replace(tzinfo=None), # Ensure naive datetime for easy comparison
        reminder_lead_days=event_data.reminder_lead_days,
        created_by=current_user.id,
        course_id=event_data.course_id,
        semester_number=event_data.semester_number
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Simulate Firebase push notification
    print(f"[NOTIFICATION] [Push Notification Simulator] Sent to all students: New Event '{new_event.title}' scheduled for {new_event.event_date}")
    
    send_to_all_students(
        db=db,
        title=f"📅 New Event: {new_event.title}",
        body=f"{new_event.event_type.capitalize()} scheduled for {new_event.event_date.strftime('%B %d, %Y')}",
        data={"event_id": str(new_event.id), "type": "event"}
    )
    
    days_until = (new_event.event_date.date() - date.today()).days
    
    return serialize_event(new_event, current_user.name, days_until)

@router.get("", response_model=list[EventOut])
def get_events(
    event_type: str = None,
    course_id: uuid.UUID = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Event, User.name.label("created_by_name")).join(User, Event.created_by == User.id)
    
    if current_user.role == "student":
        # Student sees events belonging to their course OR generic events (course_id is null)
        # AND belonging to their semester OR generic semester (semester_number is null)
        course_filter = (Event.course_id == current_user.course_id) | (Event.course_id == None)
        semester_filter = (Event.semester_number == current_user.current_semester) | (Event.semester_number == None)
        query = query.filter(course_filter & semester_filter)
    else:
        # Admin: optional filter via query params
        if course_id:
            query = query.filter(Event.course_id == course_id)
        if semester:
            query = query.filter(Event.semester_number == semester)
            
    if event_type:
        query = query.filter(Event.event_type == event_type.lower().strip())
        
    results = query.order_by(Event.event_date.asc()).all()
    
    today = date.today()
    out = []
    for event, creator_name in results:
        days_until = (event.event_date.date() - today).days
        out.append(serialize_event(event, creator_name, days_until))
    return out

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    db.delete(event)
    db.commit()
    return None
