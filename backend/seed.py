from database import SessionLocal
from models.subject import Subject
import uuid

SUBJECTS = [
    {
        "name": "Data Structures & Algorithms",
        "code": "DSA",
        "description": "Fundamental data structures, algorithms, time & space complexity",
        "color": "#3B82F6",
        "icon": "GitBranch",
    },
    {
        "name": "Database Management Systems",
        "code": "DBMS",
        "description": "SQL, normalization, transactions, indexing, NoSQL",
        "color": "#8B5CF6",
        "icon": "Database",
    },
    {
        "name": "Operating Systems",
        "code": "OS",
        "description": "Process management, memory, file systems, deadlocks",
        "color": "#10B981",
        "icon": "Monitor",
    },
    {
        "name": "Computer Networks",
        "code": "CN",
        "description": "OSI model, TCP/IP, routing, protocols, network security",
        "color": "#F59E0B",
        "icon": "Network",
    },
    {
        "name": "Java Programming",
        "code": "JAVA",
        "description": "OOP, collections, multithreading, JDBC, Spring basics",
        "color": "#EF4444",
        "icon": "Coffee",
    },
    {
        "name": "Python Programming",
        "code": "PYTHON",
        "description": "Python syntax, libraries, data science basics, Flask/Django",
        "color": "#06B6D4",
        "icon": "Code",
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Subject).count()
        if existing > 0:
            print(f"[SKIP] Subjects already seeded ({existing} found).")
            return
        for s in SUBJECTS:
            subject = Subject(id=uuid.uuid4(), **s)
            db.add(subject)
        db.commit()
        print(f"[OK] Seeded {len(SUBJECTS)} subjects successfully.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
