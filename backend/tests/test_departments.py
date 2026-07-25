import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from database import Base, get_db, get_db_sync, get_db_async
from main import app
from models.user import User
from models.department import Department
from models.subject import Subject
from utils.security import hash_password

# Use SQLite for isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_departments.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed an admin user (role: super_admin) to bypass HOD checks
        admin = User(
            id=uuid.uuid4(),
            name="Admin Test",
            email="admin@intellilearn.com",
            password_hash=hash_password("admin123"),
            role="super_admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # For async database routes in hod_departments
    async def override_get_db_async():
        # Async session mock over sync testing session
        from sqlalchemy.ext.asyncio import AsyncSession
        class MockAsyncSession:
            def __init__(self, sync_session):
                self.sync_session = sync_session
            async def execute(self, statement, *args, **kwargs):
                # Simple statement execution wrapper for sqlite
                res = self.sync_session.execute(statement)
                return res
            async def commit(self):
                self.sync_session.commit()
            async def rollback(self):
                self.sync_session.rollback()
            async def refresh(self, instance):
                self.sync_session.refresh(instance)
            def add(self, instance):
                self.sync_session.add(instance)
            async def delete(self, instance):
                self.sync_session.delete(instance)
            def query(self, *args, **kwargs):
                return self.sync_session.query(*args, **kwargs)
            async def close(self):
                pass
        
        # Yield mock async session
        yield MockAsyncSession(db_session)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_sync] = override_get_db
    app.dependency_overrides[get_db_async] = override_get_db_async
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def get_admin_headers(client):
    login_res = client.post("/auth/login", json={"email": "admin@intellilearn.com", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_department_crud(client, db_session):
    headers = get_admin_headers(client)

    # 1. Create Department
    create_payload = {
        "department_name": "Computer Science & Engineering",
        "department_code": "CSE",
        "department_type": "Engineering",
        "total_semesters": 8,
        "description": "CSE Department",
        "status": "Active"
    }
    res = client.post("/api/hod/departments", json=create_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["department_name"] == "Computer Science & Engineering"
    assert data["department_code"] == "CSE"
    assert data["department_type"] == "Engineering"
    assert data["total_semesters"] == 8
    dept_id = data["department_id"]

    # 2. Get Department by ID
    res = client.get(f"/api/hod/departments/{dept_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["department_name"] == "Computer Science & Engineering"

    # 3. Get Active Departments/List
    res = client.get("/api/hod/departments", headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["total"] == 1
    assert res_data["departments"][0]["department_id"] == dept_id

    # 4. Update Department
    update_payload = {
        "department_code": "CSE-UPD",
        "status": "Inactive"
    }
    res = client.put(f"/api/hod/departments/{dept_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["department_code"] == "CSE-UPD"
    assert res.json()["status"] == "Inactive"


def test_subject_linkage_and_cascade(client, db_session):
    headers = get_admin_headers(client)

    # Create Department
    dept = Department(
        department_id=uuid.uuid4(),
        department_name="Mechanical Engineering",
        department_code="MECH",
        department_type="Engineering",
        total_semesters=8,
        status="Active"
    )
    db_session.add(dept)
    db_session.commit()

    # Create Subject linked to Department
    subject_payload = {
        "name": "Thermodynamics",
        "code": "ME-201",
        "description": "Introduction to Thermodynamics",
        "color": "#3B82F6",
        "icon": "BookOpen",
        "department_id": str(dept.department_id),
        "semester_number": 2,
        "credit_hours": 4
    }
    # Subjects router uses standard prefix
    res = client.post("/subjects", json=subject_payload, headers=headers)
    assert res.status_code == 201
    subj_data = res.json()
    assert subj_data["department_id"] == str(dept.department_id)
    subject_id = subj_data["id"]

    # Verify Subject is linked to Department in DB
    subject = db_session.query(Subject).filter(Subject.id == uuid.UUID(subject_id)).first()
    assert subject.department_id == dept.department_id

    # Trying to delete Department with linked subject should be blocked (business logic validation)
    res = client.delete(f"/api/hod/departments/{dept.department_id}", headers=headers)
    assert res.status_code == 400
    assert "cannot be deleted" in res.json()["detail"]

    # Manually remove linkage to test deletion
    subject.department_id = None
    db_session.commit()

    # Delete Department and verify success
    res = client.delete(f"/api/hod/departments/{dept.department_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Department deleted successfully"
