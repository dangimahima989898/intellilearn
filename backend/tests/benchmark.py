import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from routers.analytics import get_student_overview
from routers.dashboard_analytics import get_heatmap
from models.user import User
from models.subject import Subject

db = SessionLocal()

try:
    # 1. Fetch any student and admin
    student = db.query(User).filter(User.role == "student").first()
    admin = db.query(User).filter(User.role == "super_admin").first()

    if not student:
        print("No student found in DB to benchmark overview!")
    else:
        print(f"Benchmarking /student/overview for student: {student.email}...")
        start = time.perf_counter()
        res = get_student_overview(db=db, current_user=student)
        end = time.perf_counter()
        print(f"Latency: {(end - start) * 1000:.2f}ms")
        print(f"Overview subject count: {len(res.get('subjects_studied', []))}")

    if not admin:
        print("No super_admin found in DB to benchmark heatmap!")
    else:
        print(f"\nBenchmarking /admin/dashboard/heatmap...")
        start = time.perf_counter()
        res = get_heatmap(semester=None, subject_id=None, date_range="this_semester", db=db, current_user=admin)
        end = time.perf_counter()
        print(f"Latency: {(end - start) * 1000:.2f}ms")
        print(f"Heatmap subjects loaded: {len(res)}")

finally:
    db.close()
