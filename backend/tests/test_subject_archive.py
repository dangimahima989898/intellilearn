import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid
from datetime import datetime, timedelta

from database import Base, get_db
from main import app
from models.user import User
from models.course import Course
from models.subject import Subject
from utils.security import hash_password
from routers.subjects import purge_expired_subjects

# Use SQLite for isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_subject_archive.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed an admin user
        admin = User(
            id=uuid.uuid4(),
            name="Admin Test",
            email="admin@intellilearn.com",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin)
        
        # Seed a course
        course = Course(
            id=uuid.uuid4(),
            name="Master of Computer Applications",
            code="MCA",
            total_semesters=4,
            duration_years=2,
            is_active=True
        )
        db.add(course)
        
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


def get_admin_headers(client):
    login_res = client.post("/auth/login", json={"email": "admin@intellilearn.com", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_soft_delete_subject(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create a subject
    create_payload = {
        "name": "Software Engineering",
        "code": "MCA-201",
        "description": "Software Design Principles",
        "color": "#3B82F6",
        "icon": "BookOpen",
        "course_id": str(course.id),
        "semester_number": 2
    }
    
    create_res = client.post("/subjects", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    subject_id = create_res.json()["id"]
    
    # Soft delete the subject
    delete_res = client.delete(f"/subjects/{subject_id}", headers=headers)
    assert delete_res.status_code == 200
    assert "moved to Archive" in delete_res.json()["message"]
    
    # Verify in DB
    subject = db_session.query(Subject).filter(Subject.id == uuid.UUID(subject_id)).first()
    assert subject.is_archived is True
    assert subject.archived_at is not None


def test_list_subjects_filters_archived(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create two subjects
    sub1 = Subject(
        id=uuid.uuid4(),
        name="Active Subject",
        code="ACT-101",
        course_id=course.id,
        semester_number=1,
        is_archived=False
    )
    sub2 = Subject(
        id=uuid.uuid4(),
        name="Archived Subject",
        code="ARC-102",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow()
    )
    db_session.add(sub1)
    db_session.add(sub2)
    db_session.commit()
    
    # List subjects
    list_res = client.get("/subjects", headers=headers)
    assert list_res.status_code == 200
    subjects_list = list_res.json()
    
    # Verify only the active one is returned
    assert len(subjects_list) == 1
    assert subjects_list[0]["id"] == str(sub1.id)


def test_list_archived_subjects(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create an archived subject
    sub = Subject(
        id=uuid.uuid4(),
        name="Archived Subject",
        code="ARC-102",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow() - timedelta(days=2)
    )
    db_session.add(sub)
    db_session.commit()
    
    list_res = client.get("/subjects/archived", headers=headers)
    assert list_res.status_code == 200
    archived_list = list_res.json()
    
    assert len(archived_list) == 1
    assert archived_list[0]["id"] == str(sub.id)
    assert archived_list[0]["remaining_days"] == 13


def test_restore_subject(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create an archived subject
    sub = Subject(
        id=uuid.uuid4(),
        name="Archived Subject",
        code="ARC-102",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow()
    )
    db_session.add(sub)
    db_session.commit()
    
    # Restore it
    restore_res = client.post(f"/subjects/{sub.id}/restore", headers=headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["is_archived"] is False
    assert restore_res.json()["archived_at"] is None
    
    # Verify DB state
    db_session.refresh(sub)
    assert sub.is_archived is False
    assert sub.archived_at is None


def test_permanent_delete_subject(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create a subject
    sub = Subject(
        id=uuid.uuid4(),
        name="Temporary Subject",
        code="TMP-103",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow()
    )
    db_session.add(sub)
    db_session.commit()
    
    # Permanent delete
    delete_res = client.delete(f"/subjects/{sub.id}/permanent", headers=headers)
    assert delete_res.status_code == 204
    
    # Verify DB has no record
    assert db_session.query(Subject).filter(Subject.id == sub.id).first() is None


def test_purge_expired_subjects(client, db_session):
    headers = get_admin_headers(client)
    course = db_session.query(Course).first()
    
    # Create an archived subject expired > 15 days
    expired_sub = Subject(
        id=uuid.uuid4(),
        name="Expired Subject",
        code="EXP-104",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow() - timedelta(days=16)
    )
    
    # Create an archived subject not expired
    active_archive_sub = Subject(
        id=uuid.uuid4(),
        name="New Archive Subject",
        code="NEW-105",
        course_id=course.id,
        semester_number=1,
        is_archived=True,
        archived_at=datetime.utcnow() - timedelta(days=2)
    )
    
    db_session.add(expired_sub)
    db_session.add(active_archive_sub)
    db_session.commit()
    
    # Trigger purge by querying subjects list
    list_res = client.get("/subjects/archived", headers=headers)
    assert list_res.status_code == 200
    
    # Verify expired one is deleted and active archive one is kept
    assert db_session.query(Subject).filter(Subject.id == expired_sub.id).first() is None
    assert db_session.query(Subject).filter(Subject.id == active_archive_sub.id).first() is not None
