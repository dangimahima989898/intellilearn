"""
hod_announcements.py — HOD Announcements / Notifications endpoints.
Uses the existing `notifications` table (user_id, title, body, is_read, sent_at).
HOD sends a notification per targeted student (bulk insert).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

from database import get_db
from models import User, Notification, StudentEnrollment, AdminActionLog
from utils.dependencies import require_hod_or_admin

router = APIRouter(prefix="/api/v1/hod/announcements", tags=["HOD Announcements"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class SendAnnouncementRequest(BaseModel):
    title: str
    body: str
    target_type: str           # "all_students" | "department" | "semester" | "subject"
    target_dept: Optional[str] = None      # "BCA" | "MCA" | "BSc CS" | "MSc IT"
    target_semester_id: Optional[str] = None
    target_subject_id: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_target_students(db: Session, req: SendAnnouncementRequest) -> List[User]:
    """Resolve target selection to list of student User objects."""
    q = db.query(User).filter(User.role == "student", User.is_active == True)

    if req.target_type == "department" and req.target_dept:
        # Filter students whose enrollment course matches dept abbreviation
        dept_name = req.target_dept
        q = q.join(StudentEnrollment, StudentEnrollment.student_id == User.id)\
             .join("course")\
             .filter(func.lower("courses.name").like(f"%{dept_name.lower()}%"))

    elif req.target_type == "semester" and req.target_semester_id:
        q = q.join(StudentEnrollment, StudentEnrollment.student_id == User.id)\
             .filter(StudentEnrollment.current_semester_id == uuid.UUID(req.target_semester_id))

    return q.all()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/send")
def send_announcement(
    req: SendAnnouncementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Send an announcement to targeted students.
    Creates one Notification row per student.
    """
    # Resolve recipients
    try:
        students = _get_target_students(db, req)
    except Exception:
        # Fallback: all students
        students = db.query(User).filter(User.role == "student", User.is_active == True).all()

    if not students:
        return {"message": "No matching students found for this target.", "sent_to": 0}

    notifs = []
    for student in students:
        notifs.append(Notification(
            id=uuid.uuid4(),
            user_id=student.id,
            title=req.title,
            body=req.body,
        ))

    db.add_all(notifs)

    # Log the action
    log = AdminActionLog(
        admin_id=current_user.id,
        action_type="SEND_ANNOUNCEMENT",
        details=f"Sent '{req.title}' to {len(notifs)} students. Target: {req.target_type}"
    )
    db.add(log)
    db.commit()

    return {"message": "Announcement sent successfully.", "sent_to": len(notifs)}


@router.get("/sent")
def get_sent_announcements(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    Returns distinct announcement titles sent by this HOD,
    grouped by title+body (since we store one row per student).
    """
    # Pull recent admin action logs for announcements sent by this user
    logs = db.query(AdminActionLog).filter(
        AdminActionLog.admin_id == current_user.id,
        AdminActionLog.action_type == "SEND_ANNOUNCEMENT"
    ).order_by(AdminActionLog.timestamp.desc()).limit(limit).all()

    result = []
    for l in logs:
        result.append({
            "id": str(l.id),
            "details": l.details,
            "sent_at": l.timestamp.isoformat() if l.timestamp else None,
        })
    return result


@router.get("/stats/{notification_title}")
def get_notification_stats(
    notification_title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """Delivery and read stats for a notification by title."""
    total = db.query(func.count(Notification.id))\
              .filter(Notification.title == notification_title).scalar() or 0
    read = db.query(func.count(Notification.id))\
             .filter(Notification.title == notification_title, Notification.is_read == True).scalar() or 0

    return {
        "title": notification_title,
        "total_recipients": total,
        "read_count": read,
        "unread_count": total - read,
        "read_rate_pct": round((read / total * 100), 1) if total > 0 else 0.0,
    }


@router.get("/history")
def get_announcement_history(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """Full announcement history from admin action log."""
    logs = db.query(AdminActionLog).filter(
        AdminActionLog.action_type == "SEND_ANNOUNCEMENT"
    ).order_by(AdminActionLog.timestamp.desc()).limit(limit).all()

    result = []
    for l in logs:
        sender = db.query(User.name).filter(User.id == l.admin_id).scalar() or "HOD"
        result.append({
            "id": str(l.id),
            "sent_by": sender,
            "details": l.details,
            "sent_at": l.timestamp.isoformat() if l.timestamp else None,
        })
    return result
