from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.timetable import Timetable
from models.subject import Subject
from schemas.timetable import TimetableCreate, TimetableOut
from utils.dependencies import get_current_user, require_admin
from utils.semester_filter import apply_semester_filter
import uuid

router = APIRouter()

@router.post("/", response_model=TimetableOut, status_code=status.HTTP_201_CREATED)
def create_timetable_slot(slot_data: TimetableCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    if not slot_data.course_id or not slot_data.semester_number:
        raise HTTPException(status_code=400, detail="course_id and semester_number are required for admin creation.")

    subject = db.query(Subject).filter(Subject.id == slot_data.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    # Check for duplicate slot
    duplicate = db.query(Timetable).filter(
        Timetable.subject_id == slot_data.subject_id,
        Timetable.day_of_week == slot_data.day_of_week,
        Timetable.start_time == slot_data.start_time,
        Timetable.end_time == slot_data.end_time
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="A timetable slot for this subject at this day and time already exists.")
        
    new_slot = Timetable(
        id=uuid.uuid4(),
        subject_id=slot_data.subject_id,
        day_of_week=slot_data.day_of_week,
        start_time=slot_data.start_time,
        end_time=slot_data.end_time,
        room=slot_data.room,
        course_id=slot_data.course_id,
        semester_number=slot_data.semester_number
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    
    return {
        "id": new_slot.id,
        "subject_id": new_slot.subject_id,
        "subject_name": subject.name,
        "subject_color": subject.color,
        "day_of_week": new_slot.day_of_week,
        "start_time": new_slot.start_time.strftime("%H:%M") if hasattr(new_slot.start_time, "strftime") else str(new_slot.start_time),
        "end_time": new_slot.end_time.strftime("%H:%M") if hasattr(new_slot.end_time, "strftime") else str(new_slot.end_time),
        "room": new_slot.room,
        "course_id": new_slot.course_id,
        "semester_number": new_slot.semester_number
    }

@router.get("/", response_model=list[TimetableOut])
def get_timetable(
    course_id: uuid.UUID = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Timetable, Subject.name.label("subject_name"), Subject.color.label("subject_color"))\
              .join(Subject, Timetable.subject_id == Subject.id)\
              .filter(Subject.is_archived == False)

    if current_user.role == "student":
        query = apply_semester_filter(query, Timetable, current_user)
    else:
        if course_id:
            query = query.filter(Timetable.course_id == course_id)
        if semester:
            query = query.filter(Timetable.semester_number == semester)

    results = query.all()
                
    return [
        {
            "id": slot.id,
            "subject_id": slot.subject_id,
            "subject_name": subject_name,
            "subject_color": subject_color,
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time.strftime("%H:%M") if hasattr(slot.start_time, "strftime") else str(slot.start_time),
            "end_time": slot.end_time.strftime("%H:%M") if hasattr(slot.end_time, "strftime") else str(slot.end_time),
            "room": slot.room,
            "course_id": slot.course_id,
            "semester_number": slot.semester_number
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
