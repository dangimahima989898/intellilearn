from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.note import Note
from models.subject import Subject
from models.user import User
from schemas.note import NoteOut
from utils.dependencies import get_current_user, require_admin
import uuid
import os
import shutil
from datetime import datetime

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.ppt', '.pptx'}

def secure_filename(filename: str) -> str:
    return "".join([c for c in filename if c.isalpha() or c.isdigit() or c in (' ', '.', '_', '-')]).rstrip()

@router.post("/upload", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def upload_note(
    title: str = Form(...),
    subject_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
        
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_SIZE / (1024*1024)}MB")
        
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    safe_name = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_note = Note(
        id=uuid.uuid4(),
        subject_id=subject_id,
        uploaded_by=current_user.id,
        title=title,
        file_url=f"/uploads/{unique_filename}",
        file_type=ext[1:].upper(),
        file_size_kb=file_size // 1024,
        download_count=0
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return {
        **new_note.__dict__,
        "subject_name": subject.name,
        "uploaded_by_name": current_user.name
    }

@router.get("/", response_model=list[NoteOut])
def get_notes(subject_id: uuid.UUID = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Note, Subject.name.label("subject_name"), User.name.label("uploaded_by_name"))\
              .join(Subject, Note.subject_id == Subject.id)\
              .join(User, Note.uploaded_by == User.id)
              
    if subject_id:
        query = query.filter(Note.subject_id == subject_id)
        
    results = query.all()
    
    return [
        {
            **note.__dict__,
            "subject_name": subject_name,
            "uploaded_by_name": uploaded_by_name
        }
        for note, subject_name, uploaded_by_name in results
    ]

@router.get("/{id}", response_model=NoteOut)
def get_note(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    result = db.query(Note, Subject.name.label("subject_name"), User.name.label("uploaded_by_name"))\
               .join(Subject, Note.subject_id == Subject.id)\
               .join(User, Note.uploaded_by == User.id)\
               .filter(Note.id == id).first()
               
    if not result:
        raise HTTPException(status_code=404, detail="Note not found")
        
    note, subject_name, uploaded_by_name = result
    return {
        **note.__dict__,
        "subject_name": subject_name,
        "uploaded_by_name": uploaded_by_name
    }

@router.get("/download/{id}")
def download_note(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    note.download_count += 1
    db.commit()
    
    file_path = os.path.join(".", note.file_url.lstrip("/"))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path=file_path, filename=os.path.basename(file_path))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    note = db.query(Note).filter(Note.id == id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    file_path = os.path.join(".", note.file_url.lstrip("/"))
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            
    db.delete(note)
    db.commit()
    return None
