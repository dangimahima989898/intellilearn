# Import all models here so Alembic can detect them
from .user import User
from .subject import Subject
from .note import Note
from .question import Question
from .quiz_attempt import QuizAttempt
from .quiz_answer import QuizAnswer
from .doubt import Doubt
from .doubt_answer import DoubtAnswer
from .daily_challenge import DailyChallenge
from .challenge_submission import ChallengeSubmission
from .timetable import Timetable
from .event import Event
from .notification import Notification
from .chat_log import ChatLog
from .rate_limit import RateLimit
