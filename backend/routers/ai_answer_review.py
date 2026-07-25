from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import datetime

from database import get_db_async as get_db
from utils.dependencies import require_role_async
from models.ai_answer_report import AIAnswerReport
from models.faculty_subject_assignment import FacultySubjectAssignment
from models.user import User
from models.subject import Subject
from models.notification import Notification
from routers.notifications import manager

router = APIRouter(prefix="/api", tags=["AI Answer Review"])

# Role dependencies
require_faculty = require_role_async("faculty")
require_hod = require_role_async("hod", "super_admin")

class FacultyReviewAction(BaseModel):
    decision: str # Correct, Incorrect, Needs Improvement
    comment: Optional[str] = None

class AIReportOut(BaseModel):
    report_id: uuid.UUID
    student_name: str
    student_email: str
    subject_code: str
    subject_name: str
    question: str
    ai_answer: str
    student_reason: str
    faculty_decision: Optional[str]
    faculty_comment: Optional[str]
    status: str
    escalated_to_hod: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Helper to generate real-time push/WebSocket notifications
async def create_and_push_notification(db: AsyncSession, recipient_id: uuid.UUID, role: str, title: str, msg: str, module: str, ref_id: uuid.UUID):
    notif = Notification(
        id=uuid.uuid4(),
        recipient_user_id=recipient_id,
        recipient_role=role,
        title=title,
        message=msg,
        module=module,
        reference_id=ref_id,
        priority="High" if role in ["hod", "faculty"] else "Medium"
    )
    db.add(notif)
    await db.flush() # Populate generated columns like created_at
    
    # WebSocket push
    await manager.send_personal_message({
        "type": "notification",
        "notification": {
            "id": str(notif.id),
            "title": notif.title,
            "message": notif.message,
            "module": notif.module,
            "priority": notif.priority,
            "created_at": datetime.now().isoformat()
        }
    }, recipient_id)

@router.get("/faculty/ai-reports", response_model=List[AIReportOut])
async def get_faculty_ai_reports(
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    # Retrieve subjects assigned to this faculty
    assign_stmt = select(FacultySubjectAssignment.subject_id).where(
        FacultySubjectAssignment.faculty_id == current_user.id,
        FacultySubjectAssignment.approval_status == 'approved'
    )
    assign_res = await db.execute(assign_stmt)
    assigned_subject_ids = assign_res.scalars().all()

    if not assigned_subject_ids:
        return []

    # Query reports linked to those subjects
    reports_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.student),
        selectinload(AIAnswerReport.subject)
    ).where(
        AIAnswerReport.subject_id.in_(assigned_subject_ids)
    ).order_by(AIAnswerReport.created_at.desc())

    # Apply pagination if provided (backward compatible)
    if page is not None and limit is not None:
        page = max(1, page)
        limit = min(max(1, limit), 100)
        reports_stmt = reports_stmt.offset((page - 1) * limit).limit(limit)

    reports_res = await db.execute(reports_stmt)
    reports = reports_res.scalars().all()

    results = []
    for r in reports:
        student_name = r.student.name if r.student else "Unknown Student"
        student_email = r.student.email if r.student else "unknown@mlsu.ac.in"
        subj_code = r.subject.code if r.subject else "DSA"
        subj_name = r.subject.name if r.subject else "Subject"

        results.append(AIReportOut(
            report_id=r.report_id,
            student_name=student_name,
            student_email=student_email,
            subject_code=subj_code,
            subject_name=subj_name,
            question=r.question,
            ai_answer=r.ai_answer,
            student_reason=r.student_reason,
            faculty_decision=r.faculty_decision,
            faculty_comment=r.faculty_comment,
            status=r.status,
            escalated_to_hod=r.escalated_to_hod,
            created_at=r.created_at
        ))
    return results

@router.post("/faculty/ai-reports/{id}/approve")
async def approve_ai_report(
    id: uuid.UUID,
    payload: FacultyReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    report_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.student)
    ).where(AIAnswerReport.report_id == id)
    res = await db.execute(report_stmt)
    report = res.scalars().first()

    if not report:
        raise HTTPException(status_code=404, detail="AI report not found")

    report.status = "approved"
    report.faculty_decision = payload.decision
    report.faculty_comment = payload.comment
    report.faculty_id = current_user.id

    # Notify student
    student_msg = f"Your report on AI answer for {report.subject.name if report.subject else 'Subject'} has been APPROVED by the faculty: '{payload.comment or 'Verified Incorrect concept'}'."
    await create_and_push_notification(
        db, report.student_id, "student", "AI Answer Report Approved 🚩", student_msg, "ai_moderation", report.report_id
    )

    await db.commit()
    
    # Broadcast updates over WS
    try:
        report_payload = {
            "type": "flagged_answer_updated",
            "report": {
                "report_id": str(report.report_id),
                "student_name": report.student.name if report.student else "Student",
                "student_email": report.student.email if report.student else "",
                "subject_code": report.subject.code if report.subject else "DSA",
                "subject_name": report.subject.name if report.subject else "Subject",
                "question": report.question,
                "ai_answer": report.ai_answer,
                "student_reason": report.student_reason,
                "faculty_decision": report.faculty_decision,
                "faculty_comment": report.faculty_comment,
                "status": report.status,
                "escalated_to_hod": report.escalated_to_hod,
                "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
            }
        }
        await manager.send_personal_message(report_payload, report.student_id)
        if report.faculty_id:
            await manager.send_personal_message(report_payload, report.faculty_id)
    except Exception:
        pass

    return {"message": "AI report approved and knowledge update queued successfully"}

@router.post("/faculty/ai-reports/{id}/reject")
async def reject_ai_report(
    id: uuid.UUID,
    payload: FacultyReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    report_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.student)
    ).where(AIAnswerReport.report_id == id)
    res = await db.execute(report_stmt)
    report = res.scalars().first()

    if not report:
        raise HTTPException(status_code=404, detail="AI report not found")

    report.status = "rejected"
    report.faculty_decision = payload.decision
    report.faculty_comment = payload.comment
    report.faculty_id = current_user.id

    # Notify student
    student_msg = f"Your report on AI answer for {report.subject.name if report.subject else 'Subject'} was DISMISSED (AI verified correct). Faculty note: '{payload.comment or 'Correct concept'}'."
    await create_and_push_notification(
        db, report.student_id, "student", "AI Answer Verified Correct ✅", student_msg, "ai_moderation", report.report_id
    )

    await db.commit()
    
    # Broadcast updates over WS
    try:
        report_payload = {
            "type": "flagged_answer_updated",
            "report": {
                "report_id": str(report.report_id),
                "student_name": report.student.name if report.student else "Student",
                "student_email": report.student.email if report.student else "",
                "subject_code": report.subject.code if report.subject else "DSA",
                "subject_name": report.subject.name if report.subject else "Subject",
                "question": report.question,
                "ai_answer": report.ai_answer,
                "student_reason": report.student_reason,
                "faculty_decision": report.faculty_decision,
                "faculty_comment": report.faculty_comment,
                "status": report.status,
                "escalated_to_hod": report.escalated_to_hod,
                "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
            }
        }
        await manager.send_personal_message(report_payload, report.student_id)
        if report.faculty_id:
            await manager.send_personal_message(report_payload, report.faculty_id)
    except Exception:
        pass

    return {"message": "AI report rejected and closed"}

@router.post("/faculty/ai-reports/{id}/escalate")
async def escalate_ai_report(
    id: uuid.UUID,
    payload: FacultyReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_faculty)
):
    report_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.student)
    ).where(AIAnswerReport.report_id == id)
    res = await db.execute(report_stmt)
    report = res.scalars().first()

    if not report:
        raise HTTPException(status_code=404, detail="AI report not found")

    report.status = "escalated"
    report.escalated_to_hod = True
    report.faculty_decision = payload.decision
    report.faculty_comment = payload.comment
    report.faculty_id = current_user.id

    # Find the HOD for the department or super_admins
    hods_stmt = select(User).where(User.role == "hod")
    hods_res = await db.execute(hods_stmt)
    hods = hods_res.scalars().all()

    for hod in hods:
        hod_msg = f"Faculty {current_user.name} has escalated an AI answer report for {report.subject.name if report.subject else 'Subject'} for final HOD decision."
        await create_and_push_notification(
            db, hod.id, "hod", "Escalated AI Answer Review ⚠️", hod_msg, "ai_moderation", report.report_id
        )

    await db.commit()
    
    # Broadcast updates over WS
    try:
        report_payload = {
            "type": "flagged_answer_updated",
            "report": {
                "report_id": str(report.report_id),
                "student_name": report.student.name if report.student else "Student",
                "student_email": report.student.email if report.student else "",
                "subject_code": report.subject.code if report.subject else "DSA",
                "subject_name": report.subject.name if report.subject else "Subject",
                "question": report.question,
                "ai_answer": report.ai_answer,
                "student_reason": report.student_reason,
                "faculty_decision": report.faculty_decision,
                "faculty_comment": report.faculty_comment,
                "status": report.status,
                "escalated_to_hod": report.escalated_to_hod,
                "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
            }
        }
        await manager.send_personal_message(report_payload, report.student_id)
        if report.faculty_id:
            await manager.send_personal_message(report_payload, report.faculty_id)
        # Also notify active HODs
        for hod in hods:
            await manager.send_personal_message(report_payload, hod.id)
    except Exception:
        pass

    return {"message": "AI report escalated to HOD"}
    return {"message": "AI report escalated to HOD successfully"}

@router.get("/hod/escalated-ai-reports", response_model=List[AIReportOut])
async def get_hod_escalated_ai_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    reports_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.student),
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.faculty)
    ).where(
        AIAnswerReport.escalated_to_hod == True
    ).order_by(AIAnswerReport.created_at.desc())

    reports_res = await db.execute(reports_stmt)
    reports = reports_res.scalars().all()

    results = []
    for r in reports:
        student_name = r.student.name if r.student else "Unknown Student"
        student_email = r.student.email if r.student else "unknown@mlsu.ac.in"
        subj_code = r.subject.code if r.subject else "DSA"
        subj_name = r.subject.name if r.subject else "Subject"

        results.append(AIReportOut(
            report_id=r.report_id,
            student_name=student_name,
            student_email=student_email,
            subject_code=subj_code,
            subject_name=subj_name,
            question=r.question,
            ai_answer=r.ai_answer,
            student_reason=r.student_reason,
            faculty_decision=f"Escalated by {r.faculty.name if r.faculty else 'Faculty'}: {r.faculty_decision or ''}",
            faculty_comment=r.faculty_comment,
            status=r.status,
            escalated_to_hod=r.escalated_to_hod,
            created_at=r.created_at
        ))
    return results

class HODReviewAction(BaseModel):
    comment: Optional[str] = None

@router.post("/hod/ai-reports/{id}/approve")
async def hod_approve_report(
    id: uuid.UUID,
    payload: HODReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    report_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.faculty),
        selectinload(AIAnswerReport.student)
    ).where(AIAnswerReport.report_id == id)
    res = await db.execute(report_stmt)
    report = res.scalars().first()

    if not report:
        raise HTTPException(status_code=404, detail="AI report not found")

    report.status = "approved"
    if payload.comment:
        report.faculty_comment = f"{report.faculty_comment or ''} | HOD: {payload.comment}"

    # Notify student
    student_msg = f"The HOD has approved the faculty recommendation on the AI answer report for {report.subject.name if report.subject else 'Subject'}."
    await create_and_push_notification(
        db, report.student_id, "student", "AI Report Approved by HOD 🚩", student_msg, "ai_moderation", report.report_id
    )

    # Notify faculty
    if report.faculty_id:
        fac_msg = f"HOD approved your recommendation on the AI report for {report.subject.name if report.subject else 'Subject'}."
        await create_and_push_notification(
            db, report.faculty_id, "faculty", "HOD Approved AI Report ✅", fac_msg, "ai_moderation", report.report_id
        )

    await db.commit()

    # Broadcast updates over WS
    try:
        report_payload = {
            "type": "flagged_answer_updated",
            "report": {
                "report_id": str(report.report_id),
                "student_name": report.student.name if report.student else "Student",
                "student_email": report.student.email if report.student else "",
                "subject_code": report.subject.code if report.subject else "DSA",
                "subject_name": report.subject.name if report.subject else "Subject",
                "question": report.question,
                "ai_answer": report.ai_answer,
                "student_reason": report.student_reason,
                "faculty_decision": report.faculty_decision,
                "faculty_comment": report.faculty_comment,
                "status": report.status,
                "escalated_to_hod": report.escalated_to_hod,
                "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
            }
        }
        await manager.send_personal_message(report_payload, report.student_id)
        if report.faculty_id:
            await manager.send_personal_message(report_payload, report.faculty_id)
        # Notify HODs
        hods_stmt = select(User).where(User.role == "hod")
        hods_res = await db.execute(hods_stmt)
        hods = hods_res.scalars().all()
        for hod in hods:
            await manager.send_personal_message(report_payload, hod.id)
    except Exception:
        pass

    return {"message": "AI report approved by HOD successfully"}

@router.post("/hod/ai-reports/{id}/reject")
async def hod_reject_report(
    id: uuid.UUID,
    payload: HODReviewAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod)
):
    report_stmt = select(AIAnswerReport).options(
        selectinload(AIAnswerReport.subject),
        selectinload(AIAnswerReport.faculty),
        selectinload(AIAnswerReport.student)
    ).where(AIAnswerReport.report_id == id)
    res = await db.execute(report_stmt)
    report = res.scalars().first()

    if not report:
        raise HTTPException(status_code=404, detail="AI report not found")

    if not payload.comment or not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Remarks are mandatory when discarding the recommendation.")

    # Discard recommendation -> Status is updated to rejected, escalated_to_hod set to False to finalize review
    report.status = "rejected"
    report.escalated_to_hod = False
    report.faculty_comment = f"{report.faculty_comment or ''} | HOD Discard Comment: {payload.comment}"

    # Notify student
    student_msg = f"The HOD has discarded the recommendation on the AI answer report for {report.subject.name if report.subject else 'Subject'}."
    await create_and_push_notification(
        db, report.student_id, "student", "AI Report Discarded by HOD ❌", student_msg, "ai_moderation", report.report_id
    )

    # Notify faculty
    if report.faculty_id:
        fac_msg = f"HOD has discarded the recommendation on the AI report for {report.subject.name if report.subject else 'Subject'}. HOD remarks: {payload.comment}"
        await create_and_push_notification(
            db, report.faculty_id, "faculty", "AI Report Discarded by HOD ❌", fac_msg, "ai_moderation", report.report_id
        )

    await db.commit()

    # Broadcast updates over WS
    try:
        report_payload = {
            "type": "flagged_answer_updated",
            "report": {
                "report_id": str(report.report_id),
                "student_name": report.student.name if report.student else "Student",
                "student_email": report.student.email if report.student else "",
                "subject_code": report.subject.code if report.subject else "DSA",
                "subject_name": report.subject.name if report.subject else "Subject",
                "question": report.question,
                "ai_answer": report.ai_answer,
                "student_reason": report.student_reason,
                "faculty_decision": report.faculty_decision,
                "faculty_comment": report.faculty_comment,
                "status": report.status,
                "escalated_to_hod": report.escalated_to_hod,
                "created_at": report.created_at.isoformat() if hasattr(report.created_at, 'isoformat') else str(report.created_at)
            }
        }
        await manager.send_personal_message(report_payload, report.student_id)
        if report.faculty_id:
            await manager.send_personal_message(report_payload, report.faculty_id)
        # Notify HODs
        hods_stmt = select(User).where(User.role == "hod")
        hods_res = await db.execute(hods_stmt)
        hods = hods_res.scalars().all()
        for hod in hods:
            await manager.send_personal_message(report_payload, hod.id)
    except Exception:
        pass

    return {"message": "AI report recommendation discarded successfully by HOD"}
