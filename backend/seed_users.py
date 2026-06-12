from database import SessionLocal
from models.user import User
from utils.security import hash_password
from datetime import date
import uuid

def seed_users():
    db = SessionLocal()
    try:
        # Check admin
        admin = db.query(User).filter(User.email == "admin@intellilearn.com").first()
        if not admin:
            admin = User(
                id=uuid.uuid4(),
                name="Admin User",
                email="admin@intellilearn.com",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True,
                streak_count=0,
                last_active_date=date.today(),
            )
            db.add(admin)
            print("[OK] Admin user created.")
        else:
            print("[SKIP] Admin user already exists.")

        # Check student
        student = db.query(User).filter(User.email == "student@example.com").first()
        if not student:
            student = User(
                id=uuid.uuid4(),
                name="Student User",
                email="student@example.com",
                password_hash=hash_password("student123"),
                role="student",
                is_active=True,
                streak_count=0,
                last_active_date=date.today(),
            )
            db.add(student)
            print("[OK] Student user created.")
        else:
            print("[SKIP] Student user already exists.")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
