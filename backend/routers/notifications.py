from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models.notification import Notification
from utils.dependencies import require_student, require_admin, get_current_user
from utils.firebase import send_to_all_students

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationOut(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    is_read: bool
    sent_at: datetime
    
    class Config:
        from_attributes = True

class NotificationsResponse(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int

class SendAllRequest(BaseModel):
    title: str
    body: str

@router.get("/mine", response_model=NotificationsResponse)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(desc(Notification.sent_at)).limit(20).all()
    unread_count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    
    results = [
        NotificationOut(
            id=n.id,
            title=n.title,
            body=n.body,
            is_read=n.is_read,
            sent_at=n.sent_at
        ) for n in notifs
    ]
    
    return {"notifications": results, "unread_count": unread_count}

@router.put("/{id}/read")
def mark_read(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.put("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}

@router.post("/send-all")
def send_all(
    req: SendAllRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    stats = send_to_all_students(db=db, title=req.title, body=req.body)
    return stats
