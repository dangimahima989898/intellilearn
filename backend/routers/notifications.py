from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models.notification import Notification
from models.user import User
from utils.dependencies import require_student, require_admin, get_current_user
from utils.firebase import send_push_notification

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
    type: Optional[str] = "info"
    course_id: Optional[str] = None
    semester_number: Optional[int] = None

@router.get("/mine", response_model=NotificationsResponse)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
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
    current_user = Depends(get_current_user)
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
    current_user = Depends(get_current_user)
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
    # Query students matching filters
    query = db.query(User).filter(User.role == "student", User.is_active == True)
    
    if req.course_id and req.course_id.strip():
        try:
            course_uuid = uuid.UUID(req.course_id)
            query = query.filter(User.course_id == course_uuid)
        except ValueError:
            pass  # ignore invalid UUID
            
    if req.semester_number:
        query = query.filter(User.current_semester == req.semester_number)
        
    students = query.all()
    
    success_count = 0
    fail_count = 0
    saved_count = 0
    
    # Prepend or serialize the 'type' in the body as JSON
    serialized_body = json.dumps({
        "type": req.type or "info",
        "message": req.body
    })
    
    # Save notification for all targeted students
    for student in students:
        notif = Notification(
            id=uuid.uuid4(),
            user_id=student.id,
            title=req.title,
            body=serialized_body,
        )
        db.add(notif)
        saved_count += 1
        
        if student.fcm_token:
            if send_push_notification(student.fcm_token, req.title, req.body):
                success_count += 1
            else:
                fail_count += 1
                
    # Save a copy under the sending Admin's account so they have a persistent sent history log
    admin_notif = Notification(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=req.title,
        body=serialized_body,
    )
    db.add(admin_notif)
    
    db.commit()
    
    return {
        "success": success_count,
        "failed": fail_count,
        "saved_to_db": saved_count,
        "admin_notif_id": str(admin_notif.id)
    }

@router.delete("/{id}")
def delete_notification(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}
