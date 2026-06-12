from database import SessionLocal
from models.daily_challenge import DailyChallenge
from models.challenge_submission import ChallengeSubmission
db = SessionLocal()
try:
    challenges = db.query(DailyChallenge).all()
    print(f"Total challenges: {len(challenges)}")
    for c in challenges:
        print(f"ID: {c.id}")
        print(f"Date: {c.challenge_date}")
        print(f"Question text: {c.question_text!r}")
        print(f"Option A: {c.option_a!r}")
        print(f"Option B: {c.option_b!r}")
        print(f"Option C: {c.option_c!r}")
        print(f"Option D: {c.option_d!r}")
        print(f"Correct answer: {c.correct_answer!r}")
        print("-" * 40)
finally:
    db.close()
