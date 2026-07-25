# Requirements Document

## Introduction

This feature enhances the Adaptive Quiz system by replacing the manual free-text "Focus Topic" input with a dynamic topic selector populated from real database content (content_chunks.topic_hint). A new backend endpoint provides unique topics grouped by unit for a given subject. Frontend bugs (undeclared state variables, quiz flow issues) are fixed, hardcoded topic lists are removed, and the complete quiz flow (start → questions → answers → submit → results → history) is verified end-to-end.

## Glossary

- **Topic_Selector**: The frontend UI component that displays available topics grouped by unit, replacing the previous free-text topic input field
- **Topics_Endpoint**: The backend API endpoint `GET /adaptive-quiz/topics` that returns unique topics from the content_chunks table grouped by unit
- **Content_Chunk**: A database record in the content_chunks table containing chunked note content with an optional topic_hint field
- **Adaptive_Quiz_Page**: The React component `AdaptiveQuizPage.jsx` that manages the full adaptive quiz user experience
- **Quiz_Service**: The frontend service layer (`quizService.js`) that communicates with the adaptive quiz backend API
- **Quiz_Flow**: The complete user journey through the adaptive quiz: setup → question display → answer submission → feedback → results → history

## Requirements

### Requirement 1: Dynamic Topics API Endpoint

**User Story:** As a student, I want topic choices to come from real uploaded content, so that I only see topics for which study material actually exists.

#### Acceptance Criteria

1. WHEN a GET request is received at `/adaptive-quiz/topics` with a query parameter `subject_id`, THE Topics_Endpoint SHALL return a JSON response containing unique topic_hint values from the content_chunks table for the specified subject, grouped by the unit field of the associated content chunks.
2. WHEN a GET request is received at `/adaptive-quiz/topics` with a valid `subject_id` that has no content_chunks records, THE Topics_Endpoint SHALL return an empty object with HTTP status 200.
3. IF a GET request is received at `/adaptive-quiz/topics` without a `subject_id` parameter, THEN THE Topics_Endpoint SHALL return an HTTP 422 validation error response.
4. THE Topics_Endpoint SHALL exclude content_chunks records where topic_hint is null or empty from the response.
5. THE Topics_Endpoint SHALL require the requesting user to have a valid student authentication token.

### Requirement 2: Dynamic Topic Selector UI

**User Story:** As a student, I want to select my quiz topic from a structured dropdown organized by unit, so that I can easily find and choose relevant topics.

#### Acceptance Criteria

1. WHEN a subject is selected on the Adaptive_Quiz_Page, THE Topic_Selector SHALL fetch available topics from the Topics_Endpoint using the selected subject ID.
2. WHEN topics are successfully loaded, THE Topic_Selector SHALL display topics grouped by unit labels (e.g., "Unit 1", "Unit 2").
3. WHEN a student selects a topic from the Topic_Selector, THE Adaptive_Quiz_Page SHALL set the selected topic value for quiz start.
4. WHILE topics are being fetched from the Topics_Endpoint, THE Topic_Selector SHALL display a loading indicator to the student.
5. WHEN the Topics_Endpoint returns an empty result for the selected subject, THE Topic_Selector SHALL display a "No topics available" message.

### Requirement 3: Remove Hardcoded Topic Lists

**User Story:** As a developer, I want all topic data to originate from the database, so that the system stays consistent with actual uploaded content.

#### Acceptance Criteria

1. THE Adaptive_Quiz_Page SHALL retrieve topic options exclusively from the Topics_Endpoint response.
2. THE Adaptive_Quiz_Page SHALL NOT render any hardcoded or statically defined topic lists.
3. WHEN a previously selected subject no longer has topics available in the database, THE Topic_Selector SHALL clear the current topic selection and display "No topics available."

### Requirement 4: Fix Undeclared State Variable Bug

**User Story:** As a developer, I want the AdaptiveQuizPage component to compile without errors, so that students experience no runtime crashes.

#### Acceptance Criteria

1. THE Adaptive_Quiz_Page SHALL declare the `reviewQuestions` state variable using the React useState hook before referencing the `setReviewQuestions` setter function.
2. WHEN a quiz answer is submitted successfully, THE Adaptive_Quiz_Page SHALL append the answered question details to the `reviewQuestions` state array without causing a runtime error.

### Requirement 5: Complete Quiz Flow Integrity

**User Story:** As a student, I want the full adaptive quiz flow to work seamlessly from start to finish, so that I can complete quizzes and view my results without interruptions.

#### Acceptance Criteria

1. WHEN a student clicks "Start Adaptive Quiz" with a valid subject and topic selected, THE Adaptive_Quiz_Page SHALL transition from the setup screen to the quiz screen displaying the first question.
2. WHEN a student submits an answer or the timer expires, THE Adaptive_Quiz_Page SHALL display immediate feedback including correctness, the correct answer, and an explanation.
3. WHEN a student clicks "Next Question" after feedback is displayed, THE Adaptive_Quiz_Page SHALL fetch and display the next adaptive question from the backend.
4. WHEN all 10 questions are answered or no further questions are available, THE Adaptive_Quiz_Page SHALL transition to the results screen showing the performance report.
5. WHEN a student navigates to the history screen, THE Adaptive_Quiz_Page SHALL display a list of past completed quiz attempts with scores, subjects, topics, and timestamps.
6. WHEN a student clicks "Next Question" after answering question 5, THE Adaptive_Quiz_Page SHALL display a mid-quiz checkpoint modal showing accuracy and adaptive difficulty level before continuing.
