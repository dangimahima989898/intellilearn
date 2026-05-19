from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.timetable import Timetable
from models.subject import Subject
from schemas.timetable import TimetableCreate, TimetableOut
from utils.dependencies import get_current_user, require_admin
import uuid

router = APIRouter()

@router.post("/", response_model=TimetableOut, status_code=status.HTTP_201_CREATED)
def create_timetable_slot(slot_data: TimetableCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == slot_data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    new_slot = Timetable(
        id=uuid.uuid4(),
        subject_id=slot_data.subject_id,
        day_of_week=slot_data.day_of_week,
        start_time=slot_data.start_time,
        end_time=slot_data.end_time,
        room=slot_data.room
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    
    return {
        **new_slot.__dict__,
        "subject_name": subject.name,
        "subject_color": subject.color
    }

@router.get("/", response_model=list[TimetableOut])
def get_timetable(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    results = db.query(Timetable, Subject.name.label("subject_name"), Subject.color.label("subject_color"))\
                .join(Subject, Timetable.subject_id == Subject.id)\
                .all()
                
    return [
        {
            **slot.__dict__,
            "subject_name": subject_name,
            "subject_color": subject_color
        }
        for slot, subject_name, subject_color in results
    ]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable_slot(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    slot = db.query(Timetable).filter(Timetable.id == id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
        
    db.delete(slot)
    db.commit()
    return None
