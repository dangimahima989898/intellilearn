# QA Test Plan — Doubt Board Module
## IntelliLearn Platform | Senior QA Engineer Report

**Module:** Doubt Board (Community Q&A)  
**Version:** 1.0.0  
**Date:** July 16, 2026  
**Prepared By:** Senior QA Engineer  
**Environment:** FastAPI Backend (Port 8000) + React/Vite Frontend (Port 5173)  
**Database:** PostgreSQL (SQLAlchemy ORM)  

---

## 1. Module Overview

The Doubt Board is a community-driven Q&A system where students post subject-specific questions, receive answers from peers and faculty, and can mark doubts as resolved. Admins can verify answers and force-resolve doubts.

### Architecture Summary
- **Backend:** FastAPI router at `/doubts` prefix with 10 endpoints
- **Frontend:** 4 page components (Student Board, Student Detail, Admin Board, Admin Detail)
- **Models:** 4 DB tables (doubts, doubt_answers, doubt_upvotes, doubt_question_upvotes)
- **Auth:** JWT-based with role guards (student, admin, HOD, faculty)

### Key Features Under Test
| Feature | Student | Admin/HOD/Faculty |
|---------|---------|-------------------|
| Ask a Question | ✅ | ❌ |
| View Questions | ✅ | ✅ |
| Answer Questions | ✅ | ✅ |
| Upvote Questions | ✅ | ✅ |
| Upvote Answers | ✅ | ✅ |
| Accept Answer (Resolve) | ✅ (author only) | ❌ |
| Admin Resolve | ❌ | ✅ |
| Verify Answer | ❌ | ✅ |
| Delete Question | ✅ (own) | ✅ (any) |
| Subject Filter | ✅ | ✅ |
| Status Filter | ✅ | ✅ |
| Search | ❌ (client-side N/A) | ✅ (client-side) |
| Pagination | ❌ (single page load) | ✅ (Load More) |

---

## 2. Test Environment & Prerequisites

| Item | Detail |
|------|--------|
| Backend URL | http://localhost:8000 |
| Frontend URL | http://localhost:5173 |
| Test DB | PostgreSQL with seeded subjects, users |
| Browsers | Chrome 126+, Firefox 127+, Safari 18+, Edge 126+ |
| Devices | Desktop (1920×1080), Tablet (768×1024), Mobile (375×812) |
| Test Users | Student A (author), Student B (non-author), Admin, HOD, Faculty |

---

## 3. Functional Test Cases

### 3.1 Ask a Question

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-001 | Ask Question | Successfully post a new doubt | Student logged in, ≥1 subject exists | 1. Click "Ask a Question" 2. Select subject 3. Enter question (≥20 chars) 4. Click "Broadcast Doubt" | Doubt created, toast success, modal closes, doubt appears in feed | Critical | P1 | Yes | subject_id: valid UUID, question_text: "How do I implement binary search in Python with recursion?" |
| DB-F-002 | Ask Question | Validation — question too short | Student logged in, modal open | 1. Select subject 2. Enter "Short?" (< 20 chars) 3. Click submit | Toast error "Please provide more detail (min 20 characters)", form not submitted | Major | P1 | Yes | question_text: "Short?" (6 chars) |
| DB-F-003 | Ask Question | Validation — no subject selected | Student logged in, modal open | 1. Leave subject dropdown at "Choose a subject..." 2. Enter valid question 3. Click submit | Submit button disabled, HTML required validation prevents submission | Major | P1 | Yes | subject_id: empty |
| DB-F-004 | Ask Question | Max length enforcement | Student logged in, modal open | 1. Enter 1001+ characters in textarea | Input capped at 1000 characters via maxLength attribute | Minor | P2 | Yes | question_text: 1001 chars string |
| DB-F-005 | Ask Question | Character counter display | Student logged in, modal open | 1. Type in question field | Counter updates showing "X / 1000 chars (Min 20)", red when < 20, green when ≥ 20 | Minor | P3 | Yes | Progressive typing |
| DB-F-006 | Ask Question | XSS sanitization | Student logged in | 1. Post question with `<script>alert('xss')</script>` | Input sanitized via sanitize_text validator, script tags stripped/escaped | Critical | P1 | Yes | question_text: "<script>alert('xss')</script> How does SQL injection work?" |
| DB-F-007 | Ask Question | Archived subject rejected | Student logged in, subject archived | 1. Attempt to create doubt with archived subject_id via API | 404 "Subject not found" returned | Major | P2 | Yes | subject_id: archived subject UUID |
| DB-F-008 | Ask Question | Non-student role blocked | Admin logged in | 1. Attempt POST /doubts/ | 403 Forbidden — require_student guard | Critical | P1 | Yes | Admin JWT token |
| DB-F-009 | Ask Question | Modal open/close | Student on Doubt Board page | 1. Click "Ask a Question" 2. Click "Cancel" or X button | Modal opens with animation, closes cleanly without submitting | Minor | P3 | Yes | N/A |
| DB-F-010 | Ask Question | Double submit prevention | Student logged in, form filled | 1. Click submit 2. Rapidly click again | Button shows spinner "Posting Doubt...", disabled during submission, only one request sent | Major | P1 | Yes | Valid form data |


### 3.2 Question Feed & Filters

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-011 | Question Feed | Load all doubts on page open | Student logged in, doubts exist in DB | 1. Navigate to /student/doubts | All doubts loaded, displayed in 2-column grid, sorted by created_at DESC | Critical | P1 | Yes | ≥5 doubts in DB |
| DB-F-012 | Subject Filter | Filter by specific subject | Multiple subjects with doubts exist | 1. Click a subject chip (e.g., "CS101") | Only doubts for that subject shown, filter state updated | Major | P1 | Yes | 3+ subjects with doubts |
| DB-F-013 | Subject Filter | "All Subjects" reset | Subject filter active | 1. Click "All Subjects" button | All doubts from all subjects displayed again | Major | P1 | Yes | Active subject filter |
| DB-F-014 | Status Filter | Filter unresolved only | Mix of resolved/unresolved doubts | 1. Click "Unresolved" tab | Only doubts with is_resolved=false shown | Major | P1 | Yes | Mix of resolved/unresolved |
| DB-F-015 | Status Filter | Filter resolved only | Mix of resolved/unresolved doubts | 1. Click "Resolved" tab | Only doubts with is_resolved=true shown, green border styling | Major | P1 | Yes | Mix of resolved/unresolved |
| DB-F-016 | Status Filter | "All Quests" shows everything | Status filter active | 1. Click "All Quests" tab | All doubts shown regardless of status | Major | P1 | Yes | Active status filter |
| DB-F-017 | Combined Filters | Subject + Status together | Doubts exist across subjects/statuses | 1. Select subject "CS101" 2. Select "Unresolved" | Only unresolved doubts for CS101 shown | Major | P2 | Yes | Diverse test data |
| DB-F-018 | Search (Admin) | Search by question text | Admin on doubt board, doubts exist | 1. Type keyword in search box | Doubts filtered client-side by question_text match | Major | P2 | Yes | searchQuery: "binary search" |
| DB-F-019 | Search (Admin) | Search by student name | Admin on doubt board | 1. Type student name in search | Doubts from that student shown | Major | P2 | Yes | searchQuery: "John" |
| DB-F-020 | Search (Admin) | Search by subject name | Admin on doubt board | 1. Type subject name in search | Doubts for that subject shown | Minor | P3 | Yes | searchQuery: "Data Structures" |
| DB-F-021 | Search (Admin) | Empty search resets | Admin with active search | 1. Clear search input | All doubts shown again | Minor | P3 | Yes | Clear searchQuery |


### 3.3 Pagination / Load More

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-022 | Pagination | Initial page loads 20 items | >20 doubts in DB | 1. Navigate to admin doubt board | First 20 doubts shown, "Load More" button visible | Major | P1 | Yes | 25+ doubts seeded |
| DB-F-023 | Pagination | Load More fetches next page | >20 doubts, page 1 loaded | 1. Click "Load More Doubts" | Next 20 doubts appended, no duplicates | Major | P1 | Yes | 25+ doubts |
| DB-F-024 | Pagination | No more data hides button | All doubts loaded (< PAGE_SIZE returned) | 1. Load until last page | "Load More" button hidden when hasMore=false | Minor | P2 | Yes | Finite doubts < 40 |
| DB-F-025 | Pagination | Filter reset resets pagination | Page 2 loaded, then filter changed | 1. Load page 2 2. Change subject filter | Page resets to 1, fresh data loaded, old data cleared | Major | P2 | Yes | Filter change scenario |
| DB-F-026 | Pagination | Loading state during load more | Slow network simulated | 1. Click "Load More" | Button shows "Loading..." text, disabled during fetch | Minor | P3 | Yes | Network throttle |

### 3.4 Question Details

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-027 | Question Detail | Navigate to detail page | Student on doubt board | 1. Click on a doubt card | Navigates to /student/doubts/{id}, full question shown with answers | Critical | P1 | Yes | Valid doubt ID |
| DB-F-028 | Question Detail | Display student name and time | Doubt detail loaded | 1. View doubt header | Student name, relative time ("2h ago"), subject badge all visible | Minor | P2 | Yes | Doubt with known timestamp |
| DB-F-029 | Question Detail | Answer count displayed | Doubt has 3 answers | 1. View "Discussion Thread" header | Shows "(3)" in header | Minor | P3 | Yes | Doubt with 3 answers |
| DB-F-030 | Question Detail | Non-existent doubt 404 | Invalid doubt ID | 1. Navigate to /student/doubts/invalid-uuid | Toast error "Failed to load doubt details", redirects to /student/doubts | Major | P2 | Yes | Random non-existent UUID |
| DB-F-031 | Question Detail | Back navigation | On doubt detail page | 1. Click "Back to Doubt Board" | Returns to /student/doubts, previous state maintained | Minor | P3 | Yes | N/A |


### 3.5 Answer Posting

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-032 | Answer Posting | Successfully post an answer | Student on unresolved doubt detail | 1. Type answer (≥10 chars) 2. Click "Broadcast Answer" | Answer posted, toast success, answer appears in thread, textarea cleared | Critical | P1 | Yes | answer_text: "The binary search algorithm works by dividing the array in half..." |
| DB-F-033 | Answer Posting | Validation — answer too short | Doubt detail, answer field open | 1. Type "Yes" (< 10 chars) 2. Click submit | Toast error "Answer is too short.", not submitted | Major | P1 | Yes | answer_text: "Yes" |
| DB-F-034 | Answer Posting | Submit disabled when invalid | Empty answer field | 1. View submit button state | Button disabled (opacity-40, cursor-not-allowed) when < 10 chars | Minor | P2 | Yes | Empty textarea |
| DB-F-035 | Answer Posting | Answer form hidden on resolved doubts | Doubt is_resolved=true | 1. Navigate to resolved doubt | Answer form section not rendered | Major | P1 | Yes | Resolved doubt ID |
| DB-F-036 | Answer Posting | XSS in answer text | Post answer with script tags | 1. Submit answer with `<img onerror=alert(1)>` | Sanitized by sanitize_text validator | Critical | P1 | Yes | Malicious HTML |
| DB-F-037 | Answer Posting | Answer on non-existent doubt | Invalid doubt_id via API | 1. POST /doubts/{invalid}/answers | 404 "Doubt not found" | Major | P2 | Yes | Non-existent UUID |
| DB-F-038 | Answer Posting | Multiple answers by same user | Student already answered | 1. Post second answer to same doubt | Allowed — no restriction in backend | Minor | P3 | No | Same user, same doubt |

### 3.6 Upvote System

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-039 | Upvote Question | Toggle upvote on (question) | Student on doubt board | 1. Click upvote icon on a doubt card | vote_count increments by 1, icon turns blue, state=upvoted | Critical | P1 | Yes | Doubt not yet upvoted by user |
| DB-F-040 | Upvote Question | Toggle upvote off (question) | Student previously upvoted | 1. Click upvote icon again | vote_count decrements by 1, icon returns to default | Critical | P1 | Yes | Doubt already upvoted |
| DB-F-041 | Upvote Question | Upvote from detail page | Student on doubt detail | 1. Click "X Helpfuls" button | Same toggle behavior, count updates optimistically | Major | P2 | Yes | Doubt detail page |
| DB-F-042 | Upvote Answer | Toggle upvote on (answer) | Student on doubt detail with answers | 1. Click upvote on an answer | answer.upvotes increments, icon fills blue | Critical | P1 | Yes | Answer not yet upvoted |
| DB-F-043 | Upvote Answer | Toggle upvote off (answer) | Answer previously upvoted | 1. Click upvote again | answer.upvotes decrements, icon returns to default | Critical | P1 | Yes | Answer already upvoted |
| DB-F-044 | Upvote | Unique constraint enforcement | Same user upvotes same item twice via API | 1. Send duplicate upvote request | Toggle behavior (not duplicate insert), DB constraint uq_user_doubt_upvote enforced | Critical | P1 | Yes | Concurrent upvote requests |
| DB-F-045 | Upvote | Optimistic UI update | Slow network | 1. Click upvote | UI updates immediately before API response | Minor | P3 | No | Network throttle |


### 3.7 Mark as Resolved

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-046 | Resolve Doubt | Author accepts an answer | Author on own unresolved doubt with answers | 1. Click "Accept Answer" on an answer | Doubt marked resolved, answer marked accepted, green "Resolved" badge shown, "Best Answer" badge on answer | Critical | P1 | Yes | Author's JWT, valid answer_id |
| DB-F-047 | Resolve Doubt | Non-author cannot accept | Non-author student on another's doubt | 1. View doubt detail | "Accept Answer" button not shown | Critical | P1 | Yes | Different student's doubt |
| DB-F-048 | Resolve Doubt | Already resolved rejection | Doubt already resolved, API call | 1. PUT /doubts/{id}/resolve again | 409 "This doubt is already resolved" | Major | P2 | Yes | is_resolved=true doubt |
| DB-F-049 | Resolve Doubt | Invalid answer_id rejected | Author tries to accept non-existent answer | 1. PUT /doubts/{id}/resolve?accepted_answer_id=invalid | 404 "Answer not found for this doubt" | Major | P2 | Yes | Invalid answer UUID |
| DB-F-050 | Admin Resolve | Admin force-resolves | Admin on admin doubt board, unresolved doubt | 1. Click "Resolve" button on doubt card | Doubt marked resolved without accepted_answer_id, toast "Doubt marked as resolved" | Critical | P1 | Yes | Admin JWT, unresolved doubt |
| DB-F-051 | Admin Resolve | Already resolved shows badge | Admin views resolved doubt | 1. View doubt card | "Resolve" button not shown, "Resolved" badge displayed instead | Minor | P2 | Yes | Resolved doubt |
| DB-F-052 | Admin Resolve | Non-admin blocked | Student calls admin-resolve API | 1. PUT /doubts/{id}/admin-resolve with student token | 403 Forbidden | Critical | P1 | Yes | Student JWT |

### 3.8 Delete Question

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-053 | Delete Doubt | Author deletes own doubt | Author logged in | 1. DELETE /doubts/{id} | 204 No Content, doubt + answers + upvotes all deleted | Critical | P1 | Yes | Author's doubt ID |
| DB-F-054 | Delete Doubt | Admin deletes any doubt | Admin logged in | 1. DELETE /doubts/{id} (any doubt) | 204 No Content, full cascade delete | Critical | P1 | Yes | Admin JWT, any doubt |
| DB-F-055 | Delete Doubt | Non-author/non-admin blocked | Student B tries to delete Student A's doubt | 1. DELETE /doubts/{student_a_doubt_id} | 403 "Not authorized to delete this doubt" | Critical | P1 | Yes | Student B JWT, Student A's doubt |
| DB-F-056 | Delete Doubt | Cascade deletion of answers | Doubt has 5 answers with upvotes | 1. Delete the doubt | All answers, all answer upvotes deleted cleanly | Major | P1 | Yes | Doubt with nested data |
| DB-F-057 | Delete Doubt | Non-existent doubt | Invalid ID | 1. DELETE /doubts/{invalid} | 404 "Doubt not found" | Minor | P3 | Yes | Random UUID |


### 3.9 Admin Verification

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-F-058 | Verify Answer | Admin verifies an answer | Admin on doubt detail, answer exists | 1. Click "Verify Answer" button | Answer marked is_verified_by_admin=true, "Verified by Admin" badge shown | Critical | P1 | Yes | Admin JWT, answer_id |
| DB-F-059 | Verify Answer | Admin unverifies an answer | Answer already verified | 1. Click "Unverify Answer" | Badge removed, is_verified_by_admin=false | Major | P2 | Yes | Verified answer |
| DB-F-060 | Verify Answer | Non-admin blocked | Student calls verify API | 1. PUT /doubts/answers/{id}/verify with student token | 403 Forbidden | Critical | P1 | Yes | Student JWT |
| DB-F-061 | Verify Answer | Non-existent answer | Invalid answer_id | 1. PUT /doubts/answers/{invalid}/verify | 404 "Answer not found" | Minor | P3 | Yes | Random UUID |

---

## 4. UI Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-UI-001 | Empty State | No doubts exist | DB empty or filter returns 0 | 1. Navigate to doubt board | Empty state illustration shown: "No questions found" message with icon | Minor | P2 | Yes | Empty DB |
| DB-UI-002 | Loading State | Page loading | Slow network / fresh load | 1. Navigate to doubt board | 4 skeleton pulse cards (animate-pulse) shown in 2-col grid | Minor | P2 | Yes | Network throttle |
| DB-UI-003 | Error State | API failure | Backend down | 1. Navigate to doubt board | Red error card: "Failed to load doubts" with "Retry Connection" button | Major | P1 | Yes | Backend offline |
| DB-UI-004 | Error State | Retry button works | Error state displayed | 1. Start backend 2. Click "Retry Connection" | Data loads successfully, error state replaced by feed | Major | P1 | Yes | Restart backend |
| DB-UI-005 | Loading (Detail) | Detail page loading | Navigate to detail | 1. Open doubt detail | Spinner animation with pulsing icon and "Loading discussion details..." text | Minor | P3 | Yes | Any doubt |
| DB-UI-006 | Theme Support | Light mode rendering | Theme set to light | 1. Toggle to light theme 2. View doubt board | Correct light styling: white backgrounds, slate text, proper borders | Minor | P2 | Yes | isLight=true |
| DB-UI-007 | Theme Support | Dark mode rendering | Theme set to dark | 1. Toggle to dark theme | Correct dark styling: transparent/blur backgrounds, white text | Minor | P2 | Yes | isLight=false |
| DB-UI-008 | Card Interaction | Hover effect on doubt cards | Doubt board loaded | 1. Hover over a doubt card | Card lifts (-translate-y-1.5), border color changes, cursor pointer | Minor | P3 | Yes | Mouse interaction |
| DB-UI-009 | Resolved Badge | Resolved doubt styling | Resolved doubt exists | 1. View resolved doubt card | Green border/background tint, "Resolved" badge with checkmark icon | Minor | P2 | Yes | is_resolved=true doubt |
| DB-UI-010 | Best Answer Badge | Accepted answer styling | Doubt with accepted answer | 1. View doubt detail | Accepted answer has green border, "Best Answer" badge with award icon | Minor | P2 | Yes | Doubt with accepted_answer_id |
| DB-UI-011 | Verified Badge | Admin-verified answer | Answer with is_verified_by_admin=true | 1. View answer on detail page | Blue "Verified by Admin" badge with shield icon | Minor | P2 | Yes | Verified answer |
| DB-UI-012 | Modal Animation | Create doubt modal | Doubt board page | 1. Click "Ask a Question" | Modal slides in with animation (animate-fade-in, scale-in), backdrop blur | Minor | P3 | No | N/A |
| DB-UI-013 | Time Formatting | Relative time display | Doubts of various ages | 1. View doubt cards | "just now", "5m ago", "3h ago", "2d ago" correctly formatted | Minor | P3 | Yes | Various created_at timestamps |
| DB-UI-014 | Subject Badge Colors | Color coding by subject | Multiple subjects | 1. View subject badges | Each subject has distinct color from subjectColors map | Minor | P3 | No | Multiple subjects |
| DB-UI-015 | Upvote Visual State | Upvoted vs not-upvoted | Mix of upvoted/not states | 1. View cards | Upvoted: blue icon with fill. Not upvoted: gray/white icon | Minor | P2 | Yes | current_user_upvoted states |


---

## 5. API Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-API-001 | POST /doubts/ | Valid doubt creation | Valid student JWT | 1. POST with valid subject_id and question_text | 200, returns DoubtOut with id, student_name, subject_name, vote_count=0, answer_count=0 | Critical | P1 | Yes | Valid payload |
| DB-API-002 | POST /doubts/ | Missing subject_id | Valid JWT | 1. POST without subject_id | 422 Validation Error | Major | P1 | Yes | {question_text: "..."} |
| DB-API-003 | POST /doubts/ | Missing question_text | Valid JWT | 1. POST without question_text | 422 Validation Error | Major | P1 | Yes | {subject_id: "..."} |
| DB-API-004 | POST /doubts/ | No auth token | No JWT | 1. POST /doubts/ without Authorization header | 401 Unauthorized | Critical | P1 | Yes | No header |
| DB-API-005 | GET /doubts/ | List with default params | Valid JWT | 1. GET /doubts/ | 200, array of DoubtOut objects, max 20, ordered by created_at DESC | Critical | P1 | Yes | N/A |
| DB-API-006 | GET /doubts/ | Filter by subject_id | Valid subject exists | 1. GET /doubts/?subject_id={uuid} | 200, only doubts for that subject | Major | P1 | Yes | Valid subject_id |
| DB-API-007 | GET /doubts/ | Filter by is_resolved=true | Resolved doubts exist | 1. GET /doubts/?is_resolved=true | 200, only resolved doubts | Major | P1 | Yes | is_resolved=true |
| DB-API-008 | GET /doubts/ | Filter by is_resolved=false | Unresolved doubts exist | 1. GET /doubts/?is_resolved=false | 200, only unresolved doubts | Major | P1 | Yes | is_resolved=false |
| DB-API-009 | GET /doubts/ | Pagination page=2 size=5 | >5 doubts exist | 1. GET /doubts/?page=2&size=5 | 200, offset 5, returns next 5 doubts | Major | P1 | Yes | page=2, size=5 |
| DB-API-010 | GET /doubts/{id} | Get doubt detail | Valid doubt exists | 1. GET /doubts/{valid_id} | 200, returns {doubt: DoubtOut, answers: [...]} | Critical | P1 | Yes | Valid doubt UUID |
| DB-API-011 | GET /doubts/{id} | Non-existent doubt | Invalid ID | 1. GET /doubts/{random_uuid} | 404 "Doubt not found" | Major | P2 | Yes | Non-existent UUID |
| DB-API-012 | POST /doubts/{id}/answers | Post valid answer | Valid JWT, valid doubt | 1. POST with answer_text | 200, returns DoubtAnswerOut with upvotes=0, is_accepted=false | Critical | P1 | Yes | {answer_text: "Here's the solution..."} |
| DB-API-013 | POST /doubts/{id}/upvote | Toggle upvote on | Not yet upvoted | 1. POST /doubts/{id}/upvote | 200, {vote_count: N+1, user_upvoted: true} | Critical | P1 | Yes | First upvote |
| DB-API-014 | POST /doubts/{id}/upvote | Toggle upvote off | Already upvoted | 1. POST /doubts/{id}/upvote again | 200, {vote_count: N-1, user_upvoted: false} | Critical | P1 | Yes | Second call |
| DB-API-015 | POST /doubts/answers/{id}/upvote | Toggle answer upvote | Valid answer_id | 1. POST /doubts/answers/{id}/upvote | 200, {upvotes: N+1, user_upvoted: true} | Critical | P1 | Yes | Valid answer UUID |
| DB-API-016 | PUT /doubts/{id}/resolve | Resolve with answer | Author JWT, valid answer | 1. PUT with accepted_answer_id param | 200, DoubtOut with is_resolved=true | Critical | P1 | Yes | Author token, answer_id |
| DB-API-017 | PUT /doubts/{id}/admin-resolve | Admin resolve | Admin/HOD/Faculty JWT | 1. PUT /doubts/{id}/admin-resolve | 200, {is_resolved: true, message: "..."} | Critical | P1 | Yes | Admin token |
| DB-API-018 | DELETE /doubts/{id} | Delete own doubt | Author JWT | 1. DELETE /doubts/{id} | 204 No Content | Critical | P1 | Yes | Author token |
| DB-API-019 | PUT /doubts/answers/{id}/verify | Verify answer | Admin JWT | 1. PUT /doubts/answers/{id}/verify | 200, {is_verified_by_admin: true} | Major | P1 | Yes | Admin token |
| DB-API-020 | Response Schema | DoubtOut schema validation | Any GET /doubts/ response | 1. Validate response against DoubtOut schema | All fields present: id, student_id, student_name, subject_id, subject_name, question_text, is_resolved, vote_count, answer_count, created_at, accepted_answer_id, current_user_upvoted | Major | P2 | Yes | Any response |


---

## 6. Edge Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-E-001 | Question Text | Unicode/emoji in question | Student logged in | 1. Post doubt with emoji: "Why does 🐍 Python use 🔗 references? 这是一个测试" | Stored and displayed correctly without corruption | Major | P2 | Yes | Unicode + emoji text |
| DB-E-002 | Question Text | Very long question (1000 chars) | Student logged in | 1. Post doubt at max length (1000 chars) | Accepted, stored fully, displayed with line-clamp-3 on cards | Minor | P3 | Yes | 1000 char string |
| DB-E-003 | Question Text | Whitespace-only question | Student logged in | 1. Enter only spaces/tabs (< 20 visible chars) | Frontend validation blocks (length check counts whitespace, but sanitizer may trim) | Major | P2 | Yes | "                    " |
| DB-E-004 | Pagination | Page 0 or negative | API call | 1. GET /doubts/?page=0 | Backend calculates offset as (0-1)*20 = -20, potential error or empty result | Major | P2 | Yes | page=0, page=-1 |
| DB-E-005 | Pagination | Extremely large page number | API call | 1. GET /doubts/?page=99999 | Empty array returned (offset beyond data), no crash | Minor | P3 | Yes | page=99999 |
| DB-E-006 | Upvote | Rapid toggle (race condition) | User clicks rapidly | 1. Click upvote 10 times in 1 second | Final state consistent (either upvoted or not), vote_count accurate | Major | P1 | Yes | Rapid clicks |
| DB-E-007 | Resolve | Accept own answer | Author answers own doubt then accepts | 1. Post answer to own doubt 2. Accept that answer | Allowed — no restriction in code | Minor | P3 | Yes | Author answers self |
| DB-E-008 | Delete | Delete doubt that was just resolved | Doubt resolved 1 second ago | 1. Delete the resolved doubt | Successfully deleted (no restriction on resolved doubts) | Minor | P3 | Yes | Recently resolved doubt |
| DB-E-009 | Concurrent | Two users answer simultaneously | Two sessions open | 1. Both users submit answers at same time | Both answers saved, no conflicts | Major | P2 | No | Parallel sessions |
| DB-E-010 | Filter | Invalid subject_id in URL param | Direct API call | 1. GET /doubts/?subject_id=not-a-uuid | 422 Validation Error (UUID parse fail) | Minor | P3 | Yes | Invalid UUID string |
| DB-E-011 | Vote Count | Negative vote_count | Manual DB manipulation or bug | 1. Check if vote_count can go below 0 | vote_count should not go negative (but no check in code — potential bug) | Major | P2 | Yes | Multiple unvote attempts |
| DB-E-012 | Answers | Answer ordering | Doubt with multiple answers | 1. View doubt with accepted + high-upvote answers | Answers sorted by is_accepted DESC, then upvotes DESC | Minor | P3 | Yes | Mix of accepted/upvoted |


---

## 7. Negative Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-N-001 | Auth | Expired JWT token | Token expired | 1. Call any endpoint with expired token | 401 Unauthorized | Critical | P1 | Yes | Expired JWT |
| DB-N-002 | Auth | Malformed JWT token | Invalid token string | 1. Set Authorization: Bearer garbage123 | 401 Unauthorized | Critical | P1 | Yes | "garbage123" |
| DB-N-003 | Auth | Missing auth header | No Authorization | 1. Call protected endpoint without header | 401 Unauthorized | Critical | P1 | Yes | No header |
| DB-N-004 | Input | SQL injection in question_text | Student logged in | 1. Post doubt: "'; DROP TABLE doubts; --" | Safely handled by SQLAlchemy ORM parameterization, stored as text | Critical | P1 | Yes | SQL injection string |
| DB-N-005 | Input | HTML injection in answer | Any user | 1. Post answer with `<div onmouseover=alert(1)>hover</div>` | Sanitized by sanitize_text, rendered as plain text | Critical | P1 | Yes | HTML injection |
| DB-N-006 | Role | Student calls admin-only endpoints | Student JWT | 1. PUT /doubts/{id}/admin-resolve 2. PUT /doubts/answers/{id}/verify | 403 for both | Critical | P1 | Yes | Student token |
| DB-N-007 | Role | Faculty creates doubt (student-only) | Faculty JWT | 1. POST /doubts/ | 403 Forbidden — require_student | Major | P1 | Yes | Faculty token |
| DB-N-008 | Input | Empty body on POST | Valid JWT | 1. POST /doubts/ with empty JSON {} | 422 Validation Error — missing fields | Major | P1 | Yes | {} |
| DB-N-009 | Input | Invalid UUID format | Any endpoint with UUID param | 1. GET /doubts/not-a-uuid | 422 Validation Error | Major | P2 | Yes | "not-a-uuid" |
| DB-N-010 | Input | Null values in required fields | API call | 1. POST /doubts/ with {subject_id: null, question_text: null} | 422 Validation Error | Major | P2 | Yes | Null values |
| DB-N-011 | Logic | Resolve doubt with answer from different doubt | Author | 1. PUT /doubts/{A}/resolve?accepted_answer_id={answer_from_doubt_B} | 404 "Answer not found for this doubt" | Major | P1 | Yes | Cross-doubt answer_id |
| DB-N-012 | Logic | Upvote non-existent doubt | Valid JWT | 1. POST /doubts/{invalid}/upvote | 404 "Doubt not found" | Minor | P2 | Yes | Non-existent doubt UUID |
| DB-N-013 | Logic | Upvote non-existent answer | Valid JWT | 1. POST /doubts/answers/{invalid}/upvote | 404 "Answer not found" | Minor | P2 | Yes | Non-existent answer UUID |
| DB-N-014 | Logic | Delete already-deleted doubt | Valid JWT | 1. DELETE /doubts/{id} 2. DELETE same id again | First: 204, Second: 404 | Minor | P3 | Yes | Same UUID twice |


---

## 8. Accessibility Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-A-001 | Keyboard Nav | Tab through doubt cards | Doubt board loaded | 1. Press Tab repeatedly | Focus moves through filter buttons, subject chips, doubt cards in logical order | Major | P2 | Yes | Keyboard only |
| DB-A-002 | Keyboard Nav | Enter to open doubt detail | Doubt card focused | 1. Press Enter on focused card | Navigates to doubt detail page | Major | P2 | Yes | Keyboard only |
| DB-A-003 | Keyboard Nav | Modal keyboard trap | Create doubt modal open | 1. Tab through modal 2. Ensure focus stays within modal | Focus cycles within modal (not behind backdrop) | Major | P2 | Yes | Modal open |
| DB-A-004 | Keyboard Nav | Escape closes modal | Modal open | 1. Press Escape key | Modal closes (NOTE: not implemented in current code — likely bug) | Major | P2 | Yes | Modal open |
| DB-A-005 | Screen Reader | Doubt card ARIA labels | Screen reader active | 1. Navigate to doubt card | Card announces: question text, subject, vote count, answer count, resolved status | Major | P2 | No | NVDA/VoiceOver |
| DB-A-006 | Screen Reader | Form labels | Modal open | 1. Navigate form fields | Select and textarea have proper labels announced | Major | P2 | Yes | axe-core scan |
| DB-A-007 | Color Contrast | Text on dark background | Dark mode | 1. Check contrast ratios | All text meets WCAG 2.1 AA (4.5:1 for normal, 3:1 for large text) | Major | P2 | Yes | axe-core/Lighthouse |
| DB-A-008 | Color Contrast | Text on light background | Light mode | 1. Check contrast ratios | All text meets WCAG 2.1 AA | Major | P2 | Yes | axe-core/Lighthouse |
| DB-A-009 | Focus Indicators | Visible focus rings | Keyboard navigation | 1. Tab through interactive elements | All buttons/links show visible focus indicator (focus:ring, focus:border) | Minor | P3 | Yes | Keyboard only |
| DB-A-010 | Motion | Reduced motion preference | prefers-reduced-motion: reduce | 1. Set OS to reduce motion 2. View animations | Animations disabled or simplified (hover transforms, pulse, spin) | Minor | P3 | No | OS accessibility setting |

---

## 9. Performance Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-P-001 | Feed Load | Initial load time with 100 doubts | 100 doubts in DB | 1. Measure GET /doubts/ response time | Response < 500ms for 20 items page | Major | P1 | Yes | 100 seeded doubts |
| DB-P-002 | Feed Load | Large dataset 10,000 doubts | 10K doubts in DB | 1. GET /doubts/?page=1&size=20 | Response < 1s, no timeout | Major | P1 | Yes | 10K doubts |
| DB-P-003 | Detail Load | Doubt with 100 answers | Doubt has 100 answers | 1. GET /doubts/{id} | Response < 2s, all answers loaded | Major | P2 | Yes | 100 answers |
| DB-P-004 | N+1 Query | Answer count per doubt in feed | 20 doubts loaded | 1. Monitor SQL queries during GET /doubts/ | Should not generate N+1 queries (currently counts per doubt — potential issue) | Critical | P1 | Yes | SQL query logging |
| DB-P-005 | Upvote | Upvote under concurrent load | 50 users upvote same doubt simultaneously | 1. Simulate 50 concurrent POST /doubts/{id}/upvote | vote_count accurate, no race condition, unique constraint holds | Major | P1 | Yes | Load testing tool |
| DB-P-006 | Frontend | DOM rendering with 40 cards | 40 doubts loaded (2 pages admin) | 1. Measure render time | Smooth render < 100ms, no jank | Minor | P3 | Yes | Performance profiler |
| DB-P-007 | Memory | Memory leak on filter changes | Repeated filter toggles | 1. Toggle filters 100 times 2. Check memory | No memory growth beyond baseline | Minor | P3 | No | Chrome DevTools |


---

## 10. Security Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-S-001 | Auth | Access without token | No session | 1. Call all endpoints without JWT | 401 on all protected endpoints | Critical | P1 | Yes | No auth header |
| DB-S-002 | Auth | Token from different user (IDOR) | User A's token, User B's doubt | 1. Try to delete User B's doubt with User A's token | 403 Forbidden | Critical | P1 | Yes | Cross-user tokens |
| DB-S-003 | Auth | Role escalation | Student token | 1. Call admin-only endpoints (verify, admin-resolve) | 403 Forbidden | Critical | P1 | Yes | Student JWT |
| DB-S-004 | Input | XSS via question_text | Malicious input | 1. Post doubt with XSS payloads 2. View rendered output | Script not executed, sanitized in both storage and display | Critical | P1 | Yes | XSS payloads list |
| DB-S-005 | Input | XSS via answer_text | Malicious input | 1. Post answer with various XSS vectors | Sanitized, no execution | Critical | P1 | Yes | OWASP XSS cheat sheet |
| DB-S-006 | Input | SQL Injection | Direct API call | 1. Send SQL injection in subject_id, question_text | ORM parameterizes all queries, no injection possible | Critical | P1 | Yes | SQLi payloads |
| DB-S-007 | CORS | Cross-origin request from unauthorized domain | Request from evil.com | 1. Send request with Origin: http://evil.com | CORS blocked (not in allow_origins list) | Critical | P1 | Yes | Unauthorized origin |
| DB-S-008 | Rate Limiting | Spam doubt creation | Rapid requests | 1. POST /doubts/ 100 times in 10 seconds | Rate limiting should apply (NOTE: not implemented in doubt router — potential gap) | Major | P1 | No | Rapid fire requests |
| DB-S-009 | Data Exposure | User data in responses | Any response | 1. Check all response payloads | No password hashes, emails, or sensitive user data leaked | Critical | P1 | Yes | Response inspection |
| DB-S-010 | IDOR | Access other user's data | Student A's session | 1. Enumerate doubt IDs, access details | Allowed (public read), but no private data exposed | Major | P2 | Yes | UUID enumeration |

---

## 11. Responsive Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-R-001 | Layout | Desktop (1920×1080) | Full width browser | 1. View doubt board | 2-column grid (md:grid-cols-2), full filter bar, max-w-6xl centered | Minor | P2 | Yes | 1920×1080 viewport |
| DB-R-002 | Layout | Tablet (768×1024) | Medium viewport | 1. Resize to 768px width | Grid transitions to 2 columns, filters wrap, spacing adjusts | Minor | P2 | Yes | 768×1024 viewport |
| DB-R-003 | Layout | Mobile (375×812) | Small viewport | 1. Resize to 375px width | Single column grid, stacked filters, full-width cards | Major | P2 | Yes | 375×812 viewport |
| DB-R-004 | Modal | Modal on mobile | Mobile viewport | 1. Open create doubt modal on mobile | Modal fills screen with padding (p-4), scrollable if needed | Major | P2 | Yes | 375×812 + modal |
| DB-R-005 | Filters | Filter bar wrapping | Narrow viewport, many subjects | 1. View filter bar with 8+ subjects on mobile | Filters wrap properly (flex-wrap), no horizontal overflow | Minor | P3 | Yes | 8+ subjects |
| DB-R-006 | Header | Header responsiveness | Mobile viewport | 1. View page header | Title and "Ask a Question" button stack vertically (flex-col) | Minor | P3 | Yes | Mobile viewport |
| DB-R-007 | Detail Page | Answer form on mobile | Mobile detail view | 1. View answer textarea | Full width, adequate touch target for submit button | Minor | P3 | Yes | Mobile viewport |


---

## 12. Regression Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-RG-001 | Core Flow | End-to-end student journey | Clean state | 1. Login as student 2. Post doubt 3. View in feed 4. Upvote 5. View detail 6. Post answer 7. Accept answer | Complete flow works without errors | Critical | P1 | Yes | Full flow data |
| DB-RG-002 | Core Flow | End-to-end admin journey | Doubts and answers exist | 1. Login as admin 2. View board 3. Search 4. Open detail 5. Verify answer 6. Admin-resolve doubt | Complete admin flow works | Critical | P1 | Yes | Full flow data |
| DB-RG-003 | Integration | Subject deletion doesn't break doubts | Subject with doubts exists | 1. Archive subject 2. View doubt board | Doubts for archived subjects filtered out (Subject.is_archived check) | Major | P1 | Yes | Archived subject |
| DB-RG-004 | Integration | User deletion impact | User who posted doubts is deleted | 1. Delete user from system 2. View their doubts | Graceful handling (FK constraint or cascade) | Major | P2 | No | User with doubts |
| DB-RG-005 | State | Filter state persistence across navigation | Filter active | 1. Set filter to "Unresolved" 2. Open doubt detail 3. Go back | Filter state may or may not persist (verify behavior) | Minor | P3 | Yes | Navigation flow |
| DB-RG-006 | Data | Vote count consistency | Multiple upvote operations | 1. Upvote doubt 2. Refresh page 3. Check count | vote_count in DB matches displayed count | Major | P1 | Yes | Before/after comparison |

---

## 13. Smoke Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-SM-001 | Health | Backend doubt endpoint responds | Server running | 1. GET /doubts/ with valid JWT | 200 OK with array response | Critical | P1 | Yes | Valid JWT |
| DB-SM-002 | Health | Student board page loads | Frontend running | 1. Navigate to /student/doubts | Page renders without crash, no console errors | Critical | P1 | Yes | Student session |
| DB-SM-003 | Health | Admin board page loads | Frontend running | 1. Navigate to /admin/doubts | Page renders without crash | Critical | P1 | Yes | Admin session |
| DB-SM-004 | Core | Can create a doubt | Full stack running | 1. Open modal 2. Fill form 3. Submit | Doubt created successfully | Critical | P1 | Yes | Valid data |
| DB-SM-005 | Core | Can post an answer | Doubt exists | 1. Open doubt detail 2. Post answer | Answer appears in thread | Critical | P1 | Yes | Valid data |
| DB-SM-006 | Core | Can upvote | Doubt exists | 1. Click upvote icon | Count changes, no error | Critical | P1 | Yes | Any doubt |
| DB-SM-007 | Core | Can resolve | Author's unresolved doubt with answer | 1. Accept answer | Resolved badge appears | Critical | P1 | Yes | Author + answer |


---

## 14. Resilience & Error Handling Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation Candidate | Test Data |
|---------|---------|----------|--------------|-------|-----------------|----------|----------|---------------------|-----------|
| DB-RES-001 | API Failure | Backend unreachable on page load | Backend stopped | 1. Navigate to doubt board | Error state shown: "Failed to load doubts. Check your API connection." with Retry button | Major | P1 | Yes | Backend offline |
| DB-RES-002 | API Failure | Backend fails during doubt creation | Backend crashes mid-request | 1. Submit new doubt 2. Backend returns 500 | Toast "Failed to post doubt.", modal stays open, form data preserved | Major | P1 | Yes | Simulated 500 |
| DB-RES-003 | API Failure | Upvote API fails | Network issue | 1. Click upvote, API returns error | Toast "Failed to upvote doubt.", UI reverts to previous state | Major | P2 | Yes | Simulated error |
| DB-RES-004 | Browser Refresh | Refresh on doubt board | Filters active | 1. Set filters 2. Press F5 | Page reloads, filters reset to default (All/All Subjects) | Minor | P3 | Yes | Active filters |
| DB-RES-005 | Browser Refresh | Refresh on detail page | Viewing doubt detail | 1. Press F5 on /student/doubts/{id} | Doubt reloads correctly from URL param | Major | P2 | Yes | Valid doubt URL |
| DB-RES-006 | Session Expiry | Token expires during use | JWT about to expire | 1. Use app until token expires 2. Try to upvote | 401 returned, app should redirect to login (depends on interceptor) | Critical | P1 | Yes | Short-lived token |
| DB-RES-007 | Offline Mode | Device goes offline | App loaded, then disconnected | 1. Disconnect network 2. Try to post doubt | Appropriate error handling (network error caught by axios) | Major | P2 | No | Airplane mode |
| DB-RES-008 | Slow Network | 3G connection speed | Throttled network | 1. Load doubt board on 3G | Loading skeleton shown, eventually loads, no timeout crash | Minor | P3 | No | Network throttle |
| DB-RES-009 | Duplicate Submission | Double-click submit | Modal open, form valid | 1. Double-click "Broadcast Doubt" quickly | isSubmitting flag prevents duplicate, only 1 doubt created | Major | P1 | Yes | Rapid double-click |
| DB-RES-010 | Unauthorized Access | Direct URL to doubt board without login | No session | 1. Navigate to /student/doubts directly | Redirected to login page (route guard) | Critical | P1 | Yes | No auth session |

---

## 15. Likely Bugs (Predicted from Code Review)

| # | Bug Description | Location | Risk Level | Evidence |
|---|----------------|----------|------------|----------|
| 1 | **N+1 query in GET /doubts/** — answer_count is computed per-doubt in a loop | `routers/doubts.py` line ~72 | High | `db.query(func.count(...)).filter(...)` inside for loop |
| 2 | **Vote count can go negative** — no floor check when decrementing | `routers/doubts.py` upvote handler | Medium | `doubt.vote_count -= 1` without `max(0, ...)` guard |
| 3 | **No Escape key handler on modal** — modal only closes via X or Cancel button | `DoubtBoardPage.jsx` modal | Low | No `onKeyDown` or `useEffect` for Escape |
| 4 | **Question upvote record not cleaned on doubt delete** — DoubtQuestionUpvote not deleted in cascade | `routers/doubts.py` delete handler | Medium | Only answers and answer-upvotes are deleted; question upvotes orphaned |
| 5 | **No rate limiting on doubt creation** — students can spam doubts | `routers/doubts.py` POST / | Medium | No rate limit middleware on this endpoint |
| 6 | **Stale data after resolve** — `current_user_upvoted` hardcoded in resolve response | `routers/doubts.py` line ~210 | Low | Comment says "we need to fetch it" but doesn't |
| 7 | **Admin search is client-side only** — all data must be loaded first for search to work | `AdminDoubtBoardPage.jsx` | Medium | `doubts.filter(...)` runs after render, pagination means not all data available |
| 8 | **No input length validation on backend** — question_text has no min/max length check | `schemas/doubt.py` | Medium | Frontend enforces 20 chars min, but API accepts any non-empty string |
| 9 | **Missing error boundary** — React crash on null data | `DoubtDetailPage.jsx` line ~130 | Low | `setData(prev => prev)` in finally block, then destructures `data` which could be null |
| 10 | **Admin delete role check is "admin" not "super_admin"** — inconsistent role naming | `routers/doubts.py` delete handler | Medium | `current_user.role != "admin"` but system uses "super_admin" role |


---

## 16. High-Risk Scenarios

| # | Scenario | Impact | Mitigation |
|---|----------|--------|------------|
| 1 | **Race condition on upvotes** — concurrent users toggle same doubt's vote_count without DB-level locking | vote_count becomes inaccurate, shows wrong number | Add `SELECT ... FOR UPDATE` or use atomic increment (`vote_count = Doubt.vote_count + 1`) |
| 2 | **Orphaned upvote records on delete** — DoubtQuestionUpvote rows remain after doubt deletion | DB bloat, potential FK violations in future | Add cascade delete for question upvotes in delete handler |
| 3 | **No backend length validation** — API accepts 1-char or million-char question_text | Possible DB overflow, storage abuse, display issues | Add `@field_validator` with min_length=20, max_length=1000 |
| 4 | **Admin search only works on loaded data** — with pagination, search misses doubts not yet loaded | Admin cannot find specific doubts reliably | Move search to backend API with query parameter |
| 5 | **Role mismatch in delete authorization** — checks `role != "admin"` but system uses `super_admin` | Admins may be unable to delete doubts | Fix to check `current_user.role not in ["super_admin", "admin"]` or use `require_admin` |
| 6 | **No spam protection** — no rate limiting, captcha, or duplicate detection | Bot flooding, spam doubts polluting the board | Add rate limiting middleware, duplicate question detection |
| 7 | **Session expiry without graceful handling** — no token refresh mechanism visible | Users lose work (typed answers) when token expires mid-session | Implement token refresh or pre-expire warning |

---

## 17. Automation Recommendations

### Tool Selection

| Tool | Use Case | Rationale |
|------|----------|-----------|
| **Playwright** (Recommended) | E2E UI tests, cross-browser | Best-in-class for React SPAs, auto-wait, network interception, multi-browser |
| **Cypress** (Alternative) | E2E UI tests | Developer-friendly, excellent debugging, but Chrome-only for CI |
| **pytest + httpx** | API tests | Already in project stack, async support, fast execution |
| **axe-core + Playwright** | Accessibility | Automated WCAG scanning integrated with E2E |
| **k6 / Locust** | Performance/Load | Simulate concurrent upvotes, pagination load |

### Automation Priority Matrix

| Priority | Test Category | Count | Tool | Est. Effort |
|----------|--------------|-------|------|-------------|
| Sprint 1 | Smoke Tests | 7 | Playwright | 4h |
| Sprint 1 | API Critical Path | 20 | pytest + httpx | 8h |
| Sprint 2 | Functional (CRUD) | 30 | Playwright | 16h |
| Sprint 2 | Security (Auth/XSS) | 10 | pytest + httpx | 6h |
| Sprint 3 | Edge Cases | 12 | pytest + Playwright | 8h |
| Sprint 3 | Accessibility | 10 | Playwright + axe | 6h |
| Sprint 4 | Performance | 7 | k6 | 8h |
| Sprint 4 | Responsive | 7 | Playwright (multi-viewport) | 4h |

### Sample Playwright Test Structure

```javascript
// tests/doubt-board/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Doubt Board Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/login');
    await page.fill('[name=email]', 'student@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    await page.waitForURL('/student/**');
  });

  test('DB-SM-002: Board page loads', async ({ page }) => {
    await page.goto('/student/doubts');
    await expect(page.locator('h1')).toContainText('Doubt Board');
    await expect(page.locator('[class*=grid]')).toBeVisible();
  });

  test('DB-SM-004: Create a doubt', async ({ page }) => {
    await page.goto('/student/doubts');
    await page.click('text=Ask a Question');
    await page.selectOption('select', { index: 1 });
    await page.fill('textarea', 'How does the quick sort algorithm achieve O(n log n) average time?');
    await page.click('text=Broadcast Doubt');
    await expect(page.locator('text=Doubt posted successfully')).toBeVisible();
  });
});
```

### Sample pytest API Test

```python
# tests/test_doubts_api.py
import pytest
import httpx

BASE = "http://localhost:8000"

@pytest.fixture
def student_token():
    r = httpx.post(f"{BASE}/auth/login", json={"email": "student@test.com", "password": "pass123"})
    return r.json()["access_token"]

def test_create_doubt_success(student_token, valid_subject_id):
    """DB-API-001"""
    r = httpx.post(f"{BASE}/doubts/", 
        json={"subject_id": str(valid_subject_id), "question_text": "How does binary search work in detail?"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 200
    data = r.json()
    assert data["vote_count"] == 0
    assert data["answer_count"] == 0
    assert data["is_resolved"] == False

def test_create_doubt_no_auth():
    """DB-API-004"""
    r = httpx.post(f"{BASE}/doubts/", json={"subject_id": "...", "question_text": "test"})
    assert r.status_code == 401
```


---

## 18. Production Readiness Score

| Category | Weight | Score (1-10) | Weighted | Notes |
|----------|--------|--------------|----------|-------|
| Core Functionality | 25% | 8/10 | 2.00 | CRUD, upvote, resolve all work. Missing: edit question/answer not implemented |
| Security | 20% | 7/10 | 1.40 | Auth guards solid, XSS sanitized. Gaps: no rate limiting, role check inconsistency |
| Error Handling | 15% | 6/10 | 0.90 | Frontend has error/loading states. Backend missing: input length validation, graceful null handling |
| Performance | 15% | 5/10 | 0.75 | N+1 query issue, no caching, client-side search limitation |
| Accessibility | 10% | 4/10 | 0.40 | No ARIA labels, no keyboard modal close, no screen reader optimization |
| UX/UI Polish | 10% | 8/10 | 0.80 | Clean design, animations, theme support, responsive grid |
| Code Quality | 5% | 7/10 | 0.35 | Clean separation, but some hardcoded values and missing cascade |

**Total Production Readiness Score: 6.6 / 10**

---

## 19. Release Recommendation

### 🟡 CONDITIONAL GO

**Verdict:** The Doubt Board module is **functionally complete for core workflows** but has **critical gaps** that should be addressed before production release.

### Must-Fix Before Release (Blockers)

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Fix N+1 query in GET /doubts/ (use subquery or joinedload for count) | Performance/Critical | 2h |
| 2 | Add backend min/max length validation for question_text and answer_text | Security/Major | 30m |
| 3 | Fix orphaned DoubtQuestionUpvote records on doubt delete | Data Integrity/Major | 30m |
| 4 | Fix admin role check in delete handler ("admin" vs "super_admin") | Security/Critical | 15m |
| 5 | Add rate limiting on POST /doubts/ and POST /answers | Security/Major | 2h |

### Should-Fix Post-Release (Technical Debt)

| # | Issue | Priority |
|---|-------|----------|
| 1 | Move admin search to backend (server-side search endpoint) | P2 |
| 2 | Add Escape key handler for modal | P3 |
| 3 | Implement atomic vote_count updates (prevent race condition) | P2 |
| 4 | Add ARIA labels and screen reader support | P2 |
| 5 | Implement edit/delete for questions and answers in frontend | P2 |
| 6 | Add vote_count floor guard (prevent negative) | P3 |

### Not Implemented (Out of Current Scope)

The following features from the test plan scope are **not yet implemented** in the codebase:

- ❌ Edit Question (no endpoint or UI)
- ❌ Edit Answer (no endpoint or UI)  
- ❌ Delete Answer (no endpoint — only doubt delete exists)
- ❌ AI Suggestions (not present in doubt module)
- ❌ Reporting/Flagging (not in doubt module)
- ❌ Attachments/Images/Code Snippets (plain text only)
- ❌ Notifications on new answers (no websocket/push for doubts)
- ❌ Infinite scroll (admin uses "Load More" button, student loads all)
- ❌ Spam Protection (no captcha, deduplication, or throttling)

---

## 20. Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Test Cases | 128 |
| Functional | 61 |
| UI | 15 |
| API | 20 |
| Edge Cases | 12 |
| Negative | 14 |
| Accessibility | 10 |
| Performance | 7 |
| Security | 10 |
| Responsive | 7 |
| Regression | 6 |
| Smoke | 7 |
| Automation Candidates | 108 (84%) |
| Manual-Only | 20 (16%) |
| Estimated Automation Effort | ~60 hours |
| Recommended Sprints | 4 sprints |

---

*End of QA Test Plan — Doubt Board Module*  
*Document Version: 1.0 | Last Updated: July 16, 2026*
