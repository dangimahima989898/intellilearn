import pytest
import uuid
import csv
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db, get_db_sync
from main import app
from models.user import User
from models.placement_test import PlacementTest, TestQuestion, TestAttempt, AttemptAnswer
from utils.security import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_placement.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create users
        admin = User(
            id=uuid.uuid4(),
            name="Admin User",
            email="admin@intellilearn.com",
            password_hash=hash_password("admin123"),
            role="super_admin",
            is_active=True
        )
        student = User(
            id=uuid.uuid4(),
            name="Student User",
            email="student@intellilearn.com",
            password_hash=hash_password("student123"),
            role="student",
            is_active=True
        )
        student2 = User(
            id=uuid.uuid4(),
            name="Student 2 User",
            email="student2@intellilearn.com",
            password_hash=hash_password("student123"),
            role="student",
            is_active=True
        )
        db.add_all([admin, student, student2])
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
    app.dependency_overrides[get_db_sync] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def get_auth_headers(user):
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

# --- TESTS ---

def test_unauthenticated_api_access(client):
    """
    1. Unauthenticated request returns 401.
    """
    response = client.get("/api/placement-tests")
    assert response.status_code == 401

def test_admin_only_endpoints(client, db_session):
    """
    2. Students cannot access admin endpoints.
    """
    student = db_session.query(User).filter(User.role == "student").first()
    headers = get_auth_headers(student)
    
    # Try to create test
    payload = {
        "title": "Hack Test",
        "category": "Engineering",
        "test_type": "coding",
        "duration_minutes": 60,
        "difficulty": "hard",
        "total_marks": 100
    }
    response = client.post("/api/placement-tests/admin/create", json=payload, headers=headers)
    assert response.status_code == 403

def test_complete_student_flow(client, db_session):
    """
    3. Student lists tests, starts attempt, saves answers, submits, and views results.
    """
    # Get users
    student = db_session.query(User).filter(User.role == "student").first()
    student_headers = get_auth_headers(student)
    admin = db_session.query(User).filter(User.role == "super_admin").first()
    admin_headers = get_auth_headers(admin)
    
    # 1. Admin creates test
    test_payload = {
        "title": "QA Skill Assessment",
        "category": "Engineering",
        "test_type": "mixed",
        "duration_minutes": 60,
        "difficulty": "medium",
        "total_marks": 100
    }
    res_test = client.post("/api/placement-tests/admin/create", json=test_payload, headers=admin_headers)
    assert res_test.status_code == 200
    test_id = res_test.json()["id"]
    
    # 2. Admin adds questions
    q1_payload = {
        "question_text": "What is Python?",
        "question_type": "mcq",
        "options": ["A snake", "A programming language", "A shoe brand", "A coffee"],
        "correct_answer": "A programming language",
        "marks": 40,
        "section": "Aptitude",
        "order_index": 1
    }
    res_q1 = client.post(f"/api/placement-tests/admin/{test_id}/questions", json=q1_payload, headers=admin_headers)
    assert res_q1.status_code == 200
    q1_id = res_q1.json()["id"]

    q2_payload = {
        "question_text": "2 + 2 = ?",
        "question_type": "fill",
        "correct_answer": "4",
        "marks": 60,
        "section": "Math",
        "order_index": 2
    }
    res_q2 = client.post(f"/api/placement-tests/admin/{test_id}/questions", json=q2_payload, headers=admin_headers)
    assert res_q2.status_code == 200
    q2_id = res_q2.json()["id"]
    
    # 3. Student lists tests
    res_list = client.get("/api/placement-tests", headers=student_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["title"] == "QA Skill Assessment"
    assert res_list.json()[0]["attempted"] is False
    
    # 4. Student starts test
    res_start = client.post(f"/api/placement-tests/{test_id}/start", headers=student_headers)
    assert res_start.status_code == 200
    attempt_id = res_start.json()["id"]
    
    # 5. Fetch attempt questions
    res_qs = client.get(f"/api/placement-tests/{test_id}/questions", headers=student_headers)
    assert res_qs.status_code == 200
    assert len(res_qs.json()) == 2
    
    # 6. Save answer for Question 1 (Correct)
    ans1_payload = {
        "question_id": q1_id,
        "user_answer": "A programming language",
        "time_spent_seconds": 15,
        "marked_for_review": False
    }
    res_ans1 = client.post(f"/api/placement-tests/{test_id}/save-answer", json=ans1_payload, headers=student_headers)
    assert res_ans1.status_code == 200
    assert res_ans1.json()["is_correct"] is True
    
    # 7. Save answer for Question 2 (Incorrect)
    ans2_payload = {
        "question_id": q2_id,
        "user_answer": "5",
        "time_spent_seconds": 10,
        "marked_for_review": True
    }
    res_ans2 = client.post(f"/api/placement-tests/{test_id}/save-answer", json=ans2_payload, headers=student_headers)
    assert res_ans2.status_code == 200
    assert res_ans2.json()["is_correct"] is False
    
    # 8. Submit test
    submit_payload = {
        "tab_switches": 1,
        "status": "submitted"
    }
    res_submit = client.post(f"/api/placement-tests/{test_id}/submit", json=submit_payload, headers=student_headers)
    assert res_submit.status_code == 200
    assert res_submit.json()["status"] == "submitted"
    assert res_submit.json()["score"] == 40.0 # Only Q1 is correct (40 marks)
    
    # 9. Get Result Report
    res_report = client.get(f"/api/placement-tests/{test_id}/result/{attempt_id}", headers=student_headers)
    assert res_report.status_code == 200
    report_data = res_report.json()
    assert report_data["percentage"] == 40.0
    assert report_data["grade"] == "D"
    assert report_data["pass_status"] is True
    assert report_data["insights"]["strongest_section"] == "Aptitude"

def test_csv_import_roundtrip(client, db_session):
    """
    4. CSV Import idempotency check.
    """
    admin = db_session.query(User).filter(User.role == "super_admin").first()
    headers = get_auth_headers(admin)
    
    # 1. Admin creates test
    test_payload = {
        "title": "CSV Import Test",
        "category": "General",
        "test_type": "aptitude",
        "duration_minutes": 30,
        "difficulty": "easy",
        "total_marks": 50
    }
    res_test = client.post("/api/placement-tests/admin/create", json=test_payload, headers=headers)
    test_id = res_test.json()["id"]
    
    # 2. Upload CSV
    csv_content = (
        "question_text,question_type,options,correct_answer,marks,section,order_index\n"
        "What is 1+1?,mcq,\"['1','2','3']\",2,20,Math,1\n"
        "What is Capital of UK?,fill,,London,30,Geography,2\n"
    )
    
    file = io.BytesIO(csv_content.encode("utf-8"))
    res_import = client.post(
        f"/api/placement-tests/admin/{test_id}/csv-import",
        files={"file": ("questions.csv", file, "text/csv")},
        headers=headers
    )
    assert res_import.status_code == 200
    assert "imported 2 questions" in res_import.json()["message"]
    
    # 3. Duplicate import should be idempotent and not create duplicates
    file_dup = io.BytesIO(csv_content.encode("utf-8"))
    res_import_dup = client.post(
        f"/api/placement-tests/admin/{test_id}/csv-import",
        files={"file": ("questions.csv", file_dup, "text/csv")},
        headers=headers
    )
    assert res_import_dup.status_code == 200
    assert "imported 0 questions" in res_import_dup.json()["message"]
