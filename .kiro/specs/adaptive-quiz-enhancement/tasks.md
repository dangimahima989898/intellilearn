# Implementation Plan: Adaptive Quiz Enhancement

## Overview

This plan implements a dynamic topic selector for the Adaptive Quiz by adding a backend endpoint that queries `content_chunks.topic_hint` values grouped by unit, extending the frontend quiz service, replacing the free-text topic input with a grouped dropdown, fixing the undeclared `reviewQuestions` state bug, and verifying the complete quiz flow.

## Tasks

- [x] 1. Add backend topics endpoint
  - [x] 1.1 Implement GET /adaptive-quiz/topics endpoint in `backend/routers/adaptive_quiz.py`
    - Import ContentChunk model
    - Add `@router.get("/topics")` endpoint with `subject_id: uuid.UUID` query parameter
    - Add `require_student` dependency for authentication
    - Query content_chunks filtering by subject_id where topic_hint is not null and not empty
    - Group unique topic_hint values by unit (derived from chunk_index // 20 + 1)
    - Sort topics alphabetically within each unit group
    - Return dict like `{"Unit 1": ["Topic A", ...], "Unit 2": [...]}` or empty `{}` if no chunks
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.2 Write unit tests for the topics endpoint
    - Test returns grouped topics for a valid subject with content_chunks
    - Test returns empty `{}` for subject with no content_chunks
    - Test returns 422 when subject_id is missing
    - Test excludes records where topic_hint is null or empty
    - Test returns 401 without valid auth token
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Extend frontend quiz service
  - [x] 2.1 Add `getTopics(subjectId)` method to `frontend/src/services/quizService.js`
    - Add method that calls `GET /adaptive-quiz/topics` with `subject_id` query param
    - Return `response.data` (the grouped topics object)
    - _Requirements: 2.1_

- [x] 3. Fix state declaration bug and replace topic input with dynamic selector
  - [x] 3.1 Fix `reviewQuestions` useState declaration bug in `AdaptiveQuizPage.jsx`
    - Add `const [reviewQuestions, setReviewQuestions] = useState([]);` alongside other state declarations (near line 180)
    - Ensure `setReviewQuestions` in `handleAnswerSubmit` no longer throws ReferenceError
    - _Requirements: 4.1, 4.2_

  - [x] 3.2 Add topic fetching state and effect in `AdaptiveQuizPage.jsx`
    - Add state: `const [availableTopics, setAvailableTopics] = useState({});`
    - Add state: `const [topicsLoading, setTopicsLoading] = useState(false);`
    - Add `useEffect` that fetches topics via `quizService.getTopics(selectedSubject.id)` when `selectedSubject` changes
    - Clear `availableTopics` and `topic` when subject is deselected
    - Clear current topic selection if it no longer appears in the new topics response
    - Handle errors with toast and fallback to empty object
    - _Requirements: 2.1, 2.4, 3.3_

  - [x] 3.3 Replace free-text topic input with grouped dropdown Topic Selector in `AdaptiveQuizPage.jsx`
    - Remove the existing `<input type="text">` for topic in the "Focus Topic" section
    - Remove the hardcoded `selectedSubject.topics` quick-pick buttons below the input
    - Add a `<select>` with `<optgroup>` elements for each unit from `availableTopics`
    - Show loading indicator (spinner + "Loading topics...") while `topicsLoading` is true
    - Show "No topics available for this subject." message when topics response is empty and subject is selected
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

- [x] 4. Checkpoint - Verify core changes compile and render
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Verify and fix complete quiz flow
  - [x] 5.1 Verify quiz start → question display transition works correctly
    - Confirm `startQuiz()` sets attemptId, fetches first question, transitions to "quiz" screen
    - Ensure timer starts with correct duration from question's `estimated_time_seconds`
    - _Requirements: 5.1_

  - [x] 5.2 Verify answer submission → feedback → next question flow
    - Confirm `handleAnswerSubmit` shows feedback with correctness, correct answer, and explanation
    - Confirm `nextQuestion` fetches next adaptive question and resets UI state
    - Confirm mid-quiz checkpoint modal triggers after question 5 with accuracy and difficulty info
    - _Requirements: 5.2, 5.3, 5.6_

  - [x] 5.3 Verify quiz completion → results and history screens
    - Confirm `finishQuiz` transitions to results screen after 10 questions or when no more questions available
    - Confirm history screen displays past attempts with score, subject, topic, and timestamp
    - _Requirements: 5.4, 5.5_

- [x] 6. Final checkpoint - Ensure all changes work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The backend uses Python/FastAPI, frontend uses React/JavaScript (Vite)
- The `content_chunks` model already has `topic_hint` (String 200, nullable) and `chunk_index` (Integer) fields
- Unit derivation uses `chunk_index // 20 + 1` convention with "Unit 1" as fallback when chunk_index is null

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] }
  ]
}
```
