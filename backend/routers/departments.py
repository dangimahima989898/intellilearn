from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.department import Department
from schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from utils.dependencies import require_hod_or_admin, get_current_user
import uuid

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=list[DepartmentOut])
def get_departments(
    search: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    query = db.query(Department)
    if search:
        query = query.filter(Department.department_name.ilike(f"%{search}%"))
    return query.all()

@router.get("/active", response_model=list[DepartmentOut])
def get_active_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Department).filter(Department.status == "Active").all()

@router.get("/{id}", response_model=DepartmentOut)
def get_department(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    # Check uniqueness (case-insensitive check)
    existing = db.query(Department).filter(
        func.lower(Department.department_name) == func.lower(dept_data.department_name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department name already exists")
    
    new_dept = Department(
        id=uuid.uuid4(),
        department_name=dept_data.department_name.strip(),
        hod_name=dept_data.hod_name.strip() if dept_data.hod_name else None,
        description=dept_data.description,
        status=dept_data.status or "Active"
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept

@router.put("/{id}", response_model=DepartmentOut)
def update_department(
    id: uuid.UUID,
    dept_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = dept_data.model_dump(exclude_unset=True)
    if "department_name" in update_data and update_data["department_name"]:
        name_strip = update_data["department_name"].strip()
        if name_strip.lower() != dept.department_name.lower():
            # Check uniqueness
            existing = db.query(Department).filter(
                func.lower(Department.department_name) == func.lower(name_strip)
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Department name already exists")
        update_data["department_name"] = name_strip
        
    if "hod_name" in update_data and update_data["hod_name"]:
        update_data["hod_name"] = update_data["hod_name"].strip()
        
    for key, value in update_data.items():
        setattr(dept, key, value)
        
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/{id}")
def delete_department(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_admin)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Also set any referencing subjects' department_id to None
    from models.subject import Subject
    db.query(Subject).filter(Subject.department_id == id).update({Subject.department_id: None})
    
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
