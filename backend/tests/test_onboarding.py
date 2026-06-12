import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from models.user import User
from models.enrolled_student import EnrolledStudent
from models.student_access_request import StudentAccessRequest
from utils.security import hash_password

# Use an in-memory SQLite database for independent test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_onboarding.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed an admin user for review tests
        admin = User(
            id=None,  # let UUID auto-assign if possible or generate
            name="Admin Test",
            email="admin@intellilearn.com",
            password_hash=hash_password("admin123"),
            role="admin",
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

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_student_self_registration_disabled(client):
    """
    1. Public student self-registration must return 403 Forbidden.
    """
    payload = {
        "name": "New Student",
        "email": "student@intellilearn.com",
        "password": "password123",
        "role": "student"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 403
    assert "disabled" in response.json()["detail"].lower()


def test_student_access_request_flow_and_rate_limit(client, db_session):
    """
    2. Student request access endpoint works and enforces rate limit of max 3 daily.
    """
    payload = {
        "full_name": "Applicant Student",
        "email": "applicant@test.com",
        "enrollment_number": "ENR-9992",
        "semester": 2,
        "branch": "MCA",
        "section": "A",
        "reason": "Need platform access"
    }

    # Request 1: Should succeed
    response = client.post("/api/auth/request-access", json=payload)
    assert response.status_code == 201
    assert "submitted" in response.json()["message"].lower()

    # Request 2 & 3: Should succeed
    client.post("/api/api/auth/request-access" if False else "/api/auth/request-access", json=payload)
    client.post("/api/auth/request-access", json=payload)

    # Request 4: Should fail due to rate limit
    response = client.post("/api/auth/request-access", json=payload)
    assert response.status_code == 429
    assert "limit exceeded" in response.json()["detail"].lower()


def test_bulk_student_upload_enrolled(client, db_session):
    """
    3. Bulk upload pre-authorizes cohorts and skips duplicate enrollment numbers.
    """
    # Authenticate as admin
    login_res = client.post("/auth/login", json={"email": "admin@intellilearn.com", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create synthetic CSV data with one duplicate
    csv_content = (
        "full_name,email,enrollment_number,semester,branch,section,academic_year\n"
        "Alex Brown,alex@school.com,ENR-101,1,MCA,A,2025-2026\n"
        "Charlie Green,charlie@school.com,ENR-102,1,MCA,B,2025-2026\n"
        "Duplicate Brown,duplicate@school.com,ENR-101,1,MCA,A,2025-2026\n"
    )
    
    files = {"file": ("students.csv", csv_content, "text/csv")}

    # Test preview mode
    response = client.post("/api/admin/upload-students?preview=true", files=files, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 3
    assert data["success_count"] == 2
    assert data["duplicate_count"] == 1

    # Verify no records are committed yet
    assert db_session.query(EnrolledStudent).count() == 0

    # Test commit mode
    files = {"file": ("students.csv", csv_content, "text/csv")}
    response = client.post("/api/admin/upload-students?preview=false", files=files, headers=headers)
    assert response.status_code == 200
    assert db_session.query(EnrolledStudent).count() == 2
