from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.timetable import Timetable
from models.subject import Subject
from models.user import User
from models.faculty_leave_request import FacultyLeaveRequest
from models.faculty_availability import FacultyAvailability
from models.semester import Semester
from models.course import Course
from schemas.timetable import TimetableCreate, TimetableOut, TimetableUpdate
from pydantic import BaseModel
from utils.dependencies import get_current_user, require_hod_or_admin
from utils.semester_filter import apply_semester_filter
from datetime import datetime, time
from typing import Optional, List
import uuid

router = APIRouter()


def parse_time(t) -> time:
    if isinstance(t, str):
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                return datetime.strptime(t, fmt).time()
            except ValueError:
                pass
        raise ValueError(f"Cannot parse time string: {t}")
    return t


def _check_conflicts(db: Session, slot_data: TimetableCreate, exclude_id: uuid.UUID = None):
    """Check for faculty double-booking, room conflict, approved leave, and availability."""
    start = parse_time(slot_data.start_time)
    end = parse_time(slot_data.end_time)

    if start >= end:
        raise HTTPException(
            status_code=409,
            detail="Conflict: Start time must be before end time."
        )

    # 1. Subject validation
    subject = db.query(Subject).filter(Subject.id == slot_data.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or is archived.")

    # 2. Assigned faculty validation
    if slot_data.faculty_id:
        faculty = db.query(User).filter(User.id == slot_data.faculty_id, User.role == "faculty").first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Assigned faculty member not found.")

    # 3. Substitute faculty validation
    if slot_data.substitute_faculty_id:
        substitute = db.query(User).filter(User.id == slot_data.substitute_faculty_id, User.role == "faculty").first()
        if not substitute:
            raise HTTPException(status_code=404, detail="Substitute faculty member not found.")

    # 4. Semester and course validation
    if slot_data.course_id and slot_data.semester_number:
        course = db.query(Course).filter(Course.id == slot_data.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
            
        semester = db.query(Semester).filter(
            Semester.course_id == slot_data.course_id,
            Semester.semester_number == slot_data.semester_number
        ).first()
        if not semester:
            if 1 <= slot_data.semester_number <= (course.total_semesters or 8):
                semester = Semester(
                    id=uuid.uuid4(),
                    course_id=slot_data.course_id,
                    semester_number=slot_data.semester_number,
                    academic_year="2025-2026",
                    is_active=True
                )
                db.add(semester)
                db.commit()
            else:
                raise HTTPException(status_code=400, detail=f"Semester number {slot_data.semester_number} is out of bounds for course {course.name}.")

    # 5. Fetch existing slots
    base_q = db.query(Timetable).filter(
        Timetable.day_of_week == slot_data.day_of_week
    )
    if exclude_id:
        base_q = base_q.filter(Timetable.id != exclude_id)

    existing = base_q.all()

    def overlaps(slot: Timetable) -> bool:
        """Return True if slot overlaps the requested time window."""
        s_start = parse_time(slot.start_time)
        s_end = parse_time(slot.end_time)
        return s_start < end and s_end > start

    def date_overlaps(slot: Timetable) -> bool:
        """Return True if the requested slot overlaps with the existing slot in date.
        If either is a recurring slot (date is None), they overlap.
        If both are date-specific slots, they only overlap if their dates are identical.
        """
        return slot_data.date is None or slot.date is None or slot_data.date == slot.date

    # 6. Duplicate timetable slot conflict (same course/semester at same time)
    if slot_data.course_id and slot_data.semester_number:
        for ex in existing:
            if ex.course_id and str(ex.course_id) == str(slot_data.course_id) and ex.semester_number == slot_data.semester_number and overlaps(ex) and date_overlaps(ex):
                c_subj = ex.subject.name if ex.subject else "Unknown"
                raise HTTPException(
                    status_code=409,
                    detail=f"Timetable conflict: Semester {slot_data.semester_number} already has class '{c_subj}' on {slot_data.day_of_week} that overlaps {slot_data.start_time}–{slot_data.end_time}."
                )

    # 7. Faculty double-booking, leave, and availability conflicts
    if slot_data.faculty_id:
        faculty_uuid = uuid.UUID(str(slot_data.faculty_id))
        for ex in existing:
            if ex.faculty_id and str(ex.faculty_id) == str(faculty_uuid) and overlaps(ex) and date_overlaps(ex):
                c_subj = ex.subject.name if ex.subject else "Unknown"
                c_course = ex.subject.course.code if (ex.subject and ex.subject.course) else "N/A"
                c_sem = ex.semester_number
                raise HTTPException(
                    status_code=409,
                    detail=f"Faculty conflict: This faculty member already teaches '{c_subj}' ({c_course} Sem {c_sem}) on {slot_data.day_of_week} during {ex.start_time.strftime('%H:%M')}–{ex.end_time.strftime('%H:%M')}."
                )

        from datetime import date
        today = date.today()
        active_leaves = db.query(FacultyLeaveRequest).filter(
            FacultyLeaveRequest.faculty_id == faculty_uuid,
            FacultyLeaveRequest.status == "approved",
            FacultyLeaveRequest.end_date >= today
        ).count()
        if active_leaves > 0:
            raise HTTPException(
                status_code=422,
                detail="LEAVE_CONFLICT: This faculty member has an approved leave. Please resolve the leave or assign a substitute."
            )

        avail = db.query(FacultyAvailability).filter(FacultyAvailability.faculty_id == faculty_uuid).first()
        if avail and avail.unavailable_slots:
            try:
                import json
                slots_list = json.loads(avail.unavailable_slots)
                for u_slot in slots_list:
                    if u_slot.get("day_of_week") == slot_data.day_of_week:
                        u_st_str = u_slot.get("start_time")
                        u_et_str = u_slot.get("end_time")
                        if u_st_str and u_et_str:
                            u_st = parse_time(u_st_str)
                            u_et = parse_time(u_et_str)
                            if u_st < end and start < u_et:
                                raise HTTPException(
                                    status_code=409,
                                    detail=f"Faculty availability conflict: This faculty member is marked unavailable on {slot_data.day_of_week} during {u_st_str}–{u_et_str}."
                                )
            except HTTPException:
                raise
            except Exception:
                pass

    # 8. Room conflict
    if slot_data.room:
        for ex in existing:
            if ex.room and ex.room.strip().lower() == slot_data.room.strip().lower() and overlaps(ex) and date_overlaps(ex):
                c_subj = ex.subject.name if ex.subject else "Unknown"
                c_course = ex.subject.course.code if (ex.subject and ex.subject.course) else "N/A"
                c_sem = ex.semester_number
                raise HTTPException(
                    status_code=409,
                    detail=f"Room conflict: Room '{slot_data.room}' is already booked for '{c_subj}' ({c_course} Sem {c_sem}) on {slot_data.day_of_week} during {ex.start_time.strftime('%H:%M')}–{ex.end_time.strftime('%H:%M')}."
                )


@router.post("", response_model=TimetableOut, status_code=status.HTTP_201_CREATED)
def create_timetable_slot(
    slot_data: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    if not slot_data.course_id or not slot_data.semester_number:
        raise HTTPException(status_code=400, detail="course_id and semester_number are required.")

    subject = db.query(Subject).filter(Subject.id == slot_data.subject_id, Subject.is_archived == False).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    _check_conflicts(db, slot_data)

    faculty_id = uuid.UUID(str(slot_data.faculty_id)) if hasattr(slot_data, 'faculty_id') and slot_data.faculty_id else None
    faculty_user = db.query(User).filter(User.id == faculty_id).first() if faculty_id else None

    new_slot = Timetable(
        id=uuid.uuid4(),
        subject_id=slot_data.subject_id,
        faculty_id=faculty_id,
        day_of_week=slot_data.day_of_week,
        start_time=datetime.strptime(slot_data.start_time, "%H:%M").time(),
        end_time=datetime.strptime(slot_data.end_time, "%H:%M").time(),
        room=slot_data.room,
        course_id=slot_data.course_id,
        semester_number=slot_data.semester_number,
        is_lab=slot_data.is_lab or False,
        status=slot_data.status or "draft",
        date=slot_data.date
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    # Check if currently on approved leave
    faculty_on_leave = False
    if faculty_id:
        from datetime import date
        today = date.today()
        active_leaves = db.query(FacultyLeaveRequest).filter(
            FacultyLeaveRequest.faculty_id == faculty_id,
            FacultyLeaveRequest.status == "approved",
            FacultyLeaveRequest.end_date >= today
        ).count()
        faculty_on_leave = active_leaves > 0

    return {
        "id": new_slot.id,
        "subject_id": new_slot.subject_id,
        "subject_name": subject.name,
        "subject_color": subject.color,
        "faculty_id": str(new_slot.faculty_id) if new_slot.faculty_id else None,
        "faculty_name": faculty_user.name if faculty_user else None,
        "faculty_on_leave": faculty_on_leave,
        "day_of_week": new_slot.day_of_week,
        "start_time": new_slot.start_time.strftime("%H:%M") if hasattr(new_slot.start_time, "strftime") else str(new_slot.start_time),
        "end_time": new_slot.end_time.strftime("%H:%M") if hasattr(new_slot.end_time, "strftime") else str(new_slot.end_time),
        "room": new_slot.room,
        "course_id": new_slot.course_id,
        "semester_number": new_slot.semester_number,
        "is_lab": new_slot.is_lab,
        "status": new_slot.status,
        "substitute_faculty_id": str(new_slot.substitute_faculty_id) if new_slot.substitute_faculty_id else None,
        "substitute_faculty_name": None,
        "date": new_slot.date
    }


@router.get("", response_model=list[TimetableOut])
def get_timetable(
    course_id: uuid.UUID = None,
    semester: int = None,
    start_week_date: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.orm import aliased
    FacultyUser = aliased(User)
    SubstituteUser = aliased(User)

    query = db.query(
        Timetable, 
        Subject.name.label("subject_name"), 
        Subject.color.label("subject_color"),
        FacultyUser.name.label("faculty_name"),
        SubstituteUser.name.label("substitute_faculty_name")
    )\
              .join(Subject, Timetable.subject_id == Subject.id)\
              .outerjoin(FacultyUser, Timetable.faculty_id == FacultyUser.id)\
              .outerjoin(SubstituteUser, Timetable.substitute_faculty_id == SubstituteUser.id)\
              .filter(Subject.is_archived == False)

    if current_user.role == "student":
        query = apply_semester_filter(query, Timetable, current_user)
    elif current_user.role == "faculty":
        # Faculty only sees their own slots
        query = query.filter(Timetable.faculty_id == current_user.id)
    else:
        if course_id:
            query = query.filter(Timetable.course_id == course_id)
        if semester:
            query = query.filter(Timetable.semester_number == semester)

    if start_week_date:
        try:
            from datetime import timedelta
            start_dt = datetime.strptime(start_week_date, "%Y-%m-%d").date()
            end_dt = start_dt + timedelta(days=6)
            query = query.filter(
                (Timetable.date.is_(None)) | 
                ((Timetable.date >= start_dt) & (Timetable.date <= end_dt))
            )
        except ValueError:
            pass

    # Apply pagination if requested (backward compatible: no pagination if not provided)
    if page is not None and limit is not None:
        page = max(1, page)
        limit = min(max(1, limit), 500)
        query = query.offset((page - 1) * limit).limit(limit)

    results = query.all()

    from datetime import date
    today = date.today()
    on_leave_faculty_ids = {
        str(r.faculty_id) for r in db.query(FacultyLeaveRequest).filter(
            FacultyLeaveRequest.status == "approved",
            FacultyLeaveRequest.end_date >= today
        ).all()
    }

    return [
        {
            "id": slot.id,
            "subject_id": slot.subject_id,
            "subject_name": subject_name,
            "subject_color": subject_color,
            "faculty_id": str(slot.faculty_id) if slot.faculty_id else None,
            "faculty_name": faculty_name,
            "faculty_on_leave": str(slot.faculty_id) in on_leave_faculty_ids if slot.faculty_id else False,
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time.strftime("%H:%M") if hasattr(slot.start_time, "strftime") else str(slot.start_time),
            "end_time": slot.end_time.strftime("%H:%M") if hasattr(slot.end_time, "strftime") else str(slot.end_time),
            "room": slot.room,
            "course_id": slot.course_id,
            "semester_number": slot.semester_number,
            "is_lab": slot.is_lab,
            "status": slot.status,
            "substitute_faculty_id": str(slot.substitute_faculty_id) if slot.substitute_faculty_id else None,
            "substitute_faculty_name": substitute_faculty_name,
            "date": slot.date
        }
        for slot, subject_name, subject_color, faculty_name, substitute_faculty_name in results
    ]


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable_slot(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)  # Only HOD/admin can delete
):
    slot = db.query(Timetable).filter(Timetable.id == id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
    db.delete(slot)
    db.commit()
    return None


class AutoGenerateRequest(BaseModel):
    course_id: str
    semester_number: int
    day_of_week: Optional[str] = None

class PublishRequest(BaseModel):
    course_id: str
    semester_number: int

def check_proposed_conflict(proposed_slots, day: str, start: time, end: time, room: str, faculty_id: uuid.UUID) -> bool:
    for p in proposed_slots:
        if p["day_of_week"] == day:
            overlap = p["start_time"] < end and start < p["end_time"]
            if overlap:
                # Any overlap within the proposed slots for the same cohort is a conflict.
                return True
    return False

@router.post("/auto-generate")
def auto_generate_timetable(
    req: AutoGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    course_uuid = uuid.UUID(req.course_id)
    sem_num = req.semester_number
    
    # Fetch active subjects
    subjects = db.query(Subject).filter(
        Subject.course_id == course_uuid,
        Subject.semester_number == sem_num,
        Subject.is_archived == False
    ).all()
    
    if not subjects:
        raise HTTPException(status_code=400, detail="No active subjects found for this course and semester")
        
    # Delete existing draft slots
    delete_query = db.query(Timetable).filter(
        Timetable.course_id == course_uuid,
        Timetable.semester_number == sem_num,
        Timetable.status == "draft"
    )
    if req.day_of_week:
        delete_query = delete_query.filter(Timetable.day_of_week == req.day_of_week)
    delete_query.delete()
    db.commit()
    
    # Pre-fetch required data for in-memory conflict checking to avoid database roundtrip latency
    from collections import defaultdict
    from datetime import date, datetime
    import json
    
    existing_slots = db.query(Timetable).all()
    
    today = date.today()
    active_leaves = db.query(FacultyLeaveRequest).filter(
        FacultyLeaveRequest.status == "approved",
        FacultyLeaveRequest.start_date <= today,
        FacultyLeaveRequest.end_date >= today
    ).all()
    on_leave_faculty_ids = {leave.faculty_id for leave in active_leaves}
    
    availabilities = db.query(FacultyAvailability).all()
    faculty_unavailabilities = {}
    for av in availabilities:
        if av.unavailable_slots:
            try:
                slots_list = json.loads(av.unavailable_slots)
                parsed_slots = []
                for u_slot in slots_list:
                    day_val = u_slot.get("day_of_week")
                    u_st_str = u_slot.get("start_time")
                    u_et_str = u_slot.get("end_time")
                    if day_val and u_st_str and u_et_str:
                        u_st = time(*map(int, u_st_str.split(':')))
                        u_et = time(*map(int, u_et_str.split(':')))
                        parsed_slots.append((day_val, u_st, u_et))
                faculty_unavailabilities[av.faculty_id] = parsed_slots
            except Exception:
                pass
                
    # Track faculty contact hours
    db_faculty_hours = defaultdict(float)
    for s in existing_slots:
        if s.faculty_id:
            duration = (datetime.combine(date.min, s.end_time) - datetime.combine(date.min, s.start_time)).seconds / 3600.0
            db_faculty_hours[s.faculty_id] += duration
            
    proposed_faculty_hours = defaultdict(float)
    
    def get_total_faculty_hours(faculty_id: uuid.UUID) -> float:
        if not faculty_id:
            return 0.0
        return db_faculty_hours[faculty_id] + proposed_faculty_hours[faculty_id]
        
    def check_placement_conflict_in_memory(day: str, start: time, end: time, room: str, faculty_id: uuid.UUID) -> bool:
        # 1. Room conflict
        for s in existing_slots:
            if s.day_of_week == day and s.room == room:
                if s.start_time < end and s.end_time > start:
                    return True
                    
        # 2. Faculty conflict
        if faculty_id:
            for s in existing_slots:
                if s.day_of_week == day and s.faculty_id == faculty_id:
                    if s.start_time < end and s.end_time > start:
                        return True
                        
            # 3. Approved leave
            if faculty_id in on_leave_faculty_ids:
                return True
                
            # 4. Faculty unavailability
            unavail_list = faculty_unavailabilities.get(faculty_id, [])
            for u_day, u_start, u_end in unavail_list:
                if u_day == day:
                    if u_start < end and start < u_end:
                        return True

        # 5. Cohort conflict (same course and semester)
        for s in existing_slots:
            if s.day_of_week == day and s.course_id == course_uuid and s.semester_number == sem_num:
                if s.start_time < end and s.end_time > start:
                    return True
        return False
        
    from models.faculty_subject_assignment import FacultySubjectAssignment
    
    # Define slots
    L_SLOTS = [
        (time(9, 0), time(10, 0)),
        (time(10, 0), time(11, 0)),
        (time(11, 0), time(12, 0)),
        (time(12, 0), time(13, 0)),
        (time(14, 0), time(15, 0)),
        (time(15, 0), time(16, 0))
    ]
    
    LAB_SLOTS = [
        (time(9, 0), time(11, 0)),
        (time(11, 0), time(13, 0)),
        (time(14, 0), time(16, 0))
    ]
    
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    ROOMS_LEC = ["Room 101", "Room 102", "Room 201", "Room 202"]
    ROOMS_LAB = ["Lab A", "Lab B"]
    
    requests = []
    for s in subjects:
        assign = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.subject_id == s.id,
            FacultySubjectAssignment.role == "primary"
        ).first()
        faculty_id = assign.faculty_id if assign else None
        
        is_lab = any(word in s.name.lower() for word in ["lab", "laboratory", "practical", "workshop"])
        credits = s.credit_hours or 3
        
        if is_lab:
            blocks = credits // 2
            for _ in range(blocks):
                requests.append({
                    "subject_id": s.id,
                    "faculty_id": faculty_id,
                    "is_lab": True,
                    "duration": 2.0
                })
            if credits % 2 == 1:
                requests.append({
                    "subject_id": s.id,
                    "faculty_id": faculty_id,
                    "is_lab": True,
                    "duration": 1.0
                })
        else:
            for _ in range(credits):
                requests.append({
                    "subject_id": s.id,
                    "faculty_id": faculty_id,
                    "is_lab": False,
                    "duration": 1.0
                })
                
    requests.sort(key=lambda r: r["is_lab"], reverse=True)
    
    proposed_slots = []
    unplaced_requests = []
    
    for req_item in requests:
        duration = req_item["duration"]
        faculty_id = req_item["faculty_id"]
        sub_id = req_item["subject_id"]
        is_lab = req_item["is_lab"]
        
        if is_lab and duration == 2.0:
            slots_to_try = LAB_SLOTS
            rooms_to_try = ROOMS_LAB
        else:
            slots_to_try = L_SLOTS
            rooms_to_try = ROOMS_LEC
            
        candidates = []
        for day in DAYS:
            for start, end in slots_to_try:
                if faculty_id:
                    curr_hours = get_total_faculty_hours(faculty_id)
                    if curr_hours + duration > 16.0:
                        continue
                        
                for room in rooms_to_try:
                    if check_placement_conflict_in_memory(day, start, end, room, faculty_id):
                        continue
                    if check_proposed_conflict(proposed_slots, day, start, end, room, faculty_id):
                        continue
                        
                    # Calculate heuristic score for this valid candidate slot
                    score = 0
                    
                    # Gather all slots currently scheduled for this cohort on this day
                    cohort_day_slots = []
                    for s in existing_slots:
                        if s.day_of_week == day and s.course_id == course_uuid and s.semester_number == sem_num:
                            cohort_day_slots.append((s.start_time, s.end_time, s.subject_id))
                    for p in proposed_slots:
                        if p["day_of_week"] == day:
                            cohort_day_slots.append((p["start_time"], p["end_time"], p["subject_id"]))
                            
                    # Heuristic 1: Subject distribution
                    # Avoid scheduling the same subject twice on the same day (unless it is a lab block)
                    same_subject_on_day = any(s_id == sub_id for _, _, s_id in cohort_day_slots)
                    if same_subject_on_day and not is_lab:
                        score -= 50
                        
                    # Heuristic 2: Contiguity / Gap minimization
                    if not cohort_day_slots:
                        # Empty day: prefer starting classes early in the morning (09:00)
                        score += 10 - start.hour
                    else:
                        # Day already has classes scheduled:
                        is_adjacent = False
                        fills_gap = False
                        
                        for c_start, c_end, _ in cohort_day_slots:
                            if start == c_end or end == c_start:
                                is_adjacent = True
                                
                        # Check if placing here fills a gap (classes exist both before and after)
                        has_before = any(c_end <= start for c_start, c_end, _ in cohort_day_slots)
                        has_after = any(c_start >= end for c_start, c_end, _ in cohort_day_slots)
                        if has_before and has_after:
                            fills_gap = True
                            
                        if fills_gap:
                            score += 100
                        elif is_adjacent:
                            score += 50
                        else:
                            # Not adjacent, creates a gap
                            score -= 30
                            
                    candidates.append({
                        "day": day,
                        "start_time": start,
                        "end_time": end,
                        "room": room,
                        "score": score
                    })
                    
        if candidates:
            # Sort candidates by score descending
            candidates.sort(key=lambda c: c["score"], reverse=True)
            best = candidates[0]
            
            proposed_slots.append({
                "subject_id": sub_id,
                "faculty_id": faculty_id,
                "day_of_week": best["day"],
                "start_time": best["start_time"],
                "end_time": best["end_time"],
                "room": best["room"],
                "is_lab": is_lab
            })
            if faculty_id:
                proposed_faculty_hours[faculty_id] += duration
        else:
            unplaced_requests.append(req_item)
            
    created_slots = []
    for p in proposed_slots:
        new_slot = Timetable(
            id=uuid.uuid4(),
            subject_id=p["subject_id"],
            faculty_id=p["faculty_id"],
            day_of_week=p["day_of_week"],
            start_time=p["start_time"],
            end_time=p["end_time"],
            room=p["room"],
            course_id=course_uuid,
            semester_number=sem_num,
            is_lab=p["is_lab"],
            status="draft"
        )
        db.add(new_slot)
        created_slots.append(new_slot)
        
    db.commit()
    
    return {
        "message": f"Successfully auto-generated {len(created_slots)} draft timetable slots.",
        "placed_slots_count": len(created_slots),
        "unplaced_slots_count": len(unplaced_requests)
    }

@router.post("/publish")
def publish_timetable(
    req: PublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    course_uuid = uuid.UUID(req.course_id)
    sem_num = req.semester_number
    
    slots = db.query(Timetable).filter(
        Timetable.course_id == course_uuid,
        Timetable.semester_number == sem_num,
        Timetable.status == "draft"
    ).all()
    
    for s in slots:
        s.status = "released"
        
    db.commit()
    return {"message": f"Successfully published {len(slots)} timetable slots"}


# TimetableUpdate is imported from schemas.timetable


@router.put("/{id}", response_model=TimetableOut)
def update_timetable_slot(
    id: uuid.UUID,
    slot_data: TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    slot = db.query(Timetable).filter(Timetable.id == id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
        
    # Build updated slot representation for validation checks
    temp_data = TimetableCreate(
        subject_id=slot_data.subject_id if slot_data.subject_id is not None else slot.subject_id,
        faculty_id=slot_data.faculty_id if slot_data.faculty_id is not None else slot.faculty_id,
        day_of_week=slot_data.day_of_week if slot_data.day_of_week is not None else slot.day_of_week,
        start_time=slot_data.start_time if slot_data.start_time is not None else slot.start_time.strftime("%H:%M"),
        end_time=slot_data.end_time if slot_data.end_time is not None else slot.end_time.strftime("%H:%M"),
        room=slot_data.room if slot_data.room is not None else slot.room,
        course_id=slot_data.course_id if slot_data.course_id is not None else slot.course_id,
        semester_number=slot_data.semester_number if slot_data.semester_number is not None else slot.semester_number,
        is_lab=slot_data.is_lab if slot_data.is_lab is not None else slot.is_lab,
        status=slot_data.status if slot_data.status is not None else slot.status,
        substitute_faculty_id=slot_data.substitute_faculty_id if slot_data.substitute_faculty_id is not None else slot.substitute_faculty_id,
        date=slot_data.date if 'date' in slot_data.__fields_set__ else slot.date
    )
    
    # Check conflicts if time, day, room, faculty, or date changed
    if (slot_data.start_time and slot_data.start_time != slot.start_time.strftime("%H:%M")) or \
       (slot_data.end_time and slot_data.end_time != slot.end_time.strftime("%H:%M")) or \
       (slot_data.day_of_week and slot_data.day_of_week != slot.day_of_week) or \
       (slot_data.room is not None and slot_data.room != slot.room) or \
       (slot_data.faculty_id is not None and slot_data.faculty_id != slot.faculty_id) or \
       ('date' in slot_data.__fields_set__ and slot_data.date != slot.date):
        _check_conflicts(db, temp_data, exclude_id=id)

    # Apply updates
    if slot_data.subject_id is not None:
        slot.subject_id = slot_data.subject_id
    if slot_data.faculty_id is not None:
        slot.faculty_id = slot_data.faculty_id
    if slot_data.day_of_week is not None:
        slot.day_of_week = slot_data.day_of_week
    if slot_data.start_time is not None:
        from datetime import datetime
        slot.start_time = datetime.strptime(slot_data.start_time, "%H:%M").time()
    if slot_data.end_time is not None:
        from datetime import datetime
        slot.end_time = datetime.strptime(slot_data.end_time, "%H:%M").time()
    if slot_data.room is not None:
        slot.room = slot_data.room
    if slot_data.course_id is not None:
        slot.course_id = slot_data.course_id
    if slot_data.semester_number is not None:
        slot.semester_number = slot_data.semester_number
    if slot_data.is_lab is not None:
        slot.is_lab = slot_data.is_lab
    if slot_data.status is not None:
        slot.status = slot_data.status
    if slot_data.substitute_faculty_id is not None:
        slot.substitute_faculty_id = slot_data.substitute_faculty_id
    if 'date' in slot_data.__fields_set__:
        slot.date = slot_data.date
        
    db.commit()
    db.refresh(slot)
    
    subject = db.query(Subject).filter(Subject.id == slot.subject_id).first()
    faculty_user = db.query(User).filter(User.id == slot.faculty_id).first() if slot.faculty_id else None
    substitute_user = db.query(User).filter(User.id == slot.substitute_faculty_id).first() if slot.substitute_faculty_id else None
    
    faculty_on_leave = False
    if slot.faculty_id:
        from datetime import date
        today = date.today()
        active_leaves = db.query(FacultyLeaveRequest).filter(
            FacultyLeaveRequest.faculty_id == slot.faculty_id,
            FacultyLeaveRequest.status == "approved",
            FacultyLeaveRequest.end_date >= today
        ).count()
        faculty_on_leave = active_leaves > 0
        
    return {
        "id": slot.id,
        "subject_id": slot.subject_id,
        "subject_name": subject.name if subject else None,
        "subject_color": subject.color if subject else None,
        "faculty_id": str(slot.faculty_id) if slot.faculty_id else None,
        "faculty_name": faculty_user.name if faculty_user else None,
        "faculty_on_leave": faculty_on_leave,
        "day_of_week": slot.day_of_week,
        "start_time": slot.start_time.strftime("%H:%M") if hasattr(slot.start_time, "strftime") else str(slot.start_time),
        "end_time": slot.end_time.strftime("%H:%M") if hasattr(slot.end_time, "strftime") else str(slot.end_time),
        "room": slot.room,
        "course_id": slot.course_id,
        "semester_number": slot.semester_number,
        "is_lab": slot.is_lab,
        "status": slot.status,
        "substitute_faculty_id": str(slot.substitute_faculty_id) if slot.substitute_faculty_id else None,
        "substitute_faculty_name": substitute_user.name if substitute_user else None,
        "date": slot.date
    }

