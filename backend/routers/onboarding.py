import io
import random
import string
import logging
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from database import get_db
from models.user import User
from models.enrolled_student import EnrolledStudent
from models.student_access_request import StudentAccessRequest
from schemas.onboarding import (
    StudentAccessRequestCreate,
    StudentAccessRequestOut,
    AccessRequestReview,
    EnrolledStudentOut,
    ManualEnrollmentCreate,
    ChangePasswordRequest,
)
from utils.dependencies import get_current_user, require_admin
from utils.security import hash_password, verify_password
from utils.email import send_email

logger = logging.getLogger(__name__)
router = APIRouter()


def generate_random_password(length: int = 12) -> str:
    """Generates a secure random 12-character alphanumeric password"""
    characters = string.ascii_letters + string.digits
    return "".join(random.choice(characters) for _ in range(length))


# ----------------------------------------------------
# PUBLIC STUDENT ENDPOINTS
# ----------------------------------------------------

@router.post("/auth/request-access", status_code=status.HTTP_201_CREATED)
def request_access(request_data: StudentAccessRequestCreate, db: Session = Depends(get_db)):
    """
    Submits a student access request. Enforces 3 requests per email per day limit.
    """

    email_lower = request_data.email.strip().lower()
    enrollment_clean = request_data.enrollment_number.strip()

    # Rate limiting check (max 3 per email per day)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    request_count = db.query(StudentAccessRequest).filter(
        StudentAccessRequest.email == email_lower,
        StudentAccessRequest.created_at >= one_day_ago
    ).count()

    if request_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can request access a maximum of 3 times per day."
        )

    # Check if a user with this email already exists
    existing_user = db.query(User).filter(User.email == email_lower).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already registered, please login."
        )

    # Create the access request
    new_request = StudentAccessRequest(
        id=uuid.uuid4(),
        full_name=request_data.full_name.strip(),
        email=email_lower,
        enrollment_number=enrollment_clean,
        semester=request_data.semester,
        branch=request_data.branch.strip(),
        section=request_data.section.strip().upper(),
        reason=request_data.reason.strip() if request_data.reason else None,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Send confirmation email to student
    student_subject = "We received your IntelliLearn Access Request"
    student_context = {
        "full_name": new_request.full_name,
        "branch": new_request.branch,
        "semester": new_request.semester
    }
    email_ok_student = send_email(
        to_email=new_request.email,
        to_name=new_request.full_name,
        subject=student_subject,
        template_name="request_received.html",
        context=student_context
    )

    # Send notification email to admin
    admin_email = "admin@intellilearn.com"
    admin_subject = f"New Access Request: {new_request.full_name}"
    admin_context = {
        "full_name": new_request.full_name,
        "email": new_request.email,
        "enrollment_number": new_request.enrollment_number,
        "semester": new_request.semester,
        "branch": new_request.branch,
        "section": new_request.section,
        "reason": new_request.reason or "No reason provided",
        "admin_url": "http://localhost:5173/admin/requests"
    }
    email_ok_admin = send_email(
        to_email=admin_email,
        to_name="Admin",
        subject=admin_subject,
        template_name="admin_alert.html",
        context=admin_context
    )

    return {
        "message": "Your request has been submitted. You'll receive your login credentials via email once approved by admin.",
        "request_id": str(new_request.id)
    }


@router.get("/auth/request-status")
def check_request_status(
    email: str = Query(None),
    enrollment_number: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Public utility — allows students to search and check the live status of their access request.
    """
    if not email and not enrollment_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either an email address or enrollment number to track your request."
        )
    
    query = db.query(StudentAccessRequest)
    if email:
        query = query.filter(StudentAccessRequest.email == email.strip().lower())
    if enrollment_number:
        query = query.filter(StudentAccessRequest.enrollment_number == enrollment_number.strip())
        
    req = query.order_by(StudentAccessRequest.created_at.desc()).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching access request found. Please make sure details are correct or submit a new request."
        )
        
    return {
        "id": str(req.id),
        "full_name": req.full_name,
        "email": req.email,
        "enrollment_number": req.enrollment_number,
        "semester": req.semester,
        "branch": req.branch,
        "section": req.section,
        "status": req.status,
        "created_at": req.created_at,
        "reviewed_at": req.reviewed_at
    }


@router.post("/auth/change-password")
def change_password(data: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    """
    Forced password change for first-time logins.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    db.commit()

    return {"message": "Password changed successfully."}


# ----------------------------------------------------
# ADMIN STUDENT MANAGEMENT ENDPOINTS
# ----------------------------------------------------

@router.post("/admin/upload-students")
def upload_students(
    file: UploadFile = File(...),
    preview: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Uploads enrolled students from CSV or Excel. 
    If preview=True, only parses and validates rows returning summary statistics.
    """
    filename = file.filename.lower()
    try:
        contents = file.file.read()
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload CSV or Excel (.xlsx) files."
            )
    except Exception as e:
        logger.exception(f"Error parsing file {file.filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse file: {str(e)}"
        )

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    required_cols = ["full_name", "email", "enrollment_number", "semester", "branch", "section", "academic_year"]
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns in sheet: {', '.join(missing_cols)}"
        )

    preview_rows = []
    success_count = 0
    duplicate_count = 0
    error_rows = []
    seen_enrollments = set()

    for index, row in df.iterrows():
        row_num = index + 2  # 1-indexed plus header row
        
        # Validation checks
        full_name = str(row.get("full_name", "")).strip()
        email = str(row.get("email", "")).strip().lower()
        enrollment_number = str(row.get("enrollment_number", "")).strip()

        if enrollment_number in seen_enrollments:
            duplicate_count += 1
            continue
        seen_enrollments.add(enrollment_number)

        semester_val = row.get("semester")
        branch = str(row.get("branch", "")).strip()
        section = str(row.get("section", "")).strip().upper()
        academic_year = str(row.get("academic_year", "")).strip()

        if not full_name or not email or not enrollment_number or not branch or not section or not academic_year:
            error_rows.append(f"Row {row_num}: Missing required field values.")
            continue

        try:
            semester = int(semester_val)
            if semester < 1 or semester > 8:
                raise ValueError()
        except (ValueError, TypeError):
            error_rows.append(f"Row {row_num}: Invalid semester value (must be 1-8).")
            continue

        # Add to preview
        if len(preview_rows) < 15:
            preview_rows.append({
                "full_name": full_name,
                "email": email,
                "enrollment_number": enrollment_number,
                "semester": semester,
                "branch": branch,
                "section": section,
                "academic_year": academic_year
            })

        # Check duplicate enrollment in db
        existing_enrolled = db.query(EnrolledStudent).filter(
            EnrolledStudent.enrollment_number == enrollment_number
        ).first()

        if existing_enrolled:
            duplicate_count += 1
            continue

        if not preview:
            # Perform DB Insert
            try:
                enrolled = EnrolledStudent(
                    id=uuid.uuid4(),
                    full_name=full_name,
                    email=email,
                    enrollment_number=enrollment_number,
                    semester=semester,
                    branch=branch,
                    section=section,
                    academic_year=academic_year,
                    is_approved=False,
                    credentials_sent=False
                )
                db.add(enrolled)
                success_count += 1
            except Exception as db_err:
                logger.exception(db_err)
                error_rows.append(f"Row {row_num}: Database insertion error.")
        else:
            success_count += 1

    if not preview:
        db.commit()

    return {
        "preview": preview,
        "preview_rows": preview_rows,
        "total_rows": len(df),
        "success_count": success_count,
        "duplicate_count": duplicate_count,
        "error_count": len(error_rows),
        "errors": error_rows
    }


@router.get("/admin/enrolled-students", response_model=List[EnrolledStudentOut])
def get_enrolled_students(
    semester: Optional[int] = None,
    branch: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List enrolled students with search & filter.
    """
    query = db.query(EnrolledStudent)
    if semester:
        query = query.filter(EnrolledStudent.semester == semester)
    if branch:
        query = query.filter(EnrolledStudent.branch.ilike(f"%{branch}%"))
    if status:
        if status.lower() == "approved":
            query = query.filter(EnrolledStudent.is_approved == True)
        elif status.lower() == "pending":
            query = query.filter(EnrolledStudent.is_approved == False)
    if search:
        query = query.filter(
            EnrolledStudent.full_name.ilike(f"%{search}%") |
            EnrolledStudent.enrollment_number.ilike(f"%{search}%") |
            EnrolledStudent.email.ilike(f"%{search}%")
        )
    return query.order_by(EnrolledStudent.created_at.desc()).all()


@router.post("/admin/enrolled-students", response_model=EnrolledStudentOut, status_code=status.HTTP_201_CREATED)
def create_enrolled_student(
    student_data: ManualEnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Manually enroll a student.
    """
    existing = db.query(EnrolledStudent).filter(
        EnrolledStudent.enrollment_number == student_data.enrollment_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this enrollment number is already pre-enrolled."
        )

    new_student = EnrolledStudent(
        id=uuid.uuid4(),
        full_name=student_data.full_name.strip(),
        email=student_data.email.strip().lower(),
        enrollment_number=student_data.enrollment_number.strip(),
        semester=student_data.semester,
        branch=student_data.branch.strip(),
        section=student_data.section.strip().upper(),
        academic_year=student_data.academic_year.strip(),
        is_approved=False,
        credentials_sent=False
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.get("/admin/access-requests", response_model=List[StudentAccessRequestOut])
def get_access_requests(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List access requests by status.
    """
    query = db.query(StudentAccessRequest)
    if status:
        query = query.filter(StudentAccessRequest.status == status.lower().strip())
    return query.order_by(StudentAccessRequest.created_at.desc()).all()


@router.patch("/admin/access-requests/{id}/approve")
def approve_access_request(
    id: uuid.UUID,
    review_data: AccessRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Approves a student's access request.
    Verifies they are enrolled in EnrolledStudent before issuing credentials, unless overridden.
    """
    req = db.query(StudentAccessRequest).filter(StudentAccessRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found.")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already in '{req.status}' state.")

    # Cross check against EnrolledStudent
    enrolled = db.query(EnrolledStudent).filter(
        EnrolledStudent.enrollment_number == req.enrollment_number,
        EnrolledStudent.semester == req.semester
    ).first()

    if not enrolled and not review_data.override:
        return {
            "warning": True,
            "message": "Not in enrolled list — approve anyway?"
        }

    # Verify email uniqueness in User table
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A registered user account already exists with this email address."
        )

    # Generate secure password
    temp_password = generate_random_password(12)

    # Create new student account
    new_user = User(
        id=uuid.uuid4(),
        name=req.full_name,
        email=req.email,
        password_hash=hash_password(temp_password),
        role="student",
        is_active=True,
        must_change_password=True,
        current_semester=req.semester,
        enrollment_no=req.enrollment_number,
        section=req.section,
        branch=req.branch
    )
    db.add(new_user)

    # Send Brevo email
    subject = f"Your IntelliLearn Login Credentials — Semester {req.semester}"
    context = {
        "full_name": req.full_name,
        "semester": req.semester,
        "enrollment_number": req.enrollment_number,
        "email": req.email,
        "password": temp_password,
        "login_url": "http://localhost:5173/login"
    }

    email_sent = send_email(
        to_email=req.email,
        to_name=req.full_name,
        subject=subject,
        template_name="credentials_email.html",
        context=context
    )

    # Update request status
    req.status = "approved"
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()

    # Update enrolled record if found
    if enrolled:
        enrolled.is_approved = True
        enrolled.credentials_sent = email_sent

    db.commit()

    return {
        "warning": False,
        "status": "approved",
        "email_sent": email_sent,
        "message": "Access request approved. Credentials generated & email sent." if email_sent else "Access request approved, but email dispatch failed."
    }


@router.patch("/admin/access-requests/{id}/reject")
def reject_access_request(
    id: uuid.UUID,
    review_data: AccessRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Rejects a student's access request. Sends a rejection email.
    """
    req = db.query(StudentAccessRequest).filter(StudentAccessRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found.")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already in '{req.status}' state.")

    rejection_reason = review_data.rejection_reason or "Provided details do not match administrative records."

    # Update status
    req.status = "rejected"
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()

    # Send Rejection Email
    subject = "Update regarding your IntelliLearn Access Request"
    context = {
        "full_name": req.full_name,
        "rejection_reason": rejection_reason
    }

    email_sent = send_email(
        to_email=req.email,
        to_name=req.full_name,
        subject=subject,
        template_name="rejection_email.html",
        context=context
    )

    db.commit()

    return {
        "status": "rejected",
        "email_sent": email_sent,
        "message": "Access request rejected and email notification sent."
    }


@router.post("/admin/resend-credentials/{id}")
def resend_credentials(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Resends credentials to an approved enrolled student or user.
    Generates a new secure temporary password to overwrite the existing one.
    """
    enrolled = db.query(EnrolledStudent).filter(EnrolledStudent.id == id).first()
    if not enrolled:
        raise HTTPException(status_code=404, detail="Enrolled student not found.")

    # Find the corresponding User account
    user = db.query(User).filter(User.email == enrolled.email).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="No user account exists for this student. Try approving them first or generating credentials."
        )

    # Force a password reset
    temp_password = generate_random_password(12)
    user.password_hash = hash_password(temp_password)
    user.must_change_password = True

    # Send email
    subject = f"Your IntelliLearn Login Credentials — Semester {enrolled.semester}"
    context = {
        "full_name": enrolled.full_name,
        "semester": enrolled.semester,
        "enrollment_number": enrolled.enrollment_number,
        "email": enrolled.email,
        "password": temp_password,
        "login_url": "http://localhost:5173/login"
    }

    email_sent = send_email(
        to_email=enrolled.email,
        to_name=enrolled.full_name,
        subject=subject,
        template_name="credentials_email.html",
        context=context
    )

    if email_sent:
        enrolled.credentials_sent = True
    db.commit()

    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send credentials email via Brevo.")

    return {"message": "Credentials resent successfully."}


@router.post("/admin/generate-credentials/{id}")
def generate_credentials_for_enrolled(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Manually creates a User account and dispatches credentials for a pre-enrolled student.
    """
    enrolled = db.query(EnrolledStudent).filter(EnrolledStudent.id == id).first()
    if not enrolled:
        raise HTTPException(status_code=404, detail="Enrolled student not found.")

    existing_user = db.query(User).filter(User.email == enrolled.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A registered user account already exists with this email address."
        )

    # Generate secure password
    temp_password = generate_random_password(12)

    # Create new student account
    new_user = User(
        id=uuid.uuid4(),
        name=enrolled.full_name,
        email=enrolled.email,
        password_hash=hash_password(temp_password),
        role="student",
        is_active=True,
        must_change_password=True,
        current_semester=enrolled.semester,
        enrollment_no=enrolled.enrollment_number,
        section=enrolled.section,
        branch=enrolled.branch
    )
    db.add(new_user)

    # Send Brevo email
    subject = f"Your IntelliLearn Login Credentials — Semester {enrolled.semester}"
    context = {
        "full_name": enrolled.full_name,
        "semester": enrolled.semester,
        "enrollment_number": enrolled.enrollment_number,
        "email": enrolled.email,
        "password": temp_password,
        "login_url": "http://localhost:5173/login"
    }

    email_sent = send_email(
        to_email=enrolled.email,
        to_name=enrolled.full_name,
        subject=subject,
        template_name="credentials_email.html",
        context=context
    )

    enrolled.is_approved = True
    enrolled.credentials_sent = email_sent
    db.commit()

    return {
        "email_sent": email_sent,
        "message": "Credentials generated successfully and email sent." if email_sent else "Credentials generated, but email dispatch failed."
    }

@router.delete("/admin/enrolled-students/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrolled_student(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Deletes a pre-authorized enrolled student record.
    """
    student = db.query(EnrolledStudent).filter(EnrolledStudent.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Pre-authorized student record not found.")
    db.delete(student)
    db.commit()
    return None

