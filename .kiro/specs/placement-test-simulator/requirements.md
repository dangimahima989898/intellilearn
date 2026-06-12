# Requirements Document

## Introduction

The Placement Test Simulator is a module within IntelliLearn that mimics real-world aptitude and coding test environments used in campus placements. Students can browse role-based tests, take timed assessments containing MCQs and coding challenges, and receive a detailed performance report upon completion. Admins can create and manage tests and questions. The module integrates with the existing JWT-based authentication system and follows the established FastAPI + SQLAlchemy + React + Tailwind CSS stack.

## Glossary

- **Placement_Test**: A timed assessment containing one or more sections of questions, associated with a role category and difficulty level.
- **Test_Question**: A single question within a Placement_Test, which may be of type MCQ, coding challenge, or fill-in-the-blank.
- **Test_Attempt**: A single student's session for a given Placement_Test, tracking start time, submission time, score, and status.
- **Attempt_Answer**: A student's recorded response to a single Test_Question within a Test_Attempt.
- **Test_Listing_Page**: The `/tests` page displaying all available Placement_Tests with filter controls.
- **Test_Instructions_Page**: The `/tests/:id` page showing test metadata, rules, and the Start Test action.
- **Active_Test_Screen**: The `/tests/:id/start` page where a student actively answers questions under a countdown timer.
- **Result_Page**: The `/tests/:id/result/:attemptId` page showing score summary, section breakdown, and question-wise review.
- **My_Tests_Dashboard**: The `/dashboard/my-tests` page showing a student's attempt history and aggregate statistics.
- **Admin_Test_Creator**: The `/admin/tests/create` page for admins to create tests and add questions.
- **Timer**: The countdown component on the Active_Test_Screen that tracks remaining time based on `started_at + duration_minutes`.
- **Section**: A named grouping of Test_Questions within a Placement_Test (e.g., "Aptitude", "Coding", "Verbal").
- **Score**: The sum of marks awarded for all correctly answered Test_Questions in a Test_Attempt.
- **Section_Score**: The sum of marks awarded for correctly answered Test_Questions within a single Section.
- **Grade**: A letter grade (A, B, C, D, F) assigned based on the percentage score of a Test_Attempt.
- **Percentage**: The ratio of Score to total_marks expressed as a value in the range [0, 100].
- **Question_State**: The navigation status of a Test_Question during an attempt — one of: `not_visited`, `visited_unanswered`, `answered`, `marked_for_review`.
- **Seed_Data**: Pre-populated Placement_Test records inserted at application setup.
- **CSV_Import**: A bulk question upload mechanism accepting a structured CSV file.

---

## Requirements

### Requirement 1: Database Schema — Placement Tests

**User Story:** As a developer, I want a well-structured database schema for placement tests, so that all test data is stored consistently and can be queried efficiently.

#### Acceptance Criteria

1. THE System SHALL create a `placement_tests` table with columns: `id` (UUID primary key), `title` (string, not null), `category` (string, not null), `test_type` (enum: `aptitude`, `coding`, `mixed`), `duration_minutes` (integer, not null), `difficulty` (enum: `easy`, `medium`, `hard`), `description` (text, nullable), `total_marks` (integer, not null), `created_at` (timestamp with timezone, server default now).
2. THE System SHALL create a `test_questions` table with columns: `id` (UUID primary key), `test_id` (UUID foreign key → `placement_tests.id`), `question_text` (text, not null), `question_type` (enum: `mcq`, `coding`, `fill`), `options` (JSONB, nullable), `correct_answer` (text, not null), `starter_code` (text, nullable), `expected_output` (text, nullable), `marks` (integer, not null), `section` (string, not null), `order_index` (integer, not null).
3. THE System SHALL create a `test_attempts` table with columns: `id` (UUID primary key), `user_id` (UUID foreign key → `users.id`), `test_id` (UUID foreign key → `placement_tests.id`), `started_at` (timestamp with timezone, not null), `submitted_at` (timestamp with timezone, nullable), `score` (float, nullable), `total_marks` (integer, not null), `time_taken_seconds` (integer, nullable), `status` (enum: `in_progress`, `submitted`, `timed_out`), `section_scores` (JSONB, nullable).
4. THE System SHALL create an `attempt_answers` table with columns: `id` (UUID primary key), `attempt_id` (UUID foreign key → `test_attempts.id`), `question_id` (UUID foreign key → `test_questions.id`), `user_answer` (text, nullable), `is_correct` (boolean, nullable), `time_spent_seconds` (integer, nullable), `marked_for_review` (boolean, default false).
5. THE System SHALL enforce a unique constraint on `(attempt_id, question_id)` in the `attempt_answers` table to prevent duplicate answer records.
6. WHEN the `placement_tests` table is created, THE System SHALL create indexes on `category`, `test_type`, and `difficulty` columns to support efficient filtering.

---

### Requirement 2: Seed Data — Role-Based Tests

**User Story:** As a student, I want pre-populated placement tests to be available immediately, so that I can start practising without waiting for admin setup.

#### Acceptance Criteria

1. WHEN the seed script is executed, THE System SHALL insert the following six Placement_Tests into the `placement_tests` table:
   - `Software Engineer Assessment` (category: Engineering, test_type: mixed, duration: 90 min, difficulty: medium, total_marks: 100)
   - `Data Analyst Aptitude Test` (category: Analytics, test_type: aptitude, duration: 60 min, difficulty: easy, total_marks: 60)
   - `Backend Developer Challenge` (category: Engineering, test_type: coding, duration: 75 min, difficulty: hard, total_marks: 80)
   - `Logical Reasoning Sprint` (category: General, test_type: aptitude, duration: 45 min, difficulty: easy, total_marks: 50)
   - `Full Stack Engineer Test` (category: Engineering, test_type: mixed, duration: 120 min, difficulty: hard, total_marks: 120)
   - `Quantitative Ability Round` (category: General, test_type: aptitude, duration: 30 min, difficulty: medium, total_marks: 40)
2. WHEN the seed script is executed more than once, THE System SHALL skip insertion of records that already exist (idempotent seed).

---

### Requirement 3: Test Listing Page

**User Story:** As a student, I want to browse all available placement tests with filters, so that I can find tests relevant to my target role and skill level.

#### Acceptance Criteria

1. WHEN a student navigates to `/tests`, THE Test_Listing_Page SHALL display all available Placement_Tests as cards.
2. WHEN a student applies a filter by `test_type`, `difficulty`, or `category`, THE Test_Listing_Page SHALL display only Placement_Tests matching all selected filter values.
3. THE Test_Listing_Page SHALL display on each test card: title, category badge, difficulty chip, duration in minutes, total marks, question count, and a "Start Test" call-to-action button.
4. WHEN a student has at least one Test_Attempt with `status` of `submitted` or `timed_out` for a Placement_Test, THE Test_Listing_Page SHALL display an "Attempted" badge on that test's card.
5. WHEN no Placement_Tests match the active filters, THE Test_Listing_Page SHALL display a message indicating no tests were found.
6. WHEN the filter values change, THE Test_Listing_Page SHALL update the displayed test cards without a full page reload.

---

### Requirement 4: Test Instructions Page

**User Story:** As a student, I want to review test details and rules before starting, so that I understand what to expect during the assessment.

#### Acceptance Criteria

1. WHEN a student navigates to `/tests/:id`, THE Test_Instructions_Page SHALL display the Placement_Test's title, category, difficulty, duration, total marks, and description.
2. THE Test_Instructions_Page SHALL display a section-wise breakdown listing each Section name and the number of questions in that section, including sections that contain zero questions.
3. THE Test_Instructions_Page SHALL display a rules list covering: time limit, no tab-switching, full-screen requirement, auto-submit on timeout, and answer persistence.
4. WHEN a student clicks "Start Test", THE System SHALL create a new `test_attempts` row with `status: 'in_progress'`, `started_at` set to the current UTC timestamp, and `total_marks` copied from the Placement_Test. Students may create multiple attempts for the same Placement_Test.
5. WHEN a student clicks "Start Test", THE System SHALL redirect the student to the Active_Test_Screen at `/tests/:id/start`.
6. IF a student already has an active Test_Attempt (`status: 'in_progress'`) for the same Placement_Test, THEN THE System SHALL resume that existing attempt rather than creating a new one.

---

### Requirement 5: Active Test Screen — Timer

**User Story:** As a student, I want a visible countdown timer during the test, so that I can manage my time effectively.

#### Acceptance Criteria

1. WHEN the Active_Test_Screen loads, THE Timer SHALL calculate remaining time as `(started_at + duration_minutes * 60) - current_unix_timestamp` in seconds.
2. WHILE the Test_Attempt status is `in_progress`, THE Timer SHALL decrement the remaining time by one second on each tick.
3. WHEN the remaining time reaches zero, THE System SHALL automatically submit the Test_Attempt with `status: 'timed_out'` and redirect the student to the Result_Page.
4. THE Timer SHALL display remaining time in `MM:SS` format.
5. WHEN remaining time is less than or equal to 300 seconds (5 minutes), THE Timer SHALL change its display colour to red to alert the student.
6. THE Timer SHALL be calculated from the server-side `started_at` timestamp to prevent client-side manipulation.

---

### Requirement 6: Active Test Screen — Question Navigation

**User Story:** As a student, I want a question navigation panel, so that I can jump to any question and track my progress at a glance.

#### Acceptance Criteria

1. THE Active_Test_Screen SHALL display a numbered button grid where each button corresponds to one Test_Question.
2. THE Active_Test_Screen SHALL colour-code each navigation button according to the Question_State: grey for `not_visited`, yellow for `visited_unanswered`, green for `answered`, and purple for `marked_for_review`.
3. WHEN a student clicks a navigation button, THE Active_Test_Screen SHALL display the corresponding Test_Question.
4. THE Active_Test_Screen SHALL display section tabs that filter the navigation grid to show only questions belonging to the selected Section.
5. WHEN a student navigates away from a question without answering, THE System SHALL update that question's Question_State to `visited_unanswered`.

---

### Requirement 7: Active Test Screen — Question Area

**User Story:** As a student, I want a clear question area with appropriate input controls, so that I can answer MCQ and coding questions comfortably.

#### Acceptance Criteria

1. THE Active_Test_Screen SHALL render Test_Question text supporting Markdown formatting and fenced code blocks.
2. WHEN a Test_Question has `question_type: 'mcq'`, THE Active_Test_Screen SHALL display radio button options parsed from the `options` JSONB field.
3. WHEN a Test_Question has `question_type: 'coding'`, THE Active_Test_Screen SHALL display a code editor (Monaco or CodeMirror), a language selector, and a "Run Code" button. IF the code editor component fails to load, THEN THE Active_Test_Screen SHALL hide the editor, language selector, and Run Code button and display an error message in their place.
4. WHEN a Test_Question has `question_type: 'fill'`, THE Active_Test_Screen SHALL display a text input field for the student's answer.
5. THE Active_Test_Screen SHALL provide a "Mark for Review" toggle that sets the Question_State to `marked_for_review` and persists `marked_for_review: true` in the corresponding Attempt_Answer record.
6. THE Active_Test_Screen SHALL provide a "Clear Response" button that removes the student's current answer for the active question and sets the Question_State to `visited_unanswered`.
7. THE Active_Test_Screen SHALL provide "Previous" and "Next" navigation buttons to move between Test_Questions sequentially.

---

### Requirement 8: Answer Persistence & Auto-Save

**User Story:** As a student, I want my answers saved automatically, so that I do not lose progress due to accidental navigation or connectivity issues.

#### Acceptance Criteria

1. WHEN a student selects or changes an answer, THE System SHALL persist the Attempt_Answer to the database within 3 seconds using a debounced auto-save mechanism.
2. THE System SHALL upsert the Attempt_Answer record (insert if not exists, update if exists) based on the unique `(attempt_id, question_id)` constraint.
3. WHEN the student's browser loses network connectivity, THE System SHALL queue pending saves and retry them upon reconnection.
4. WHEN the student's browser regains connectivity, THE System SHALL flush all queued Attempt_Answer saves and SHALL block manual submission until all queued saves are completely processed.
5. FOR ALL sequences of answer saves for the same question, THE System SHALL store only the most recent answer value (idempotent upsert).

---

### Requirement 9: Tab-Switch & Anti-Cheat

**User Story:** As an admin, I want anti-cheat measures enforced during tests, so that assessment integrity is maintained.

#### Acceptance Criteria

1. WHEN the Active_Test_Screen is active and the student switches to another browser tab or window, THE System SHALL display a warning overlay upon return.
2. THE System SHALL record the number of tab-switch events in the Test_Attempt session.
3. WHEN the Active_Test_Screen is active, THE System SHALL request full-screen mode on test start.
4. WHEN the student exits full-screen mode during an active test, THE System SHALL display a warning prompt requesting the student to return to full-screen.
5. WHEN the Active_Test_Screen displays a coding editor, THE System SHALL disable paste operations within the editor area.
6. WHEN question order randomisation is enabled for a Placement_Test, THE System SHALL shuffle the Test_Questions for each new Test_Attempt while preserving the complete set of questions.

---

### Requirement 10: Test Submission & Score Calculation

**User Story:** As a student, I want my test to be scored immediately upon submission, so that I can see my results right away.

#### Acceptance Criteria

1. WHEN a student clicks "Submit Test", THE System SHALL collect all Attempt_Answer records for the active Test_Attempt.
2. THE System SHALL calculate Score as the sum of `marks` for each Test_Question where the corresponding Attempt_Answer `is_correct` is true.
3. THE System SHALL calculate Section_Score for each Section as the sum of `marks` for correctly answered Test_Questions within that Section.
4. THE System SHALL update the Test_Attempt record with: `status: 'submitted'`, `submitted_at` set to current UTC timestamp, `score`, `total_marks`, `time_taken_seconds` (= `submitted_at - started_at`), and `section_scores` JSONB.
5. WHEN submission is complete, THE System SHALL redirect the student to the Result_Page at `/tests/:id/result/:attemptId`.
6. FOR ALL valid Test_Attempts, the Score SHALL be greater than or equal to 0 and less than or equal to `total_marks`.
7. FOR ALL valid Test_Attempts, the sum of all Section_Scores SHALL equal the total Score.

---

### Requirement 11: Result & Analysis Page

**User Story:** As a student, I want a detailed performance report after submission, so that I can understand my strengths and areas for improvement.

#### Acceptance Criteria

1. WHEN a student navigates to `/tests/:id/result/:attemptId`, THE Result_Page SHALL display a score summary card showing: total score, Percentage, Grade, time taken, and pass/fail status.
2. THE Result_Page SHALL calculate Percentage as `(score / total_marks) * 100`, rounded to two decimal places.
3. THE Result_Page SHALL assign Grade according to: A (≥ 85%), B (≥ 70%), C (≥ 55%), D (≥ 40%), F (< 40%).
4. THE Result_Page SHALL display a bar chart showing Section_Score versus maximum section marks for each Section.
5. THE Result_Page SHALL display a question-wise review listing each Test_Question with the student's answer, the correct answer, and a correct/wrong/unattempted indicator.
6. THE Result_Page SHALL display performance insights identifying the strongest Section (highest Section_Score percentage) and the Section with the most time spent.
7. FOR ALL Percentage values, THE Result_Page SHALL display a value in the range [0.00, 100.00].

---

### Requirement 12: My Tests Dashboard

**User Story:** As a student, I want to view my test history and overall statistics, so that I can track my placement preparation progress.

#### Acceptance Criteria

1. WHEN a student navigates to `/dashboard/my-tests`, THE My_Tests_Dashboard SHALL display a list of all Test_Attempts for the authenticated student, ordered by `started_at` descending.
2. THE My_Tests_Dashboard SHALL display for each attempt: test name, score, Percentage, date, time taken, and a status badge (`in_progress`, `submitted`, or `timed_out`).
3. THE My_Tests_Dashboard SHALL display aggregate statistics: total tests taken (count of `submitted` + `timed_out` attempts), average score (mean Percentage across completed attempts), and best score (maximum Percentage across completed attempts).
4. FOR ALL students with at least one completed attempt, the average score SHALL be greater than or equal to the minimum individual Percentage and less than or equal to the maximum individual Percentage.
5. WHEN a student has no Test_Attempts, THE My_Tests_Dashboard SHALL display an empty state message with a link to the Test_Listing_Page.

---

### Requirement 13: Admin — Test Creation

**User Story:** As an admin, I want to create placement tests and add questions, so that I can manage the test catalogue for students.

#### Acceptance Criteria

1. WHEN an admin navigates to `/admin/tests/create`, THE Admin_Test_Creator SHALL display a form for test metadata: title, category, test_type, duration_minutes, difficulty, description, and total_marks.
2. WHEN an admin submits valid test metadata, THE System SHALL persist a new `placement_tests` record and return the new test's `id`.
3. THE Admin_Test_Creator SHALL allow an admin to add Test_Questions one at a time, specifying: question_text, question_type, options (for MCQ), correct_answer, starter_code (for coding), expected_output (for coding), marks, section, and order_index.
4. WHEN an admin uploads a CSV file via the bulk import control, THE System SHALL parse each row and insert the corresponding Test_Question records for the specified test.
5. IF a CSV row is missing required fields (`question_text`, `question_type`, `correct_answer`, `marks`, `section`), THEN THE System SHALL skip that row and include it in a validation error report returned to the admin.
6. THE Admin_Test_Creator SHALL be accessible only to users with `role: 'admin'`.

---

### Requirement 14: CSV Import Round-Trip

**User Story:** As an admin, I want the CSV import to be reliable and consistent, so that bulk question uploads produce the same result regardless of how many times they are run.

#### Acceptance Criteria

1. WHEN a valid CSV file is imported for a test, THE System SHALL parse each row into a Test_Question record with all required fields populated.
2. FOR ALL valid CSV rows, parsing the row and then serialising the resulting Test_Question back to CSV format SHALL produce a row equivalent to the original input (round-trip property).
3. WHEN the same CSV file is imported twice for the same test, THE System SHALL not create duplicate Test_Question records (idempotent import based on `(test_id, order_index)` uniqueness).

---

### Requirement 15: API Security & Access Control

**User Story:** As a system administrator, I want all placement test endpoints to enforce authentication and role-based access, so that test data and attempt records are protected.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to any placement test endpoint, THE System SHALL return HTTP 401 Unauthorized.
2. WHEN a student attempts to access an admin-only endpoint (e.g., test creation, question management), THE System SHALL return HTTP 403 Forbidden.
3. WHEN a student attempts to access another student's Test_Attempt or Attempt_Answer records, THE System SHALL return HTTP 403 Forbidden.
4. THE System SHALL validate all incoming request payloads against defined Pydantic schemas and return HTTP 422 Unprocessable Entity for invalid inputs.
5. WHILE a Test_Attempt has `status: 'in_progress'`, THE System SHALL reject any submission request for a different Test_Attempt belonging to the same student and same Placement_Test.
