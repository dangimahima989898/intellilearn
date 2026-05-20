from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timedelta, timezone
import re
from utils.sanitize import sanitize_text

from database import get_db
from models.chat_log import ChatLog
from models.user import User
from utils.dependencies import require_student, get_current_user
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


@router.get("/subjects")
def get_subjects(current_user: User = Depends(get_current_user)):
    """Return the list of supported MCA subjects with metadata."""
    return SUBJECTS


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
