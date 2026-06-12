from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timedelta, timezone
import re
import io
import PyPDF2
from utils.sanitize import sanitize_text

from database import get_db
from models.chat_log import ChatLog
from models.user import User
from models.subject import Subject
from utils.dependencies import require_student, require_admin, get_current_user
from utils.llm_client import get_llm_response, get_provider_status
from utils.rate_limiter import check_rate_limit

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── Rate limit config ──────────────────────────────────────────────────────────
RATE_LIMIT_MAX = 20  # requests per hour
RATE_LIMIT_WINDOW = 60  # minutes

# ── System prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are IntelliLearn AI Tutor, a highly knowledgeable and friendly academic assistant designed specifically for MCA (Master of Computer Applications) students at Mohanlal Sukhadia University, Udaipur, Rajasthan, India.

Your subject expertise covers:
1. Data Structures & Algorithms (DSA) - Arrays, Linked Lists, Trees, Graphs, Sorting, Searching, Dynamic Programming, Greedy, Backtracking
2. Database Management Systems (DBMS) - ER diagrams, Normalization (1NF-BCNF), SQL queries, Transactions, ACID properties, Indexing, NoSQL basics
3. Operating Systems (OS) - Processes, Threads, CPU Scheduling, Deadlocks, Memory Management, Virtual Memory, File Systems, I/O
4. Computer Networks (CN) - OSI/TCP-IP models, Application/Transport/Network layer protocols, IP addressing, Routing algorithms, DNS, HTTP, TCP, UDP
5. Java Programming - OOP concepts, Interfaces, Abstract classes, Collections Framework, Exception handling, Multithreading, JDBC, Lambda, Streams
6. Python Programming - Syntax, List/Dict/Set comprehensions, File I/O, OOP in Python, Popular libraries (NumPy, Pandas basics), Flask basics

Rules you MUST follow:
- If the user writes in Hindi (Devanagari script or Roman Hindi), respond ENTIRELY in Hindi
- If the user writes in English, respond in English
- Always be encouraging and supportive — the student is preparing for exams
- For code questions, provide WORKING, commented code examples
- Structure your answers clearly: use numbered lists or bullet points when explaining steps
- Keep responses focused and under 400 words unless a longer explanation is truly needed
- If asked about something completely unrelated to MCA studies, politely redirect: "I'm specialized for MCA subjects. Let me help you with DSA, DBMS, OS, CN, Java, or Python!"
- ALWAYS end your response with: "📚 Suggested next topic: [most_relevant_next_topic]"
- Never make up incorrect technical information
"""

# ── Subject catalogue ─────────────────────────────────────────────────────────
SUBJECTS = [
    {
        "code": "DSA",
        "name": "Data Structures & Algorithms",
        "color": "#3B82F6",
        "icon": "GitBranch",
        "topics": ["Arrays", "Linked Lists", "Trees", "Graphs", "Sorting", "Dynamic Programming", "Greedy", "Backtracking"],
    },
    {
        "code": "DBMS",
        "name": "Database Management Systems",
        "color": "#8B5CF6",
        "icon": "Database",
        "topics": ["SQL", "Normalization", "Transactions", "Indexing", "NoSQL", "ER Diagrams"],
    },
    {
        "code": "OS",
        "name": "Operating Systems",
        "color": "#10B981",
        "icon": "Monitor",
        "topics": ["Processes", "Scheduling", "Deadlocks", "Memory Management", "File Systems"],
    },
    {
        "code": "CN",
        "name": "Computer Networks",
        "color": "#F59E0B",
        "icon": "Network",
        "topics": ["OSI Model", "TCP/IP", "IP Addressing", "Routing", "DNS", "HTTP", "TCP", "UDP"],
    },
    {
        "code": "JAVA",
        "name": "Java Programming",
        "color": "#EF4444",
        "icon": "Coffee",
        "topics": ["OOP", "Collections", "Multithreading", "Exception Handling", "JDBC", "Lambda", "Streams"],
    },
    {
        "code": "PYTHON",
        "name": "Python Programming",
        "color": "#06B6D4",
        "icon": "Code",
        "topics": ["Syntax", "OOP", "List Comprehension", "File I/O", "NumPy", "Pandas", "Flask"],
    },
]


# ── Schemas ───────────────────────────────────────────────────────────────────
class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    subject: str
    language: str = "english"
    conversation_history: list[MessageItem] = Field(default=[], max_length=10)
    pdf_context: Optional[str] = None

    @field_validator('message')
    @classmethod
    def sanitize_field(cls, v: str) -> str:
        return sanitize_text(v)

class ChatResponse(BaseModel):
    response: str
    suggested_topic: str
    subject: str
    language: str
    provider_used: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_suggested_topic(response_text: str) -> str:
    """Parse the 'Suggested next topic:' line from the AI response."""
    match = re.search(r"📚 Suggested next topic:\s*(.+)", response_text)
    if match:
        return match.group(1).strip()
    # fallback: last non-empty line
    return ""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Send a message to the AI tutor and get a response."""
    # 1. Rate limiting (20 per hour)
    check_rate_limit(str(current_user.id), "chatbot_chat", max_requests=20, window_seconds=3600)

    # 2. Build dynamic system prompt with subject + language context
    subject_label = body.subject.upper()
    dynamic_prompt = (
        SYSTEM_PROMPT
        + f"\n\nThe student is asking about {subject_label}."
        + f"\nThe user is communicating in {body.language}. Respond in the same language."
    )
    if body.pdf_context:
        # Truncate to ~4000 chars to stay within token limits
        truncated_ctx = body.pdf_context[:4000]
        dynamic_prompt += (
            "\n\nThe student has uploaded a PDF document. Use the following extracted text "
            "as additional context when answering their question. If the question relates to "
            "the document, answer based on it. If not, use your general knowledge.\n"
            f"--- PDF CONTENT ---\n{truncated_ctx}\n--- END OF PDF CONTENT ---"
        )

    # 3. Build messages list (cap history to last 10)
    history = body.conversation_history[-10:]
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": body.message})

    # 4. Call LLM
    ai_response = await get_llm_response(
        messages=messages,
        system_prompt=dynamic_prompt,
        max_tokens=800,
    )

    # 5. Extract suggested topic
    suggested_topic = extract_suggested_topic(ai_response)

    # 6. Persist to chat_logs
    log = ChatLog(
        student_id=current_user.id,
        subject=body.subject,
        user_message=body.message,
        ai_response=ai_response,
        language=body.language,
    )
    db.add(log)
    db.commit()

    # 7. Determine which provider is active (for UI indicator)
    provider_status = get_provider_status()
    active_provider = next(
        (k for k, v in provider_status.items() if v), "unknown"
    )

    return ChatResponse(
        response=ai_response,
        suggested_topic=suggested_topic,
        subject=body.subject,
        language=body.language,
        provider_used=active_provider,
    )


ADMIN_SYSTEM_PROMPT = """You are IntelliLearn Admin AI — an intelligent assistant embedded inside the IntelliLearn College LMS Admin Panel for MLSU (Mohanlal Sukhadia University), Udaipur.

You help college administrators with:
- Managing subjects, notes, timetables, events, and students in the LMS
- Explaining how to use the admin panel features (Subjects, Notes, Timetable, Events & Exams, Students, Doubt Board, Notifications)
- Answering questions about course structures (MCA, BCA, BSc CS, MSc IT) and semester management
- Providing guidance on student cohort management, semester advancement, and access requests
- Tips on best practices for academic content management

Key features to help with:
- Subjects: Add/manage subjects per course and semester with color coding
- Notes: Upload PDFs/links per subject; students access these
- Timetable: Create weekly class schedule slots with room/time
- Events & Exams: Create events with reminders, push notifications to students
- Students: View cohorts, advance semesters, manage enrollments
- Doubt Board: Monitor student questions and answers
- Notifications: Send targeted announcements to specific courses/semesters

Be concise, professional, and actionable. Use bullet points for lists. Respond in English."""


class AdminChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    conversation_history: list[MessageItem] = Field(default=[], max_length=20)

    @field_validator('message')
    @classmethod
    def sanitize_field(cls, v: str) -> str:
        return sanitize_text(v)


@router.post("/admin-chat")
async def admin_chat(
    body: AdminChatRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only AI chat endpoint for the admin panel assistant."""
    # Build messages list
    history = body.conversation_history[-20:]
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": body.message})

    # Call LLM with admin system prompt
    ai_response = await get_llm_response(
        messages=messages,
        system_prompt=ADMIN_SYSTEM_PROMPT,
        max_tokens=600,
    )

    provider_status = get_provider_status()
    active_provider = next(
        (k for k, v in provider_status.items() if v), "unknown"
    )

    return {
        "response": ai_response,
        "provider_used": active_provider,
    }


@router.post("/extract-pdf")
async def extract_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
):
    """Extract text from an uploaded PDF file (max 5 MB)."""
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 5 MB limit.")
    
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        extracted_text = "\n".join(text_parts)
        if not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from this PDF. It may be image-based or encrypted."
            )
        return {"text": extracted_text, "pages": len(reader.pages), "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")


@router.get("/subjects")
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return the list of supported MCA subjects with database IDs and metadata."""
    db_subjects = db.query(Subject).filter(Subject.is_archived == False).all()
    subjects_map = {s["code"].lower(): s for s in SUBJECTS}
    
    result = []
    for sub in db_subjects:
        static_meta = subjects_map.get(sub.code.lower(), {})
        result.append({
            "id": str(sub.id),
            "code": sub.code,
            "name": sub.name,
            "color": sub.color or static_meta.get("color", "#3B82F6"),
            "icon": sub.icon or static_meta.get("icon", "BookOpen"),
            "topics": static_meta.get("topics", [])
        })
    return result


@router.get("/history")
def get_history(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Return the last 20 chat logs for the authenticated student."""
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.student_id == current_user.id)
        .order_by(ChatLog.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": str(log.id),
            "subject": log.subject,
            "user_message": log.user_message,
            "ai_response": log.ai_response,
            "language": log.language,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get("/provider-status")
def provider_status(current_user: User = Depends(get_current_user)):
    """Return which AI providers are configured."""
    return get_provider_status()
