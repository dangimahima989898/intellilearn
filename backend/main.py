from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

from database import engine, Base, SessionLocal
import models  # noqa: F401 — triggers all model imports so Base.metadata is populated

# ── Routers ────────────────────────────────────────────────────────────────────
from routers import (
    auth as auth_router,
    subjects as subjects_router,
    notes as notes_router,
    timetable as timetable_router,
    events as events_router
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
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploaded notes, etc.) ───────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Include Routers ────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(subjects_router.router, prefix="/subjects", tags=["Subjects"])
app.include_router(notes_router.router, prefix="/notes", tags=["Notes"])
app.include_router(timetable_router.router, prefix="/timetable", tags=["Timetable"])
app.include_router(events_router.router, prefix="/events", tags=["Events"])


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
