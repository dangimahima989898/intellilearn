from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional, List
import uuid

from database import get_db_async as get_db
from utils.dependencies import require_hod_or_admin_async
from models import Department, User, Course, Subject, FacultySubjectAssignment
from schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut

router = APIRouter(tags=["HOD Department Management"])

@router.get("/departments")
async def get_departments(
    search: Optional[str] = None,
    academic_year: Optional[str] = None,
    status: Optional[str] = None,
    sort: Optional[str] = "name",
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Subqueries for each department's calculations
    hod_name_subquery = select(User.name).where(User.id == Department.hod_id).scalar_subquery()
    
    student_count_subquery = select(func.count(User.id)).outerjoin(
        Course, User.course_id == Course.id
    ).where(
        User.role == "student",
        User.is_active == True,
        or_(
            User.department_id == Department.department_id,
            Course.department_id == Department.department_id
        )
    ).scalar_subquery()
    
    assigned_subject_dept = select(FacultySubjectAssignment.faculty_id).join(
        Subject, FacultySubjectAssignment.subject_id == Subject.id
    ).where(
        Subject.department_id == Department.department_id
    ).scalar_subquery()
    
    faculty_count_subquery = select(func.count(User.id)).where(
        User.role == "faculty",
        User.is_active == True,
        or_(
            User.department_id == Department.department_id,
            User.id.in_(assigned_subject_dept)
        )
    ).scalar_subquery()
    
    subject_count_subquery = select(func.count(Subject.id)).where(
        Subject.department_id == Department.department_id
    ).scalar_subquery()

    # Total count query
    count_stmt = select(func.count(Department.department_id))
    if search:
        count_stmt = count_stmt.where(Department.department_name.ilike(f"%{search}%"))
    if status and status != "All":
        count_stmt = count_stmt.where(Department.status == status)
        
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0
    
    # Base query for Departments
    stmt = select(
        Department,
        hod_name_subquery.label("hod_name"),
        student_count_subquery.label("students_count"),
        faculty_count_subquery.label("faculty_count"),
        subject_count_subquery.label("subjects_count")
    )
    
    if search:
        stmt = stmt.where(Department.department_name.ilike(f"%{search}%"))
        
    if status and status != "All":
        stmt = stmt.where(Department.status == status)
        
    # Sort
    if sort == "name":
        stmt = stmt.order_by(Department.department_name.asc())
    elif sort == "newest":
        stmt = stmt.order_by(Department.created_at.desc())
    elif sort == "oldest":
        stmt = stmt.order_by(Department.created_at.asc())
    else:
        stmt = stmt.order_by(Department.department_name.asc())
        
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    res = await db.execute(stmt)
    results = res.all()
    
    # Calculate counts and hod name for each department
    departments_out = []
    for row in results:
        dept = row[0]
        hod_name = row[1]
        students_count = row[2] or 0
        faculty_count = row[3] or 0
        subjects_count = row[4] or 0
            
        departments_out.append({
            "id": dept.department_id,
            "department_id": dept.department_id,
            "department_name": dept.department_name,
            "department_code": dept.department_code,
            "department_type": dept.department_type,
            "total_semesters": dept.total_semesters,
            "hod_id": dept.hod_id,
            "hod_name": hod_name,
            "description": dept.description,
            "status": dept.status,
            "created_at": dept.created_at,
            "updated_at": dept.updated_at,
            "students": students_count,
            "faculty": faculty_count,
            "subjects": subjects_count
        })
        
    return {
        "departments": departments_out,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/departments/{id}")
async def get_department(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Department).where(Department.department_id == id)
    res = await db.execute(stmt)
    dept = res.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def create_department(
    req: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Unique check for Name
    name_stmt = select(Department).where(func.lower(Department.department_name) == func.lower(req.department_name.strip()))
    name_res = await db.execute(name_stmt)
    if name_res.scalars().first():
        raise HTTPException(status_code=400, detail="Department name already exists")
        
    # Unique check for Code (must be uppercase)
    code_upper = req.department_code.strip().upper()
    code_stmt = select(Department).where(func.lower(Department.department_code) == func.lower(code_upper))
    code_res = await db.execute(code_stmt)
    if code_res.scalars().first():
        raise HTTPException(status_code=400, detail="Department code already exists")
        
    new_dept = Department(
        department_id=uuid.uuid4(),
        department_name=req.department_name.strip(),
        department_code=code_upper,
        department_type=req.department_type,
        total_semesters=req.total_semesters,
        hod_id=req.hod_id,
        description=req.description,
        status=req.status or "Active"
    )
    
    db.add(new_dept)
    
    # Create corresponding Course record so it shows up in Schedule Manager and other dropdowns
    new_course = Course(
        id=uuid.uuid4(),
        name=req.department_name.strip(),
        code=code_upper,
        total_semesters=req.total_semesters,
        duration_years=(req.total_semesters + 1) // 2,
        department_id=new_dept.department_id,
        is_active=True
    )
    db.add(new_course)
    
    # If HOD is assigned, update HOD user's designation and role
    if req.hod_id:
        hod_user_stmt = select(User).where(User.id == req.hod_id)
        hod_user_res = await db.execute(hod_user_stmt)
        hod_user = hod_user_res.scalars().first()
        if hod_user:
            hod_user.designation = "HOD"
            hod_user.role = "hod"
            hod_user.department_id = new_dept.department_id
            
    await db.commit()
    await db.refresh(new_dept)
    
    return new_dept

@router.put("/departments/{id}")
async def update_department(
    id: uuid.UUID,
    req: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Department).where(Department.department_id == id)
    res = await db.execute(stmt)
    dept = res.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    update_data = req.model_dump(exclude_unset=True)
    
    if "department_name" in update_data and update_data["department_name"]:
        name_strip = update_data["department_name"].strip()
        if name_strip.lower() != dept.department_name.lower():
            name_stmt = select(Department).where(func.lower(Department.department_name) == func.lower(name_strip))
            name_res = await db.execute(name_stmt)
            if name_res.scalars().first():
                raise HTTPException(status_code=400, detail="Department name already exists")
        dept.department_name = name_strip
        
    if "department_code" in update_data and update_data["department_code"]:
        code_upper = update_data["department_code"].strip().upper()
        if code_upper.lower() != dept.department_code.lower():
            code_stmt = select(Department).where(func.lower(Department.department_code) == func.lower(code_upper))
            code_res = await db.execute(code_stmt)
            if code_res.scalars().first():
                raise HTTPException(status_code=400, detail="Department code already exists")
        dept.department_code = code_upper
        
    if "department_type" in update_data and update_data["department_type"]:
        dept.department_type = update_data["department_type"]
        
    if "total_semesters" in update_data and update_data["total_semesters"]:
        dept.total_semesters = update_data["total_semesters"]
        
    if "hod_id" in update_data:
        new_hod_id = update_data["hod_id"]
        # If changed, update HOD designations
        if new_hod_id != dept.hod_id:
            # Clear old HOD's designation if they aren't HOD of another department
            if dept.hod_id:
                other_dept_stmt = select(Department).where(
                    and_(Department.hod_id == dept.hod_id, Department.department_id != id)
                )
                other_dept_res = await db.execute(other_dept_stmt)
                if not other_dept_res.scalars().first():
                    old_hod_stmt = select(User).where(User.id == dept.hod_id)
                    old_hod_res = await db.execute(old_hod_stmt)
                    old_hod = old_hod_res.scalars().first()
                    if old_hod:
                        old_hod.designation = "Faculty"
                        old_hod.role = "faculty"
                        
            dept.hod_id = new_hod_id
            if new_hod_id:
                hod_user_stmt = select(User).where(User.id == new_hod_id)
                hod_user_res = await db.execute(hod_user_stmt)
                hod_user = hod_user_res.scalars().first()
                if hod_user:
                    hod_user.designation = "HOD"
                    hod_user.role = "hod"
                    hod_user.department_id = id
                    
    if "description" in update_data:
        dept.description = update_data["description"]
        
    if "status" in update_data and update_data["status"]:
        dept.status = update_data["status"]
        
    # Update corresponding course(s) to keep in sync
    course_stmt = select(Course).where(Course.department_id == id)
    course_res = await db.execute(course_stmt)
    courses = course_res.scalars().all()
    for course in courses:
        if "department_name" in update_data:
            course.name = update_data["department_name"].strip()
        if "department_code" in update_data:
            course.code = update_data["department_code"].strip().upper()
        if "total_semesters" in update_data:
            course.total_semesters = update_data["total_semesters"]
            course.duration_years = (update_data["total_semesters"] + 1) // 2
        if "status" in update_data:
            course.is_active = (update_data["status"] == "Active")
        
    await db.commit()
    await db.refresh(dept)
    return dept

@router.delete("/departments/{id}")
async def delete_department(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    stmt = select(Department).where(Department.department_id == id)
    res = await db.execute(stmt)
    dept = res.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Prevent deletion if contains:
    # 1. Subjects
    sub_stmt = select(func.count(Subject.id)).where(Subject.department_id == id)
    sub_res = await db.execute(sub_stmt)
    subjects_count = sub_res.scalar() or 0
    
    # Get courses belonging to the department (to delete cascadingly if no blocker records exist)
    course_select_stmt = select(Course).where(Course.department_id == id)
    course_res = await db.execute(course_select_stmt)
    dept_courses = course_res.scalars().all()
    
    # 3. Students
    student_stmt = select(func.count(User.id)).where(
        User.role == "student",
        User.department_id == id
    )
    student_res = await db.execute(student_stmt)
    students_count = student_res.scalar() or 0
    
    # 4. Faculty
    faculty_stmt = select(func.count(User.id)).where(
        User.role == "faculty",
        User.department_id == id
    )
    faculty_res = await db.execute(faculty_stmt)
    faculty_count = faculty_res.scalar() or 0
    
    if subjects_count > 0 or students_count > 0 or faculty_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Department cannot be deleted because it contains academic records."
        )
        
    # Delete courses belonging to the department
    for course in dept_courses:
        await db.delete(course)
        
    # Clear HOD user designation if applicable
    if dept.hod_id:
        hod_user_stmt = select(User).where(User.id == dept.hod_id)
        hod_user_res = await db.execute(hod_user_stmt)
        hod_user = hod_user_res.scalars().first()
        if hod_user:
            hod_user.designation = "Faculty"
            hod_user.role = "faculty"
            
    await db.delete(dept)
    await db.commit()
    return {"message": "Department deleted successfully"}

@router.patch("/departments/{id}/status")
async def patch_department_status(
    id: uuid.UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    if status not in ["Active", "Inactive"]:
        raise HTTPException(status_code=400, detail="Status must be Active or Inactive")
        
    stmt = select(Department).where(Department.department_id == id)
    res = await db.execute(stmt)
    dept = res.scalars().first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    dept.status = status
    
    # Update corresponding course(s) status
    course_stmt = select(Course).where(Course.department_id == id)
    course_res = await db.execute(course_stmt)
    courses = course_res.scalars().all()
    for course in courses:
        course.is_active = (status == "Active")
        
    await db.commit()
    return {"message": f"Department status updated to {status}"}

@router.get("/faculty/hod-list")
async def get_hod_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hod_or_admin_async)
):
    # Select User and Department Name via a subquery to avoid N+1 database hits
    dept_name_subquery = select(Department.department_name).where(Department.department_id == User.department_id).scalar_subquery()

    # Load faculty where designation='HOD' OR eligible_hod=true
    stmt = select(
        User,
        dept_name_subquery.label("dept_name")
    ).where(
        User.role.in_(["faculty", "hod"]),
        User.is_active == True,
        or_(
            User.designation == "HOD",
            User.eligible_hod == True
        )
    ).order_by(User.name.asc())
    
    res = await db.execute(stmt)
    results = res.all()
    
    # Return formatted list
    result = []
    for row in results:
        f = row[0]
        dept_name = row[1] or "Unassigned"
        
        result.append({
            "id": f.id,
            "name": f.name,
            "email": f.email,
            "employee_id": f.employee_id or "N/A",
            "department": dept_name
        })
    return result
