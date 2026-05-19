from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="IntelliLearn API",
    description="AI-Powered Smart Learning Management & Adaptive Assessment System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — Allow frontend to call backend
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

# Serve uploaded files
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Root routes
@app.get("/", tags=["Health"])
def root():
    return {
        "message": "IntelliLearn API Running",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "database": "not_connected_yet",
        "ai": "not_configured_yet"
    }

# Note: Routers will be added here in Steps 3 onwards
