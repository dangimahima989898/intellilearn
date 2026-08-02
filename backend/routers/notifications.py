from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional, Dict
import uuid
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models.notification import Notification
from models.user import User
from models import (
    StudentAccessRequest,
    FacultyLeaveRequest,
    AIAnswerReport,
    Doubt,
    FacultySubjectAssignment,
    Subject,
    DoubtAnswer,
    NoteSummary
)
from utils.dependencies import get_current_user, require_admin
from utils.firebase import send_push_notification

# Note: We prefix the router with /api/notifications to match requirements.
# We will also support the legacy routes under the legacy prefix if needed or map them cleanly.
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# Real-time WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: uuid.UUID):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

# Pydantic schemas
class NotificationOut(BaseModel):
    id: uuid.UUID
    recipient_user_id: uuid.UUID
    recipient_role: Optional[str]
    title: str
    message: str
    module: Optional[str]
    reference_id: Optional[uuid.UUID]
    priority: str
    is_read: bool
    is_archived: bool
    created_at: datetime

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

class NotificationReadPayload(BaseModel):
    notification_id: Optional[uuid.UUID] = None
    mark_all: Optional[bool] = False

class NotificationArchivePayload(BaseModel):
    notification_id: uuid.UUID
    is_archived: bool

# WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        await websocket.close(code=1008)
        return
        
    await manager.connect(user_uuid, websocket)
    try:
        while True:
            # Keep connection alive, listen to messages if client sends any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_uuid, websocket)

# Centralized GET /api/notifications
@router.get("", response_model=NotificationsResponse)
def get_notifications(
    module: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"), # "read", "unread", "archived", "active"
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Clean up default FastAPI Query objects if called directly in code
    from fastapi.params import Query as FastAPIQuery
    if isinstance(module, FastAPIQuery):
        module = None
    if isinstance(priority, FastAPIQuery):
        priority = None
    if isinstance(status_filter, FastAPIQuery):
        status_filter = None

    # 1. Fetch user-specific notifications from DB
    query = db.query(Notification).filter(Notification.recipient_user_id == current_user.id)

    if module:
        query = query.filter(Notification.module == module)
    if priority:
        query = query.filter(Notification.priority == priority)
        
    if status_filter == "unread":
        query = query.filter(Notification.is_read == False, Notification.is_archived == False)
    elif status_filter == "read":
        query = query.filter(Notification.is_read == True, Notification.is_archived == False)
    elif status_filter == "archived":
        query = query.filter(Notification.is_archived == True)
    elif status_filter == "active":
        query = query.filter(Notification.is_archived == False)

    db_notifications = query.order_by(desc(Notification.created_at)).limit(200).all()

    # 2. Get read & archived reference IDs for dynamic notifications mapping
    read_ref_ids = {
        r[0] for r in db.query(Notification.reference_id).filter(
            Notification.recipient_user_id == current_user.id,
            Notification.is_read == True,
            Notification.reference_id != None
        ).all()
    }
    
    archived_ref_ids = {
        r[0] for r in db.query(Notification.reference_id).filter(
            Notification.recipient_user_id == current_user.id,
            Notification.is_archived == True,
            Notification.reference_id != None
        ).all()
    }

    # Helper function to check state
    def get_ref_status(ref_id):
        return (ref_id in read_ref_ids, ref_id in archived_ref_ids)

    # 3. Fetch Dynamic Active notifications based on role
    dynamic_items = []
    role = current_user.role

    if role in ["super_admin", "hod"]:
        # Approvals: Pending Student access requests
        pending_approvals = db.query(StudentAccessRequest).filter(StudentAccessRequest.status == "pending").all()
        for r in pending_approvals:
            is_read, is_archived = get_ref_status(r.id)
            dynamic_items.append({
                "id": r.id,
                "recipient_user_id": current_user.id,
                "recipient_role": role,
                "title": "Pending Student Approval",
                "message": f"Access request pending for {r.full_name} ({r.email}).",
                "module": "approvals",
                "reference_id": r.id,
                "priority": "Medium",
                "is_read": is_read,
                "is_archived": is_archived,
                "created_at": r.created_at
            })

        # Leave requests: Pending Faculty Leave requests
        pending_leaves = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.status == "pending").all()
        for r in pending_leaves:
            is_read, is_archived = get_ref_status(r.id)
            fac_name = r.faculty.name if r.faculty else "Faculty"
            dynamic_items.append({
                "id": r.id,
                "recipient_user_id": current_user.id,
                "recipient_role": role,
                "title": "Pending Leave Request",
                "message": f"Faculty {fac_name} has requested leave from {r.start_date} to {r.end_date}.",
                "module": "leaves",
                "reference_id": r.id,
                "priority": "High",
                "is_read": is_read,
                "is_archived": is_archived,
                "created_at": r.created_at
            })

        # AI Report Escalations: Escalated AI Answer Reports
        escalated_reports = db.query(AIAnswerReport).filter(AIAnswerReport.status == "escalated").all()
        for r in escalated_reports:
            is_read, is_archived = get_ref_status(r.report_id)
            subj_name = r.subject.name if r.subject else "Subject"
            dynamic_items.append({
                "id": r.report_id,
                "recipient_user_id": current_user.id,
                "recipient_role": role,
                "title": "Escalated AI Answer Review",
                "message": f"AI answer report escalated to HOD for subject {subj_name}.",
                "module": "ai_moderation",
                "reference_id": r.report_id,
                "priority": "High",
                "is_read": is_read,
                "is_archived": is_archived,
                "created_at": r.created_at
            })

        # Skill Review: Under Review Note Summaries
        under_review_summaries = db.query(NoteSummary).filter(NoteSummary.status == "UNDER_REVIEW").all()
        for r in under_review_summaries:
            is_read, is_archived = get_ref_status(r.id)
            note_title = r.note.title if r.note else "Note"
            dynamic_items.append({
                "id": r.id,
                "recipient_user_id": current_user.id,
                "recipient_role": role,
                "title": "Note Summary Under Review",
                "message": f"Summary for note '{note_title}' is pending review.",
                "module": "skill_review",
                "reference_id": r.id,
                "priority": "Medium",
                "is_read": is_read,
                "is_archived": is_archived,
                "created_at": r.created_at
            })

    elif role == "faculty":
        assigned_subj_ids = [
            a[0] for a in db.query(FacultySubjectAssignment.subject_id).filter(
                FacultySubjectAssignment.faculty_id == current_user.id,
                FacultySubjectAssignment.approval_status == 'approved'
            ).all()
        ]
        if assigned_subj_ids:
            # AI reports pending for faculty's subjects
            pending_reports = db.query(AIAnswerReport).filter(
                AIAnswerReport.status == "pending",
                AIAnswerReport.subject_id.in_(assigned_subj_ids)
            ).all()
            for r in pending_reports:
                is_read, is_archived = get_ref_status(r.report_id)
                subj_name = r.subject.name if r.subject else "Subject"
                dynamic_items.append({
                    "id": r.report_id,
                    "recipient_user_id": current_user.id,
                    "recipient_role": role,
                    "title": "Pending AI Answer Review",
                    "message": f"AI answer report pending for subject {subj_name}.",
                    "module": "ai_moderation",
                    "reference_id": r.report_id,
                    "priority": "High",
                    "is_read": is_read,
                    "is_archived": is_archived,
                    "created_at": r.created_at
                })

            # Unresolved doubts in faculty's subjects
            unresolved_doubts = db.query(Doubt).filter(
                Doubt.is_resolved == False,
                Doubt.subject_id.in_(assigned_subj_ids)
            ).all()
            for r in unresolved_doubts:
                is_read, is_archived = get_ref_status(r.id)
                subj_name = r.subject.name if r.subject else "Subject"
                dynamic_items.append({
                    "id": r.id,
                    "recipient_user_id": current_user.id,
                    "recipient_role": role,
                    "title": "Unresolved Subject Doubt",
                    "message": f"Unresolved doubt in {subj_name}: '{r.question_text[:50]}...'",
                    "module": "doubts",
                    "reference_id": r.id,
                    "priority": "Medium",
                    "is_read": is_read,
                    "is_archived": is_archived,
                    "created_at": r.created_at
                })

    elif role == "student":
        # Unresolved student doubts that have received answers — filtered to current semester subjects only
        student_doubts_query = db.query(Doubt).join(Subject, Doubt.subject_id == Subject.id).filter(
            Doubt.student_id == current_user.id,
            Doubt.is_resolved == False,
            Subject.semester_number == current_user.current_semester
        )
        if current_user.course_id:
            student_doubts_query = student_doubts_query.filter(Subject.course_id == current_user.course_id)
        student_doubts = student_doubts_query.all()
        for r in student_doubts:
            has_answers = db.query(DoubtAnswer).filter(DoubtAnswer.doubt_id == r.id).first() is not None
            if has_answers:
                is_read, is_archived = get_ref_status(r.id)
                subj_name = r.subject.name if r.subject else "Subject"
                dynamic_items.append({
                    "id": r.id,
                    "recipient_user_id": current_user.id,
                    "recipient_role": role,
                    "title": "Your Doubt Answered",
                    "message": f"Your doubt in {subj_name} has received new answers.",
                    "module": "doubts",
                    "reference_id": r.id,
                    "priority": "Medium",
                    "is_read": is_read,
                    "is_archived": is_archived,
                    "created_at": r.created_at
                })

    # Filter dynamic items based on parameters
    filtered_dynamic = []
    for item in dynamic_items:
        if module and item["module"] != module:
            continue
        if priority and item["priority"] != priority:
            continue
            
        is_read = item["is_read"]
        is_archived = item["is_archived"]
        
        if status_filter == "unread" and (is_read or is_archived):
            continue
        if status_filter == "read" and (not is_read or is_archived):
            continue
        if status_filter == "archived" and not is_archived:
            continue
        if status_filter == "active" and is_archived:
            continue
            
        filtered_dynamic.append(item)

    # 4. Construct final combined results
    results = [
        NotificationOut(
            id=n.id,
            recipient_user_id=n.recipient_user_id,
            recipient_role=n.recipient_role,
            title=n.title,
            message=n.message,
            module=n.module,
            reference_id=n.reference_id,
            priority=n.priority,
            is_read=n.is_read,
            is_archived=n.is_archived,
            created_at=n.created_at
        ) for n in db_notifications
    ]

    for item in filtered_dynamic:
        results.append(NotificationOut(
            id=item["id"],
            recipient_user_id=item["recipient_user_id"],
            recipient_role=item["recipient_role"],
            title=item["title"],
            message=item["message"],
            module=item["module"],
            reference_id=item["reference_id"],
            priority=item["priority"],
            is_read=item["is_read"],
            is_archived=item["is_archived"],
            created_at=item["created_at"]
        ))

    results.sort(key=lambda x: x.created_at, reverse=True)

    # Compute live unread count (active unread DB + active unread dynamic)
    db_unread = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id,
        Notification.is_read == False,
        Notification.is_archived == False
    ).count()

    dynamic_unread = sum(1 for item in dynamic_items if not item["is_read"] and not item["is_archived"])
    total_unread = db_unread + dynamic_unread

    return {"notifications": results, "unread_count": total_unread}

# Centralized PATCH /api/notifications/read
@router.patch("/read")
def mark_notifications_read(
    payload: NotificationReadPayload,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if payload.mark_all:
        db.query(Notification).filter(
            Notification.recipient_user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True})
        
        # Mark all dynamic items read too by querying them and inserting read entries
        response_data = get_notifications(db=db, current_user=current_user)
        for notif in response_data["notifications"]:
            if not notif.is_read and notif.reference_id:
                exists = db.query(Notification).filter(
                    Notification.recipient_user_id == current_user.id,
                    Notification.reference_id == notif.reference_id
                ).first()
                if exists:
                    exists.is_read = True
                else:
                    new_read = Notification(
                        id=uuid.uuid4(),
                        recipient_user_id=current_user.id,
                        recipient_role=current_user.role,
                        title=notif.title,
                        message=notif.message,
                        module=notif.module,
                        reference_id=notif.reference_id,
                        is_read=True
                    )
                    db.add(new_read)

    elif payload.notification_id:
        notif = db.query(Notification).filter(
            Notification.id == payload.notification_id,
            Notification.recipient_user_id == current_user.id
        ).first()
        
        if notif:
            notif.is_read = True
        else:
            notif_by_ref = db.query(Notification).filter(
                Notification.reference_id == payload.notification_id,
                Notification.recipient_user_id == current_user.id
            ).first()
            if notif_by_ref:
                notif_by_ref.is_read = True
            else:
                new_read = Notification(
                    id=uuid.uuid4(),
                    recipient_user_id=current_user.id,
                    recipient_role=current_user.role,
                    title="Action Marked Read",
                    message="Actionable notification marked read",
                    module="system",
                    reference_id=payload.notification_id,
                    is_read=True
                )
                db.add(new_read)
    else:
        raise HTTPException(status_code=400, detail="Invalid request payload")

    db.commit()
    return {"message": "Notifications read status updated"}

# Centralized PATCH /api/notifications/archive
@router.patch("/archive")
def mark_notifications_archive(
    payload: NotificationArchivePayload,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == payload.notification_id,
        Notification.recipient_user_id == current_user.id
    ).first()
    if not notif:
        notif_by_ref = db.query(Notification).filter(
            Notification.reference_id == payload.notification_id,
            Notification.recipient_user_id == current_user.id
        ).first()
        if notif_by_ref:
            notif = notif_by_ref
        else:
            notif = Notification(
                id=uuid.uuid4(),
                recipient_user_id=current_user.id,
                recipient_role=current_user.role,
                title="Action Archived",
                message="Actionable notification archived",
                module="system",
                reference_id=payload.notification_id,
                is_read=True,
                is_archived=payload.is_archived
            )
            db.add(notif)
            db.commit()
            return {"message": f"Notification archived status updated to {payload.is_archived}"}

    notif.is_archived = payload.is_archived
    db.commit()
    return {"message": f"Notification archived status updated to {payload.is_archived}"}

# Centralized DELETE /api/notifications/{id}
@router.delete("/{id}")
def delete_notification(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.recipient_user_id == current_user.id
    ).first()
    if not notif:
        notif_by_ref = db.query(Notification).filter(
            Notification.reference_id == id,
            Notification.recipient_user_id == current_user.id
        ).first()
        if notif_by_ref:
            notif = notif_by_ref
        else:
            raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}

# ── Backwards compatibility endpoints for /notifications ──
# (These mount at the root router as /notifications/... but we can define them here and re-map)
legacy_router = APIRouter(prefix="/notifications", tags=["Legacy Notifications"])

@legacy_router.get("/mine", response_model=NotificationsResponse)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Map to new centralized logic
    return get_notifications(status_filter="active", db=db, current_user=current_user)

@legacy_router.put("/{id}/read")
def legacy_mark_read(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return mark_notifications_read(NotificationReadPayload(notification_id=id), db, current_user)

@legacy_router.put("/mark-all-read")
def legacy_mark_all_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return mark_notifications_read(NotificationReadPayload(mark_all=True), db, current_user)

@legacy_router.delete("/{id}")
def legacy_delete(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return delete_notification(id, db, current_user)

@legacy_router.post("/send-all")
def legacy_send_all(
    req: SendAllRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    # Duplicate prevention: check if same title+message was sent in last 60 seconds
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(seconds=60)
    duplicate = db.query(Notification).filter(
        Notification.title == req.title,
        Notification.message == req.body,
        Notification.module == "system",
        Notification.created_at >= cutoff
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="This announcement was already sent in the last 60 seconds. Please wait before sending again.")

    query = db.query(User).filter(User.role == "student", User.is_active == True)
    
    if req.course_id and req.course_id.strip():
        try:
            course_uuid = uuid.UUID(req.course_id)
            query = query.filter(User.course_id == course_uuid)
        except ValueError:
            pass
            
    if req.semester_number:
        query = query.filter(User.current_semester == req.semester_number)
        
    students = query.all()
    saved_count = 0
    
    for student in students:
        notif = Notification(
            id=uuid.uuid4(),
            recipient_user_id=student.id,
            recipient_role="student",
            title=req.title,
            message=req.body,
            module="system",
            priority="Medium"
        )
        db.add(notif)
        saved_count += 1
        
        # Real-time WebSockets
        try:
            import asyncio
            asyncio.create_task(manager.send_personal_message({
                "type": "notification",
                "notification": {
                    "id": str(notif.id),
                    "title": notif.title,
                    "message": notif.message,
                    "module": notif.module,
                    "priority": notif.priority,
                    "created_at": datetime.now().isoformat()
                }
            }, student.id))
        except Exception:
            pass
            
        if student.fcm_token:
            try:
                send_push_notification(student.fcm_token, req.title, req.body)
            except Exception:
                pass
                
    db.commit()
    return {"saved_to_db": saved_count}
