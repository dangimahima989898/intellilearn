import pytest
from fastapi.testclient import TestClient
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db, get_db_sync
from models import *

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a test setup
@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
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

def test_register_new_user(client):
    suffix = str(uuid.uuid4())[:8]
    response = client.post("/auth/register", json={
        "name": "Test Admin",
        "email": f"testuser_{suffix}@test.com",
        "password": "password123",
        "role": "super_admin"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "super_admin"
    assert data["name"] == "Test Admin"

def test_register_duplicate_email(client):
    suffix = str(uuid.uuid4())[:8]
    email = f"dup_{suffix}@test.com"
    client.post("/auth/register", json={"name":"Alice","email":email,"password":"pass123","role":"super_admin"})
    response = client.post("/auth/register", json={"name":"Bob","email":email,"password":"pass123","role":"super_admin"})
    
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

def test_login_correct_credentials(client):
    suffix = str(uuid.uuid4())[:8]
    email = f"login_{suffix}@test.com"
    client.post("/auth/register", json={"name":"Login Test","email":email,"password":"mypassword","role":"super_admin"})
    
    response = client.post("/auth/login", json={"email":email,"password":"mypassword"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password(client):
    suffix = str(uuid.uuid4())[:8]
    email = f"wrong_{suffix}@test.com"
    client.post("/auth/register", json={"name":"Wrong Pass","email":email,"password":"correct","role":"super_admin"})
    
    response = client.post("/auth/login", json={"email":email,"password":"wrong"})
    assert response.status_code == 401

def test_get_me_with_valid_token(client):
    suffix = str(uuid.uuid4())[:8]
    email = f"me_{suffix}@test.com"
    reg = client.post("/auth/register", json={"name":"Me Test","email":email,"password":"pass123","role":"super_admin"})
    token = reg.json()["access_token"]
    
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == email

def test_get_me_without_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 403  # HTTPBearer returns 403 when no valid header present

def test_get_me_with_bad_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer totally-fake-token"})
    assert response.status_code == 401 # Custom validation throws 401

def test_admin_required_rejects_student(client):
    # Student self-registration is disabled, so we can't register a student directly.
    # But we can test that self-registration indeed rejects with 403.
    suffix = str(uuid.uuid4())[:8]
    email = f"student_{suffix}@test.com"
    
    response = client.post("/auth/register", json={"name":"Student","email":email,"password":"pass123","role":"student"})
    assert response.status_code == 403
