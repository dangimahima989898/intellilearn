from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.course import Course
from utils.dependencies import get_current_user, require_admin, require_hod_or_admin
import uuid

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("")
def list_courses(db: Session = Depends(get_db)):
    """Public — no auth needed. Used in registration dropdown."""
    courses = db.query(Course).filter(Course.is_active == True).all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "code": c.code,
            "total_semesters": c.total_semesters,
            "duration_years": c.duration_years,
            "description": c.description,
        }
        for c in courses
    ]

@router.get("/{course_id}/semesters")
def list_semesters(course_id: str, db: Session = Depends(get_db)):
    """Return list of semester numbers for a course."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(400, "Invalid course ID format")
    
    course = db.query(Course).filter(Course.id == course_uuid).first()
    if not course:
        raise HTTPException(404, "Course not found")
    return {
        "course_id": str(course.id),
        "course_name": course.name,
        "course_code": course.code,
        "semesters": [
            {"number": i, "label": f"Semester {i}"}
            for i in range(1, course.total_semesters + 1)
        ]
    }

@router.get("/students/count")
def count_students(
    course_id: str = None,
    semester: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    """Admin utility — count students in a course+semester."""
    from models.user import User
    query = db.query(User).filter(User.role == "student", User.is_active == True)
    if course_id and course_id.strip():
        try:
            course_uuid = uuid.UUID(course_id)
            query = query.filter(User.course_id == course_uuid)
        except ValueError:
            raise HTTPException(400, "Invalid course ID format")
    if semester and semester.strip():
        try:
            semester_val = int(semester)
            query = query.filter(User.current_semester == semester_val)
        except ValueError:
            raise HTTPException(400, "Invalid semester format")
    return {"count": query.count()}

from pydantic import BaseModel

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

class AdvanceSemesterPayload(BaseModel):
    course_id: str
    from_semester: int
    to_semester: int

@admin_router.get("/students")
def list_students(
    course_id: str = None,
    semester: int = None,
    section: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    from models.user import User
    query = db.query(User).filter(User.role == "student")
    if course_id:
        try:
            course_uuid = uuid.UUID(course_id)
            query = query.filter(User.course_id == course_uuid)
        except ValueError:
            raise HTTPException(400, "Invalid course ID format")
    if semester:
        query = query.filter(User.current_semester == semester)
    if section:
        query = query.filter(User.section.ilike(section))
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.enrollment_no.ilike(f"%{search}%"))
        )
    
    students = query.all()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "is_active": s.is_active,
            "streak": s.streak_count,
            "last_active": s.last_active_date.strftime("%Y-%m-%d") if s.last_active_date else "Never",
            "course_id": str(s.course_id) if s.course_id else None,
            "course_code": s.course.code if s.course else None,
            "course_name": s.course.name if s.course else None,
            "current_semester": s.current_semester,
            "enrollment": s.enrollment_no,
            "roll_number": s.roll_number,
            "section": s.section,
            "cgpa": s.cgpa,
            "phone": s.phone,
            "admission_year": s.admission_year,
            "status": "active" if s.is_active else "inactive"
        }
        for s in students
    ]

@admin_router.put("/advance-semester")
def advance_semester(
    payload: AdvanceSemesterPayload,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    from models.user import User
    try:
        course_uuid = uuid.UUID(payload.course_id)
    except ValueError:
        raise HTTPException(400, "Invalid course ID format")
        
    students = db.query(User).filter(
        User.role == "student",
        User.course_id == course_uuid,
        User.current_semester == payload.from_semester
    ).all()
    
    for s in students:
        s.current_semester = payload.to_semester
    db.commit()
    
    return {"message": f"Successfully advanced {len(students)} students to Semester {payload.to_semester}."}

@admin_router.delete("/students/{id}", status_code=204)
def delete_student(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    from models.user import User
    from models.quiz_attempt import QuizAttempt
    from models.notification import Notification
    from models.doubt_upvote import DoubtUpvote
    from models.doubt_question_upvote import DoubtQuestionUpvote
    from models.doubt_answer import DoubtAnswer
    from models.doubt import Doubt
    from models.chat_log import ChatLog
    from models.challenge_submission import ChallengeSubmission
    from models.rate_limit import RateLimit
    
    student = db.query(User).filter(User.id == id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    
    # Clean up student relations cascadingly
    try:
        # Delete upvotes on doubts and answers
        db.query(DoubtUpvote).filter(DoubtUpvote.student_id == id).delete(synchronize_session=False)
        db.query(DoubtQuestionUpvote).filter(DoubtQuestionUpvote.user_id == id).delete(synchronize_session=False)
        
        # Delete answers and doubts
        db.query(DoubtAnswer).filter(DoubtAnswer.answered_by == id).delete(synchronize_session=False)
        db.query(Doubt).filter(Doubt.student_id == id).delete(synchronize_session=False)
        
        # Delete rate limits, notifications, chat logs, challenge submissions, quiz attempts
        db.query(RateLimit).filter(RateLimit.student_id == id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.user_id == id).delete(synchronize_session=False)
        db.query(ChatLog).filter(ChatLog.student_id == id).delete(synchronize_session=False)
        db.query(ChallengeSubmission).filter(ChallengeSubmission.student_id == id).delete(synchronize_session=False)
        
        # Delete quiz attempts (will cascade delete quiz answers)
        attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == id).all()
        for att in attempts:
            db.delete(att)
            
        db.delete(student)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")
        
    return None

