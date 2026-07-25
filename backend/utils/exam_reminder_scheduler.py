"""
Automated Exam Reminder Scheduler

Checks for upcoming exams/events and sends push notifications to students
X days before the event date (based on `reminder_lead_days` field).

Runs as a background task on app startup, checking every 6 hours.
Deduplicates using the Notification table's `reference_id` + `module` fields.
"""

import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import and_
from sqlalchemy.orm import Session

from database import SessionLocal
from models.event import Event
from models.exam_schedule import ExamSchedule
from models.notification import Notification
from models.user import User
from models.subject import Subject
from utils.firebase import send_push_notification

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 6 * 60 * 60  # 6 hours
MODULE_TAG = "exam_reminder"


def _send_exam_reminders(db: Session) -> dict:
    """
    Check Events (type=exam) and ExamSchedule records for upcoming dates.
    Send notifications to relevant students if reminder_lead_days match.
    """
    today = date.today()
    sent_count = 0
    skipped_count = 0

    # ── 1. Check Events with type 'exam' ─────────────────────────────────────
    events = db.query(Event).filter(
        Event.event_type == "exam",
        Event.event_date >= today,  # Only future events
    ).all()

    for event in events:
        event_date = event.event_date.date() if hasattr(event.event_date, 'date') else event.event_date
        days_until = (event_date - today).days
        lead_days = event.reminder_lead_days or 1

        # Send reminder if today is exactly `lead_days` before event
        if days_until != lead_days:
            continue

        # Find target students (by course/semester, or all if generic)
        students_query = db.query(User).filter(
            User.role == "student",
            User.is_active == True,
        )
        if event.course_id:
            students_query = students_query.filter(User.course_id == event.course_id)
        if event.semester_number:
            students_query = students_query.filter(User.current_semester == event.semester_number)

        students = students_query.all()

        for student in students:
            # Deduplicate: check if reminder already sent for this event + student
            existing = db.query(Notification).filter(
                Notification.recipient_user_id == student.id,
                Notification.reference_id == event.id,
                Notification.module == MODULE_TAG,
            ).first()

            if existing:
                skipped_count += 1
                continue

            title = f"⏰ Exam Reminder: {event.title}"
            message = (
                f"Your exam '{event.title}' is in {days_until} day(s) "
                f"on {event_date.strftime('%B %d, %Y')}. Prepare well!"
            )

            # Save notification to DB
            notif = Notification(
                recipient_user_id=student.id,
                recipient_role="student",
                title=title,
                message=message,
                module=MODULE_TAG,
                reference_id=event.id,
                priority="High",
            )
            db.add(notif)

            # Send push notification if student has FCM token
            if student.fcm_token:
                send_push_notification(
                    student.fcm_token, title, message,
                    data={"event_id": str(event.id), "type": "exam_reminder"}
                )

            sent_count += 1

    # ── 2. Check ExamSchedule records ─────────────────────────────────────────
    exam_schedules = db.query(ExamSchedule).filter(
        ExamSchedule.exam_date >= today,
    ).all()

    for exam in exam_schedules:
        exam_date = exam.exam_date.date() if hasattr(exam.exam_date, 'date') else exam.exam_date
        days_until = (exam_date - today).days

        # Default reminder: 1 day and 3 days before
        if days_until not in (1, 3):
            continue

        # Get subject name for the notification
        subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
        subject_name = subject.name if subject else "Unknown Subject"

        # Find students enrolled in that semester/course
        students = db.query(User).filter(
            User.role == "student",
            User.is_active == True,
        ).all()  # Broad — all students get exam schedule reminders

        for student in students:
            # Deduplicate
            reminder_key_str = f"{exam.id}_{days_until}"
            existing = db.query(Notification).filter(
                Notification.recipient_user_id == student.id,
                Notification.reference_id == exam.id,
                Notification.module == MODULE_TAG,
                Notification.title.contains(f"{days_until} day"),
            ).first()

            if existing:
                skipped_count += 1
                continue

            title = f"⏰ Exam in {days_until} day(s): {subject_name}"
            message = (
                f"Your {subject_name} exam is scheduled for "
                f"{exam_date.strftime('%B %d, %Y')} in Room {exam.room}. "
                f"Good luck with your preparation!"
            )

            notif = Notification(
                recipient_user_id=student.id,
                recipient_role="student",
                title=title,
                message=message,
                module=MODULE_TAG,
                reference_id=exam.id,
                priority="High",
            )
            db.add(notif)

            if student.fcm_token:
                send_push_notification(
                    student.fcm_token, title, message,
                    data={"exam_id": str(exam.id), "type": "exam_reminder"}
                )

            sent_count += 1

    db.commit()
    return {"sent": sent_count, "skipped_duplicates": skipped_count}


async def exam_reminder_loop():
    """Background loop that checks for upcoming exams every 6 hours."""
    logger.info("[Exam Reminder Scheduler] Started — checking every 6 hours")

    while True:
        try:
            db = SessionLocal()
            try:
                result = _send_exam_reminders(db)
                if result["sent"] > 0:
                    logger.info(
                        f"[Exam Reminder Scheduler] Sent {result['sent']} reminders, "
                        f"skipped {result['skipped_duplicates']} duplicates"
                    )
                else:
                    logger.debug("[Exam Reminder Scheduler] No reminders to send this cycle")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"[Exam Reminder Scheduler] Error: {e}")

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


def start_exam_reminder_scheduler():
    """Call this from the FastAPI startup event to begin the background scheduler."""
    asyncio.ensure_future(exam_reminder_loop())
