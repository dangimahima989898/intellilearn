from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.subject import Subject
from models.note import Note
from models.question import Question
from models.content_chunks import ContentChunk
from schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut, SubjectWithStats, SubjectArchived
from utils.dependencies import get_current_user, require_admin
from utils.semester_filter import apply_semester_filter
import uuid
import os
from datetime import datetime, timedelta

router = APIRouter()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
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
        icon=subject_data.icon,
        course_id=uuid.UUID(str(subject_data.course_id)) if subject_data.course_id else None,
        semester_number=subject_data.semester_number
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@router.get("", response_model=list[SubjectWithStats])
def get_subjects(
    course_id: str = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    purge_expired_subjects(db)
    query = db.query(Subject).filter(Subject.is_archived == False)
    
    if current_user.role == "student":
        query = apply_semester_filter(query, Subject, current_user)
    else:
        # Admin: optional filter via query params
        if course_id:
            try:
                query = query.filter(Subject.course_id == uuid.UUID(course_id))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid course_id format")
        if semester:
            query = query.filter(Subject.semester_number == semester)
            
    subjects = query.all()
    
    result = []
    for s in subjects:
        notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == s.id).scalar() or 0
        questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == s.id).scalar() or 0
        chunks_count = db.query(func.count(ContentChunk.id)).filter(ContentChunk.subject_id == s.id).scalar() or 0
        result.append({
            **s.__dict__,
            "notes_count": notes_count,
            "questions_count": questions_count,
            "chunks_count": chunks_count
        })
    return result

@router.get("/archived", response_model=list[SubjectArchived])
def get_archived_subjects(db: Session = Depends(get_db), current_user = Depends(require_admin)):
    purge_expired_subjects(db)
    subjects = db.query(Subject).filter(Subject.is_archived == True).all()
    
    result = []
    now = datetime.utcnow()
    for s in subjects:
        notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == s.id).scalar() or 0
        questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == s.id).scalar() or 0
        chunks_count = db.query(func.count(ContentChunk.id)).filter(ContentChunk.subject_id == s.id).scalar() or 0
        
        remaining_days = 15
        if s.archived_at:
            archived_naive = s.archived_at.replace(tzinfo=None)
            diff = now - archived_naive
            remaining_days = max(0, 15 - diff.days)
            
        result.append({
            **s.__dict__,
            "notes_count": notes_count,
            "questions_count": questions_count,
            "chunks_count": chunks_count,
            "remaining_days": remaining_days
        })
    return result

@router.get("/{id}", response_model=SubjectWithStats)
def get_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == subject.id).scalar() or 0
    questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == subject.id).scalar() or 0
    chunks_count = db.query(func.count(ContentChunk.id)).filter(ContentChunk.subject_id == subject.id).scalar() or 0
    
    return {
        **subject.__dict__,
        "notes_count": notes_count,
        "questions_count": questions_count,
        "chunks_count": chunks_count
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
        elif key == "course_id" and value:
            value = uuid.UUID(str(value))
        setattr(subject, key, value)
        
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{id}")
def delete_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject.is_archived = True
    subject.archived_at = datetime.utcnow()
    db.commit()
    return {"message": "Subject moved to Archive. It can be restored within 15 days before being permanently deleted."}


@router.post("/{id}/restore", response_model=SubjectOut)
def restore_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == id, Subject.is_archived == True).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Archived subject not found")
        
    subject.is_archived = False
    subject.archived_at = None
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject_permanent(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    perform_permanent_cascade_delete(id, db)
    return None

def purge_expired_subjects(db: Session):
    cutoff = datetime.utcnow() - timedelta(days=15)
    expired_subjects = db.query(Subject).filter(
        Subject.is_archived == True,
        Subject.archived_at < cutoff
    ).all()
    for s in expired_subjects:
        perform_permanent_cascade_delete(s.id, db)

def perform_permanent_cascade_delete(id: uuid.UUID, db: Session):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        return
        
    # Cascade delete all notes associated with this subject, including files on disk
    notes = db.query(Note).filter(Note.subject_id == id).all()
    for note in notes:
        file_path = os.path.join(".", note.file_url.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing file {file_path}: {e}")
        db.delete(note)

    # Cascade delete all doubts and their related upvotes and answers
    from models.doubt import Doubt
    from models.doubt_answer import DoubtAnswer
    from models.doubt_upvote import DoubtUpvote
    from models.doubt_question_upvote import DoubtQuestionUpvote
    
    doubts = db.query(Doubt).filter(Doubt.subject_id == id).all()
    doubt_ids = [d.id for d in doubts]
    if doubt_ids:
        # Delete doubt answer upvotes
        answers = db.query(DoubtAnswer).filter(DoubtAnswer.doubt_id.in_(doubt_ids)).all()
        answer_ids = [a.id for a in answers]
        if answer_ids:
            db.query(DoubtUpvote).filter(DoubtUpvote.answer_id.in_(answer_ids)).delete(synchronize_session=False)
            
        # Delete doubt question upvotes
        db.query(DoubtQuestionUpvote).filter(DoubtQuestionUpvote.doubt_id.in_(doubt_ids)).delete(synchronize_session=False)
        # Delete doubt answers
        db.query(DoubtAnswer).filter(DoubtAnswer.doubt_id.in_(doubt_ids)).delete(synchronize_session=False)
        # Delete doubts
        db.query(Doubt).filter(Doubt.subject_id == id).delete(synchronize_session=False)

    # Cascade delete all daily challenges and their related challenge submissions
    from models.daily_challenge import DailyChallenge
    from models.challenge_submission import ChallengeSubmission
    
    challenges = db.query(DailyChallenge).filter(DailyChallenge.subject_id == id).all()
    challenge_ids = [c.id for c in challenges]
    if challenge_ids:
        db.query(ChallengeSubmission).filter(ChallengeSubmission.challenge_id.in_(challenge_ids)).delete(synchronize_session=False)
        db.query(DailyChallenge).filter(DailyChallenge.subject_id == id).delete(synchronize_session=False)

    # Cascade delete all quiz attempts (which will cascade to quiz answers via SQLAlchemy relationship)
    from models.quiz_attempt import QuizAttempt
    attempts = db.query(QuizAttempt).filter(QuizAttempt.subject_id == id).all()
    for attempt in attempts:
        db.delete(attempt)
    db.flush()

    # Cascade delete all questions
    db.query(Question).filter(Question.subject_id == id).delete(synchronize_session=False)

    # Cascade delete all timetable entries
    from models.timetable import Timetable
    db.query(Timetable).filter(Timetable.subject_id == id).delete(synchronize_session=False)

    # Cascade delete all RAG content chunks
    db.query(ContentChunk).filter(ContentChunk.subject_id == id).delete(synchronize_session=False)

    # Delete the subject itself
    db.delete(subject)
    db.commit()
