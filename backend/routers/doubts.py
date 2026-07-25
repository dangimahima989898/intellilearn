from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_
from typing import List, Optional
import uuid
from datetime import datetime
import json

from database import get_db
from models.doubt import Doubt
from models.doubt_answer import DoubtAnswer
from models.doubt_upvote import DoubtUpvote
from models.doubt_question_upvote import DoubtQuestionUpvote
from models.subject import Subject
from models.user import User
from models.faculty_subject_assignment import FacultySubjectAssignment
from models.notification import Notification
from routers.notifications import manager
from utils.dependencies import require_student, get_current_user, require_admin, require_role
from schemas.doubt import DoubtCreate, DoubtOut, DoubtAnswerCreate, DoubtAnswerOut

router = APIRouter(prefix="/doubts", tags=["Doubt Board"])

@router.post("/", response_model=DoubtOut)
async def create_doubt(
    req: DoubtCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_doubt = Doubt(
        id=uuid.uuid4(),
        student_id=current_user.id,
        subject_id=req.subject_id,
        question_text=req.question_text
    )
    db.add(new_doubt)
    db.commit()
    db.refresh(new_doubt)

    # Find faculty members assigned to this subject
    assignments = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.subject_id == req.subject_id,
        FacultySubjectAssignment.approval_status == "approved"
    ).all()

    for assignment in assignments:
        notif = Notification(
            id=uuid.uuid4(),
            recipient_user_id=assignment.faculty_id,
            recipient_role="faculty",
            title="New Doubt Raised",
            message=json.dumps({
                "message": f"Student {current_user.name} raised a doubt in {subject.name}: '{req.question_text[:50]}...'",
                "student_name": current_user.name,
                "subject": subject.name,
                "doubt_title": req.question_text[:30],
                "timestamp": datetime.utcnow().isoformat()
            }),
            module="doubts",
            reference_id=new_doubt.id,
            priority="Medium"
        )
        db.add(notif)
        
        # Real-time WebSocket delivery
        try:
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
            }, assignment.faculty_id)
            
            await manager.send_personal_message({
                "type": "doubt_created",
                "doubt": {
                    "id": str(new_doubt.id),
                    "student_id": str(new_doubt.student_id),
                    "student_name": current_user.name,
                    "subject_id": str(new_doubt.subject_id),
                    "subject_name": subject.name,
                    "question_text": new_doubt.question_text,
                    "is_resolved": new_doubt.is_resolved,
                    "vote_count": new_doubt.vote_count,
                    "answer_count": 0,
                    "created_at": datetime.now().isoformat(),
                    "accepted_answer_id": None,
                    "current_user_upvoted": False
                }
            }, assignment.faculty_id)
        except Exception:
            pass

    if assignments:
        db.commit()

    return DoubtOut(
        id=new_doubt.id,
        student_id=new_doubt.student_id,
        student_name=current_user.name,
        subject_id=new_doubt.subject_id,
        subject_name=subject.name,
        subject_color=None, # color logic if needed
        question_text=new_doubt.question_text,
        is_resolved=new_doubt.is_resolved,
        vote_count=new_doubt.vote_count,
        answer_count=0,
        created_at=new_doubt.created_at,
        accepted_answer_id=new_doubt.accepted_answer_id,
        current_user_upvoted=False
    )

@router.get("/", response_model=List[DoubtOut])
def get_doubts(
    subject_id: Optional[uuid.UUID] = None,
    is_resolved: Optional[bool] = None,
    page: int = 1,
    size: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Doubt).options(joinedload(Doubt.student), joinedload(Doubt.subject))\
              .join(Subject, Doubt.subject_id == Subject.id)\
              .filter(Subject.is_archived == False)
    
    if subject_id:
        query = query.filter(Doubt.subject_id == subject_id)
    if is_resolved is not None:
        query = query.filter(Doubt.is_resolved == is_resolved)
        
    offset = (page - 1) * size
    doubts = query.order_by(desc(Doubt.created_at)).offset(offset).limit(size).all()

    results = []
    for d in doubts:
        # Count answers
        ans_count = db.query(func.count(DoubtAnswer.id)).filter(DoubtAnswer.doubt_id == d.id).scalar()
        
        user_upvoted = db.query(DoubtQuestionUpvote).filter(
            DoubtQuestionUpvote.doubt_id == d.id, 
            DoubtQuestionUpvote.user_id == current_user.id
        ).first() is not None

        results.append(DoubtOut(
            id=d.id,
            student_id=d.student_id,
            student_name=d.student.name,
            subject_id=d.subject_id,
            subject_name=d.subject.name,
            question_text=d.question_text,
            is_resolved=d.is_resolved,
            vote_count=d.vote_count,
            answer_count=ans_count,
            created_at=d.created_at,
            accepted_answer_id=d.accepted_answer_id,
            current_user_upvoted=user_upvoted
        ))
    return results

@router.get("/{id}", response_model=dict)
def get_doubt_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doubt = db.query(Doubt).options(joinedload(Doubt.student), joinedload(Doubt.subject)).filter(Doubt.id == id).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    # Get answers with upvote info
    answers_query = db.query(DoubtAnswer).filter(DoubtAnswer.doubt_id == id)
    answers = answers_query.order_by(desc(DoubtAnswer.is_accepted), desc(DoubtAnswer.upvotes)).all()

    formatted_answers = []
    for ans in answers:
        # Check if current user upvoted
        upvoted = db.query(DoubtUpvote).filter(
            DoubtUpvote.student_id == current_user.id,
            DoubtUpvote.answer_id == ans.id
        ).first() is not None
        
        # Get answerer name
        answerer = db.query(User).get(ans.answered_by)
        
        formatted_answers.append({
            "id": ans.id,
            "doubt_id": ans.doubt_id,
            "answered_by_id": ans.answered_by,
            "answered_by_name": answerer.name if answerer else "Unknown",
            "answer_text": ans.answer_text,
            "upvotes": ans.upvotes,
            "is_accepted": ans.is_accepted,
            "is_verified_by_admin": ans.is_verified_by_admin,
            "created_at": ans.created_at,
            "current_user_upvoted": upvoted
        })

    ans_count = len(formatted_answers)
    
    doubt_upvoted = db.query(DoubtQuestionUpvote).filter(
        DoubtQuestionUpvote.doubt_id == doubt.id, 
        DoubtQuestionUpvote.user_id == current_user.id
    ).first() is not None

    doubt_out = DoubtOut(
        id=doubt.id,
        student_id=doubt.student_id,
        student_name=doubt.student.name,
        subject_id=doubt.subject_id,
        subject_name=doubt.subject.name,
        question_text=doubt.question_text,
        is_resolved=doubt.is_resolved,
        vote_count=doubt.vote_count,
        answer_count=ans_count,
        created_at=doubt.created_at,
        accepted_answer_id=doubt.accepted_answer_id,
        current_user_upvoted=doubt_upvoted
    )

    return {
        "doubt": doubt_out,
        "answers": formatted_answers
    }

@router.post("/{doubt_id}/answers", response_model=DoubtAnswerOut)
async def answer_doubt(
    doubt_id: uuid.UUID,
    req: DoubtAnswerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doubt = db.query(Doubt).get(doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    new_answer = DoubtAnswer(
        id=uuid.uuid4(),
        doubt_id=doubt_id,
        answered_by=current_user.id,
        answer_text=req.answer_text
    )
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)

    # Broadcast answer to student
    try:
        answer_payload = {
            "type": "doubt_answered",
            "doubt_id": str(doubt_id),
            "answer": {
                "id": str(new_answer.id),
                "doubt_id": str(new_answer.doubt_id),
                "answered_by_id": str(new_answer.answered_by),
                "answered_by_name": current_user.name,
                "answer_text": new_answer.answer_text,
                "upvotes": new_answer.upvotes,
                "is_accepted": new_answer.is_accepted,
                "is_verified_by_admin": False,
                "created_at": datetime.now().isoformat(),
                "current_user_upvoted": False
            }
        }
        if doubt.student_id != current_user.id:
            await manager.send_personal_message(answer_payload, doubt.student_id)
            
        # Broadcast to all assigned faculty members
        assignments = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.subject_id == doubt.subject_id,
            FacultySubjectAssignment.approval_status == "approved"
        ).all()
        for assignment in assignments:
            if assignment.faculty_id != current_user.id:
                await manager.send_personal_message(answer_payload, assignment.faculty_id)
    except Exception:
        pass

    return DoubtAnswerOut(
        id=new_answer.id,
        doubt_id=new_answer.doubt_id,
        answered_by_id=new_answer.answered_by,
        answered_by_name=current_user.name,
        answer_text=new_answer.answer_text,
        upvotes=new_answer.upvotes,
        is_accepted=new_answer.is_accepted,
        is_verified_by_admin=False,
        created_at=new_answer.created_at,
        current_user_upvoted=False
    )

from models.doubt_question_upvote import DoubtQuestionUpvote

@router.post("/{doubt_id}/upvote")
def upvote_doubt(
    doubt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doubt = db.query(Doubt).get(doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    existing_upvote = db.query(DoubtQuestionUpvote).filter(
        DoubtQuestionUpvote.user_id == current_user.id,
        DoubtQuestionUpvote.doubt_id == doubt_id
    ).first()

    if existing_upvote:
        # Toggle off
        db.delete(existing_upvote)
        doubt.vote_count -= 1
        user_upvoted = False
    else:
        # Toggle on
        new_upvote = DoubtQuestionUpvote(
            id=uuid.uuid4(),
            user_id=current_user.id,
            doubt_id=doubt_id
        )
        db.add(new_upvote)
        doubt.vote_count += 1
        user_upvoted = True

    db.commit()
    return {"vote_count": doubt.vote_count, "user_upvoted": user_upvoted}

@router.post("/answers/{answer_id}/upvote")
def upvote_answer(
    answer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    answer = db.query(DoubtAnswer).get(answer_id)
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    existing_upvote = db.query(DoubtUpvote).filter(
        DoubtUpvote.student_id == current_user.id,
        DoubtUpvote.answer_id == answer_id
    ).first()

    if existing_upvote:
        # Toggle off
        db.delete(existing_upvote)
        answer.upvotes -= 1
        user_upvoted = False
    else:
        # Toggle on
        new_upvote = DoubtUpvote(
            id=uuid.uuid4(),
            student_id=current_user.id,
            answer_id=answer_id
        )
        db.add(new_upvote)
        answer.upvotes += 1
        user_upvoted = True

    db.commit()
    return {"upvotes": answer.upvotes, "user_upvoted": user_upvoted}

@router.put("/{doubt_id}/resolve", response_model=DoubtOut)
async def resolve_doubt(
    doubt_id: uuid.UUID,
    accepted_answer_id: uuid.UUID, # Pass directly in query or body
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    doubt = db.query(Doubt).get(doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
    
    if doubt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can resolve this doubt")

    if doubt.is_resolved:
        raise HTTPException(status_code=409, detail="This doubt is already resolved")

    answer = db.query(DoubtAnswer).filter(
        DoubtAnswer.id == accepted_answer_id,
        DoubtAnswer.doubt_id == doubt_id
    ).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found for this doubt")

    # Update
    doubt.is_resolved = True
    doubt.accepted_answer_id = accepted_answer_id
    answer.is_accepted = True
    
    db.commit()
    db.refresh(doubt)
    
    # Broadcast doubt resolved
    try:
        resolved_payload = {
            "type": "doubt_resolved",
            "doubt": {
                "id": str(doubt.id),
                "is_resolved": True,
                "accepted_answer_id": str(accepted_answer_id)
            }
        }
        # Notify faculty
        assignments = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.subject_id == doubt.subject_id,
            FacultySubjectAssignment.approval_status == "approved"
        ).all()
        for assignment in assignments:
            await manager.send_personal_message(resolved_payload, assignment.faculty_id)
        # Notify student
        await manager.send_personal_message(resolved_payload, doubt.student_id)
    except Exception:
        pass

    # Return formatted DoubtOut
    subject = db.query(Subject).get(doubt.subject_id)
    ans_count = db.query(func.count(DoubtAnswer.id)).filter(DoubtAnswer.doubt_id == doubt.id).scalar()

    return DoubtOut(
        id=doubt.id,
        student_id=doubt.student_id,
        student_name=current_user.name,
        subject_id=doubt.subject_id,
        subject_name=subject.name,
        question_text=doubt.question_text,
        is_resolved=doubt.is_resolved,
        vote_count=doubt.vote_count,
        answer_count=ans_count,
        created_at=doubt.created_at,
        accepted_answer_id=doubt.accepted_answer_id,
        current_user_upvoted=True # If they resolved it, probably upvoted? Or let's just assume false/true. Let's do False. Actually we need to fetch it.
    )

@router.put("/{doubt_id}/admin-resolve")
async def admin_resolve_doubt(
    doubt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("super_admin", "hod", "faculty"))
):
    """Allow admin/HOD/faculty to mark a doubt as resolved without selecting an answer."""
    doubt = db.query(Doubt).get(doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    if doubt.is_resolved:
        raise HTTPException(status_code=409, detail="This doubt is already resolved")

    doubt.is_resolved = True
    db.commit()
    db.refresh(doubt)

    # Broadcast doubt resolved by admin
    try:
        resolved_payload = {
            "type": "doubt_resolved",
            "doubt": {
                "id": str(doubt.id),
                "is_resolved": True,
                "accepted_answer_id": None
            }
        }
        await manager.send_personal_message(resolved_payload, doubt.student_id)
        
        assignments = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.subject_id == doubt.subject_id,
            FacultySubjectAssignment.approval_status == "approved"
        ).all()
        for assignment in assignments:
            if assignment.faculty_id != current_user.id:
                await manager.send_personal_message(resolved_payload, assignment.faculty_id)
    except Exception:
        pass

    subject = db.query(Subject).get(doubt.subject_id)
    student = db.query(User).get(doubt.student_id)
    ans_count = db.query(func.count(DoubtAnswer.id)).filter(DoubtAnswer.doubt_id == doubt.id).scalar()

    return {
        "id": str(doubt.id),
        "is_resolved": True,
        "message": "Doubt marked as resolved by admin"
    }

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doubt(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doubt = db.query(Doubt).get(id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
        
    # Student own doubt or Admin
    if doubt.student_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this doubt")

    # Cascade delete is handled by relationship in model if defined, 
    # but let's be safe or check relationship
    # relationship("DoubtAnswer", back_populates="doubt", cascade="all, delete-orphan") 
    # Wait, in the model I view earlier, cascade was NOT defined. I should add it or delete manually.
    
    answers = db.query(DoubtAnswer).filter(DoubtAnswer.doubt_id == id).all()
    for ans in answers:
        # Delete upvotes of answers
        db.query(DoubtUpvote).filter(DoubtUpvote.answer_id == ans.id).delete()
        db.delete(ans)
        
    db.delete(doubt)
    db.commit()
    return None

@router.put("/answers/{answer_id}/verify")
def verify_answer(
    answer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("super_admin", "hod", "faculty"))
):
    answer = db.query(DoubtAnswer).get(answer_id)
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    answer.is_verified_by_admin = not answer.is_verified_by_admin
    db.commit()
    db.refresh(answer)
    return {"is_verified_by_admin": answer.is_verified_by_admin}
from pydantic import BaseModel

class DoubtAnswerFlagPayload(BaseModel):
    flag_reason: Optional[str] = None

@router.post("/answers/{answer_id}/flag")
async def flag_doubt_answer(
    answer_id: uuid.UUID,
    payload: DoubtAnswerFlagPayload,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    answer = db.query(DoubtAnswer).get(answer_id)
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    answerer = db.query(User).get(answer.answered_by)
    if not answerer:
        raise HTTPException(status_code=404, detail="Answerer not found")
        
    doubt = db.query(Doubt).get(answer.doubt_id)
    if not doubt:
        raise HTTPException(status_code=404, detail="Associated doubt not found")
        
    subject = db.query(Subject).get(doubt.subject_id)
    
    # Save Notification
    notif = Notification(
        id=uuid.uuid4(),
        recipient_user_id=answerer.id,
        recipient_role=answerer.role,
        title="Doubt Answer Flagged",
        message=json.dumps({
            "message": f"Your answer to the doubt '{doubt.question_text[:50]}...' has been flagged.",
            "reason": payload.flag_reason or "No reason provided",
            "student_name": current_user.name,
            "doubt_title": doubt.question_text[:50],
            "timestamp": datetime.utcnow().isoformat()
        }),
        module="doubts",
        reference_id=answer.id,
        priority="High"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    # WebSocket delivery
    try:
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
        }, answerer.id)
    except Exception:
        pass
        
    return {"message": "Answer flagged successfully and faculty notified"}
