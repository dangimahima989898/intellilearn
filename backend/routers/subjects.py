from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.subject import Subject
from models.note import Note
from models.question import Question
from schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut, SubjectWithStats
from utils.dependencies import get_current_user, require_admin
import uuid

router = APIRouter()

@router.post("/", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(subject_data: SubjectCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    existing = db.query(Subject).filter(Subject.code == subject_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    
    new_subject = Subject(
        id=uuid.uuid4(),
        name=subject_data.name.strip(),
        code=subject_data.code.upper().strip(),
        description=subject_data.description,
        color=subject_data.color,
        icon=subject_data.icon
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@router.get("/", response_model=list[SubjectWithStats])
def get_subjects(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    subjects = db.query(Subject).all()
    
    # In a production app you'd do a left join with func.count(), doing multiple queries here for simplicity 
    # since subjects list is usually small
    result = []
    for s in subjects:
        notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == s.id).scalar() or 0
        questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == s.id).scalar() or 0
        result.append({
            **s.__dict__,
            "notes_count": notes_count,
            "questions_count": questions_count
        })
    return result

@router.get("/{id}", response_model=SubjectWithStats)
def get_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == subject.id).scalar() or 0
    questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == subject.id).scalar() or 0
    
    return {
        **subject.__dict__,
        "notes_count": notes_count,
        "questions_count": questions_count
    }

@router.put("/{id}", response_model=SubjectOut)
def update_subject(id: uuid.UUID, subject_data: SubjectUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    if subject_data.code and subject_data.code.upper() != subject.code:
        existing = db.query(Subject).filter(Subject.code == subject_data.code.upper()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Subject code already exists")
            
    update_data = subject_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "code":
            value = value.upper().strip()
        elif key == "name":
            value = value.strip()
        setattr(subject, key, value)
        
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    notes_exist = db.query(Note).filter(Note.subject_id == id).first()
    if notes_exist:
        raise HTTPException(status_code=400, detail="Cannot delete subject with existing notes. Delete notes first.")
        
    db.delete(subject)
    db.commit()
    return None
