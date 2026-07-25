from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from sqlalchemy.orm import selectinload
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from utils.firebase import send_push_notification
from models import (
    User, FlaggedAnswer, ChatLog, DoubtAnswer, Doubt, Subject,
    StudentAccessRequest, AdminActionLog, Notification
)

router = APIRouter(prefix="/hod/moderation", tags=["HOD Content Moderation"])

class FlagReviewAction(BaseModel):
    correct_answer: Optional[str] = None
    optional_note: Optional[str] = None

@router.get("/flagged-answers")
async def get_flagged_answers(
    status: Optional[str] = Query(None),
    dept: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(FlaggedAnswer).options(
        selectinload(FlaggedAnswer.student),
        selectinload(FlaggedAnswer.chat_log)
    ).join(
        User, User.id == FlaggedAnswer.student_id
    ).outerjoin(
        ChatLog, ChatLog.id == FlaggedAnswer.chat_log_id
    )

    if status and status != "all":
        stmt = stmt.where(FlaggedAnswer.status == status)

    res = await db.execute(stmt)
    flags = res.scalars().all()

    result = []
    for f in flags:
        student = f.student
        chat_log = f.chat_log
        
        # Filter by department or subject if filters set
        student_dept = student.branch if student else "MCA"
        if dept and dept != "All" and student_dept != dept:
            continue

        subj_name = chat_log.subject if chat_log else "DSA"
        if subject and subject != "All" and subj_name != subject:
            continue

        result.append({
            "id": str(f.id),
            "question": chat_log.user_message if chat_log else "Unknown Question",
            "ai_answer": chat_log.ai_response if chat_log else "Unknown AI Response",
            "flag_reason": f.flag_reason,
            "student_name": student.name if student else "Unknown Student",
            "enrollment": student.enrollment_no if student else "N/A",
            "department": student_dept,
            "subject": subj_name,
            "semester": "Sem 1",
            "syllabus_unit": "Unit 1",
            "flagged_at": f.created_at.isoformat() if f.created_at else datetime.utcnow().isoformat(),
            "status": f.status,
            "admin_note": f.admin_note,
        })
    return result

@router.post("/flagged-answers/{id}/confirm-wrong")
async def confirm_wrong(
    id: str,
    payload: FlagReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        fid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(FlaggedAnswer).where(FlaggedAnswer.id == fid)
    res = await db.execute(stmt)
    flag = res.scalars().first()

    if not flag:
        raise HTTPException(status_code=404, detail="Flagged answer not found")

    flag.status = "approved"  # approved = confirmed wrong
    flag.admin_note = payload.optional_note or "Confirmed wrong by HOD"
    flag.reviewed_by = current_user.id
    flag.reviewed_at = datetime.utcnow()

    # Create admin action log
    db.add(AdminActionLog(
        admin_id=current_user.id,
        action_type="MODERATION_REVIEW",
        details=f"Flagged AI answer {id} confirmed wrong: {payload.optional_note}"
    ))

    # Notify student
    student_id = flag.student_id
    if student_id:
        student_stmt = select(User).where(User.id == student_id)
        student_res = await db.execute(student_stmt)
        student = student_res.scalars().first()

        db.add(Notification(
            id=uuid.uuid4(),
            user_id=student_id,
            title="Moderation Review Complete",
            body=f"Your flag on chatbot response has been confirmed as correct. HOD note: {payload.optional_note or ''}"
        ))

        if student and student.fcm_token:
            send_push_notification(student.fcm_token, "Moderation Update", "Your flag on AI answer was approved.")

    await db.commit()
    return {"message": "AI answer confirmed incorrect and reviewed successfully"}

@router.post("/flagged-answers/{id}/verify-correct")
async def verify_correct(
    id: str,
    payload: FlagReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        fid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    stmt = select(FlaggedAnswer).where(FlaggedAnswer.id == fid)
    res = await db.execute(stmt)
    flag = res.scalars().first()

    if not flag:
        raise HTTPException(status_code=404, detail="Flagged answer not found")

    flag.status = "dismissed"  # dismissed = verified correct
    flag.admin_note = payload.optional_note or "Verified correct by HOD"
    flag.reviewed_by = current_user.id
    flag.reviewed_at = datetime.utcnow()

    # Create admin action log
    db.add(AdminActionLog(
        admin_id=current_user.id,
        action_type="MODERATION_REVIEW",
        details=f"Flagged AI answer {id} dismissed: {payload.optional_note}"
    ))

    # Notify student
    student_id = flag.student_id
    if student_id:
        student_stmt = select(User).where(User.id == student_id)
        student_res = await db.execute(student_stmt)
        student = student_res.scalars().first()

        db.add(Notification(
            id=uuid.uuid4(),
            user_id=student_id,
            title="Moderation Review Complete",
            body="Your flag on chatbot response was dismissed (AI answer verified correct)."
        ))

        if student and student.fcm_token:
            send_push_notification(student.fcm_token, "Moderation Update", "Your flag on AI answer was dismissed.")

    await db.commit()
    return {"message": "AI answer verified correct and reviewed successfully"}

@router.get("/doubt-reports")
async def get_doubt_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Retrieve reported/unverified doubt answers
    stmt = select(DoubtAnswer).options(
        selectinload(DoubtAnswer.doubt).selectinload(Doubt.student),
        selectinload(DoubtAnswer.doubt).selectinload(Doubt.subject)
    ).join(Doubt, Doubt.id == DoubtAnswer.doubt_id).where(
        DoubtAnswer.is_verified_by_admin == False
    )
    res = await db.execute(stmt)
    answers = res.scalars().all()

    result = []
    for a in answers:
        doubt = a.doubt
        student = doubt.student
        answerer_stmt = select(User).where(User.id == a.answered_by)
        answerer_res = await db.execute(answerer_stmt)
        answerer = answerer_res.scalars().first()

        result.append({
            "id": str(a.id),
            "question": doubt.question_text if doubt else "Doubt Question",
            "reported_answer": a.answer_text,
            "reporter_name": student.name if student else "Student Reporter",
            "reporter_enrollment": student.enrollment_no if student else "N/A",
            "answerer_name": answerer.name if answerer else "Faculty/Student",
            "answerer_enrollment": answerer.enrollment_no if answerer else "N/A",
            "report_reason": "Incomplete or incorrect answer.",
            "department": student.branch if student else "MCA",
            "subject": doubt.subject.name if (doubt and doubt.subject) else "DSA",
            "semester": "Sem 1",
            "reported_at": a.created_at.isoformat() if a.created_at else datetime.utcnow().isoformat(),
            "status": "pending"
        })
    return result

@router.get("/student-requests")
@router.get("/access-requests")
async def get_student_requests(

    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Retrieve access requests
    stmt = select(StudentAccessRequest).where(StudentAccessRequest.status == "pending")
    res = await db.execute(stmt)
    requests = res.scalars().all()

    result = []
    for r in requests:
        result.append({
            "id": str(r.id),
            "type": "semester_correction",  # standard mapping
            "student_name": r.full_name,
            "enrollment": r.enrollment_number,
            "department": r.branch,
            "description": r.reason or "Semester correction required.",
            "current_value": f"{r.branch} Semester {r.semester}",
            "requested_value": f"{r.branch} Semester {r.semester}",
            "has_document": False,
            "requested_at": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
            "status": r.status
        })
    return result

@router.get("/history")
async def get_moderation_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(AdminActionLog).where(
        AdminActionLog.action_type.in_(["MODERATION_REVIEW", "APPROVE", "REJECT"])
    ).order_by(AdminActionLog.timestamp.desc())
    res = await db.execute(stmt)
    logs = res.scalars().all()

    result = []
    for l in logs:
        result.append({
            "id": str(l.id),
            "date": l.timestamp.isoformat() if l.timestamp else datetime.utcnow().isoformat(),
            "type": l.action_type,
            "description": l.details,
            "subject": "—",
            "decision": "Action Completed",
            "student_notified": True
        })
    return result
