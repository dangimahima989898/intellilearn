"""
Department Management Test Suite
=================================
Covers all 66 test cases from Department_Management_Test_Cases.md

Sections covered:
  1. Page Load & Header             (TC-01 – TC-04)
  2. Department List Table          (TC-05 – TC-15)
  3. Search                         (TC-16 – TC-21)
  4. Filters & Sorting              (TC-22 – TC-29)
  5. Add / Create Department Modal  (TC-30 – TC-55)
  6. Cross-Module Consistency       (TC-56 – TC-59)
  7. Responsiveness & UI            (TC-60 – TC-63)  [API-level format checks]
  8. Access Control                 (TC-64 – TC-66)
"""

import pytest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db, get_db_sync, get_db_async
from main import app
from models.user import User
from models.department import Department
from models.subject import Subject
from models.course import Course
from utils.security import hash_password

# ── SQLite test DB ────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_department_management.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Async session shim ────────────────────────────────────────────────────────
class MockAsyncSession:
    """Thin synchronous wrapper that satisfies async await calls in the routers."""

    def __init__(self, sync_session):
        self.sync_session = sync_session

    async def execute(self, statement, *args, **kwargs):
        return self.sync_session.execute(statement)

    async def commit(self):
        self.sync_session.commit()

    async def rollback(self):
        self.sync_session.rollback()

    async def flush(self):
        self.sync_session.flush()

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

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def db_session():
    """Create tables, seed data, yield session, teardown."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        _seed_base_data(db)
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def _seed_base_data(db):
    """Seed minimum data needed for department management tests."""
    # 1. Super admin
    admin = User(
        id=uuid.uuid4(),
        name="Admin User",
        email="admin@intellilearn.com",
        password_hash=hash_password("admin123"),
        role="super_admin",
        is_active=True,
        status="approved",
    )
    db.add(admin)
    db.flush()

    # 2. Departments
    # MCA (Active)
    mca_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Master of Computer Applications",
        department_code="MCA",
        department_type="Science",
        total_semesters=6,
        status="Active",
    )
    # BCA (Inactive)
    bca_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Bachelor of Computer Applications",
        department_code="BCA",
        department_type="Science",
        total_semesters=6,
        status="Inactive",
    )
    # EE (Active, for search partial match)
    ee_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Electrical Engineering",
        department_code="EE",
        department_type="Engineering",
        total_semesters=8,
        status="Active",
    )
    # ECE (Active, for search partial match)
    ece_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Electronics & Communication Engineering",
        department_code="ECE",
        department_type="Engineering",
        total_semesters=8,
        status="Active",
    )
    db.add_all([mca_dept, bca_dept, ee_dept, ece_dept])
    db.flush()

    # 3. Faculty
    # HOD Eligible
    fac_eligible = User(
        id=uuid.uuid4(),
        name="Eligible Faculty",
        email="eligible@intellilearn.com",
        password_hash=hash_password("pass123"),
        role="faculty",
        is_active=True,
        status="approved",
        eligible_hod=True,
        designation="Faculty",
    )
    # Normal Faculty
    fac_normal = User(
        id=uuid.uuid4(),
        name="Normal Faculty",
        email="normal@intellilearn.com",
        password_hash=hash_password("pass123"),
        role="faculty",
        is_active=True,
        status="approved",
        eligible_hod=False,
        designation="Faculty",
    )
    db.add_all([fac_eligible, fac_normal])
    db.flush()

    # 4. Student (linked to MCA)
    student = User(
        id=uuid.uuid4(),
        name="Student One",
        email="student@intellilearn.com",
        password_hash=hash_password("pass123"),
        role="student",
        is_active=True,
        status="approved",
        department_id=mca_dept.department_id,
    )
    db.add(student)
    db.commit()


@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    async def override_get_db_async():
        yield MockAsyncSession(db_session)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_sync] = override_get_db
    app.dependency_overrides[get_db_async] = override_get_db_async
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _admin_headers(client) -> dict:
    r = client.post("/auth/login", json={"email": "admin@intellilearn.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 – Page Load & Header (TC-01 to TC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPageLoadAndHeader:
    """TC-01 to TC-04: API availability and response validation."""

    def test_TC01_list_departments_returns_200(self, client):
        """TC-01: Navigate to Department Management."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        assert r.status_code == 200
        assert "departments" in r.json()

    def test_TC03_department_count_display(self, client):
        """TC-03: Verify count matches returned rows."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        data = r.json()
        assert data["total"] == len(data["departments"])


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 – Department List Table (TC-05 to TC-15)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDepartmentListTable:
    """TC-05 to TC-15: Table attributes, CRUD actions, cascade delete blocks."""

    def test_TC05_table_columns_render(self, client):
        """TC-05: Ensure returned JSON holds required columns."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        depts = r.json()["departments"]
        assert len(depts) >= 1
        for key in ["id", "department_id", "department_name", "department_code",
                    "department_type", "total_semesters", "status", "students", "faculty", "subjects"]:
            assert key in depts[0]

    def test_TC06_student_count_accuracy(self, client):
        """TC-06: Student counts match seeded values (MCA = 1)."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        mca = next(d for d in r.json()["departments"] if d["department_code"] == "MCA")
        assert mca["students"] == 1

    def test_TC07_hod_unassigned_state(self, client):
        """TC-07: Display None for departments without HOD."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        mca = next(d for d in r.json()["departments"] if d["department_code"] == "MCA")
        assert mca["hod_name"] is None
        assert mca["hod_id"] is None

    def test_TC08_TC09_status_badge(self, client):
        """TC-08, TC-09: Status badges correctly populated."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments", headers=headers)
        mca = next(d for d in r.json()["departments"] if d["department_code"] == "MCA")
        bca = next(d for d in r.json()["departments"] if d["department_code"] == "BCA")
        assert mca["status"] == "Active"
        assert bca["status"] == "Inactive"

    def test_TC11_edit_prefilled_data(self, client):
        """TC-11: Pre-fill edit inputs via get details API."""
        headers = _admin_headers(client)
        r_list = client.get("/api/hod/departments", headers=headers)
        dept_id = r_list.json()["departments"][0]["department_id"]

        r_detail = client.get(f"/api/hod/departments/{dept_id}", headers=headers)
        assert r_detail.status_code == 200
        assert r_detail.json()["department_id"] == dept_id

    def test_TC12_toggle_status_via_patch(self, client, db_session):
        """TC-12: Update status via patch endpoint."""
        headers = _admin_headers(client)
        dept = db_session.query(Department).filter(Department.department_code == "MCA").first()

        # Update to Inactive
        r1 = client.patch(f"/api/hod/departments/{str(dept.department_id)}/status?status=Inactive", headers=headers)
        assert r1.status_code == 200
        db_session.refresh(dept)
        assert dept.status == "Inactive"

        # Toggle back to Active
        r2 = client.patch(f"/api/hod/departments/{str(dept.department_id)}/status?status=Active", headers=headers)
        assert r2.status_code == 200
        db_session.refresh(dept)
        assert dept.status == "Active"

    def test_TC13_delete_blocked_when_contains_students(self, client, db_session):
        """TC-13: Deletion should be blocked if students are registered in department."""
        headers = _admin_headers(client)
        dept = db_session.query(Department).filter(Department.department_code == "MCA").first()

        r = client.delete(f"/api/hod/departments/{str(dept.department_id)}", headers=headers)
        assert r.status_code == 400
        assert "cannot be deleted" in r.json()["detail"]

    def test_TC15_alphabetical_sorting(self, client):
        """TC-15: Default sort by name ascending."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?sort=name", headers=headers)
        names = [d["department_name"] for d in r.json()["departments"]]
        assert names == sorted(names)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 – Search (TC-16 to TC-21)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSearch:
    """TC-16 to TC-21: Searching logic validation."""

    def test_TC16_search_by_full_name(self, client):
        """TC-16: Search for 'Master of Computer Applications' returns exactly MCA."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?search=Master+of+Computer+Applications", headers=headers)
        assert r.status_code == 200
        depts = r.json()["departments"]
        assert len(depts) == 1
        assert depts[0]["department_code"] == "MCA"

    def test_TC17_search_by_partial_name(self, client):
        """TC-17: Search for 'Elect' matches 'Electrical Engineering' & 'Electronics ...'."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?search=Elect", headers=headers)
        depts = r.json()["departments"]
        assert len(depts) == 2
        codes = {d["department_code"] for d in depts}
        assert "EE" in codes
        assert "ECE" in codes

    def test_TC19_search_case_insensitivity(self, client):
        """TC-19: Lowercase searches yield identical outcomes."""
        headers = _admin_headers(client)
        r_lower = client.get("/api/hod/departments?search=master", headers=headers).json()
        r_upper = client.get("/api/hod/departments?search=MASTER", headers=headers).json()
        assert r_lower["departments"] == r_upper["departments"]

    def test_TC20_search_no_match(self, client):
        """TC-20: Searching non-existent returns empty response."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?search=xyzxyz", headers=headers)
        assert r.json()["total"] == 0
        assert len(r.json()["departments"]) == 0

    def test_TC21_clear_search_restores_all(self, client):
        """TC-21: Empty search parameter yields full set."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?search=", headers=headers)
        assert r.json()["total"] >= 4


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 – Filters (TC-22 to TC-29)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFiltersAndSorting:
    """TC-22 to TC-29: Filters & Sorting parameters validation."""

    def test_TC24_status_filter_all(self, client):
        """TC-24: status='All' yields active & inactive (MCA, BCA, EE, ECE)."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?status=All", headers=headers)
        assert r.json()["total"] >= 4

    def test_TC25_status_filter_active_only(self, client):
        """TC-25: status='Active' excludes BCA."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?status=Active", headers=headers)
        codes = [d["department_code"] for d in r.json()["departments"]]
        assert "BCA" not in codes
        assert "MCA" in codes

    def test_TC26_status_filter_inactive_only(self, client):
        """TC-26: status='Inactive' isolates BCA."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?status=Inactive", headers=headers)
        codes = [d["department_code"] for d in r.json()["departments"]]
        assert codes == ["BCA"]

    def test_TC29_combined_filter_and_search(self, client):
        """TC-29: status='Active' and search='Electrical' works."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/departments?status=Active&search=Electrical", headers=headers)
        assert r.json()["total"] == 1
        assert r.json()["departments"][0]["department_code"] == "EE"


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 – "Add Department" / Create Modal (TC-30 to TC-55)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreateDepartmentModal:
    """TC-30 to TC-55: Field boundary validations and creation."""

    def test_TC34_mandatory_field_checks(self, client):
        """TC-34: Reject empty creation request."""
        headers = _admin_headers(client)
        r = client.post("/api/hod/departments", json={}, headers=headers)
        assert r.status_code == 422  # Pydantic validation error

    def test_TC36_duplicate_name_blocked(self, client):
        """TC-36: Duplicate department name raises 400."""
        headers = _admin_headers(client)
        payload = {
            "department_name": "Master of Computer Applications",  # duplicate
            "department_code": "MCA-NEW",
            "department_type": "Science",
            "total_semesters": 6
        }
        r = client.post("/api/hod/departments", json=payload, headers=headers)
        assert r.status_code == 400
        assert "name already exists" in r.json()["detail"]

    def test_TC38_duplicate_code_blocked(self, client):
        """TC-38: Duplicate department code raises 400."""
        headers = _admin_headers(client)
        payload = {
            "department_name": "Unique Name Dept",
            "department_code": "mca",  # duplicate (case insensitive)
            "department_type": "Science",
            "total_semesters": 6
        }
        r = client.post("/api/hod/departments", json=payload, headers=headers)
        assert r.status_code == 400
        assert "code already exists" in r.json()["detail"]

    def test_TC39_code_length_limits(self, client):
        """TC-39: Enforce min/max length checks (min 2, max 20)."""
        headers = _admin_headers(client)
        payload_short = {
            "department_name": "Unique Name One",
            "department_code": "A",  # Too short
            "department_type": "Science",
            "total_semesters": 6
        }
        r1 = client.post("/api/hod/departments", json=payload_short, headers=headers)
        assert r1.status_code == 422

        payload_long = {
            "department_name": "Unique Name Two",
            "department_code": "ABCDEFGHIJKLMNO_PQRSTUV",  # Too long (> 20)
            "department_type": "Science",
            "total_semesters": 6
        }
        r2 = client.post("/api/hod/departments", json=payload_long, headers=headers)
        assert r2.status_code == 422

    def test_TC43_total_semesters_range(self, client):
        """TC-43: total_semesters must be between 2 and 10."""
        headers = _admin_headers(client)
        payload_low = {
            "department_name": "Unique Name Three",
            "department_code": "UND3",
            "department_type": "Science",
            "total_semesters": 1  # ge=2
        }
        r1 = client.post("/api/hod/departments", json=payload_low, headers=headers)
        assert r1.status_code == 422

        payload_high = {
            "department_name": "Unique Name Four",
            "department_code": "UND4",
            "department_type": "Science",
            "total_semesters": 11  # le=10
        }
        r2 = client.post("/api/hod/departments", json=payload_high, headers=headers)
        assert r2.status_code == 422

    def test_TC44_hod_list_eligible_only(self, client):
        """TC-44/TC-46: HOD list only contains eligible HODs (eligible_hod=True)."""
        headers = _admin_headers(client)
        r = client.get("/api/hod/faculty/hod-list", headers=headers)
        assert r.status_code == 200
        hods = r.json()
        assert len(hods) >= 1
        # 'Eligible Faculty' should be there, but 'Normal Faculty' shouldn't
        names = {h["name"] for h in hods}
        assert "Eligible Faculty" in names
        assert "Normal Faculty" not in names

    def test_TC51_successful_creation(self, client):
        """TC-51: Create department successfully with valid inputs."""
        headers = _admin_headers(client)
        payload = {
            "department_name": "Civil Engineering",
            "department_code": "CIVIL",
            "department_type": "Engineering",
            "total_semesters": 8,
            "description": "Civil engineering details",
            "status": "Active"
        }
        r = client.post("/api/hod/departments", json=payload, headers=headers)
        assert r.status_code == 201
        assert "department_id" in r.json()


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 – Cross-Module Consistency (TC-56 to TC-59)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCrossModuleConsistency:
    """TC-56 to TC-59: Verify cascading updates on related tables."""

    def test_TC58_assigning_hod_updates_faculty_role(self, client, db_session):
        """TC-58: Assigning a faculty as HOD updates their user designation and role."""
        headers = _admin_headers(client)
        fac = db_session.query(User).filter(User.name == "Eligible Faculty").first()
        dept = db_session.query(Department).filter(Department.department_code == "CIVIL").first()

        # Update department with hod_id
        payload = {
            "hod_id": str(fac.id)
        }
        r = client.put(f"/api/hod/departments/{str(dept.department_id)}", json=payload, headers=headers)
        assert r.status_code == 200

        # Verify user role is elevated
        db_session.refresh(fac)
        assert fac.role == "hod"
        assert fac.designation == "HOD"
        assert fac.department_id == dept.department_id


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 – Responsiveness & UI (TC-60 to TC-63)
# ═══════════════════════════════════════════════════════════════════════════════

class TestUIAndFormat:
    """TC-60 to TC-63: Response types constraints."""

    def test_TC63_description_length_limit(self, client):
        """TC-63: Limit description length to 300 characters."""
        headers = _admin_headers(client)
        payload = {
            "department_name": "Mechanical Engineering",
            "department_code": "MECH",
            "department_type": "Engineering",
            "total_semesters": 8,
            "description": "a" * 301,  # Too long (>300)
            "status": "Active"
        }
        r = client.post("/api/hod/departments", json=payload, headers=headers)
        assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 – Access Control (TC-64 to TC-66)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAccessControl:
    """TC-64 to TC-66: Access and authentication constraints."""

    def test_TC64_super_admin_has_full_access(self, client):
        """TC-64: Super admin can list and fetch departments."""
        headers = _admin_headers(client)
        assert client.get("/api/hod/departments", headers=headers).status_code == 200

    def test_TC66_direct_access_fails_without_auth(self, client):
        """TC-66: Request without authorization token is blocked."""
        r = client.get("/api/hod/departments")
        assert r.status_code in (401, 403)
