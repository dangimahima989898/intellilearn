from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, distinct, cast, Date
from database import get_db
from utils.dependencies import require_hod_or_admin, require_role
from models import (
    User, StudentEnrollment, FacultySubjectAssignment, Subject,
    Semester, Course, AuditLog, StudentApprovalLog, AdminActionLog,
    FlaggedAnswer, FacultyLeaveRequest, Timetable, Department
)
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime, timedelta
import uuid
from utils.security import hash_password

router = APIRouter(prefix="/api/v1/hod", tags=["HOD Actions"])


# ════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/stats")
def get_hod_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin)
):
    """
    HOD Dashboard KPI stats:
    - Pending student approvals
    - Pending leave requests
    - Flagged AI answers (pending review)
    - Subjects with no faculty assigned
    - Today's scheduled classes
    - Total active students
    """
    # Pending approvals
    pending_approvals = db.query(StudentEnrollment)\
        .filter(StudentEnrollment.approval_status == "pending").count()

    # Pending leaves
    pending_leaves = db.query(FacultyLeaveRequest)\
        .filter(FacultyLeaveRequest.status == "pending").count()

    # Flagged AI answers pending
    flagged_pending = db.query(FlaggedAnswer)\
        .filter(FlaggedAnswer.status == "pending").count()

    # Subjects with no faculty assignment
    assigned_subject_ids = db.query(
        distinct(FacultySubjectAssignment.subject_id)
    ).scalar_subquery()

    unassigned_subjects = db.query(Subject).filter(
        Subject.is_archived == False,
        Subject.id.notin_(
            db.query(FacultySubjectAssignment.subject_id)
        )
    ).count()

    # Today's classes
    today_day = datetime.now().strftime("%A")
    VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
    if today_day in VALID_DAYS:
        todays_classes = db.query(Timetable).filter(
            Timetable.day_of_week == today_day
        ).count()
    else:
        todays_classes = 0

    # Total active students
    total_students = db.query(User).filter(
        User.role == "student", User.is_active == True
    ).count()

    # Total active faculty
    total_faculty = db.query(User).filter(
        User.role == "faculty", User.is_active == True
    ).count()

    # Total subjects
    total_subjects = db.query(Subject).filter(Subject.is_archived == False).count()

    # Total departments
    total_departments = db.query(Department).filter(Department.status == "Active").count()

    return {
        "pending_approvals": pending_approvals,
        "pending_leaves": pending_leaves,
        "flagged_ai_answers": flagged_pending,
        "unassigned_subjects": unassigned_subjects,
        "todays_classes": todays_classes,
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_subjects": total_subjects,
        "total_departments": total_departments,
    }


# ════════════════════════════════════════════════════════════════════════════
# STUDENTS
# ════════════════════════════════════════════════════════════════════════════

# Conflicting student routes (get_all_students and get_students_summary_counts) removed.
# They are handled asynchronously in routers/hod_students.py.



# Conflicting faculty routes (get_unassigned_subjects and get_faculty_workload) removed.
# They are handled asynchronously in routers/hod_faculty.py.



class ApprovalRequest(BaseModel):
    action: str # "approved", "rejected", "correction"
    note: Optional[str] = None

class SubjectAssignmentRequest(BaseModel):
    faculty_id: str
    subject_id: str
    role: str = "primary"

class FacultyCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

@router.get("/students/pending")
def get_pending_students(db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """Get all pending student enrollments for approval"""
    enrollments = db.query(StudentEnrollment).filter(StudentEnrollment.approval_status == "pending").all()
    
    result = []
    for enr in enrollments:
        student = enr.student
        course = enr.course
        sem = enr.semester
        result.append({
            "enrollment_id": str(enr.id),
            "student_id": str(student.id),
            "name": student.name,
            "email": student.email,
            "enrollment_number": enr.enrollment_number,
            "id_card_url": enr.id_card_url,
            "course": course.name if course else None,
            "semester": sem.semester_number if sem else None,
            "applied_at": enr.applied_at
        })
    return result

@router.post("/students/{enrollment_id}/review")
def review_student_registration(enrollment_id: str, req: ApprovalRequest, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """Approve, reject, or request correction for a student's registration"""
    if req.action not in ["approved", "rejected", "correction"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    enrollment = db.query(StudentEnrollment).filter(StudentEnrollment.id == uuid.UUID(enrollment_id)).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    student = enrollment.student
    
    # Update enrollment status
    enrollment.approval_status = req.action
    enrollment.approval_note = req.note
    enrollment.approved_by = current_user.id
    
    # If approved, update User status to 'approved'
    if req.action == "approved":
        student.status = "approved"
    elif req.action == "rejected":
        student.status = "rejected"
        
    # Log the action
    approval_log = StudentApprovalLog(
        student_id=student.id,
        action=req.action,
        performed_by=current_user.id,
        reason=req.note
    )
    db.add(approval_log)
    
    # Log to AdminActionLog
    action_type = "APPROVE" if req.action == "approved" else "REJECT"
    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type=action_type,
        details=f"Student registration {req.action} for {student.name} ({student.email}). Reason: {req.note or 'None'}"
    )
    db.add(admin_action)
    
    db.commit()
    return {"message": f"Student registration {req.action} successfully"}

@router.get("/faculty")
def get_faculty_list(db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin", "hod", "faculty"))):
    """Get list of all faculty members with their assigned subjects"""
    faculty = db.query(User).filter(User.role == "faculty").all()
    
    result = []
    for f in faculty:
        subjects = []
        for assignment in f.faculty_assignments:
            if assignment.subject:
                subjects.append({
                    "assignment_id": str(assignment.id),
                    "subject_id": str(assignment.subject_id),
                    "name": assignment.subject.name,
                    "code": assignment.subject.code,
                    "role": assignment.role
                })
        result.append({
            "id": str(f.id), 
            "name": f.name, 
            "email": f.email,
            "subjects": subjects
        })
    return result

@router.post("/faculty/register")
def register_faculty(req: FacultyCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """Register a new faculty member"""
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")
        
    new_faculty = User(
        id=uuid.uuid4(),
        name=req.name.strip(),
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        role="faculty",
        is_active=True,
        streak_count=0,
        last_active_date=date.today(),
        must_change_password=True  # Force them to change password on first login
    )
    
    db.add(new_faculty)
    
    # Log to AdminActionLog
    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="ONBOARD_FACULTY",
        details=f"Onboarded new faculty member: {new_faculty.name} ({new_faculty.email})"
    )
    db.add(admin_action)
    
    db.commit()
    db.refresh(new_faculty)
    
    return {"message": "Faculty member created successfully", "faculty_id": str(new_faculty.id)}

@router.post("/faculty/assign-subject")
def assign_subject_to_faculty(req: SubjectAssignmentRequest, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    """Assign a subject to a faculty member"""
    # Check if faculty exists
    faculty = db.query(User).filter(User.id == uuid.UUID(req.faculty_id), User.role == "faculty").first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    # Check if subject exists
    subject = db.query(Subject).filter(Subject.id == uuid.UUID(req.subject_id)).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Create assignment
    assignment = FacultySubjectAssignment(
        faculty_id=faculty.id,
        subject_id=subject.id,
        role=req.role,
        assigned_by_hod_id=current_user.id
    )
    db.add(assignment)
    
    # Log to AdminActionLog
    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="ASSIGN_SUBJECT",
        details=f"Assigned subject {subject.name} ({subject.code}) to faculty {faculty.name} ({faculty.email}) as {req.role}"
    )
    db.add(admin_action)
    
    db.commit()
    
    return {"message": "Subject assigned successfully"}

@router.delete("/faculty/unassign-subject/{assignment_id}")
def unassign_subject_from_faculty(assignment_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_hod_or_admin)):
    assignment = db.query(FacultySubjectAssignment).filter(FacultySubjectAssignment.id == uuid.UUID(assignment_id)).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    # Fetch details for log
    faculty = assignment.faculty
    subject = assignment.subject
    faculty_name = faculty.name if faculty else "Unknown Faculty"
    subject_name = subject.name if subject else "Unknown Subject"
    subject_code = subject.code if subject else "Unknown Code"
    
    # Log to AdminActionLog
    admin_action = AdminActionLog(
        admin_id=current_user.id,
        action_type="UNASSIGN_SUBJECT",
        details=f"Unassigned subject {subject_name} ({subject_code}) from faculty {faculty_name}"
    )
    db.add(admin_action)
    
    db.delete(assignment)
    db.commit()
    
    return {"message": "Subject unassigned successfully"}
