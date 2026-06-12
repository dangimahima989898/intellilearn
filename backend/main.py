from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from dotenv import load_dotenv
import os
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

from database import engine, Base, SessionLocal
import models  # noqa: F401 — triggers all model imports so Base.metadata is populated

# ── Routers ────────────────────────────────────────────────────────────────────
from routers import (
    auth as auth_router,
    subjects as subjects_router,
    notes as notes_router,
    timetable as timetable_router,
    events as events_router,
    analytics as analytics_router,
    chatbot as chatbot_router,
    questions as questions_router,
    adaptive_quiz as adaptive_quiz_router,
    daily_challenge as daily_challenge_router,
    doubts as doubts_router,
    notifications as notifications_router,
    courses as courses_router,
    onboarding as onboarding_router,
)

app = FastAPI(
    title="IntelliLearn API",
    description="AI-Powered Smart Learning Management & Adaptive Assessment System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app" # placeholder for actual
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Resource not found", "path": str(request.url)})

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception):
    import traceback
    logger.error(f"Internal error: {traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"error": "Internal server error. Please try again."})

# ── Static files (uploaded notes, etc.) ───────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Include Routers ────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(onboarding_router.router, prefix="/api")

app.include_router(courses_router.router)
app.include_router(courses_router.admin_router)
app.include_router(subjects_router.router, prefix="/subjects", tags=["Subjects"])
app.include_router(notes_router.router, prefix="/notes", tags=["Notes"])
app.include_router(timetable_router.router, prefix="/timetable", tags=["Timetable"])
app.include_router(events_router.router, prefix="/events", tags=["Events"])
app.include_router(analytics_router.router, prefix="/analytics", tags=["Analytics"])
app.include_router(chatbot_router.router)  # prefix defined inside the router
app.include_router(questions_router.router)  # prefix defined inside the router
app.include_router(adaptive_quiz_router.router)
app.include_router(daily_challenge_router.router)
app.include_router(doubts_router.router)
app.include_router(notifications_router.router)


@app.on_event("startup")
def startup_event():
    from routers.subjects import purge_expired_subjects
    db = SessionLocal()
    try:
        purge_expired_subjects(db)
        logger.info("Purged expired archived subjects successfully on startup.")
    except Exception as e:
        logger.error(f"Error purging expired archived subjects on startup: {e}")
    finally:
        db.close()


# ── Core routes ────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "message": "IntelliLearn API Running",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy",
    }


@app.get("/health", tags=["Health"])
def health_check():
    db_status = "disconnected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "ok",
        "database": db_status,
    }
