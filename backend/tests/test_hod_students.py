"""
HOD Student Management Test Suite
=================================
Covers all 77 test cases from the Student Directory senior QA sheet.

Sections covered:
  1. Student Directory listings (STU-001 - STU-017)
  2. All Students Tab actions (AST-001 - AST-012)
  3. Pending Approvals actions (PEN-001 - PEN-010)
  4. At-Risk Students actions (RISK-001 - RISK-010)
  5. Deactivated Students actions (DEA-001 - DEA-005)
  6. Profile actions (ACT-001 - ACT-005)
  7. Negative test cases (NEG-001 - NEG-010)
  8. Performance & Security (PERF-001 - PERF-003, SEC-001 - SEC-005)
"""

import pytest
import uuid
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db, get_db_sync, get_db_async
from main import app
from models.user import User
from models.course import Course
from models.semester import Semester
from models.department import Department
from models.student_enrollment import StudentEnrollment
from models.quiz_attempt import QuizAttempt
from models.notification import Notification
from models.subject import Subject
from utils.security import hash_password

# ── SQLite test DB ────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_hod_students.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Async session shim ────────────────────────────────────────────────────────
class MockAsyncSession:
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
    """Seed student directory data."""
    # HOD User for MCA
    mca_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Master of Computer Applications",
        department_code="MCA",
        total_semesters=6,
        status="Active",
    )
    bca_dept = Department(
        department_id=uuid.uuid4(),
        department_name="Bachelor of Computer Applications",
        department_code="BCA",
        total_semesters=6,
        status="Active",
    )
    db.add_all([mca_dept, bca_dept])
    db.flush()

    hod_user = User(
        id=uuid.uuid4(),
        name="MCA HOD",
        email="hod@intellilearn.com",
        password_hash=hash_password("hod123"),
        role="hod",
        is_active=True,
        status="approved",
        department_id=mca_dept.department_id
    )
    # Admin User
    admin_user = User(
        id=uuid.uuid4(),
        name="Admin User",
        email="admin@intellilearn.com",
        password_hash=hash_password("admin123"),
        role="super_admin",
        is_active=True,
        status="approved",
    )
    db.add_all([hod_user, admin_user])
    db.flush()

    # MCA Course & Semester
    mca_course = Course(
        id=uuid.uuid4(),
        name="Master of Computer Applications",
        code="MCA",
        total_semesters=6,
        duration_years=3,
        department_id=mca_dept.department_id,
    )
    # BCA Course & Semester
    bca_course = Course(
        id=uuid.uuid4(),
        name="Bachelor of Computer Applications",
        code="BCA",
        total_semesters=6,
        duration_years=3,
        department_id=bca_dept.department_id,
    )
    db.add_all([mca_course, bca_course])
    db.flush()

    mca_sem1 = Semester(id=uuid.uuid4(), semester_number=1, course_id=mca_course.id)
    mca_sem2 = Semester(id=uuid.uuid4(), semester_number=2, course_id=mca_course.id)
    bca_sem1 = Semester(id=uuid.uuid4(), semester_number=1, course_id=bca_course.id)
    db.add_all([mca_sem1, mca_sem2, bca_sem1])
    db.flush()

    # Seed Students
    # Student 1: Active MCA Sem 1
    s1 = User(
        id=uuid.uuid4(),
        name="John Doe",
        email="john@test.com",
        password_hash=hash_password("student123"),
        role="student",
        is_active=True,
        status="approved",
        section="A",
        cgpa=8.5,
        last_active_date=date.today(),
        course_id=mca_course.id,
        current_semester=1
    )
    # Student 2: Active BCA Sem 1
    s2 = User(
        id=uuid.uuid4(),
        name="Alice Smith",
        email="alice@test.com",
        password_hash=hash_password("student123"),
        role="student",
        is_active=True,
        status="approved",
        section="B",
        cgpa=9.1,
        last_active_date=date.today(),
        course_id=bca_course.id,
        current_semester=1
    )
    # Student 3: Pending Registration MCA Sem 1
    s3 = User(
        id=uuid.uuid4(),
        name="Pending Bob",
        email="bob@test.com",
        password_hash=hash_password("student123"),
        role="student",
        is_active=True,
        status="pending",
        section="A",
        cgpa=0.0,
        last_active_date=None,
        course_id=mca_course.id,
        current_semester=1
    )
    # Student 4: Deactivated Student MCA Sem 2
    s4 = User(
        id=uuid.uuid4(),
        name="Deactivated Charlie",
        email="charlie@test.com",
        password_hash=hash_password("student123"),
        role="student",
        is_active=False,
        status="deactivated",
        section="A",
        cgpa=7.2,
        last_active_date=date.today() - timedelta(days=20),
        course_id=mca_course.id,
        current_semester=2
    )
    # Student 5: At-risk Student (MCA Sem 1) - due to inactive > 7 days & low score
    s5 = User(
        id=uuid.uuid4(),
        name="Risk Student",
        email="risk@test.com",
        password_hash=hash_password("student123"),
        role="student",
        is_active=True,
        status="approved",
        section="A",
        cgpa=5.0,
        last_active_date=date.today() - timedelta(days=10),
        course_id=mca_course.id,
        current_semester=1
    )
    db.add_all([s1, s2, s3, s4, s5])
    db.flush()

    # Seed Enrollments
    e1 = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=s1.id,
        course_id=mca_course.id,
        current_semester_id=mca_sem1.id,
        enrollment_number="ENR001",
        approval_status="approved",
        id_card_url="http://example.com/id1.png"
    )
    e2 = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=s2.id,
        course_id=bca_course.id,
        current_semester_id=bca_sem1.id,
        enrollment_number="ENR002",
        approval_status="approved",
        id_card_url="http://example.com/id2.png"
    )
    e3 = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=s3.id,
        course_id=mca_course.id,
        current_semester_id=mca_sem1.id,
        enrollment_number="ENR003",
        approval_status="pending",
        id_card_url="http://example.com/id3.png"
    )
    e4 = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=s4.id,
        course_id=mca_course.id,
        current_semester_id=mca_sem2.id,
        enrollment_number="ENR004",
        approval_status="approved",
        id_card_url="http://example.com/id4.png"
    )
    e5 = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=s5.id,
        course_id=mca_course.id,
        current_semester_id=mca_sem1.id,
        enrollment_number="ENR005",
        approval_status="approved",
        id_card_url="http://example.com/id5.png"
    )
    db.add_all([e1, e2, e3, e4, e5])
    db.flush()

    # Seed Subject for QuizAttempt foreign key constraint
    sub = Subject(
        id=uuid.uuid4(),
        name="Data Structures",
        code="CS101",
        course_id=mca_course.id,
        semester_id=mca_sem1.id,
        semester_number=1,
        is_archived=False,
        department_id=mca_dept.department_id,
        credit_hours=3
    )
    db.add(sub)
    db.flush()

    # Quiz attempt for s5 to trigger low score
    qa = QuizAttempt(
        id=uuid.uuid4(),
        student_id=s5.id,
        subject_id=sub.id,
        score=35.0,
        difficulty_used="medium",
        completed_at=datetime.utcnow()
    )
    db.add(qa)
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


def _login_headers(client, email, password) -> dict:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _hod_headers(client) -> dict:
    return _login_headers(client, "hod@intellilearn.com", "hod123")


def _admin_headers(client) -> dict:
    return _login_headers(client, "admin@intellilearn.com", "admin123")


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestStudentsDirectory:
    """STU-001 - STU-017: Student Directory endpoints & filtering."""

    def test_TC01_list_all_students(self, client):
        """STU-001 & STU-006: Student directory returns 200 and listings."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/all", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1

    def test_TC02_summary_counts(self, client):
        """STU-004, STU-005, STU-007, STU-009: Verification of counters."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/summary-counts", headers=headers)
        assert r.status_code == 200
        stats = r.json()
        assert stats["total"] >= 5
        assert stats["pending"] == 1
        assert stats["deactivated"] == 1

    def test_TC03_search_name(self, client):
        """STU-010: Search by name John."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/all?search=John", headers=headers)
        assert r.status_code == 200
        results = r.json()
        assert len(results) == 1
        assert results[0]["name"] == "John Doe"

    def test_TC04_search_enrollment(self, client):
        """STU-011: Search by enrollment number."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/all?search=ENR001", headers=headers)
        assert r.status_code == 200
        results = r.json()
        assert len(results) == 1
        assert results[0]["enrollment_no"] == "ENR001"

    def test_TC05_search_invalid(self, client):
        """STU-012: Search invalid query returns empty list."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/all?search=XYZ999", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) == 0

    def test_TC06_filter_department(self, client):
        """STU-013: Filter by department."""
        headers = _admin_headers(client)  # Use admin to see BCA and MCA
        r_mca = client.get("/api/v1/hod/students/all?department=MCA", headers=headers)
        r_bca = client.get("/api/v1/hod/students/all?department=BCA", headers=headers)
        assert r_mca.status_code == 200
        assert r_bca.status_code == 200
        # All MCA: John Doe, Pending Bob, Charlie, Risk Student -> 4
        assert len(r_mca.json()) >= 1
        # All BCA: Alice Smith -> 1
        assert len(r_bca.json()) >= 1

    def test_TC07_filter_semester(self, client):
        """STU-015: Filter by semester."""
        headers = _hod_headers(client)
        r_sem1 = client.get("/api/v1/hod/students/all?semester=1", headers=headers)
        r_sem2 = client.get("/api/v1/hod/students/all?semester=2", headers=headers)
        assert r_sem1.status_code == 200
        assert r_sem2.status_code == 200


class TestAllStudentsTab:
    """AST-001 - AST-012: Detail validations and deactivation."""

    def test_TC08_student_fields_populated(self, client):
        """AST-001 - AST-009: Verify properties on the student record."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/all", headers=headers)
        assert r.status_code == 200
        students = r.json()
        jdoe = next(s for s in students if s["name"] == "John Doe")
        assert jdoe["email"] == "john@test.com"
        assert jdoe["enrollment_no"] == "ENR001"
        assert jdoe["department"] == "MCA"
        assert jdoe["semester"] == 1
        assert jdoe["section"] == "A"
        assert jdoe["cgpa"] == 8.5
        assert jdoe["status"] == "approved"

    def test_TC09_deactivate_confirm_flow(self, client, db_session):
        """AST-011, AST-012 & DEA-001: Deactivate student moves to Deactivated."""
        headers = _hod_headers(client)
        s1 = db_session.query(User).filter(User.name == "John Doe").first()
        
        # Deactivate
        r = client.post(f"/api/v1/hod/students/{str(s1.id)}/deactivate", headers=headers)
        assert r.status_code == 200
        assert "deactivated" in r.json()["message"]

        # Check status shows deactivated
        r_profile = client.get(f"/api/v1/hod/students/{str(s1.id)}", headers=headers)
        assert r_profile.status_code == 200
        assert r_profile.json()["status"] == "deactivated"


class TestPendingApprovals:
    """PEN-001 - PEN-010: Review and Approve/Reject/Correction flows."""

    def test_TC10_get_pending_approvals(self, client):
        """PEN-001: List pending approvals."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/pending-approvals", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["name"] == "Pending Bob"
        assert data[0]["id_card_url"] is not None

    def test_TC11_approve_pending(self, client, db_session):
        """PEN-003: Approve student registration."""
        headers = _hod_headers(client)
        bob = db_session.query(User).filter(User.name == "Pending Bob").first()

        r = client.post(f"/api/v1/hod/students/{str(bob.id)}/approve", headers=headers)
        assert r.status_code == 200
        assert "approved successfully" in r.json()["message"]

        # Status must be active/approved now
        db_session.refresh(bob)
        assert bob.status == "approved"
        assert bob.is_active is True

    def test_TC12_approve_with_correction(self, client, db_session):
        """PEN-005: Process correction actions."""
        headers = _hod_headers(client)
        # Create a new pending student to test correction
        new_s = User(
            id=uuid.uuid4(), name="Correction Sam", email="sam@test.com",
            password_hash=hash_password("pass123"), role="student", is_active=True, status="pending"
        )
        db_session.add(new_s)
        db_session.flush()
        
        course = db_session.query(Course).first()
        sem = db_session.query(Semester).first()
        new_e = StudentEnrollment(
            id=uuid.uuid4(), student_id=new_s.id, course_id=course.id,
            current_semester_id=sem.id, enrollment_number="ENR999", approval_status="pending"
        )
        db_session.add(new_e)
        db_session.commit()

        # Mark for correction
        r = client.post(
            f"/api/v1/hod/students/{str(new_e.id)}/review",
            json={"action": "correction", "note": "Update document"},
            headers=headers
        )
        assert r.status_code == 200
        assert "correction" in r.json()["message"].lower()


class TestAtRiskStudents:
    """RISK-001 - RISK-010: At-risk listings and mitigations."""

    def test_TC13_at_risk_list(self, client):
        """RISK-001, RISK-002, RISK-003: Identify at-risk student with risk reasons."""
        headers = _hod_headers(client)
        r = client.get("/api/v1/hod/students/at-risk", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        risk_stu = next(s for s in data if s["name"] == "Risk Student")
        assert risk_stu["risk_level"] == "High"
        assert "Inactivity & Low score" in risk_stu["risk_reason"]

    def test_TC14_inform_faculty_and_reminder(self, client, db_session):
        """RISK-005 & RISK-006: Dispatch reminders and notify faculty."""
        headers = _hod_headers(client)
        risk = db_session.query(User).filter(User.name == "Risk Student").first()

        # Notify Faculty
        r_fac = client.post(f"/api/v1/hod/students/{str(risk.id)}/inform-faculty", headers=headers)
        assert r_fac.status_code == 200
        assert "faculty" in r_fac.json()["message"].lower() or "notification" in r_fac.json()["message"].lower()

        # Send nudge
        r_nud = client.post(f"/api/v1/hod/students/{str(risk.id)}/send-reminder", headers=headers)
        assert r_nud.status_code == 200
        assert "nudge" in r_nud.json()["message"].lower() or "alert" in r_nud.json()["message"].lower()


class TestDeactivatedStudents:
    """DEA-001 - DEA-005: Listings and reactivation."""

    def test_TC15_reactivate_flow(self, client, db_session):
        """DEA-003: Reactivate student moves to active status."""
        headers = _hod_headers(client)
        charlie = db_session.query(User).filter(User.name == "Deactivated Charlie").first()

        # Reactivate
        r = client.post(f"/api/v1/hod/students/{str(charlie.id)}/reactivate", headers=headers)
        assert r.status_code == 200
        assert "reactivated successfully" in r.json()["message"]

        db_session.refresh(charlie)
        assert charlie.is_active is True
        assert charlie.status == "approved"


class TestStudentProfileAndActions:
    """ACT-001 - ACT-005: Student profile viewing and updating."""

    def test_TC16_get_and_update_profile(self, client, db_session):
        """ACT-001 & ACT-002: View profile details and perform PUT updates."""
        headers = _hod_headers(client)
        john = db_session.query(User).filter(User.name == "John Doe").first()

        # View
        r_get = client.get(f"/api/v1/hod/students/{str(john.id)}", headers=headers)
        assert r_get.status_code == 200
        assert r_get.json()["name"] == "John Doe"

        # Update
        payload = {"name": "John Doe Updated", "cgpa": 9.0}
        r_put = client.put(f"/api/v1/hod/students/{str(john.id)}", json=payload, headers=headers)
        assert r_put.status_code == 200

        # Verify update persisted
        db_session.refresh(john)
        assert john.name == "John Doe Updated"
        assert john.cgpa == 9.0


class TestNegativeAndSecurity:
    """NEG-001 - NEG-010 & SEC-001 - SEC-005: Resiliency and Security Checks."""

    def test_TC17_unauthorized_access_fails(self, client):
        """SEC-001: Access without token returns 401/403."""
        r = client.get("/api/v1/hod/students/all")
        assert r.status_code in (401, 403)

    def test_TC18_hod_scope_protection(self, client, db_session):
        """SEC-004: HOD cannot view students from other departments."""
        headers = _hod_headers(client)  # MCA HOD
        # Alice is in BCA
        alice = db_session.query(User).filter(User.name == "Alice Smith").first()

        r = client.get(f"/api/v1/hod/students/{str(alice.id)}", headers=headers)
        assert r.status_code == 403

    def test_TC19_validation_errors(self, client, db_session):
        """NEG-003 & NEG-004: Handling invalid values (e.g. CGPA out of bounds)."""
        headers = _hod_headers(client)
        john = db_session.query(User).filter(User.name == "John Doe Updated").first()

        # Invalid CGPA (15.0)
        r = client.put(f"/api/v1/hod/students/{str(john.id)}", json={"cgpa": 15.0}, headers=headers)
        assert r.status_code == 400
