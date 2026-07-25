from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, time
import uuid
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.faculty_leave_request import FacultyLeaveRequest
from utils.dependencies import require_hod_or_admin, get_current_user

router = APIRouter(prefix="/api/v1/leave", tags=["Leave Management"])

def require_faculty(current_user: User = Depends(get_current_user)):
    if current_user.role != "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty can access this route"
        )
    return current_user

class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str

@router.post("/apply")
def apply_for_leave(req: LeaveRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_faculty)):
    """Faculty applies for leave"""
    if req.start_date > req.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    leave = FacultyLeaveRequest(
        id=uuid.uuid4(),
        faculty_id=current_user.id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status="pending"
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return {"message": "Leave application submitted successfully", "leave_id": str(leave.id)}

@router.get("/mine")
def get_my_leaves(db: Session = Depends(get_db), current_user: User = Depends(require_faculty)):
    """Faculty views their own leave requests"""
    leaves = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.faculty_id == current_user.id).order_by(FacultyLeaveRequest.created_at.desc()).all()
    result = []
    for l in leaves:
        result.append({
            "id": str(l.id),
            "start_date": l.start_date,
            "end_date": l.end_date,
            "reason": l.reason,
            "status": l.status,
            "created_at": l.created_at
        })
    return result

class LeaveReviewRequest(BaseModel):
    status: str # "approved" or "rejected"

@router.get("/pending")
def get_pending_leaves(db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """HOD gets all pending leaves"""
    leaves = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.status == "pending").order_by(FacultyLeaveRequest.created_at.asc()).all()
    result = []
    for l in leaves:
        result.append({
            "id": str(l.id),
            "faculty_name": l.faculty.name,
            "faculty_id": str(l.faculty.id),
            "start_date": l.start_date,
            "end_date": l.end_date,
            "reason": l.reason,
            "status": l.status,
            "created_at": l.created_at
        })
    return result

@router.post("/{leave_id}/review")
def review_leave(leave_id: str, req: LeaveReviewRequest, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """HOD approves or rejects leave"""
    if req.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        leave_uuid = uuid.UUID(leave_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    leave = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.id == leave_uuid).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Leave request is already processed")

    leave.status = req.status
    leave.reviewed_by_hod_id = current_user.id
    db.commit()

    return {"message": f"Leave request {req.status} successfully"}

@router.get("/{leave_id}/impact")
def get_leave_impact(leave_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    try:
        leave_uuid = uuid.UUID(leave_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    leave = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.id == leave_uuid).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    from models.timetable import Timetable
    from models.faculty_availability import FacultyAvailability
    from models import User
    import json
    
    # Pre-fetch all active faculty
    active_faculty = db.query(User).filter(User.role == "faculty", User.is_active == True).all()

    # Generate dates list from start_date to end_date
    affected_lectures = []
    curr_date = leave.start_date
    all_dates = []
    while curr_date <= leave.end_date:
        all_dates.append(curr_date)
        curr_date += timedelta(days=1)

    VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
    for d in all_dates:
        day_str = d.strftime("%A") # "Monday", "Tuesday", etc.
        if day_str not in VALID_DAYS:
            continue
        # Find classes of the original lecturer on this day_of_week
        slots = db.query(Timetable).filter(
            Timetable.faculty_id == leave.faculty_id,
            Timetable.day_of_week == day_str
        ).all()
        
        for slot in slots:
            # For this slot, find available faculty
            rec_substitutes = []
            for fac in active_faculty:
                if fac.id == leave.faculty_id:
                    continue # Cannot substitute themselves
                
                # 1. Check leave status on date `d`
                has_leave = db.query(FacultyLeaveRequest).filter(
                    FacultyLeaveRequest.faculty_id == fac.id,
                    FacultyLeaveRequest.status == "approved",
                    FacultyLeaveRequest.start_date <= d,
                    FacultyLeaveRequest.end_date >= d
                ).first()
                if has_leave:
                    continue
                
                # 2. Check if fac has their own timetable slot on day_str that overlaps with slot
                overlapping_slot = db.query(Timetable).filter(
                    Timetable.faculty_id == fac.id,
                    Timetable.day_of_week == day_str,
                    Timetable.start_time < slot.end_time,
                    Timetable.end_time > slot.start_time
                ).first()
                if overlapping_slot:
                    continue
                
                # 3. Check FacultyAvailability
                avail = db.query(FacultyAvailability).filter(FacultyAvailability.faculty_id == fac.id).first()
                is_unavailable = False
                if avail and avail.unavailable_slots:
                    try:
                        slots_list = json.loads(avail.unavailable_slots)
                        for u_slot in slots_list:
                            if u_slot.get("day_of_week") == day_str:
                                u_st_str = u_slot.get("start_time")
                                u_et_str = u_slot.get("end_time")
                                if u_st_str and u_et_str:
                                    # parse HH:MM
                                    u_st = time(*map(int, u_st_str.split(':')))
                                    u_et = time(*map(int, u_et_str.split(':')))
                                    if u_st < slot.end_time and slot.start_time < u_et:
                                        is_unavailable = True
                                        break
                    except Exception:
                        pass
                
                if is_unavailable:
                    continue
                
                rec_substitutes.append({
                    "id": str(fac.id),
                    "name": fac.name,
                    "email": fac.email
                })
                
            affected_lectures.append({
                "date": d.isoformat(),
                "day_of_week": day_str,
                "start_time": slot.start_time.isoformat() if slot.start_time else None,
                "end_time": slot.end_time.isoformat() if slot.end_time else None,
                "timetable_id": str(slot.id),
                "subject_id": str(slot.subject_id),
                "subject_name": slot.subject.name if slot.subject else None,
                "subject_code": slot.subject.code if slot.subject else None,
                "course_name": slot.subject.course.name if (slot.subject and slot.subject.course) else None,
                "semester_number": slot.semester_number,
                "room": slot.room,
                "recommended_substitutes": rec_substitutes
            })
            
    return {
        "leave_id": str(leave.id),
        "faculty_id": str(leave.faculty_id),
        "faculty_name": leave.faculty.name,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "affected_lectures": affected_lectures
    }

class SubstitutionItem(BaseModel):
    timetable_id: str
    date: date
    substitute_faculty_id: str

class LeaveSubstitutionRequest(BaseModel):
    substitutions: List[SubstitutionItem]

@router.post("/{leave_id}/substitute")
def assign_leave_substitutions(
    leave_id: str,
    req: LeaveSubstitutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    try:
        leave_uuid = uuid.UUID(leave_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    leave = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.id == leave_uuid).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    from models.timetable_substitution import TimetableSubstitution
    from models.timetable import Timetable
    
    for sub in req.substitutions:
        t_id = uuid.UUID(sub.timetable_id)
        f_id = uuid.UUID(sub.substitute_faculty_id)
        
        timetable_slot = db.query(Timetable).filter(Timetable.id == t_id).first()
        if not timetable_slot:
            raise HTTPException(status_code=404, detail=f"Timetable slot {sub.timetable_id} not found")
            
        existing = db.query(TimetableSubstitution).filter(
            TimetableSubstitution.timetable_id == t_id,
            TimetableSubstitution.date == sub.date
        ).first()
        
        if existing:
            existing.substitute_faculty_id = f_id
            existing.original_faculty_id = timetable_slot.faculty_id
        else:
            new_sub = TimetableSubstitution(
                id=uuid.uuid4(),
                timetable_id=t_id,
                original_faculty_id=timetable_slot.faculty_id,
                substitute_faculty_id=f_id,
                date=sub.date
            )
            db.add(new_sub)
            
    db.commit()
    return {"message": "Substitutions assigned successfully"}

@router.get("/all")
def get_all_leaves(
    status: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    branch: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """Get all leaves with filters (status, month, year, branch)"""
    q = db.query(FacultyLeaveRequest).join(User, User.id == FacultyLeaveRequest.faculty_id)
    
    if status:
        q = q.filter(FacultyLeaveRequest.status == status)
    if branch:
        q = q.filter(User.branch.ilike(f"%{branch}%"))
    if month:
        from sqlalchemy import extract
        q = q.filter(extract('month', FacultyLeaveRequest.start_date) == month)
    if year:
        from sqlalchemy import extract
        q = q.filter(extract('year', FacultyLeaveRequest.start_date) == year)
        
    leaves = q.order_by(FacultyLeaveRequest.created_at.desc()).all()
    
    result = []
    for l in leaves:
        result.append({
            "id": str(l.id),
            "faculty_name": l.faculty.name,
            "faculty_id": str(l.faculty.id),
            "faculty_branch": l.faculty.branch,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "reason": l.reason,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })
    return result

@router.get("/calendar")
def get_leave_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """Get approved leave requests for calendar view"""
    leaves = db.query(FacultyLeaveRequest).filter(FacultyLeaveRequest.status == "approved").all()
    
    result = []
    for l in leaves:
        result.append({
            "id": str(l.id),
            "faculty_name": l.faculty.name,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "reason": l.reason
        })
    return result

