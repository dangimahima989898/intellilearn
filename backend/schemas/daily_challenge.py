from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

class DailyChallengeOut(BaseModel):
    id: UUID
    subject: str
    topic: str
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    challenge_date: date

class ChallengeSubmissionOut(BaseModel):
    selected_answer: str
    is_correct: bool
    score_earned: int
    submitted_at: datetime

class DailyChallengeResponse(BaseModel):
    challenge: DailyChallengeOut
    already_submitted: bool
    submission: Optional[ChallengeSubmissionOut] = None

class ChallengeSubmitRequest(BaseModel):
    challenge_id: UUID
    selected_answer: str

class ChallengeSubmitResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    score_earned: int
    message: str

class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    total_score: int
    correct_count: int
    attempt_count: int
    accuracy_rate: float

class ChallengeHistoryItem(BaseModel):
    challenge_date: date # renamed to match model
    subject: str
    topic: str
    is_correct: bool
    score_earned: int
    selected_answer: str
    correct_answer: str
