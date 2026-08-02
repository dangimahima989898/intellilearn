from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models.subject import Subject
from models.note import Note
from models.question import Question
from models.content_chunks import ContentChunk
from models.faculty_subject_assignment import FacultySubjectAssignment
from schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut, SubjectWithStats, SubjectArchived
from utils.dependencies import get_current_user, require_hod_or_admin
from utils.semester_filter import apply_semester_filter
import uuid
import os
import shutil
from datetime import datetime, timedelta

router = APIRouter()

def serialize_subject(subject: Subject) -> dict:
    subj_dict = {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "description": subject.description,
        "created_by": subject.created_by,
        "created_at": subject.created_at,
        "color": subject.color,
        "icon": subject.icon,
        "is_archived": subject.is_archived,
        "archived_at": subject.archived_at,
        "course_id": subject.course_id,
        "department_id": subject.department_id,
        "semester_id": subject.semester_id,
        "semester_number": subject.semester_number,
        "credit_hours": subject.credit_hours,
        "syllabus_pdf_url": subject.syllabus_pdf_url,
        "syllabus_text": subject.syllabus_text,
        "co_po_mappings": subject.co_po_mappings,
        "revision_history": subject.revision_history,
        "ownership_history": subject.ownership_history,
    }
    subj_dict["topics_list"] = subject.get_topics()
    
    assignments = []
    for a in subject.faculty_assignments:
        assignments.append({
            "id": a.id,
            "faculty_id": a.faculty_id,
            "faculty_name": a.faculty.name if a.faculty else None,
            "role": a.role
        })
    subj_dict["faculty_assignments"] = assignments
    return subj_dict

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(subject_data: SubjectCreate, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
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
        department_id=uuid.UUID(str(subject_data.department_id)) if subject_data.department_id else None,
        semester_number=subject_data.semester_number,
        co_po_mappings=subject_data.co_po_mappings,
        revision_history=subject_data.revision_history,
        ownership_history=subject_data.ownership_history,
        credit_hours=subject_data.credit_hours,
        syllabus_text=subject_data.syllabus_text
    )
    if subject_data.topics_list:
        new_subject.set_topics(subject_data.topics_list)
        
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    
    return serialize_subject(new_subject)

@router.get("", response_model=list[SubjectWithStats])
def get_subjects(
    course_id: str = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Note: purge_expired_subjects runs at startup only, not on every GET
    query = db.query(Subject).options(
        joinedload(Subject.faculty_assignments).joinedload(FacultySubjectAssignment.faculty)
    ).filter(Subject.is_archived == False)

    
    if current_user.role == "student":
        query = apply_semester_filter(query, Subject, current_user)
    elif current_user.role == "faculty":
        query = query.join(FacultySubjectAssignment).filter(FacultySubjectAssignment.faculty_id == current_user.id)
    elif current_user.role == "hod":
        query = query.filter(Subject.department_id == current_user.department_id)
        if course_id:
            try:
                course_uuid = uuid.UUID(course_id)
                query = query.filter(Subject.course_id == course_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid course_id format")
        if semester:
            query = query.filter(Subject.semester_number == semester)
    else:
        if course_id:
            try:
                course_uuid = uuid.UUID(course_id)
                from models.course import Course as DbCourse
                course_obj = db.query(DbCourse).filter(DbCourse.id == course_uuid).first()
                if course_obj and course_obj.department_id:
                    query = query.filter(
                        (Subject.course_id == course_uuid) |
                        (Subject.department_id == course_obj.department_id)
                    )
                else:
                    query = query.filter(Subject.course_id == course_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid course_id format")
        if semester:
            query = query.filter(Subject.semester_number == semester)
            
    subjects = query.all()
    if not subjects:
        return []

    # Bulk aggregate counts with a single query per table (avoid N+1)
    subject_ids = [s.id for s in subjects]
    
    notes_counts = {r[0]: r[1] for r in db.query(Note.subject_id, func.count(Note.id))
                    .filter(Note.subject_id.in_(subject_ids)).group_by(Note.subject_id).all()}
                    
    # Also fetch approved summaries count
    from models.uploaded_note import UploadedNote
    from models.note_summary import NoteSummary
    approved_summaries_counts = {r[0]: r[1] for r in db.query(UploadedNote.subject_id, func.count(NoteSummary.id))
                                 .join(NoteSummary, NoteSummary.note_id == UploadedNote.id)
                                 .filter(UploadedNote.subject_id.in_(subject_ids), NoteSummary.status == "APPROVED")
                                 .group_by(UploadedNote.subject_id).all()}
                                 
    questions_counts = {r[0]: r[1] for r in db.query(Question.subject_id, func.count(Question.id))
                        .filter(Question.subject_id.in_(subject_ids)).group_by(Question.subject_id).all()}
    chunks_counts = {r[0]: r[1] for r in db.query(ContentChunk.subject_id, func.count(ContentChunk.id))
                     .filter(ContentChunk.subject_id.in_(subject_ids)).group_by(ContentChunk.subject_id).all()}
    
    result = []
    for s in subjects:
        total_notes = notes_counts.get(s.id, 0) + approved_summaries_counts.get(s.id, 0)
        result.append({
            **serialize_subject(s),
            "notes_count": total_notes,
            "questions_count": questions_counts.get(s.id, 0),
            "chunks_count": chunks_counts.get(s.id, 0)
        })
    return result

@router.get("/archived", response_model=list[SubjectArchived])
def get_archived_subjects(db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
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
            **serialize_subject(s),
            "notes_count": notes_count,
            "questions_count": questions_count,
            "chunks_count": chunks_count,
            "remaining_days": remaining_days
        })
    return result

@router.get("/{id}", response_model=SubjectWithStats)
def get_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role == "faculty":
        from utils.dependencies import verify_faculty_owns_subject
        verify_faculty_owns_subject(db, current_user.id, id)
        
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    notes_count = db.query(func.count(Note.id)).filter(Note.subject_id == subject.id).scalar() or 0
    questions_count = db.query(func.count(Question.id)).filter(Question.subject_id == subject.id).scalar() or 0
    chunks_count = db.query(func.count(ContentChunk.id)).filter(ContentChunk.subject_id == subject.id).scalar() or 0
    
    return {
        **serialize_subject(subject),
        "notes_count": notes_count,
        "questions_count": questions_count,
        "chunks_count": chunks_count
    }

@router.put("/{id}", response_model=SubjectOut)
def update_subject(id: uuid.UUID, subject_data: SubjectUpdate, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
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
        elif key in ["course_id", "department_id"] and value:
            value = uuid.UUID(str(value))
        elif key == "topics_list":
            subject.set_topics(value)
            continue
        setattr(subject, key, value)
        
    db.commit()
    db.refresh(subject)
    
    return serialize_subject(subject)

@router.delete("/{id}")
def delete_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
    subject = db.query(Subject).filter(Subject.id == id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    subject.is_archived = True
    subject.archived_at = datetime.utcnow()
    db.commit()
    return {"message": "Subject moved to Archive. It can be restored within 15 days before being permanently deleted."}

@router.post("/{id}/restore", response_model=SubjectOut)
def restore_subject(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
    subject = db.query(Subject).filter(Subject.id == id, Subject.is_archived == True).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Archived subject not found")
        
    subject.is_archived = False
    subject.archived_at = None
    db.commit()
    db.refresh(subject)
    
    return serialize_subject(subject)

@router.delete("/{id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject_permanent(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_hod_or_admin)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    perform_permanent_cascade_delete(id, db)
    return None

@router.post("/{id}/syllabus", response_model=SubjectOut)
async def upload_subject_syllabus(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != '.pdf':
        raise HTTPException(status_code=400, detail="Only PDF syllabus uploads are allowed")
        
    upload_dir = os.path.join("uploads", "syllabus")
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Delete old syllabus file if exists
    if subject.syllabus_pdf_url:
        old_path = os.path.join(".", subject.syllabus_pdf_url.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                print(f"Error removing old syllabus file {old_path}: {e}")
                
    subject.syllabus_pdf_url = f"/uploads/syllabus/{unique_filename}"
    db.commit()
    db.refresh(subject)
    
    return serialize_subject(subject)

@router.delete("/{id}/syllabus", response_model=SubjectOut)
def delete_subject_syllabus(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    if subject.syllabus_pdf_url:
        file_path = os.path.join(".", subject.syllabus_pdf_url.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing syllabus file {file_path}: {e}")
        subject.syllabus_pdf_url = None
        db.commit()
        db.refresh(subject)
        
    return serialize_subject(subject)

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
        db.query(DoubtQuestionUpvote).filter(DoubtQuestionUpvote.user_id.in_(doubt_ids)).delete(synchronize_session=False)
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

# ── Faculty Topic Management Endpoints ─────────────────────────────────────
from pydantic import BaseModel
import json
from typing import List, Optional

class TopicsUpdate(BaseModel):
    topics: List[str]

class TopicCreate(BaseModel):
    name: str

class TopicUpdate(BaseModel):
    name: str

class TopicOut(BaseModel):
    id: uuid.UUID
    name: str
    subject_id: uuid.UUID
    semester_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

def check_topics_management_permission(subject_id: uuid.UUID, db: Session, current_user):
    if current_user.role in ["super_admin", "hod", "admin"]:
        return True
    if current_user.role == "faculty":
        from models.faculty_subject_assignment import FacultySubjectAssignment
        assignment = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.faculty_id == current_user.id,
            FacultySubjectAssignment.subject_id == subject_id
        ).first()
        if assignment:
            return True
    raise HTTPException(
        status_code=403,
        detail="Access denied. You are not authorized to manage topics for this subject."
    )

@router.get("/{id}/topics", response_model=List[str])
def get_subject_topics(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject.get_topics()

@router.post("/{id}/topics", response_model=List[str])
def update_subject_topics(
    id: uuid.UUID,
    payload: TopicsUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    check_topics_management_permission(id, db, current_user)
    
    subject.set_topics(payload.topics)
    db.commit()
    db.refresh(subject)
    return subject.get_topics()

@router.post("/{id}/topics/add", response_model=TopicOut)
def add_subject_topic(
    id: uuid.UUID,
    payload: TopicCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    check_topics_management_permission(id, db, current_user)
    
    from models.topic import Topic
    new_topic = Topic(
        name=payload.name.strip(),
        subject_id=subject.id,
        semester_id=subject.semester_id
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

@router.put("/{id}/topics/{topic_id}", response_model=TopicOut)
def update_subject_topic(
    id: uuid.UUID,
    topic_id: uuid.UUID,
    payload: TopicUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    check_topics_management_permission(id, db, current_user)
    
    from models.topic import Topic
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.subject_id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    topic.name = payload.name.strip()
    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/{id}/topics/{topic_id}")
def delete_subject_topic(
    id: uuid.UUID,
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    check_topics_management_permission(id, db, current_user)
    
    from models.topic import Topic
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.subject_id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}


@router.post("/{id}/topics/upload-syllabus", response_model=List[str])
async def upload_subject_syllabus_topics(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    check_topics_management_permission(id, db, current_user)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != '.pdf':
        raise HTTPException(status_code=400, detail="Only PDF syllabus uploads are allowed")
        
    text = ""
    try:
        from PyPDF2 import PdfReader
        import io
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))
        text = " ".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read PDF: {str(e)}")
        
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract any text from the PDF syllabus.")

    from utils.llm_client import get_llm_response
    prompt = f"""You are an academic curriculum parser. Extract the main syllabus topics/chapters/units from the following syllabus text as a clean list of topic names.
Return ONLY a valid JSON list of strings, e.g. ["Arrays", "Linked Lists", "Trees", "Sorting", "Stack", "Queue"].
Do not include unit numbers or headers like "Unit 1" in the topic strings, just the topic names.
Keep each topic name concise (2-5 words).
Do not include any explanation or markdown formatting. The response must start with [ and end with ].

Syllabus text:
{text[:8000]}"""

    try:
        raw_response = await get_llm_response(
            messages=[{"role": "user", "content": "Extract topics now."}],
            system_prompt=prompt,
            max_tokens=800
        )
        cleaned_res = raw_response.strip()
        if cleaned_res.startswith("```"):
            import re
            cleaned_res = re.sub(r"^```(?:json)?", "", cleaned_res, flags=re.IGNORECASE)
            cleaned_res = re.sub(r"```$", "", cleaned_res).strip()
        
        start_idx = cleaned_res.find("[")
        end_idx = cleaned_res.rfind("]")
        if start_idx != -1 and end_idx != -1:
            cleaned_res = cleaned_res[start_idx:end_idx+1]
            
        topics = json.loads(cleaned_res)
        if not isinstance(topics, list):
            raise ValueError("Parsed JSON is not a list")
            
        topics = [str(t).strip() for t in topics if str(t).strip()]
        
        subject.set_topics(topics)
        db.commit()
        db.refresh(subject)
        return subject.get_topics()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to extract topics via AI: {str(e)}")

