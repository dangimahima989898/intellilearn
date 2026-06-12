import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.orm import Session
from models.user import User
from models.notification import Notification
import os
import uuid
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK (only once)
_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    service_account_path = "serviceAccountKey.json"
    if not os.path.exists(service_account_path):
        logger.warning("serviceAccountKey.json not found. Push notifications disabled.")
        return False
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Firebase init failed: {e}")
        return False

def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """Send a push notification to a single FCM token. Returns True if successful."""
    if not init_firebase():
        return False
    if not fcm_token:
        return False
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.warning(f"Failed to send push to token: {e}")
        return False

def send_to_all_students(db: Session, title: str, body: str, data: dict = None) -> dict:
    """Send push notification to all active students. Saves to DB for all, sends push to those with FCM tokens. Returns stats."""
    students = db.query(User).filter(
        User.role == "student",
        User.is_active == True
    ).all()

    success_count = 0
    fail_count = 0
    saved_count = 0

    for student in students:
        # Save notification to DB for ALL active students
        notif = Notification(
            id=uuid.uuid4(),
            user_id=student.id,
            title=title,
            body=body,
        )
        db.add(notif)
        saved_count += 1

        # Send push if student has FCM token
        if student.fcm_token:
            if send_push_notification(student.fcm_token, title, body, data):
                success_count += 1
            else:
                fail_count += 1

    db.commit()
    return {"success": success_count, "failed": fail_count, "saved_to_db": saved_count}
