from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from typing import Optional, List
from pydantic import BaseModel, validator
import uuid
from datetime import datetime

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async, get_current_user_async
from utils.security import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
from models import (
    User, Subject, Department, FacultySubjectAssignment,
    UploadedNote, Question, AdminActionLog
)
from models.timetable import Timetable

router = APIRouter(prefix="/api/hod/subjects", tags=["HOD Subject Management v2"])

VALID_TYPES = ["Theory", "Lab", "Practical", "Elective", "Mandatory"]
VALID_STATUS = ["Active", "Inactive"]

# ─────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────

class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    department_id: str
    semester_no: int
    credits: int
    subject_type: str = "Theory"
    faculty_id: Optional[str] = None
    description: Optional[str] = None
    status: str = "Active"

    @validator("subject_code")
    def code_uppercase(cls, v):
        return v.strip().upper()

    @validator("subject_name")
    def name_strip(cls, v):
        return v.strip()

    @validator("credits")
    def credits_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Credits must be between 1 and 10")
        return v

    @validator("subject_type")
    def valid_type(cls, v):
        if v not in VALID_TYPES:
            raise ValueError(f"subject_type must be one of {VALID_TYPES}")
        return v

    @validator("status")
    def valid_status(cls, v):
        if v not in VALID_STATUS:
            raise ValueError(f"status must be one of {VALID_STATUS}")
        return v


class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    credits: Optional[int] = None
    subject_type: Optional[str] = None
    faculty_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    semester_no: Optional[int] = None

    @validator("credits")
    def credits_range(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Credits must be between 1 and 10")
        return v

    @validator("subject_type")
    def valid_type(cls, v):
        if v is not None and v not in VALID_TYPES:
            raise ValueError(f"subject_type must be one of {VALID_TYPES}")
        return v


class StatusPatch(BaseModel):
    status: str

    @validator("status")
    def valid_status(cls, v):
        if v not in VALID_STATUS:
            raise ValueError(f"status must be Active or Inactive")
        return v


# ─────────────────────────────────────────
# Helper — build subject response dict
# ─────────────────────────────────────────

async def _build_subject_dict(s: Subject, db: AsyncSession) -> dict:
    # Department
    dept_name = "—"
    dept_code = "—"
    if s.department_id:
        dept_stmt = select(Department).where(Department.department_id == s.department_id)
        dept_res = await db.execute(dept_stmt)
        dept = dept_res.scalars().first()
        if dept:
            dept_name = dept.department_name
            dept_code = dept.department_code

    # Faculty assignment (primary)
    fac_stmt = (
        select(User)
        .join(FacultySubjectAssignment, FacultySubjectAssignment.faculty_id == User.id)
        .where(FacultySubjectAssignment.subject_id == s.id)
    )
    fac_res = await db.execute(fac_stmt)
    faculty = fac_res.scalars().first()

    # Linked records (for delete protection)
    notes_count = (await db.execute(
        select(func.count(UploadedNote.id)).where(UploadedNote.subject_id == s.id)
    )).scalar() or 0

    questions_count = (await db.execute(
        select(func.count(Question.id)).where(Question.subject_id == s.id)
    )).scalar() or 0

    timetable_count = 0
    try:
        timetable_count = (await db.execute(
            select(func.count(Timetable.id)).where(Timetable.subject_id == s.id)
        )).scalar() or 0
    except Exception:
        pass

    can_delete = (notes_count == 0 and questions_count == 0 and timetable_count == 0)
    delete_reason = []
    if notes_count > 0:
        delete_reason.append(f"{notes_count} note(s)")
    if questions_count > 0:
        delete_reason.append(f"{questions_count} question(s)")
    if timetable_count > 0:
        delete_reason.append(f"{timetable_count} timetable entry/entries")

    # Find existing faculty assignment id for reassignment
    fac_assign_stmt = select(FacultySubjectAssignment).where(
        FacultySubjectAssignment.subject_id == s.id
    )
    fac_assign_res = await db.execute(fac_assign_stmt)
    fac_assign = fac_assign_res.scalars().first()

    return {
        "id": str(s.id),
        "subject_code": s.code or "",
        "subject_name": s.name or "",
        "department_id": str(s.department_id) if s.department_id else None,
        "department_name": dept_name,
        "department_code": dept_code,
        "semester_no": s.semester_number or 1,
        "credits": s.credit_hours or 3,
        "subject_type": s.icon if s.icon in VALID_TYPES else "Theory",
        "description": s.description or "",
        "status": "Inactive" if s.is_archived else "Active",
        "faculty": {
            "id": str(faculty.id),
            "name": faculty.name,
            "email": faculty.email,
            "assignment_id": str(fac_assign.id) if fac_assign else None
        } if faculty else None,
        "can_delete": can_delete,
        "delete_blocked_reason": ", ".join(delete_reason) if delete_reason else None,
        "notes_count": notes_count,
        "questions_count": questions_count,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ─────────────────────────────────────────
# GET /api/hod/subjects — list with filters
# ─────────────────────────────────────────

@router.get("")
async def list_subjects(
    search: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    semester_no: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    subject_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Subject)

    # Status filter
    if status == "Inactive":
        stmt = stmt.where(Subject.is_archived == True)
    elif status == "Active" or status is None:
        stmt = stmt.where(Subject.is_archived == False)
    # "All" → no status filter

    # Search
    if search and search.strip():
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            Subject.name.ilike(like),
            Subject.code.ilike(like)
        ))

    # Department
    if department_id and department_id != "All":
        try:
            dept_uuid = uuid.UUID(department_id)
            stmt = stmt.where(Subject.department_id == dept_uuid)
        except ValueError:
            pass

    # Semester
    if semester_no and semester_no != 0:
        stmt = stmt.where(Subject.semester_number == semester_no)

    # Subject type (stored in icon column)
    if subject_type and subject_type != "All" and subject_type in VALID_TYPES:
        stmt = stmt.where(Subject.icon == subject_type)

    # Count total for pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Apply pagination
    stmt = stmt.order_by(Subject.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(stmt)
    subjects = res.scalars().all()

    results = []
    if subjects:
        subject_ids = [s.id for s in subjects]
        dept_ids = {s.department_id for s in subjects if s.department_id}

        # 1. Fetch all departments in 1 query
        dept_map = {}
        if dept_ids:
            dept_stmt = select(Department).where(Department.department_id.in_(list(dept_ids)))
            dept_res = await db.execute(dept_stmt)
            dept_map = {d.department_id: d for d in dept_res.scalars().all()}

        # 2. Fetch all faculty assignments in 1 query
        assignments_stmt = (
            select(FacultySubjectAssignment, User)
            .join(User, FacultySubjectAssignment.faculty_id == User.id)
            .where(FacultySubjectAssignment.subject_id.in_(subject_ids))
        )
        assignments_res = await db.execute(assignments_stmt)
        fac_assignment_map = {}
        for fa, u in assignments_res.all():
            fac_assignment_map[fa.subject_id] = (u, fa)

        # 3. Batch counts for notes
        notes_stmt = (
            select(UploadedNote.subject_id, func.count(UploadedNote.id))
            .where(UploadedNote.subject_id.in_(subject_ids))
            .group_by(UploadedNote.subject_id)
        )
        notes_res = await db.execute(notes_stmt)
        notes_count_map = {r[0]: r[1] for r in notes_res.all()}

        # 4. Batch counts for questions
        questions_stmt = (
            select(Question.subject_id, func.count(Question.id))
            .where(Question.subject_id.in_(subject_ids))
            .group_by(Question.subject_id)
        )
        questions_res = await db.execute(questions_stmt)
        questions_count_map = {r[0]: r[1] for r in questions_res.all()}

        # 5. Batch counts for timetable entries
        timetable_count_map = {}
        try:
            timetable_stmt = (
                select(Timetable.subject_id, func.count(Timetable.id))
                .where(Timetable.subject_id.in_(subject_ids))
                .group_by(Timetable.subject_id)
            )
            timetable_res = await db.execute(timetable_stmt)
            timetable_count_map = {r[0]: r[1] for r in timetable_res.all()}
        except Exception:
            pass

        # Build response dicts from the batched maps
        for s in subjects:
            dept = dept_map.get(s.department_id)
            dept_name = dept.department_name if dept else "—"
            dept_code = dept.department_code if dept else "—"

            fac_tuple = fac_assignment_map.get(s.id)
            faculty = fac_tuple[0] if fac_tuple else None
            fac_assign = fac_tuple[1] if fac_tuple else None

            notes_count = notes_count_map.get(s.id, 0)
            questions_count = questions_count_map.get(s.id, 0)
            timetable_count = timetable_count_map.get(s.id, 0)

            can_delete = (notes_count == 0 and questions_count == 0 and timetable_count == 0)
            delete_reason = []
            if notes_count > 0:
                delete_reason.append(f"{notes_count} note(s)")
            if questions_count > 0:
                delete_reason.append(f"{questions_count} question(s)")
            if timetable_count > 0:
                delete_reason.append(f"{timetable_count} timetable entry/entries")

            results.append({
                "id": str(s.id),
                "subject_code": s.code or "",
                "subject_name": s.name or "",
                "department_id": str(s.department_id) if s.department_id else None,
                "department_name": dept_name,
                "department_code": dept_code,
                "semester_no": s.semester_number or 1,
                "credits": s.credit_hours or 3,
                "subject_type": s.icon if s.icon in VALID_TYPES else "Theory",
                "description": s.description or "",
                "status": "Inactive" if s.is_archived else "Active",
                "faculty": {
                    "id": str(faculty.id),
                    "name": faculty.name,
                    "email": faculty.email,
                    "assignment_id": str(fac_assign.id) if fac_assign else None
                } if faculty else None,
                "can_delete": can_delete,
                "delete_blocked_reason": ", ".join(delete_reason) if delete_reason else None,
                "notes_count": notes_count,
                "questions_count": questions_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })

    return {
        "subjects": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit)
    }



# ─────────────────────────────────────────
# GET /api/hod/subjects/stats
# ─────────────────────────────────────────

@router.get("/stats")
async def get_subject_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Total (all, including inactive)
    total_res = await db.execute(select(func.count(Subject.id)))
    total = total_res.scalar() or 0

    # Active only
    active_res = await db.execute(
        select(func.count(Subject.id)).where(Subject.is_archived == False)
    )
    active = active_res.scalar() or 0

    # Inactive
    inactive = total - active

    # Theory subjects
    theory_res = await db.execute(
        select(func.count(Subject.id)).where(
            and_(Subject.is_archived == False, Subject.icon == "Theory")
        )
    )
    theory = theory_res.scalar() or 0

    # Lab subjects (Lab + Practical)
    lab_res = await db.execute(
        select(func.count(Subject.id)).where(
            and_(Subject.is_archived == False, Subject.icon.in_(["Lab", "Practical"]))
        )
    )
    lab = lab_res.scalar() or 0

    # Subjects without faculty
    assigned_ids_res = await db.execute(
        select(distinct(FacultySubjectAssignment.subject_id))
    )
    assigned_ids = [r[0] for r in assigned_ids_res.all()]

    no_faculty_res = await db.execute(
        select(func.count(Subject.id)).where(
            and_(
                Subject.is_archived == False,
                Subject.id.notin_(assigned_ids) if assigned_ids else Subject.id.isnot(None)
            )
        )
    )
    no_faculty = no_faculty_res.scalar() or 0

    # If no assigned subjects at all
    if not assigned_ids:
        no_faculty = active

    return {
        "total": total,
        "active": active,
        "theory": theory,
        "lab": lab,
        "no_faculty": no_faculty,
        "inactive": inactive
    }


# ─────────────────────────────────────────
# GET /api/hod/subjects/departments
# ─────────────────────────────────────────

@router.get("/departments")
async def list_departments(
    db: AsyncSession = Depends(get_db)
    # No auth required — read-only public list for dropdowns
):
    stmt = select(Department).where(Department.status == "Active").order_by(Department.department_name)
    res = await db.execute(stmt)
    depts = res.scalars().all()
    return [
        {
            "department_id": str(d.department_id),
            "department_name": d.department_name,
            "department_code": d.department_code,
            "total_semesters": d.total_semesters or 8,
        }
        for d in depts
    ]


# ─────────────────────────────────────────
# GET /api/hod/subjects/departments/{dept_id}/semesters
# ─────────────────────────────────────────

@router.get("/departments/{dept_id}/semesters")
async def get_dept_semesters(
    dept_id: str,
    db: AsyncSession = Depends(get_db)
    # No auth required — read-only for dynamic semester dropdown
):
    try:
        dept_uuid = uuid.UUID(dept_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department ID")

    stmt = select(Department).where(Department.department_id == dept_uuid)
    res = await db.execute(stmt)
    dept = res.scalars().first()

    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    total = dept.total_semesters or 8
    return {
        "department_id": str(dept.department_id),
        "department_name": dept.department_name,
        "total_semesters": total,
        "semesters": list(range(1, total + 1))
    }


# ─────────────────────────────────────────
# GET /api/hod/subjects/faculty?department_id=
# ─────────────────────────────────────────

@router.get("/faculty")
async def get_faculty_by_dept(
    department_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(User).where(
        and_(
            User.role == "faculty",
            User.is_active == True,
            User.status == "approved"
        )
    )

    if department_id and department_id != "All":
        try:
            dept_uuid = uuid.UUID(department_id)
            dept_stmt = stmt.where(User.department_id == dept_uuid)
            res = await db.execute(dept_stmt)
            faculty = res.scalars().all()
            if not faculty:
                # Fallback: display all available faculty across all departments
                res = await db.execute(stmt)
                faculty = res.scalars().all()
        except ValueError:
            res = await db.execute(stmt)
            faculty = res.scalars().all()
    else:
        res = await db.execute(stmt)
        faculty = res.scalars().all()

    return [
        {
            "id": str(f.id),
            "name": f.name,
            "email": f.email,
            "employee_id": f.employee_id or "",
            "designation": f.designation or "Faculty"
        }
        for f in faculty
    ]


# ─────────────────────────────────────────
# POST /api/hod/subjects — Create Subject
# ─────────────────────────────────────────

@router.post("", status_code=201)
async def create_subject(
    req: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Validate department
    try:
        dept_uuid = uuid.UUID(req.department_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department_id")

    dept_res = await db.execute(select(Department).where(Department.department_id == dept_uuid))
    dept = dept_res.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate semester range
    if not (1 <= req.semester_no <= (dept.total_semesters or 8)):
        raise HTTPException(
            status_code=400,
            detail=f"semester_no must be between 1 and {dept.total_semesters} for this department"
        )

    # Unique code check
    code_check = await db.execute(select(Subject).where(Subject.code == req.subject_code))
    if code_check.scalars().first():
        raise HTTPException(status_code=400, detail=f"Subject code '{req.subject_code}' already exists")

    # Unique name within same dept + semester
    name_check = await db.execute(
        select(Subject).where(
            and_(
                Subject.name == req.subject_name,
                Subject.department_id == dept_uuid,
                Subject.semester_number == req.semester_no,
                Subject.is_archived == False
            )
        )
    )
    if name_check.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"A subject with this name already exists in Semester {req.semester_no} of {dept.department_name}"
        )

    new_sub = Subject(
        id=uuid.uuid4(),
        name=req.subject_name,
        code=req.subject_code,
        description=req.description,
        department_id=dept_uuid,
        semester_number=req.semester_no,
        credit_hours=req.credits,
        icon=req.subject_type,    # store type in icon column
        is_archived=(req.status == "Inactive"),
        created_by=current_user.id
    )
    db.add(new_sub)
    await db.flush()  # get new_sub.id

    # Assign faculty if provided
    if req.faculty_id:
        try:
            fac_uuid = uuid.UUID(req.faculty_id)
            fac_res = await db.execute(
                select(User).where(and_(User.id == fac_uuid, User.role == "faculty"))
            )
            if fac_res.scalars().first():
                assignment = FacultySubjectAssignment(
                    id=uuid.uuid4(),
                    faculty_id=fac_uuid,
                    subject_id=new_sub.id,
                    role="primary"
                )
                db.add(assignment)
        except ValueError:
            pass

    # Action log
    log = AdminActionLog(
        admin_id=current_user.id,
        action_type="CREATE_SUBJECT",
        details=f"Created subject '{new_sub.name}' ({new_sub.code}) in {dept.department_name} Sem {req.semester_no}"
    )
    db.add(log)

    await db.commit()
    return {"id": str(new_sub.id), "message": "Subject created successfully"}


# ─────────────────────────────────────────
# PUT /api/hod/subjects/{id} — Update Subject
# ─────────────────────────────────────────

@router.put("/{subject_id}")
async def update_subject(
    subject_id: str,
    req: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    res = await db.execute(select(Subject).where(Subject.id == sub_uuid))
    sub = res.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    if req.subject_name is not None:
        sub.name = req.subject_name.strip()
    if req.credits is not None:
        sub.credit_hours = req.credits
    if req.subject_type is not None:
        sub.icon = req.subject_type
    if req.description is not None:
        sub.description = req.description
    if req.status is not None:
        sub.is_archived = (req.status == "Inactive")
    if req.semester_no is not None:
        sub.semester_number = req.semester_no

    # Faculty reassignment
    if req.faculty_id is not None:
        # Remove old assignments
        old_stmt = select(FacultySubjectAssignment).where(FacultySubjectAssignment.subject_id == sub.id)
        old_res = await db.execute(old_stmt)
        for old in old_res.scalars().all():
            await db.delete(old)

        # Add new assignment
        if req.faculty_id:
            try:
                fac_uuid = uuid.UUID(req.faculty_id)
                fac_check = await db.execute(
                    select(User).where(and_(User.id == fac_uuid, User.role == "faculty"))
                )
                if fac_check.scalars().first():
                    assignment = FacultySubjectAssignment(
                        id=uuid.uuid4(),
                        faculty_id=fac_uuid,
                        subject_id=sub.id,
                        role="primary"
                    )
                    db.add(assignment)
            except ValueError:
                pass

    log = AdminActionLog(
        admin_id=current_user.id,
        action_type="UPDATE_SUBJECT",
        details=f"Updated subject '{sub.name}' ({sub.code})"
    )
    db.add(log)
    await db.commit()
    return {"message": "Subject updated successfully"}


# ─────────────────────────────────────────
# PATCH /api/hod/subjects/{id}/status
# ─────────────────────────────────────────

@router.patch("/{subject_id}/status")
async def patch_subject_status(
    subject_id: str,
    req: StatusPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    res = await db.execute(select(Subject).where(Subject.id == sub_uuid))
    sub = res.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    sub.is_archived = (req.status == "Inactive")
    if sub.is_archived:
        sub.archived_at = datetime.utcnow()
    else:
        sub.archived_at = None

    log = AdminActionLog(
        admin_id=current_user.id,
        action_type="STATUS_SUBJECT",
        details=f"Set subject '{sub.name}' status to {req.status}"
    )
    db.add(log)
    await db.commit()
    return {"message": f"Subject status updated to {req.status}"}


# ─────────────────────────────────────────
# DELETE /api/hod/subjects/{id}
# ─────────────────────────────────────────

@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    try:
        sub_uuid = uuid.UUID(subject_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    res = await db.execute(select(Subject).where(Subject.id == sub_uuid))
    sub = res.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check linked records
    notes_count = (await db.execute(
        select(func.count(UploadedNote.id)).where(UploadedNote.subject_id == sub.id)
    )).scalar() or 0

    questions_count = (await db.execute(
        select(func.count(Question.id)).where(Question.subject_id == sub.id)
    )).scalar() or 0

    timetable_count = 0
    try:
        timetable_count = (await db.execute(
            select(func.count(Timetable.id)).where(Timetable.subject_id == sub.id)
        )).scalar() or 0
    except Exception:
        pass

    if notes_count > 0 or questions_count > 0 or timetable_count > 0:
        reasons = []
        if notes_count > 0:
            reasons.append(f"{notes_count} note(s)")
        if questions_count > 0:
            reasons.append(f"{questions_count} question(s)")
        if timetable_count > 0:
            reasons.append(f"{timetable_count} timetable entry/entries")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete subject. It has linked records: {', '.join(reasons)}. Deactivate it instead."
        )

    name_backup = sub.name
    code_backup = sub.code
    await db.delete(sub)

    log = AdminActionLog(
        admin_id=current_user.id,
        action_type="DELETE_SUBJECT",
        details=f"Deleted subject '{name_backup}' ({code_backup})"
    )
    db.add(log)
    await db.commit()
    return {"message": "Subject deleted successfully"}
