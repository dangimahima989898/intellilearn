"""
Adaptive Assessment Engine for MCA students at MLSU.
Implements the real-time difficulty adjustment state machine, topic personalization,
cross-session question deduplication, weak topic detection, and readiness score calculations.
"""

import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, not_, desc

from models.question import Question
from models.quiz_attempt import QuizAttempt
from models.quiz_answer import QuizAnswer
from models.student_performance_summary import StudentPerformanceSummary
from models.subject import Subject


class AdaptiveEngine:
    @staticmethod
    def start_session(db, student_id, subject_id, topic, num_questions=10):
        """Initialize a new adaptive quiz session."""
        attempt = QuizAttempt(
            id=uuid.uuid4(),
            student_id=student_id,
            subject_id=subject_id,
            topic=topic,
            started_at=datetime.now(timezone.utc),
            total_questions=num_questions,
            correct_count=0,
            score=0.0,
            difficulty_used="medium",
            current_difficulty="medium",
            consecutive_correct=0,
            consecutive_wrong=0
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def _select_next_topic(db, student_id, subject_id, available_topics):
        """
        AI-driven topic selection for mixed mode based on student history.
        Prioritizes: weak topics (50%) > unexplored topics (20%) > in-progress (20%) > strong (10%).
        """
        import random
        if not available_topics:
            return "General"

        history = db.query(
            QuizAnswer.question_id,
            QuizAnswer.is_correct,
            Question.topic
        ).join(Question, QuizAnswer.question_id == Question.id)\
         .join(QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id)\
         .filter(
            QuizAttempt.student_id == student_id,
            QuizAttempt.subject_id == subject_id
         ).all()

        topic_stats = {}
        for _, is_correct, topic in history:
            if not topic:
                continue
            if topic not in topic_stats:
                topic_stats[topic] = {"correct": 0, "total": 0}
            topic_stats[topic]["total"] += 1
            if is_correct:
                topic_stats[topic]["correct"] += 1

        weak_topics, in_progress_topics, strong_topics, unexplored_topics = [], [], [], []
        for t in available_topics:
            if t not in topic_stats or topic_stats[t]["total"] == 0:
                unexplored_topics.append(t)
                continue
            accuracy = topic_stats[t]["correct"] / topic_stats[t]["total"]
            if accuracy < 0.5:
                weak_topics.append(t)
            elif accuracy < 0.8:
                in_progress_topics.append(t)
            else:
                strong_topics.append(t)

        roll = random.random()
        if roll < 0.50 and weak_topics:
            return random.choice(weak_topics)
        elif roll < 0.70 and unexplored_topics:
            return random.choice(unexplored_topics)
        elif roll < 0.90 and in_progress_topics:
            return random.choice(in_progress_topics)
        elif strong_topics:
            return random.choice(strong_topics)
        return random.choice(available_topics)

    @staticmethod
    def get_next_question(db, session_id, available_topics=None):
        """
        Select the next question dynamically with cross-session dedup, topic personalization,
        unit balancing, and graceful fallback when the question bank is exhausted.
        """
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == session_id).first()
        if not attempt:
            return None

        answered = db.query(QuizAnswer.question_id).filter(QuizAnswer.attempt_id == session_id).all()
        answered_ids = [r[0] for r in answered]
        if len(answered_ids) >= attempt.total_questions:
            return None

        # Cross-session dedup: questions answered in any previous completed session
        prev_ids = db.query(QuizAnswer.question_id).join(
            QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id
        ).filter(
            QuizAttempt.student_id == attempt.student_id,
            QuizAttempt.subject_id == attempt.subject_id,
            QuizAttempt.id != session_id,
            QuizAttempt.completed_at.isnot(None)
        ).all()
        prev_ids = {r[0] for r in prev_ids}
        all_exclude = set(answered_ids) | prev_ids

        # Unit balancing
        max_per_unit = max(1, int(attempt.total_questions * 0.4))
        unit_counts = {}
        if answered_ids:
            unit_rows = db.query(Question.unit, func.count(Question.id))\
                .filter(Question.id.in_(answered_ids))\
                .group_by(Question.unit).all()
            unit_counts = {u: c for u, c in unit_rows if u}
        overlimit_units = [u for u, c in unit_counts.items() if c >= max_per_unit]

        # Topic selection
        query_topic = None
        if attempt.topic and attempt.topic.lower() != "mixed":
            query_topic = attempt.topic
        elif available_topics:
            query_topic = AdaptiveEngine._select_next_topic(
                db, attempt.student_id, attempt.subject_id, available_topics
            )

        def build_q(exclude_ids):
            q = db.query(Question).filter(
                Question.subject_id == attempt.subject_id,
                not_(Question.id.in_(exclude_ids)) if exclude_ids else True
            )
            if query_topic:
                q = q.filter(Question.topic.ilike(f"%{query_topic}%"))
            if overlimit_units:
                q = q.filter(not_(Question.unit.in_(overlimit_units)))
            return q

        # Try fresh questions first
        q = build_q(all_exclude).filter(
            Question.difficulty == attempt.current_difficulty
        ).order_by(func.random()).first()

        if not q:
            for diff in ["medium", "easy", "hard"]:
                if diff != attempt.current_difficulty:
                    q = build_q(all_exclude).filter(Question.difficulty == diff).order_by(func.random()).first()
                    if q:
                        attempt.current_difficulty = diff
                        db.commit()
                        break

        # Fallback: bank exhausted — allow previously seen questions (exclude only current session)
        if not q:
            q = build_q(set(answered_ids)).filter(
                Question.difficulty == attempt.current_difficulty
            ).order_by(func.random()).first()
        if not q:
            for diff in ["medium", "easy", "hard"]:
                if diff != attempt.current_difficulty:
                    q = build_q(set(answered_ids)).filter(Question.difficulty == diff).order_by(func.random()).first()
                    if q:
                        attempt.current_difficulty = diff
                        db.commit()
                        break
        return q

    @staticmethod
    def evaluate_answer(db, session_id, question_id, selected_option, time_taken_seconds):
        """
        Evaluate answer and update difficulty state machine.
        Transition: 2 consecutive correct -> UP, 2 consecutive wrong -> DOWN.
        """
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == session_id).first()
        question = db.query(Question).filter(Question.id == question_id).first()
        if not attempt or not question:
            return {"error": "Session or Question not found"}

        if attempt.completed_at is not None:
            return {"error": "Cannot change or submit answers after quiz is completed"}

        existing = db.query(QuizAnswer).filter(
            QuizAnswer.attempt_id == session_id,
            QuizAnswer.question_id == question_id
        ).first()
        if existing:
            return {"error": "Question already answered in this session"}

        is_correct = (selected_option.lower().strip() == question.correct_answer.lower().strip())

        response = QuizAnswer(
            id=uuid.uuid4(),
            attempt_id=session_id,
            question_id=question_id,
            selected_answer=selected_option.lower().strip(),
            is_correct=is_correct,
            time_taken_seconds=time_taken_seconds
        )
        db.add(response)

        if is_correct:
            attempt.correct_count = (attempt.correct_count or 0) + 1
            attempt.consecutive_correct += 1
            attempt.consecutive_wrong = 0
        else:
            attempt.consecutive_wrong += 1
            attempt.consecutive_correct = 0

        DIFFICULTY_LEVELS = ["easy", "medium", "hard"]
        cur_idx = DIFFICULTY_LEVELS.index(attempt.current_difficulty) if attempt.current_difficulty in DIFFICULTY_LEVELS else 1

        if attempt.consecutive_correct >= 2:
            new_idx = min(cur_idx + 1, 2)
            if new_idx != cur_idx:
                attempt.current_difficulty = DIFFICULTY_LEVELS[new_idx]
                attempt.consecutive_correct = 0
        elif attempt.consecutive_wrong >= 2:
            new_idx = max(cur_idx - 1, 0)
            if new_idx != cur_idx:
                attempt.current_difficulty = DIFFICULTY_LEVELS[new_idx]
                attempt.consecutive_wrong = 0

        db.commit()
        db.refresh(attempt)

        total_answered = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == session_id).count()
        return {
            "is_correct": is_correct,
            "correct_answer": question.correct_answer,
            "explanation": question.explanation,
            "next_difficulty": attempt.current_difficulty,
            "questions_answered": total_answered
        }

    @staticmethod
    def generate_session_report(db, session_id):
        """
        Generate full analytics report including time analysis, topic breakdown,
        strong/weak topics, revision recommendations, and difficulty progression.
        """
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == session_id).first()
        if not attempt:
            return None

        answers = db.query(QuizAnswer, Question).join(Question, QuizAnswer.question_id == Question.id)\
            .filter(QuizAnswer.attempt_id == session_id)\
            .order_by(QuizAnswer.created_at).all()

        total = len(answers)
        correct = sum(1 for a, q in answers if a.is_correct)
        accuracy = (correct / total * 100) if total > 0 else 0.0

        diff_stats = {"easy": {"total": 0, "correct": 0}, "medium": {"total": 0, "correct": 0}, "hard": {"total": 0, "correct": 0}}
        bloom_stats, unit_stats, topic_stats = {}, {}, {}
        total_time = 0
        difficulty_progression = []

        for i, (ans, q) in enumerate(answers):
            diff = (q.difficulty or "medium").lower()
            if diff in diff_stats:
                diff_stats[diff]["total"] += 1
                if ans.is_correct:
                    diff_stats[diff]["correct"] += 1

            bloom = q.bloom_taxonomy_level or "Understand"
            bloom_stats.setdefault(bloom, {"total": 0, "correct": 0})
            bloom_stats[bloom]["total"] += 1
            if ans.is_correct:
                bloom_stats[bloom]["correct"] += 1

            unit = q.unit or "General"
            unit_stats.setdefault(unit, {"total": 0, "correct": 0})
            unit_stats[unit]["total"] += 1
            if ans.is_correct:
                unit_stats[unit]["correct"] += 1

            topic = q.topic or "General"
            topic_stats.setdefault(topic, {"total": 0, "correct": 0})
            topic_stats[topic]["total"] += 1
            if ans.is_correct:
                topic_stats[topic]["correct"] += 1

            total_time += (ans.time_taken_seconds or 0)
            difficulty_progression.append({
                "question_num": i + 1,
                "difficulty": diff,
                "is_correct": ans.is_correct,
                "topic": topic
            })

        difficulty_accuracy = {d: (s["correct"] / s["total"] * 100) if s["total"] > 0 else 0.0 for d, s in diff_stats.items()}
        bloom_accuracy = {b: (s["correct"] / s["total"] * 100) if s["total"] > 0 else 0.0 for b, s in bloom_stats.items()}
        unit_accuracy = {u: (s["correct"] / s["total"] * 100) if s["total"] > 0 else 0.0 for u, s in unit_stats.items()}

        weak_topics, strong_topic_names = [], []
        for top, stats in topic_stats.items():
            acc = (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0.0
            if acc < 0.6:
                weak_topics.append({"topic": top, "accuracy": acc * 100, "total_attempts": stats["total"]})
            elif acc >= 0.8:
                strong_topic_names.append(top)
        weak_topics.sort(key=lambda x: x["accuracy"])
        recommended_revision = [w["topic"] for w in weak_topics[:5]]

        avg_time = (total_time / total) if total > 0 else 0.0
        time_efficiency = "Fast" if avg_time <= 20 else ("Optimal" if avg_time <= 40 else "Slow")
        time_analysis = {
            "total_time_seconds": total_time,
            "avg_time_per_question_seconds": round(avg_time, 1),
            "time_efficiency": time_efficiency
        }

        readiness = accuracy * 0.6
        if diff_stats["hard"]["total"] > 0:
            readiness += (diff_stats["hard"]["correct"] / diff_stats["hard"]["total"]) * 30.0
        if diff_stats["easy"]["total"] > 0:
            easy_failed = diff_stats["easy"]["total"] - diff_stats["easy"]["correct"]
            readiness -= (easy_failed / diff_stats["easy"]["total"]) * 15.0
        readiness = max(0.0, min(100.0, readiness))
        readiness_label = "Exam Ready" if readiness >= 85 else ("Almost Ready" if readiness >= 70 else ("Needs Practice" if readiness >= 50 else "Not Ready"))

        attempt.completed_at = datetime.now(timezone.utc)
        attempt.score = accuracy
        db.commit()

        summary = db.query(StudentPerformanceSummary).filter(
            StudentPerformanceSummary.student_id == attempt.student_id,
            StudentPerformanceSummary.subject_id == attempt.subject_id
        ).first()
        weak_list_json = json.dumps([w["topic"] for w in weak_topics])
        if not summary:
            summary = StudentPerformanceSummary(
                id=uuid.uuid4(),
                student_id=attempt.student_id,
                subject_id=attempt.subject_id,
                total_quizzes=1,
                average_accuracy=accuracy,
                weak_topics=weak_list_json,
                predicted_readiness=readiness
            )
            db.add(summary)
        else:
            summary.total_quizzes += 1
            summary.average_accuracy = (summary.average_accuracy * (summary.total_quizzes - 1) + accuracy) / summary.total_quizzes
            summary.weak_topics = weak_list_json
            summary.predicted_readiness = readiness
        db.commit()

        questions_review = []
        for ans, q in answers:
            questions_review.append({
                "id": q.id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "selected_answer": ans.selected_answer,
                "correct_answer": q.correct_answer,
                "is_correct": ans.is_correct,
                "explanation": q.explanation
            })

        return {
            "session_id": str(session_id),
            "score": accuracy,
            "correct_count": correct,
            "total_questions": total,
            "difficulty_accuracy": difficulty_accuracy,
            "bloom_accuracy": bloom_accuracy,
            "unit_accuracy": unit_accuracy,
            "weak_topics": weak_topics,
            "strong_topics": strong_topic_names,
            "recommended_revision_topics": recommended_revision,
            "difficulty_progression": difficulty_progression,
            "time_analysis": time_analysis,
            "predicted_readiness": readiness,
            "readiness_label": readiness_label,
            "subject_name": attempt.subject.name if attempt.subject else "Subject",
            "questions_review": questions_review
        }
