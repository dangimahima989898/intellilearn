# Design Document: Adaptive Quiz Enhancement

## Overview

This feature enhances the Adaptive Quiz system by replacing the manual free-text "Focus Topic" input with a dynamic topic selector populated from real database content (`content_chunks.topic_hint`). A new backend endpoint provides unique topics grouped by unit for a given subject. Frontend bugs (undeclared state variables, quiz flow issues) are fixed, hardcoded topic lists are removed, and the complete quiz flow is verified end-to-end.

## Architecture

This enhancement adds a dynamic topic selection system to the existing adaptive quiz infrastructure. The architecture extends the current FastAPI backend with a new endpoint that queries `content_chunks.topic_hint` values, and modifies the React frontend to replace the free-text input with a structured topic selector dropdown grouped by unit.

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React/Vite)                                          │
│                                                                 │
│  AdaptiveQuizPage.jsx                                           │
│    ├── Subject Selector (existing)                              │
│    ├── TopicSelector (NEW component)                            │
│    │     ├── Fetches from GET /adaptive-quiz/topics?subject_id= │
│    │     ├── Renders grouped <optgroup> by unit                 │
│    │     └── Loading / empty states                             │
│    ├── Quiz Flow (existing, bug fixes applied)                  │
│    └── reviewQuestions state (bug fix: declare useState)         │
│                                                                 │
│  quizService.js                                                 │
│    └── getTopics(subjectId) → GET /adaptive-quiz/topics         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/JSON
┌───────────────────────────────▼─────────────────────────────────┐
│  Backend (FastAPI)                                               │
│                                                                  │
│  routers/adaptive_quiz.py                                        │
│    └── GET /adaptive-quiz/topics?subject_id=<uuid>               │
│          ├── Requires student auth (require_student dependency)   │
│          ├── Queries content_chunks WHERE subject_id & topic_hint │
│          │   IS NOT NULL AND topic_hint != ''                     │
│          ├── Groups by chunk's unit field (derived from           │
│          │   chunk_index or source context)                       │
│          └── Returns { "Unit 1": ["topic_a", ...], ... }         │
│                                                                  │
│  models/content_chunks.py (existing)                             │
│    └── topic_hint: String(200), nullable=True                    │
└──────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Backend: Topics Endpoint

**File:** `backend/routers/adaptive_quiz.py`

**Endpoint:** `GET /adaptive-quiz/topics`

```python
from sqlalchemy import distinct

@router.get("/topics")
def get_topics_for_subject(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_student)
):
    """
    Returns unique topic_hint values from content_chunks for a given subject,
    grouped by the unit field derived from the associated question bank or
    chunk metadata.
    """
    # Query content_chunks for this subject where topic_hint is valid
    chunks = db.query(
        ContentChunk.topic_hint,
        ContentChunk.chunk_index
    ).filter(
        ContentChunk.subject_id == subject_id,
        ContentChunk.topic_hint.isnot(None),
        ContentChunk.topic_hint != ""
    ).all()

    if not chunks:
        return {}

    # Group unique topics by unit
    # Unit is derived from chunk_index ranges or source_file patterns
    # Convention: chunks 0-based, every N chunks = 1 unit
    grouped: dict[str, list[str]] = {}
    seen_topics: set[str] = set()

    for topic_hint, chunk_index in chunks:
        topic = topic_hint.strip()
        if not topic or topic in seen_topics:
            continue
        seen_topics.add(topic)

        # Derive unit from chunk ordering or use "General" fallback
        unit_number = (chunk_index // 20) + 1 if chunk_index is not None else 1
        unit_label = f"Unit {unit_number}"

        if unit_label not in grouped:
            grouped[unit_label] = []
        grouped[unit_label].append(topic)

    # Sort topics within each unit alphabetically
    for unit in grouped:
        grouped[unit].sort()

    return grouped
```

**Alternative unit derivation strategy:** If content_chunks records are linked to questions (via topic matching), use the `questions.unit` field to determine the unit grouping. Query distinct `(topic_hint, unit)` pairs by joining content_chunks with questions on `topic_hint = questions.topic AND content_chunks.subject_id = questions.subject_id`.

### 2. Backend: Pydantic Schema

**File:** `backend/schemas/adaptive_quiz.py` (append)

```python
from typing import Dict, List

class TopicsResponse(BaseModel):
    """Response: { "Unit 1": ["Topic A", "Topic B"], "Unit 2": [...] }"""
    # Using a plain dict return, no wrapper class needed
    pass
```

Since the endpoint returns a plain `dict[str, list[str]]`, no explicit response model is required — FastAPI serializes it directly.

### 3. Frontend: Quiz Service Extension

**File:** `frontend/src/services/quizService.js`

```javascript
// Add to quizService object:
getTopics: async (subjectId) => {
  const response = await api.get('/adaptive-quiz/topics', {
    params: { subject_id: subjectId }
  });
  return response.data; // { "Unit 1": ["Topic A", ...], ... }
},
```

### 4. Frontend: Topic Selector Component

**File:** `frontend/src/pages/student/AdaptiveQuizPage.jsx` (inline or extracted)

The Topic Selector replaces the existing free-text `<input>` in the setup screen:

```jsx
// New state variables in AdaptiveQuizPage
const [availableTopics, setAvailableTopics] = useState({});  // { "Unit X": [...] }
const [topicsLoading, setTopicsLoading] = useState(false);
const [reviewQuestions, setReviewQuestions] = useState([]);   // BUG FIX: declare this

// Effect: fetch topics when subject changes
useEffect(() => {
  if (!selectedSubject) {
    setAvailableTopics({});
    setTopic("");
    return;
  }
  const fetchTopics = async () => {
    setTopicsLoading(true);
    try {
      const data = await quizService.getTopics(selectedSubject.id);
      setAvailableTopics(data || {});
      // Clear topic if previously selected topic no longer available
      if (topic && !Object.values(data || {}).flat().includes(topic)) {
        setTopic("");
      }
    } catch (err) {
      toast.error("Failed to load topics");
      setAvailableTopics({});
    } finally {
      setTopicsLoading(false);
    }
  };
  fetchTopics();
}, [selectedSubject]);

// Render: Topic Selector (replaces free-text input)
const renderTopicSelector = () => {
  const hasTopics = Object.keys(availableTopics).length > 0;

  if (topicsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading topics...
      </div>
    );
  }

  if (!hasTopics && selectedSubject) {
    return (
      <p className="text-sm text-amber-400">No topics available for this subject.</p>
    );
  }

  return (
    <select
      value={topic}
      onChange={(e) => setTopic(e.target.value)}
      className="w-full border rounded-xl px-4 py-3 text-sm bg-white/5 border-white/15 text-white"
    >
      <option value="">Select a topic...</option>
      {Object.entries(availableTopics)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([unit, topics]) => (
          <optgroup key={unit} label={unit}>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
        ))}
    </select>
  );
};
```

### 5. Bug Fix: reviewQuestions State Declaration

**File:** `frontend/src/pages/student/AdaptiveQuizPage.jsx`

The existing code references `setReviewQuestions` without declaring the state variable. Fix:

```jsx
// Add alongside other state declarations (after line defining feedback state):
const [reviewQuestions, setReviewQuestions] = useState([]);
```

This ensures the `setReviewQuestions` call in `handleAnswerSubmit` works without throwing a ReferenceError.

### 6. Mid-Quiz Checkpoint Logic

The existing `nextQuestion` function already implements checkpoint logic at question 5. No architectural changes needed — just ensure the `showCheckpoint` modal renders correctly with the `checkpointStats` data (accuracy percentage and current adaptive difficulty level).

## Data Models

### Existing Models (No Changes)

| Model | Table | Relevant Fields |
|-------|-------|-----------------|
| ContentChunk | content_chunks | id, subject_id, chunk_text, topic_hint, source_file, chunk_index |
| Subject | subjects | id, name, code, topics_list (JSON), course_id, semester_id |
| Question | questions | id, subject_id, topic, unit, difficulty, question_text, options |
| QuizAttempt | quiz_attempts | id, student_id, subject_id, topic, current_difficulty, score |
| QuizAnswer | quiz_answers | id, attempt_id, question_id, selected_answer, is_correct |

### Data Flow for Topics

```
content_chunks.topic_hint  →  Topics Endpoint  →  Frontend Topic Selector
       (DB)                     (grouping)           (grouped dropdown)
```

The `topic_hint` field in `content_chunks` is populated during the RAG notes pipeline when content is chunked and processed. Each chunk may optionally have a topic assigned by the admin or extracted via LLM during ingestion.

## Interfaces

### API Contract

#### GET /adaptive-quiz/topics

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject_id | UUID (query) | Yes | The subject to fetch topics for |

**Success Response (200):**
```json
{
  "Unit 1": ["Arrays", "Linked Lists", "Stacks"],
  "Unit 2": ["Trees", "Graphs", "Hashing"],
  "Unit 3": ["Sorting Algorithms", "Searching"]
}
```

**Empty Response (200):**
```json
{}
```

**Validation Error (422):**
```json
{
  "detail": [
    {
      "loc": ["query", "subject_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "detail": "Not authenticated"
}
```

### Frontend State Machine

```
Setup Screen
  ├── Subject selected → fetch topics → Loading state
  │     ├── Topics loaded → Show grouped selector
  │     └── Empty/Error → Show "No topics available"
  ├── Topic selected → Enable "Start Quiz" button
  └── Start Quiz clicked → Quiz Screen (existing flow)

Quiz Screen (existing, with bug fixes)
  ├── Question displayed with timer
  ├── Answer submitted → Feedback shown
  │     └── reviewQuestions array updated (bug fix)
  ├── Next Question (question 5) → Checkpoint Modal
  ├── Next Question (other) → Next adaptive question
  └── Question 10 or no more → Results Screen

Results Screen (existing)
  └── Shows performance report, weak topics, readiness score

History Screen (existing)
  └── Lists past attempts with scores, subjects, topics, timestamps
```

## Error Handling

| Scenario | Backend Behavior | Frontend Behavior |
|----------|-----------------|-------------------|
| Missing subject_id param | Return 422 with validation detail | N/A (always sends subject_id) |
| Invalid/non-existent subject_id | Return empty {} (200) | Show "No topics available" |
| No content_chunks for subject | Return empty {} (200) | Show "No topics available" |
| All topic_hints are null/empty | Return empty {} (200) | Show "No topics available" |
| Database connection error | Return 500 | Toast error, fallback to empty topics |
| Auth token missing/invalid | Return 401 | Redirect to login (existing auth handler) |
| Network failure during topic fetch | N/A | Toast error, show empty selector |
| Subject changed during fetch | N/A | Cancel stale request via useEffect cleanup |

## Testing Strategy

**Unit Tests (Example-Based):**
- Topics endpoint returns empty object for subject with no content_chunks (Req 1.2)
- Topics endpoint returns 422 without subject_id parameter (Req 1.3)
- Topics endpoint returns 401 without authentication (Req 1.5)
- Topic selector displays loading state during fetch (Req 2.4)
- Topic selector displays "No topics available" for empty response (Req 2.5)
- Topic selector clears selection when subject changes to one with no topics (Req 3.3)
- Start quiz transitions from setup to quiz screen (Req 5.1)
- Answer submission shows immediate feedback (Req 5.2)
- Next question fetches new adaptive question (Req 5.3)
- Mid-quiz checkpoint modal appears after question 5 (Req 5.6)

**Edge Case Tests:**
- Quiz transitions to results after 10 questions or when no more questions available (Req 5.4)

**Smoke Tests:**
- AdaptiveQuizPage compiles and renders without runtime errors (Req 4.1)
- No hardcoded topic arrays exist in the codebase (Req 3.1, 3.2)

**Property-Based Tests:**
- Topics endpoint returns valid, unique, grouped topics (Req 1.1, 1.4)
- Topic selector renders all groups from API response (Req 2.2)
- reviewQuestions array accumulates correctly (Req 4.2)
- History entries contain all required fields (Req 5.5)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Topics endpoint returns only valid, unique, grouped topics

*For any* subject with content_chunks records, the topics endpoint response SHALL contain only non-null, non-empty, unique topic_hint values, and every returned topic SHALL exist in the content_chunks table for that subject_id. No topic SHALL appear more than once across all unit groups in the response.

**Validates: Requirements 1.1, 1.4**

### Property 2: Topic selector renders all unit groups from API response

*For any* valid topics API response containing N unit groups with M total topics, the rendered Topic Selector component SHALL display exactly N unit group labels and exactly M selectable topic options.

**Validates: Requirements 2.2**

### Property 3: Review questions array accumulates without loss

*For any* sequence of K answer submissions during a quiz session, the reviewQuestions state array SHALL contain exactly K entries, each preserving the question text, options, selected answer, correct answer, and correctness boolean from the corresponding submission.

**Validates: Requirements 4.2**

### Property 4: History entries contain all required display fields

*For any* completed quiz attempt in the history list, the rendered entry SHALL include the score, subject name, topic, and timestamp values that correspond to the original QuizAttempt record.

**Validates: Requirements 5.5**
