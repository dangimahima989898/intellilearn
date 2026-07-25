from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from database import get_db, get_db_sync, get_db_async
from models.user import User
from utils.security import decode_token

security = HTTPBearer()


# ── SYNCHRONOUS DEPENDENCIES (Existing) ──────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_sync),
) -> User:
    """Extract and validate the JWT token, return the current user (sync)"""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token missing user ID")

    try:
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return user


def require_role(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker

def require_admin(current_user: User = Depends(require_role("super_admin"))) -> User:
    return current_user

def require_hod_or_admin(current_user: User = Depends(require_role("super_admin", "hod"))) -> User:
    return current_user

def require_student(current_user: User = Depends(require_role("student"))) -> User:
    return current_user

def require_approved_student(current_user: User = Depends(require_role("student"))) -> User:
    if current_user.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your student account is pending approval or inactive."
        )
    return current_user

def require_same_semester(semester_id: str):
    """Dependency to check if the student is querying their own semester."""
    def semester_checker(current_user: User = Depends(require_approved_student), db: Session = Depends(get_db_sync)) -> User:
        from models.student_enrollment import StudentEnrollment
        enrollment = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == current_user.id,
            StudentEnrollment.approval_status == "approved"
        ).first()
        if not enrollment or str(enrollment.current_semester_id) != semester_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this semester's content."
            )
        return current_user
    return semester_checker

def require_subject_ownership(subject_id: str):
    """Check if faculty is assigned to this subject."""
    def ownership_checker(current_user: User = Depends(require_role("faculty", "hod", "super_admin")), db: Session = Depends(get_db_sync)) -> User:
        if current_user.role in ["hod", "super_admin"]:
            return current_user
            
        from models.faculty_subject_assignment import FacultySubjectAssignment
        assignment = db.query(FacultySubjectAssignment).filter(
            FacultySubjectAssignment.faculty_id == current_user.id,
            FacultySubjectAssignment.subject_id == uuid.UUID(subject_id)
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to manage this subject."
            )
        return current_user
    return ownership_checker


def verify_faculty_owns_subject(db: Session, faculty_id: uuid.UUID, subject_id: uuid.UUID):
    """Guard function to check if a faculty member is assigned to a subject."""
    from models.faculty_subject_assignment import FacultySubjectAssignment
    assignment = db.query(FacultySubjectAssignment).filter(
        FacultySubjectAssignment.faculty_id == faculty_id,
        FacultySubjectAssignment.subject_id == subject_id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permissions for this subject."
        )
    return assignment


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: Session = Depends(get_db_sync),
) -> Optional[User]:
    if credentials is None:
        return None
    return get_current_user(credentials, db)


# ── ASYNCHRONOUS DEPENDENCIES (New for HOD) ──────────────────────────────────

async def get_current_user_async(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_async),
) -> User:
    """Extract and validate the JWT token, return the current user (async)"""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token missing user ID")

    try:
        stmt = select(User).where(User.id == uuid.UUID(user_id))
        result = await db.execute(stmt)
        user = result.scalars().first()
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return user


def require_role_async(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user_async)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker


def require_hod_or_admin_async(current_user: User = Depends(require_role_async("super_admin", "hod"))) -> User:
    return current_user
