from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.note import Note
from models.subject import Subject
from models.user import User
from schemas.note import NoteOut
from utils.dependencies import get_current_user, require_admin, require_student
from utils.llm_client import get_llm_response
from PyPDF2 import PdfReader
import uuid
import os
import shutil
from datetime import datetime
from utils.firebase import send_to_all_students

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
    
    send_to_all_students(
        db=db,
        title="📚 New Study Material Available",
        body=f"New notes for {subject.name}: {new_note.title}",
        data={"note_id": str(new_note.id), "type": "note"}
    )
    
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

@router.post("/{id}/summarize")
async def summarize_note(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    note = db.query(Note).filter(Note.id == id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    file_path = os.path.join(".", note.file_url.lstrip("/"))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    try:
        if ext == '.pdf':
            reader = PdfReader(file_path)
            text = " ".join([page.extract_text() or "" for page in reader.pages])
        elif ext == '.docx':
            from docx import Document
            doc = Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
        elif ext in ['.ppt', '.pptx']:
            from pptx import Presentation
            prs = Presentation(file_path)
            text = "\n".join([shape.text for slide in prs.slides for shape in slide.shapes if hasattr(shape, "text")])
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type for summarization: {ext}")
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return {"summary": "Could not extract text from this file. The file may be scanned/image-based.", "note_id": str(id)}
        
    text = text.strip()
    if not text:
        return {"summary": "Could not extract text from this file. The file may be scanned/image-based.", "note_id": str(id)}
        
    # Truncate text to first 6000 chars for safety
    truncated_text = text[:6000]
    
    prompt = f"""You are an expert academic summarizer for MCA students. Summarize the following study material concisely.

Format your summary as:
## Key Concepts
- [bullet point 1]
- [bullet point 2]
...

## Important Definitions
- Term: Definition
...

## Key Points to Remember
1. Point 1
2. Point 2
...

Keep the summary under 300 words total. Focus on what students need to know for exams.

Study Material:
{truncated_text}"""

    try:
        summary_text = await get_llm_response(
            messages=[{"role": "user", "content": "Please generate the summary now."}],
            system_prompt=prompt,
            max_tokens=800
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM summarization failed: {str(e)}"
        )
        
    note.summary = summary_text.strip()
    db.commit()
    db.refresh(note)
    
    return {
        "summary": note.summary,
        "note_id": str(note.id),
        "generated_at": datetime.utcnow()
    }

