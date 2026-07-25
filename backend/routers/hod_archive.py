from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
import uuid
from datetime import datetime, timedelta

from database import get_db_async as get_db
from models import Subject, AdminActionLog, User
from utils.dependencies import require_hod_or_admin_async

router = APIRouter(prefix="/hod/archive", tags=["HOD Archive"])

@router.get("")
async def get_archived_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Get all archived items (subjects) and placeholder lists for notes/announcements."""
    stmt = select(Subject).where(Subject.is_archived == True)
    res = await db.execute(stmt)
    subjects = res.scalars().all()
    
    archived_subjects = []
    now = datetime.utcnow()
    for s in subjects:
        remaining_days = 15
        if s.archived_at:
            archived_naive = s.archived_at.replace(tzinfo=None)
            diff = now - archived_naive
            remaining_days = max(0, 15 - diff.days)
            
        # Get course info
        course_name = "N/A"
        if s.course_id:
            from models import Course
            c_stmt = select(Course).where(Course.id == s.course_id)
            c_res = await db.execute(c_stmt)
            course = c_res.scalars().first()
            if course:
                course_name = course.name

        archived_subjects.append({
            "id": str(s.id),
            "name": s.name,
            "code": s.code,
            "type": "subject",
            "archived_at": s.archived_at.isoformat() if s.archived_at else None,
            "remaining_days": remaining_days,
            "details": f"Course: {course_name}, Semester: {s.semester_number or 'N/A'}"
        })
        
    return {
        "subjects": archived_subjects,
        "notes": [],         # Placeholder since Notes table doesn't have is_archived
        "announcements": []  # Placeholder since Notifications table doesn't have is_archived
    }

@router.get("/activity-log")
async def get_archive_activity_log(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Recent archive-related activities from AdminActionLog"""
    stmt = select(AdminActionLog).where(
        AdminActionLog.action_type.in_(["ARCHIVE", "UNARCHIVE", "DELETE_SUBJECT"])
    ).order_by(AdminActionLog.timestamp.desc()).limit(50)
    
    res = await db.execute(stmt)
    logs = res.scalars().all()
    
    result = []
    for log in logs:
        admin_name = "System"
        if log.admin_id:
            admin_stmt = select(User.name).where(User.id == log.admin_id)
            admin_res = await db.execute(admin_stmt)
            admin_name = admin_res.scalar() or "System"

        result.append({
            "id": str(log.id),
            "admin_name": admin_name,
            "action_type": log.action_type,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else datetime.utcnow().isoformat()
        })
    return result

def purge_expired_subjects_sync_task():
    from database import SessionLocal
    from routers.subjects import purge_expired_subjects
    db = SessionLocal()
    try:
        purge_expired_subjects(db)
    finally:
        db.close()

@router.post("/trigger-prune")
async def trigger_prune_task(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_hod_or_admin_async)
):
    background_tasks.add_task(purge_expired_subjects_sync_task)
    return {"message": "Background pruning task started."}

@router.post("/bulk-restore")
async def bulk_restore_items(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Bulk restore archived items by IDs."""
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No item IDs provided.")
    
    restored_count = 0
    for item_id in ids:
        try:
            uid = uuid.UUID(item_id)
            stmt = select(Subject).where(and_(Subject.id == uid, Subject.is_archived == True))
            res = await db.execute(stmt)
            subject = res.scalars().first()
            if subject:
                subject.is_archived = False
                subject.archived_at = None
                restored_count += 1
        except (ValueError, Exception):
            continue
    
    await db.commit()
    return {"message": f"{restored_count} item(s) restored.", "restored_count": restored_count}

@router.post("/bulk-delete")
async def bulk_delete_items(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Bulk permanently delete archived items by IDs."""
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No item IDs provided.")
    
    deleted_count = 0
    for item_id in ids:
        try:
            uid = uuid.UUID(item_id)
            stmt = select(Subject).where(Subject.id == uid)
            res = await db.execute(stmt)
            subject = res.scalars().first()
            if subject:
                await db.delete(subject)
                deleted_count += 1
        except (ValueError, Exception):
            continue
    
    await db.commit()
    return {"message": f"{deleted_count} item(s) permanently deleted.", "deleted_count": deleted_count}

@router.get("/activity-log/export")
async def export_activity_log(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    """Export archive activity log as JSON (frontend converts to CSV)."""
    stmt = select(AdminActionLog).where(
        AdminActionLog.action_type.in_(["ARCHIVE", "UNARCHIVE", "DELETE_SUBJECT", "AUTO_DELETE"])
    ).order_by(AdminActionLog.timestamp.desc()).limit(200)
    
    res = await db.execute(stmt)
    logs = res.scalars().all()
    
    result = []
    for log in logs:
        admin_name = "System"
        if log.admin_id:
            admin_stmt = select(User.name).where(User.id == log.admin_id)
            admin_res = await db.execute(admin_stmt)
            admin_name = admin_res.scalar() or "System"
        
        result.append({
            "id": str(log.id),
            "admin_name": admin_name,
            "action_type": log.action_type,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else datetime.utcnow().isoformat()
        })
    return result
