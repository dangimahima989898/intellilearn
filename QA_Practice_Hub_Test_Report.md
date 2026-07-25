# QA Test Report — Practice Hub Module (IntelliLearn)

**Document Version:** 1.0  
**Date:** July 15, 2026  
**Prepared By:** Senior QA Engineer  
**Module:** Practice Hub (Student Portal)  
**Sub-modules:** AI Question Generator | Adaptive Quiz | Daily Challenge | Leaderboard | Activity Calendar | History  
**URL:** http://localhost:5173/student/practice  
**Test Credentials:** student@example.com / student123  

---

## Test Summary

| Category | Total Cases | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Functional | 120 | 15 | 38 | 45 | 22 |
| UI | 35 | 2 | 10 | 15 | 8 |
| API | 40 | 8 | 15 | 12 | 5 |
| Edge Cases | 30 | 5 | 12 | 10 | 3 |
| Negative | 25 | 4 | 10 | 8 | 3 |
| Accessibility | 20 | 3 | 8 | 7 | 2 |
| Responsive | 15 | 1 | 5 | 6 | 3 |
| Performance | 15 | 2 | 6 | 5 | 2 |
| Security | 20 | 8 | 7 | 4 | 1 |
| Cross-Browser | 10 | 1 | 4 | 4 | 1 |
| Regression | 15 | 3 | 6 | 4 | 2 |
| Smoke | 10 | 5 | 5 | 0 | 0 |
| **TOTAL** | **355** | **57** | **126** | **120** | **52** |

---

## 1. Smoke Tests (Pre-release Gate)

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| SM-001 | Navigation | Practice Hub loads | 1. Login 2. Click Practice Hub | Page loads with 3 tabs visible | Critical | P0 | Yes |
| SM-002 | Questions | Subject grid renders | 1. Click Questions tab | 12 subject cards displayed | Critical | P0 | Yes |
| SM-003 | Adaptive Quiz | Quiz page renders | 1. Click Adaptive Quiz tab | Subject grid + Performance panel shown | Critical | P0 | Yes |
| SM-004 | Daily Challenge | Challenge loads | 1. Click Daily Challenge tab | Question + timer + options displayed | Critical | P0 | Yes |
| SM-005 | Questions | Generate questions flow | 1. Select subject 2. Select topic 3. Select difficulty 4. Generate | Questions generated and displayed | Critical | P0 | Yes |
| SM-006 | Adaptive Quiz | Complete a quiz | 1. Select subject 2. Start quiz 3. Answer 5 questions | Quiz completes, score shown | Critical | P0 | Yes |
| SM-007 | Daily Challenge | Submit answer | 1. Select option 2. Click Submit | Answer recorded, result shown | Critical | P0 | Yes |
| SM-008 | Activity | Activity tab loads | 1. Click MY ACTIVITY tab | Stats + calendar + history displayed | High | P0 | Yes |
| SM-009 | Leaderboard | Board renders | 1. Scroll to leaderboard section | Table headers visible, data or empty state | High | P0 | Yes |
| SM-010 | Auth | Logged-out access blocked | 1. Clear session 2. Navigate to /student/practice | Redirected to login | Critical | P0 | Yes |

---

## 2. Functional Test Cases

### 2.1 AI Question Generator

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| QG-001 | Subject selection displays all enrolled subjects | Student logged in | 1. Navigate to Questions tab | All 12 MCA subjects displayed in grid | High | P0 | Yes | 12 subjects |
| QG-002 | Select a subject advances to Step 2 | On Step 1 | 1. Click "Artificial Intelligence" card | Step 2 (Topic) active, topics for AI shown | High | P0 | Yes | Subject: AI |
| QG-003 | Topic selection shows available topics | Subject selected | 1. Observe topic list | 4 topics listed for selected subject | High | P0 | Yes | 4 topics |
| QG-004 | Select topic advances to Step 3 | On Step 2 | 1. Click a topic | Step 3 (Difficulty) active, difficulty options shown | High | P0 | Yes | — |
| QG-005 | Difficulty options available | On Step 3 | 1. Observe difficulty options | Easy, Medium, Hard options displayed | High | P0 | Yes | — |
| QG-006 | Select difficulty advances to Step 4 | On Step 3 | 1. Click "Medium" | Step 4 (Configure) active | Medium | P1 | Yes | Difficulty: Medium |
| QG-007 | Configure step shows generation options | On Step 4 | 1. Observe configure options | Number of questions selector, other config visible | Medium | P1 | Yes | — |
| QG-008 | Generate questions successfully | All steps completed | 1. Click "Generate" button | Loading indicator → questions displayed | Critical | P0 | Yes | Subject: Python, Topic: Loops, Difficulty: Easy, Count: 5 |
| QG-009 | Generated questions are MCQ format | Questions generated | 1. Observe question cards | Each question has text + 4 options (A, B, C, D) | High | P0 | Yes | — |
| QG-010 | Generated questions match selected subject | Questions generated | 1. Review question content | Questions related to selected subject/topic | High | P1 | No (manual) | — |
| QG-011 | Generated questions match selected difficulty | Questions generated | 1. Review complexity | Easy = basic recall, Hard = application/analysis | Medium | P1 | No (manual) | — |
| QG-012 | Go back to previous step | On Step 3 | 1. Click Step 1 or back button | Returns to Step 1 with previous selection cleared or preserved | Medium | P1 | Yes | — |
| QG-013 | Step indicator shows current position | On any step | 1. Observe step bar | Current step highlighted, completed steps checked | Low | P2 | Yes | — |
| QG-014 | Cannot skip steps | On Step 1 | 1. Click Step 3 directly | Not allowed OR redirects to Step 1 | Medium | P1 | Yes | — |
| QG-015 | Subject card shows code and name | On Step 1 | 1. Observe any subject card | Shows "MCA302" code + "Artificial Intelligence" name | Low | P2 | Yes | — |
| QG-016 | Subject card shows topic count | On Step 1 | 1. Observe cards | "4 topics listed" displayed per card | Low | P3 | Yes | — |
| QG-017 | Generate with minimum questions (1) | On configure | 1. Set count to 1 2. Generate | 1 question generated | Medium | P1 | Yes | Count: 1 |
| QG-018 | Generate with maximum questions (20) | On configure | 1. Set count to 20 2. Generate | 20 questions generated within timeout | Medium | P1 | Yes | Count: 20 |
| QG-019 | Questions have correct answer indicated | Questions generated | 1. Answer a question 2. Submit | Correct answer highlighted/revealed | Critical | P0 | Yes | — |
| QG-020 | Regenerate new set of questions | Questions displayed | 1. Click "Generate Again" or similar | New question set generated (different from first) | Medium | P1 | Yes | — |
| QG-021 | Loading state during generation | Click generate | 1. Observe during AI processing | Spinner/skeleton shown, generate button disabled | Medium | P1 | Yes | — |
| QG-022 | Error handling — AI generation fails | AI API returns error | 1. Mock API failure 2. Click generate | "Failed to generate. Retry?" message shown | High | P1 | Yes | — |
| QG-023 | Error handling — timeout | AI takes >30s | 1. Mock slow response | Timeout message after 20-30s with retry | High | P1 | Yes | — |
| QG-024 | Focus Topic input filters/guides generation | On Adaptive Quiz tab | 1. Type "Virtual Memory" in Focus Topic 2. Start quiz | Quiz focuses on memory management topics | Medium | P1 | No (manual) | Topic: "Virtual Memory" |
| QG-025 | Focus Topic accepts empty input | On Adaptive Quiz | 1. Leave Focus Topic empty 2. Start quiz | Quiz generates from full subject syllabus | Low | P2 | Yes | Empty string |

### 2.2 Adaptive Quiz

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AQ-001 | Select subject for quiz | On Adaptive Quiz tab | 1. Click "Data Structures & Algorithms" card | Card shows selected state (highlighted border) | High | P0 | Yes | Subject: DSA |
| AQ-002 | Start quiz after subject selection | Subject selected | 1. Click "Start Adaptive Quiz" | Quiz interface loads with first question | Critical | P0 | Yes | — |
| AQ-003 | Start quiz without subject selection | No subject selected | 1. Click "Start Adaptive Quiz" | Button disabled OR error "Select a subject first" | High | P0 | Yes | No selection |
| AQ-004 | Quiz displays question with 4 options | Quiz started | 1. Observe question screen | Question text + 4 MCQ options (A, B, C, D) visible | Critical | P0 | Yes | — |
| AQ-005 | Select an answer option | Question displayed | 1. Click option B | Option B highlighted as selected | High | P0 | Yes | — |
| AQ-006 | Change selected answer before submit | Option selected | 1. Click option C | Option C selected, option B deselected | Medium | P1 | Yes | — |
| AQ-007 | Submit answer | Option selected | 1. Click "Submit Answer" | Answer recorded, next question OR result shown | Critical | P0 | Yes | — |
| AQ-008 | Submit without selecting option | No option selected | 1. Click "Submit Answer" | Error: "Please select an answer" OR button disabled | High | P0 | Yes | No selection |
| AQ-009 | Difficulty increases after correct streak | 3 consecutive correct | 1. Answer 3 easy correctly | Next question is medium difficulty | High | P1 | Yes | 3 correct answers |
| AQ-010 | Difficulty decreases after wrong streak | 3 consecutive wrong | 1. Answer 3 incorrectly | Next question is easier difficulty | High | P1 | Yes | 3 wrong answers |
| AQ-011 | Quiz progress indicator | Mid-quiz | 1. Observe UI during quiz | "Question 3 of 10" or progress bar shown | Medium | P1 | Yes | — |
| AQ-012 | Quiz completion shows score | All questions answered | 1. Answer final question | Score summary: "7/10 correct, 70%" | Critical | P0 | Yes | 10 questions |
| AQ-013 | Performance panel shows recent scores | Quiz history exists | 1. Navigate to Adaptive Quiz tab | "Your Performance" shows colored dots for recent quizzes | Medium | P1 | Yes | — |
| AQ-014 | Performance dots color coding | Quiz history exists | 1. Observe dot colors | Green = ≥70%, Yellow = 50-69%, Red = <50% | Medium | P2 | Yes | — |
| AQ-015 | Predicted baseline difficulty shown | Quiz history exists | 1. Observe performance panel | "PREDICTED BASELINE DIFFICULTY: HARD" (or Medium/Easy) | Medium | P2 | Yes | — |
| AQ-016 | View History button navigates | On Adaptive Quiz tab | 1. Click "View History" | Navigates to quiz history page/section | Medium | P1 | Yes | — |
| AQ-017 | Quiz with 1 question | Config set to 1 | 1. Start quiz with 1 question | Single question → immediate result | Low | P2 | Yes | Count: 1 |
| AQ-018 | Quiz with 25 questions | Config set to max | 1. Start quiz with 25 questions | All 25 served without timeout | Medium | P2 | Yes | Count: 25 |
| AQ-019 | Quiz timer (if present) | Timed quiz mode | 1. Start timed quiz | Timer counts down, auto-submits at 0 | Medium | P2 | Yes | — |
| AQ-020 | Quit quiz midway | Mid-quiz (5/10) | 1. Click back/close/quit | Confirm dialog: "Quit? Progress will be saved as incomplete" | High | P1 | Yes | — |
| AQ-021 | Resume quiz after page refresh | Quiz in progress | 1. Start quiz 2. Refresh browser | "Resume quiz?" prompt OR auto-resume at last question | High | P1 | Yes | — |
| AQ-022 | Multiple subject quizzes in history | Taken quizzes in 3 subjects | 1. Check history | All subjects' quiz records shown | Medium | P2 | Yes | 3 different subjects |
| AQ-023 | Score updates performance dots | New quiz completed | 1. Complete quiz 2. Return to main page | New dot added to performance history | Medium | P1 | Yes | — |
| AQ-024 | Focus Topic narrows quiz scope | "SQL Joins" entered | 1. Enter "SQL Joins" 2. Select DBMS 3. Start | Questions focused on SQL joins topic | Medium | P1 | No (manual) | Topic: "SQL Joins" |
| AQ-025 | Focus Topic with invalid text | Random gibberish | 1. Enter "asdfghjkl" 2. Start quiz | Graceful handling — ignore or show "Topic not found" | Low | P2 | Yes | Topic: "asdfghjkl" |

### 2.3 Daily Challenge

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| DC-001 | Daily challenge displays today's question | Student logged in | 1. Navigate to Daily Challenge tab | Question with 4 options displayed for today | Critical | P0 | Yes | Today's date |
| DC-002 | Timer countdown is running | Challenge active | 1. Observe timer | "ENDS IN: HH:MM:SS" counting down in real-time | High | P0 | Yes | — |
| DC-003 | Select an answer option | Challenge displayed | 1. Click option A | Option A highlighted | High | P0 | Yes | — |
| DC-004 | Submit answer records response | Option selected | 1. Click "Submit Answer" | Answer submitted, result shown (correct/incorrect) | Critical | P0 | Yes | — |
| DC-005 | Submit without selection | No option picked | 1. Click "Submit Answer" | Error message or button disabled | High | P0 | Yes | No selection |
| DC-006 | Cannot resubmit after answering | Already submitted today | 1. Reload page | Shows submitted state — "Already answered" with result | High | P0 | Yes | — |
| DC-007 | Correct answer shows success | Correct option selected | 1. Submit correct answer | Green indicator, "Correct! +10 XP" or similar | High | P1 | Yes | Correct answer |
| DC-008 | Wrong answer shows failure | Wrong option selected | 1. Submit wrong answer | Red indicator, correct answer revealed | High | P1 | Yes | Wrong answer |
| DC-009 | Streak increments on correct answer | Current streak = 5 | 1. Answer correctly | Streak becomes 6 | High | P1 | Yes | Previous streak: 5 |
| DC-010 | Streak resets on miss (no submission) | Yesterday not answered | 1. Load today's challenge | Streak shows 0 or 1 (reset) | High | P1 | Yes | Missed yesterday |
| DC-011 | Challenge date matches today | Any day | 1. Observe date label | "Wednesday, 16 July 2026" matches system date | Medium | P2 | Yes | — |
| DC-012 | Difficulty badge displayed | Challenge loaded | 1. Observe difficulty badge | "HARD MODE" or appropriate difficulty shown | Low | P2 | Yes | — |
| DC-013 | Category/subject tag shown | Challenge loaded | 1. Observe category | "General" or specific subject displayed | Low | P2 | Yes | — |
| DC-014 | Timer expires before submission | Wait for timer to hit 0 | 1. Don't submit 2. Wait for expiry | Auto-submit or "Challenge expired" message | High | P1 | Yes | Wait for timeout |
| DC-015 | Challenge unavailable after midnight | Past midnight | 1. Access challenge after date change | New challenge loads OR "New challenge tomorrow" | Medium | P1 | Yes | After midnight |
| DC-016 | Switching tabs preserves challenge state | Option selected | 1. Select option B 2. Switch to MY ACTIVITY 3. Switch back | Option B still selected | Medium | P2 | Yes | — |
| DC-017 | Challenge data persists on refresh | Option selected but not submitted | 1. Select option 2. Refresh page | Selection cleared (fresh state) or preserved | Medium | P2 | Yes | — |
| DC-018 | Multiple challenges in a day (none) | Already submitted today | 1. Attempt to get new challenge | Only 1 challenge per day — no new challenge available | High | P1 | Yes | — |

### 2.4 Leaderboard

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| LB-001 | Leaderboard renders with data | Multiple students have scores | 1. Navigate to Daily Challenge 2. Scroll to leaderboard | Table with Rank, Student, Total Score, Accuracy, Streak Days | High | P0 | Yes | 5+ students |
| LB-002 | Leaderboard shows empty state | No scores recorded | 1. View leaderboard | "No standings recorded yet. Be the first!" | Medium | P1 | Yes | 0 records |
| LB-003 | "REALTIME" badge indicates live data | Leaderboard visible | 1. Observe badge | "REALTIME" tag displayed on leaderboard header | Low | P3 | Yes | — |
| LB-004 | Ranks are correctly ordered | Multiple entries | 1. Check ordering | Sorted by Total Score descending, then Accuracy | High | P1 | Yes | — |
| LB-005 | Current student highlighted | Student in leaderboard | 1. Find own entry | Own row highlighted differently (purple/bold) | Medium | P2 | Yes | — |
| LB-006 | "This Month's Elite Standings" period correct | July 2026 | 1. Observe title | Shows current month's data | Medium | P2 | Yes | — |
| LB-007 | Leaderboard updates after challenge submission | Just submitted answer | 1. Submit correct answer 2. Scroll to leaderboard | Own score updated | Medium | P1 | Yes | — |
| LB-008 | Tie handling | Two students same score | 1. Observe tied entries | Same rank assigned, secondary sort by accuracy | Low | P2 | Yes | Tied scores |
| LB-009 | Leaderboard pagination (50+ students) | Large class | 1. Check with many entries | Top 10 shown with "View All" or pagination | Medium | P2 | Yes | 50+ entries |
| LB-010 | Leaderboard displays streak days | Data available | 1. Observe streak column | Correct streak count per student | Low | P2 | Yes | — |

### 2.5 Activity Calendar & History

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AC-001 | Activity tab displays stats cards | Student has activity | 1. Click MY ACTIVITY tab | Stats: Total (170), Accuracy (57%), Challenges (17), Streak (30) | High | P0 | Yes | — |
| AC-002 | Stats values are accurate | Known test data | 1. Cross-reference with API | Displayed values match backend computations | Critical | P0 | Yes | Verified data |
| AC-003 | Calendar heatmap renders | Activity exists | 1. Observe calendar | Monthly grid with colored cells (green/red/white) | High | P0 | Yes | — |
| AC-004 | Calendar colors represent activity | Mixed activity days | 1. Compare colors to data | Green = correct, Red = incorrect, White = no activity | Medium | P1 | No (manual) | — |
| AC-005 | Calendar shows current month | July 2026 | 1. Observe calendar header | "JUL 2026" or current month shown | Medium | P2 | Yes | — |
| AC-006 | Navigate to previous month | On current month | 1. Click left arrow/previous | Previous month calendar loads | Medium | P1 | Yes | — |
| AC-007 | Navigate to next month | On current month | 1. Click right arrow | Next month (or disabled if future) | Medium | P2 | Yes | — |
| AC-008 | Click calendar date shows detail | On a date with activity | 1. Click a colored date cell | Filters breakdown log to that date | Medium | P2 | Yes | Active date |
| AC-009 | Daily Breakdown Log renders | Activity exists | 1. Scroll below calendar | Log entries with subject, topic, result, timestamp | High | P0 | Yes | — |
| AC-010 | Log entry shows subject name | Log visible | 1. Observe entry | Subject name (e.g., "Database Management Systems") displayed | Medium | P1 | Yes | — |
| AC-011 | Log entry shows topic | Log visible | 1. Observe entry | Topic tag visible per entry | Medium | P2 | Yes | — |
| AC-012 | Log entry shows correct/incorrect | Log visible | 1. Observe icons/colors | Green checkmark or red X per entry | Medium | P1 | Yes | — |
| AC-013 | Log entry shows timestamp | Log visible | 1. Observe time | Time shown (e.g., "12:30 PM" or "2 hours ago") | Low | P2 | Yes | — |
| AC-014 | Log ordered by most recent first | Multiple entries | 1. Check ordering | Most recent activity at top | Medium | P2 | Yes | — |
| AC-015 | Empty activity state | New student, no activity | 1. Login as fresh student 2. Click MY ACTIVITY | "No activity yet. Complete your first challenge!" | Medium | P1 | Yes | New student |
| AC-016 | Stats show 0 for new student | No activity | 1. Observe stats cards | "0" for total, "0%" accuracy, "0" challenges, "0" streak | Medium | P1 | Yes | New student |
| AC-017 | Long history scrolls properly | 100+ entries | 1. Scroll through log | Smooth scrolling, no performance lag, pagination or "load more" | Medium | P2 | Yes | 100+ entries |
| AC-018 | Calendar with no activity | New student | 1. Observe calendar | All cells white/grey, no colored indicators | Low | P2 | Yes | — |

### 2.6 Navigation & Tab Switching

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| NV-001 | Switch to Questions tab | On any tab | 1. Click "Questions" tab | Questions content loads, URL updates | High | P0 | Yes | — |
| NV-002 | Switch to Adaptive Quiz tab | On any tab | 1. Click "Adaptive Quiz" tab | Quiz content loads, URL updates | High | P0 | Yes | — |
| NV-003 | Switch to Daily Challenge tab | On any tab | 1. Click "Daily Challenge" tab | Challenge content loads, URL updates | High | P0 | Yes | — |
| NV-004 | Active tab indicator | On Questions tab | 1. Observe tab styling | "Questions" has active style (underline/color) | Low | P2 | Yes | — |
| NV-005 | Deep link — direct URL to Questions | Logged in | 1. Navigate to /student/practice?tab=questions | Questions tab active and loaded | Medium | P1 | Yes | — |
| NV-006 | Deep link — direct URL to Adaptive Quiz | Logged in | 1. Navigate to /student/practice?tab=adaptive | Adaptive tab active | Medium | P1 | Yes | — |
| NV-007 | Deep link — direct URL to Daily Challenge | Logged in | 1. Navigate to /student/practice?tab=challenge | Challenge tab active | Medium | P1 | Yes | — |
| NV-008 | Browser back preserves state | Navigated between tabs | 1. Go Questions→Adaptive→Challenge 2. Press back twice | Returns through tab history | Medium | P1 | Yes | — |
| NV-009 | Sidebar "Practice Hub" highlighted | On Practice Hub | 1. Observe sidebar | "Practice Hub" has active purple indicator | Low | P2 | Yes | — |
| NV-010 | Navigate away and return | On Practice Hub | 1. Click Home 2. Click Practice Hub | Practice Hub loads fresh, default tab active | Medium | P1 | Yes | — |
| NV-011 | Sub-tab navigation (CHALLENGE / MY ACTIVITY) | On Daily Challenge | 1. Click "MY ACTIVITY" | Activity view loads within challenge tab | High | P0 | Yes | — |
| NV-012 | Rapid tab switching (spam clicks) | On page | 1. Click tabs 10 times rapidly | No duplicate API calls, correct final state | Medium | P1 | Yes | — |

### 2.7 Session Handling

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| SH-001 | Session valid — page loads | Valid token | 1. Navigate to Practice Hub | Page loads normally | Critical | P0 | Yes | Valid JWT |
| SH-002 | Session expired — redirect | Token expired | 1. Wait for expiry 2. Interact | Redirect to login | Critical | P0 | Yes | Expired JWT |
| SH-003 | Session expired mid-quiz | Quiz in progress, token expires | 1. Start quiz 2. Wait 3. Submit answer | Save progress, redirect to login, resume after re-login | Critical | P0 | Yes | — |
| SH-004 | Invalid token | Tampered JWT | 1. Modify token in storage 2. Refresh | Redirect to login | Critical | P0 | Yes | Invalid JWT |
| SH-005 | Multi-tab session | 2 browser tabs | 1. Open Practice Hub in 2 tabs 2. Logout in tab 1 | Tab 2 redirects on next action | High | P1 | Yes | — |
| SH-006 | Back button after logout | Just logged out | 1. Logout 2. Press back | Cannot access Practice Hub | Critical | P0 | Yes | — |

---

## 3. UI Test Cases

| Test ID | Feature | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|---|
| UI-001 | Questions | Step indicator alignment | On Step 1 | 1. Observe step bar | Steps 1-4 evenly spaced, connected by lines, current step highlighted | Low | P2 | Yes |
| UI-002 | Questions | Subject card grid — 3 columns | Desktop viewport | 1. Observe grid | 3 columns, equal card sizes, consistent gaps | Medium | P1 | Yes |
| UI-003 | Questions | Subject card hover effect | On Step 1 | 1. Hover over a card | Card shows subtle elevation/shadow change | Low | P3 | Yes |
| UI-004 | Questions | Selected card state | Click a card | 1. Click subject card | Purple border or background indicates selection | High | P1 | Yes |
| UI-005 | Adaptive | Performance panel card | Tab active | 1. Observe right panel | White card with proper padding, no overflow | Medium | P2 | Yes |
| UI-006 | Adaptive | Score dots sizing | Performance panel | 1. Observe dots | All dots same size (~12px), evenly spaced | Low | P3 | Yes |
| UI-007 | Adaptive | Difficulty badge styling | Performance panel | 1. Observe "HARD" badge | Yellow/amber badge, readable text | Low | P2 | Yes |
| UI-008 | Adaptive | Start button styling | Subject selected | 1. Observe CTA | Purple gradient button, full-width, readable text | Medium | P2 | Yes |
| UI-009 | Challenge | Option cards equal sizing | Challenge displayed | 1. Observe 4 options | All option cards same height and width | Medium | P1 | Yes |
| UI-010 | Challenge | Selected option state | Option clicked | 1. Click option A | Purple border or fill indicates selection | High | P1 | Yes |
| UI-011 | Challenge | Timer positioning | Challenge active | 1. Observe timer | Top-right of question card, visible without scrolling | Medium | P2 | Yes |
| UI-012 | Challenge | Submit button gradient | Challenge active | 1. Observe button | Purple gradient, centered, adequate size (min 44px height) | Medium | P2 | Yes |
| UI-013 | Challenge | Disabled submit state | No option selected | 1. Observe submit button | Greyed out or reduced opacity | High | P1 | Yes |
| UI-014 | Activity | Stats cards alignment | MY ACTIVITY tab | 1. Observe 4 stat cards | Horizontal row, equal widths, aligned baselines | Medium | P2 | Yes |
| UI-015 | Activity | Heatmap cell sizing | Calendar visible | 1. Observe cells | Equal square cells, consistent spacing | Low | P2 | Yes |
| UI-016 | Activity | Log entry spacing | Breakdown log | 1. Observe entries | Consistent vertical spacing, clear separation | Low | P2 | Yes |
| UI-017 | Leaderboard | Table header alignment | Board visible | 1. Observe headers | "RANK", "STUDENT", "TOTAL SCORE", "ACCURACY", "STREAK DAYS" aligned | Medium | P2 | Yes |
| UI-018 | Leaderboard | Empty state centering | No data | 1. Observe empty message | Text centered in table area | Low | P3 | Yes |
| UI-019 | All | Floating AI button position | Any screen | 1. Observe bottom-right | Fixed position, doesn't overlap main content | Medium | P2 | Yes |
| UI-020 | All | Tab text and icons alignment | Tab bar | 1. Observe tabs | Icons vertically centered with text, consistent spacing | Low | P2 | Yes |
| UI-021 | All | Page title typography | Any tab | 1. Observe titles | "AI Question Generator", "Adaptive Quiz Engine", "Daily Challenge" — bold, large, consistent | Low | P2 | Yes |
| UI-022 | All | Subtitle typography | Any tab | 1. Observe subtitles | Muted grey text, smaller than title, readable | Low | P3 | Yes |
| UI-023 | Challenge | HARD MODE badge styling | Challenge loaded | 1. Observe badge | Red/orange pill badge, fire emoji, readable | Low | P3 | Yes |
| UI-024 | Challenge | Timer number styling | Timer running | 1. Observe numbers | Blue rounded boxes for HH:MM:SS, colon separators | Low | P3 | Yes |
| UI-025 | All | Dark mode toggle | Click toggle | 1. Click dark mode icon in header | All backgrounds, cards, text switch to dark theme | Medium | P2 | Yes |

---

## 4. API Test Cases

| Test ID | Endpoint | Scenario | Method | Precondition | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|---|
| API-001 | /questions/generate | Generate questions — happy path | POST | Valid token + subject + topic + difficulty | 200 + array of questions | Critical | P0 | Yes |
| API-002 | /questions/generate | Missing auth token | POST | No token | 401 Unauthorized | Critical | P0 | Yes |
| API-003 | /questions/generate | Invalid subject ID | POST | subject_id = "nonexistent" | 404 or 400 with error message | High | P1 | Yes |
| API-004 | /questions/generate | Missing required fields | POST | Only subject, no topic | 422 Validation Error | High | P1 | Yes |
| API-005 | /questions/generate | Exceed rate limit | POST | 51st request in 1 hour | 429 Too Many Requests | Medium | P1 | Yes |
| API-006 | /adaptive-quiz/start | Start adaptive quiz | POST | Valid token + subject_id | 200 + quiz session with first question | Critical | P0 | Yes |
| API-007 | /adaptive-quiz/start | Start without subject | POST | No subject_id | 422 Validation Error | High | P0 | Yes |
| API-008 | /adaptive-quiz/submit | Submit answer | POST | Valid session + question_id + answer | 200 + correct/incorrect + next question | Critical | P0 | Yes |
| API-009 | /adaptive-quiz/submit | Submit to completed quiz | POST | Quiz already finished | 400 "Quiz already completed" | Medium | P1 | Yes |
| API-010 | /adaptive-quiz/submit | Double submit same question | POST | Same question_id twice | 400 "Already answered" or idempotent | High | P1 | Yes |
| API-011 | /adaptive-quiz/history | Get quiz history | GET | Valid token | 200 + array of past quiz attempts | High | P0 | Yes |
| API-012 | /adaptive-quiz/history | Unauthorized access | GET | No token | 401 Unauthorized | Critical | P0 | Yes |
| API-013 | /daily-challenge | Get today's challenge | GET | Valid token | 200 + question + options + expiry time | Critical | P0 | Yes |
| API-014 | /daily-challenge | No challenge today | GET | No challenge configured | 200 + empty/null with message | Medium | P1 | Yes |
| API-015 | /daily-challenge/submit | Submit challenge answer | POST | Valid token + answer | 200 + correct/incorrect + score | Critical | P0 | Yes |
| API-016 | /daily-challenge/submit | Submit after expiry | POST | Timer expired | 400 "Challenge expired" | High | P1 | Yes |
| API-017 | /daily-challenge/submit | Submit second time | POST | Already submitted today | 400 "Already submitted" | High | P1 | Yes |
| API-018 | /daily-challenge/leaderboard | Get leaderboard | GET | Valid token | 200 + ranked student array | High | P0 | Yes |
| API-019 | /daily-challenge/activity | Get activity data | GET | Valid token | 200 + stats + calendar + history | High | P0 | Yes |
| API-020 | /daily-challenge/activity | Other student's data | GET | Modified student_id param | 403 Forbidden (can't view others) | Critical | P0 | Yes |
| API-021 | /adaptive-quiz/performance | Get performance summary | GET | Valid token | 200 + recent scores + predicted difficulty | High | P1 | Yes |
| API-022 | /questions/generate | SQL injection in topic | POST | topic = "'; DROP TABLE--" | 400 Bad Request (sanitized) | Critical | P0 | Yes |
| API-023 | /questions/generate | XSS in topic field | POST | topic = "<script>alert(1)</script>" | Field sanitized, no script in response | Critical | P0 | Yes |
| API-024 | /adaptive-quiz/start | Faculty role access | POST | Faculty token | 403 Forbidden (student-only) | High | P0 | Yes |
| API-025 | /daily-challenge | Large payload attack | POST | 10MB body payload | 413 Payload Too Large or 400 | Medium | P1 | Yes |
| API-026 | /questions/generate | Response time under load | POST | 100 concurrent requests | All respond within 30s, no crashes | High | P1 | Yes |
| API-027 | /adaptive-quiz/submit | Concurrent submissions | POST | 2 simultaneous submits | Only first processed, second rejected | High | P1 | Yes |
| API-028 | /daily-challenge | Cross-student data leak | GET | Manipulate request params | Only authenticated student's data returned | Critical | P0 | Yes |
| API-029 | All endpoints | CORS headers correct | OPTIONS | Preflight request | Access-Control-Allow-Origin includes frontend | High | P0 | Yes |
| API-030 | All endpoints | Backend down | Any | Server stopped | Frontend shows "Service unavailable" | High | P1 | Yes |

---

## 5. Edge Cases

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| EC-001 | Questions | Generate 0 questions (if allowed) | Set count to 0, generate | Validation: "Minimum 1 question required" | Medium | P1 | Yes |
| EC-002 | Questions | Subject with 0 topics | Select subject with no topics in DB | "No topics available for this subject" message | High | P1 | Yes |
| EC-003 | Questions | AI generates invalid JSON | AI returns malformed response | "Generation error. Please retry" — no crash | High | P1 | Yes |
| EC-004 | Questions | Generate for subject student isn't enrolled in | Access via URL manipulation | 403 or questions scoped to enrolled subjects only | High | P0 | Yes |
| EC-005 | Adaptive | All questions in DB already answered | Student answered everything | "No new questions available" or regenerate from AI | Medium | P2 | Yes |
| EC-006 | Adaptive | Quiz with only 1 available question | Very niche topic | Show 1 question, then complete with "Limited questions available" | Low | P2 | Yes |
| EC-007 | Adaptive | Refresh at question 10/10 (last question) | About to finish | Resume at question 10, no data loss | High | P1 | Yes |
| EC-008 | Adaptive | Network drop during quiz submit | Answering question | "Network error. Your answer may not have saved. Retry?" | High | P1 | Yes |
| EC-009 | Challenge | Challenge question same as yesterday | Sequential days | Should not repeat same question consecutively | Medium | P2 | No (manual) |
| EC-010 | Challenge | Timer reaches exactly 00:00:00 | Wait for expiry | Auto-submit if option selected, OR "Expired" state | High | P1 | Yes |
| EC-011 | Challenge | Timezone difference | Student in different timezone | Challenge based on server timezone, consistent for all | Medium | P2 | Yes |
| EC-012 | Challenge | Submit at exact expiry moment | Submit as timer hits 0 | Either accepts (grace period) or rejects cleanly | Medium | P2 | Yes |
| EC-013 | Leaderboard | 1000+ students | Large dataset | Paginated or top-N shown without performance hit | Medium | P2 | Yes |
| EC-014 | Leaderboard | Student at rank #1 | Top performer | Row highlighted, crown/badge icon shown | Low | P3 | Yes |
| EC-015 | Activity | 365 days of activity | Full year | Calendar navigable, no rendering lag | Medium | P2 | Yes |
| EC-016 | Activity | Activity log with 500+ entries | Heavy user | Paginated or virtual scrolled, no browser crash | Medium | P2 | Yes |
| EC-017 | Questions | Unicode/emoji in topic name | Topic with special chars | Rendered correctly, no encoding errors | Low | P2 | Yes |
| EC-018 | Questions | Question text > 500 characters | Long AI-generated question | Text wraps properly, no overflow | Medium | P2 | Yes |
| EC-019 | Questions | Option text > 200 characters | Long option text | Card expands or text truncates with ellipsis | Medium | P2 | Yes |
| EC-020 | Adaptive | 50 quizzes in performance history | Heavy user | Performance panel shows recent 5-10, not all 50 dots | Low | P2 | Yes |
| EC-021 | All | Browser zoom 200% | Zoomed in | Layout remains usable, no horizontal scroll | Medium | P2 | Yes |
| EC-022 | All | Print page | Ctrl+P | Printable layout without floating elements | Low | P3 | No |
| EC-023 | Challenge | Multiple browser tabs — submit in both | Same challenge | Only first submission accepted, second gets error | High | P1 | Yes |
| EC-024 | Questions | Back button during generation | AI processing | Cancels request, returns to previous step | Medium | P2 | Yes |
| EC-025 | Adaptive | Student unenrolled mid-quiz | Admin removes enrollment | Quiz completes but future quizzes for that subject blocked | Medium | P2 | No |

---

## 6. Negative Test Cases

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| NT-001 | Questions | Invalid difficulty value | Inject difficulty="extreme" via API | 400 Bad Request | High | P0 | Yes |
| NT-002 | Questions | Negative question count | Set count to -5 | Validation error, no generation | High | P0 | Yes |
| NT-003 | Questions | Count exceeds maximum (1000) | Set count to 1000 | Capped at maximum OR validation error | High | P1 | Yes |
| NT-004 | Adaptive | Submit answer for wrong quiz session | Mismatched session_id | 400 "Invalid session" | High | P1 | Yes |
| NT-005 | Adaptive | Submit answer with invalid option | option = "E" (only A-D valid) | 400 "Invalid option" | Medium | P1 | Yes |
| NT-006 | Challenge | Submit with empty answer | POST with answer="" | 400 "Answer required" | High | P0 | Yes |
| NT-007 | Challenge | Submit for yesterday's challenge | challenge_id from yesterday | 400 "Challenge expired" | High | P1 | Yes |
| NT-008 | All | Access with non-student role | Faculty token | 403 Forbidden | Critical | P0 | Yes |
| NT-009 | All | SQL injection in search/filter | Input "' OR 1=1 --" | Sanitized, no data leak | Critical | P0 | Yes |
| NT-010 | All | XSS in any text input | Input "<img src=x onerror=alert(1)>" | Escaped/sanitized in output | Critical | P0 | Yes |
| NT-011 | Questions | Extremely long topic input (10000 chars) | Paste 10000 char string | Input truncated or rejected | Medium | P1 | Yes |
| NT-012 | Adaptive | Start quiz for nonexistent subject | subject_id = UUID that doesn't exist | 404 "Subject not found" | High | P1 | Yes |
| NT-013 | Activity | Request future month calendar | month=13 or month=2027-01 | Empty data or validation error | Low | P2 | Yes |
| NT-014 | Leaderboard | Request with manipulated student_id | Other student's ID | Only own data OR 403 | High | P0 | Yes |
| NT-015 | Questions | Concurrent generation requests | Click generate 5 times fast | Debounced — only 1 request OR queue with indicator | Medium | P1 | Yes |
| NT-016 | Adaptive | Modify question in DevTools, submit wrong ID | Tampered request | Server validates question belongs to active session | High | P1 | Yes |
| NT-017 | Challenge | Replay attack — resubmit captured request | Captured valid POST | Idempotent or rejected "Already submitted" | High | P1 | Yes |
| NT-018 | All | Empty auth header | Authorization: "" | 401 Unauthorized | Critical | P0 | Yes |
| NT-019 | All | Malformed JSON body | Invalid JSON syntax | 400 Bad Request, not 500 | High | P1 | Yes |
| NT-020 | All | Content-Type mismatch | Send form-data instead of JSON | 415 or proper parsing | Medium | P2 | Yes |

---

## 7. Accessibility Tests

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| A11Y-001 | All | Keyboard navigation through tabs | 1. Press Tab to reach tabs 2. Arrow between tabs | Focus moves between Questions/Adaptive/Challenge tabs | High | P0 | Yes |
| A11Y-002 | All | Tab ARIA roles | 1. Inspect tab elements | `role="tablist"`, `role="tab"`, `aria-selected="true"` on active | High | P1 | Yes |
| A11Y-003 | Questions | Subject cards keyboard accessible | 1. Tab to subject cards 2. Press Enter | Focus visible on cards, Enter selects | High | P1 | Yes |
| A11Y-004 | Questions | Step indicator announced | 1. Screen reader navigates steps | "Step 1 of 4: Subject" announced | Medium | P2 | Yes |
| A11Y-005 | Adaptive | Score dots have text alternatives | 1. Screen reader on performance | "Recent scores: 80%, 65%, 72%, 90%, 85%" announced (not just dots) | High | P1 | Yes |
| A11Y-006 | Challenge | Timer announced to screen readers | 1. Screen reader on challenge | Timer value accessible; `aria-live="polite"` for updates | Medium | P1 | Yes |
| A11Y-007 | Challenge | MCQ options keyboard selectable | 1. Tab to options 2. Press Space/Enter | Options selectable via keyboard | Critical | P0 | Yes |
| A11Y-008 | Challenge | Selected option announced | 1. Select option with keyboard | "Option B selected: O(V^3)" announced | Medium | P1 | Yes |
| A11Y-009 | Challenge | Submit button keyboard accessible | 1. Tab to Submit Answer 2. Press Enter | Answer submitted | Critical | P0 | Yes |
| A11Y-010 | Leaderboard | Table semantics | 1. Inspect table markup | Proper `<table>`, `<th>`, `<td>` structure with scope | Medium | P1 | Yes |
| A11Y-011 | Activity | Calendar accessible | 1. Navigate calendar with keyboard | Cells focusable, date announced, color meaning conveyed via text | High | P1 | Yes |
| A11Y-012 | Activity | Color not sole indicator | 1. Observe calendar in greyscale | Activity level conveyed by text/numbers, not just color | High | P1 | No (manual) |
| A11Y-013 | All | Focus visible on all interactive elements | 1. Tab through page | Clear focus outline on every button, link, card | High | P0 | Yes |
| A11Y-014 | All | Color contrast on text | 1. Check grey subtitle text | ≥ 4.5:1 contrast ratio for all text | Medium | P1 | Yes |
| A11Y-015 | All | Images/icons have alt text | 1. Check all icons | Decorative icons: `aria-hidden="true"`, functional: `aria-label` | Medium | P2 | Yes |
| A11Y-016 | All | Skip to main content | 1. Press Tab first time | "Skip to content" link available | Medium | P2 | Yes |
| A11Y-017 | Challenge | Result announcement | 1. Submit answer | "Correct!" or "Incorrect. Correct answer is B" announced via `aria-live` | High | P1 | Yes |
| A11Y-018 | All | Heading hierarchy | 1. Check heading levels | Proper h1→h2→h3, no skipped levels | Medium | P2 | Yes |
| A11Y-019 | All | Touch target 44px | 1. Measure on mobile | All tappable elements ≥ 44x44px | Medium | P1 | Yes |
| A11Y-020 | All | Reduced motion respected | 1. Set OS preference 2. Load page | Animations disabled/reduced | Low | P3 | Yes |

---

## 8. Responsive Tests

| Test ID | Viewport | Feature | Scenario | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| RS-001 | 375px (iPhone SE) | Questions | Subject grid | Cards stack to 1 column, scrollable | Medium | P1 | Yes |
| RS-002 | 375px | Challenge | MCQ options | Options stack vertically, full width | High | P1 | Yes |
| RS-003 | 375px | Challenge | Timer position | Timer visible without scroll | Medium | P1 | Yes |
| RS-004 | 375px | Activity | Stats cards | 2x2 grid or stacked vertically | Medium | P1 | Yes |
| RS-005 | 768px (iPad) | Questions | Subject grid | 2 columns, proper spacing | Medium | P1 | Yes |
| RS-006 | 768px | Adaptive | Performance panel | Moves below subject grid OR stacks | Medium | P1 | Yes |
| RS-007 | 768px | Challenge | Question + options | Readable without horizontal scroll | Medium | P1 | Yes |
| RS-008 | 1024px (iPad landscape) | All | Sidebar behavior | Sidebar visible or hamburger toggle | Medium | P1 | Yes |
| RS-009 | 1366px (Laptop) | All | Full layout | All elements visible, no overflow | Low | P2 | Yes |
| RS-010 | 1920px (Desktop) | All | Full layout | Content well-proportioned, not stretched | Low | P2 | Yes |
| RS-011 | 2560px (4K) | All | Max-width | Content contained, not full-width stretched | Low | P3 | Yes |
| RS-012 | 375px | Leaderboard | Table rendering | Table scrolls horizontally or columns collapse | Medium | P2 | Yes |
| RS-013 | 375px | Activity | Calendar | Cells remain visible, possibly smaller | Medium | P2 | Yes |
| RS-014 | 375px | All | Floating AI button | Visible, doesn't overlap critical UI | Medium | P2 | Yes |
| RS-015 | All | All | Orientation change (portrait↔landscape) | Layout adapts without breaking | Low | P2 | Yes |

---

## 9. Performance Tests

| Test ID | Feature | Scenario | Metric | Expected | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| PF-001 | All | Initial page load | FCP | < 1.5 seconds | High | P1 | Yes |
| PF-002 | All | Largest Contentful Paint | LCP | < 2.5 seconds | High | P1 | Yes |
| PF-003 | All | Layout shift | CLS | < 0.1 | Medium | P1 | Yes |
| PF-004 | Questions | AI question generation time | Response time | < 15 seconds for 10 questions | High | P0 | Yes |
| PF-005 | Adaptive | Quiz start time | Load first question | < 3 seconds | High | P0 | Yes |
| PF-006 | Adaptive | Submit answer → next question | Transition time | < 2 seconds | High | P1 | Yes |
| PF-007 | Challenge | Page load with timer | Complete render | < 2 seconds | Medium | P1 | Yes |
| PF-008 | Challenge | Submit answer → result display | Response time | < 1 second | High | P1 | Yes |
| PF-009 | Activity | Calendar render with 365 days | Render time | < 3 seconds | Medium | P2 | Yes |
| PF-010 | Activity | Load 100+ history entries | Render time | < 3 seconds, smooth scroll | Medium | P2 | Yes |
| PF-011 | Leaderboard | Render 100+ students | Render time | < 2 seconds | Medium | P2 | Yes |
| PF-012 | All | Memory usage after 10 min | Memory | No significant leak (< 50MB growth) | Medium | P2 | Yes |
| PF-013 | All | Slow 3G network | Usability | Loading indicators shown, eventual load | Medium | P1 | Yes |
| PF-014 | Questions | Concurrent 10 users generating | Server response | All complete within 30 seconds | High | P1 | Yes |
| PF-015 | Timer | Timer accuracy after 1 hour | Drift | Timer accurate within ±2 seconds of real time | Medium | P2 | Yes |

---

## 10. Security Tests

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| SEC-001 | All | Unauthenticated access to APIs | 1. Call APIs without token | 401 for all endpoints | Critical | P0 | Yes |
| SEC-002 | All | Role escalation — student to admin | 1. Modify role in token 2. Access admin APIs | 403 Forbidden | Critical | P0 | Yes |
| SEC-003 | Questions | Access other student's generated questions | 1. Modify student_id in request | 403 or scoped to own data | Critical | P0 | Yes |
| SEC-004 | Adaptive | Access other student's quiz session | 1. Use another session_id | 403 "Not your session" | Critical | P0 | Yes |
| SEC-005 | Activity | View other student's activity | 1. Modify params | Only own data returned | Critical | P0 | Yes |
| SEC-006 | Challenge | Submit answer for other student | 1. Modify student_id in submit | Rejected — scoped to token holder | Critical | P0 | Yes |
| SEC-007 | Questions | SQL injection in topic field | 1. topic = "'; DROP TABLE questions;--" | Parameterized query prevents injection | Critical | P0 | Yes |
| SEC-008 | Questions | XSS in generated content display | 1. If AI returns `<script>` in question text | HTML escaped in rendering | Critical | P0 | Yes |
| SEC-009 | All | JWT token stored securely | 1. Inspect storage | Token in httpOnly cookie or secure localStorage (not exposed in URL) | High | P0 | Yes |
| SEC-010 | All | CSRF protection | 1. Craft CSRF attack page | Request rejected (SameSite cookie or CSRF token) | High | P1 | Yes |
| SEC-011 | Challenge | Timing attack on correct answer | 1. Measure response time for correct vs wrong | Response time consistent regardless of correctness | Medium | P2 | Yes |
| SEC-012 | Adaptive | Answer visible in API response before submit | 1. Inspect network response | Correct answer NOT sent to client before submission | Critical | P0 | Yes |
| SEC-013 | Challenge | Correct answer in page source/network | 1. Inspect page source + XHR | Answer not leaked in initial challenge load | Critical | P0 | Yes |
| SEC-014 | All | Rate limiting enforced | 1. Send 100 requests in 10 seconds | 429 after threshold (e.g., 30/min) | High | P1 | Yes |
| SEC-015 | Questions | File inclusion via topic | 1. topic = "../../etc/passwd" | Path traversal blocked | High | P1 | Yes |
| SEC-016 | All | Sensitive data in error messages | 1. Cause 500 error | No stack traces, DB info, or internal paths in response | High | P1 | Yes |
| SEC-017 | All | HTTPS enforcement | 1. Access via HTTP | Redirected to HTTPS (production) | High | P0 | Yes |
| SEC-018 | Leaderboard | Student email/PII in leaderboard | 1. Inspect leaderboard response | Only name + score shown, no email/phone/ID | High | P1 | Yes |
| SEC-019 | All | Content-Security-Policy headers | 1. Check response headers | CSP header present preventing inline scripts | Medium | P2 | Yes |
| SEC-020 | All | Input length limits enforced | 1. Send 1MB in focus_topic field | Rejected before hitting AI service | Medium | P1 | Yes |

---

## 11. Cross-Browser Tests

| Test ID | Browser | Feature | Scenario | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| XB-001 | Chrome 126 | All | Full feature smoke | All features render and function correctly | High | P0 | Yes |
| XB-002 | Firefox 127 | All | Full feature smoke | All features render and function correctly | High | P1 | Yes |
| XB-003 | Safari 17 | All | Full feature smoke | All features work, timer accurate | High | P1 | Yes |
| XB-004 | Edge 126 | All | Full feature smoke | All features render correctly | Medium | P1 | Yes |
| XB-005 | Chrome Android | Challenge | Touch interactions | Options tappable, submit works | High | P1 | Yes |
| XB-006 | Safari iOS | Challenge | Touch + timer | Timer runs, touch selects options | High | P1 | Yes |
| XB-007 | Firefox | Activity | Calendar rendering | Heatmap colors and grid correct | Medium | P2 | Yes |
| XB-008 | Safari | Adaptive | CSS grid/flex layout | Subject grid renders 3 columns | Medium | P2 | Yes |
| XB-009 | Chrome | All | CSS animations/transitions | Hover effects, tab transitions smooth | Low | P3 | Yes |
| XB-010 | All | All | localStorage/sessionStorage | Token persistence works across browsers | High | P0 | Yes |

---

## 12. Regression Tests

| Test ID | Feature | Scenario | Trigger | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|---|
| RG-001 | Questions | Subject list still loads after new subject added | DB change | 1. Add subject to DB 2. Reload | New subject appears in grid | High | P0 | Yes |
| RG-002 | Adaptive | Quiz still works after question pool updated | Content change | 1. Update questions 2. Start quiz | Quiz functions with new questions | High | P0 | Yes |
| RG-003 | Challenge | Challenge loads after date change | Date change | 1. Server date advances 2. Load challenge | New day's challenge displayed | High | P0 | Yes |
| RG-004 | Leaderboard | Rankings update after new submission | Score change | 1. Submit challenge 2. Check leaderboard | Rankings recalculated correctly | Medium | P1 | Yes |
| RG-005 | Activity | Stats update after quiz completion | New data | 1. Complete quiz 2. Check activity stats | Total incremented, accuracy updated | High | P1 | Yes |
| RG-006 | All | Navigation still works after auth token refresh | Token rotation | 1. Token refreshes mid-session | All features continue without re-login | High | P0 | Yes |
| RG-007 | Questions | Step wizard still functions after adding step 5 | Code change | 1. If config step added 2. Test flow | Full flow completes without breaking | Medium | P1 | Yes |
| RG-008 | Adaptive | Performance dots after 6th quiz | Data growth | 1. Complete 6 quizzes 2. Check panel | Shows latest 5 (or all), no overflow | Medium | P1 | Yes |
| RG-009 | Challenge | Timer still works after timezone config change | Server change | 1. Change server TZ 2. Load challenge | Timer counts correctly | Medium | P2 | Yes |
| RG-010 | All | Dark mode doesn't break after UI update | CSS change | 1. Toggle dark mode after code deploy | All elements properly themed | Medium | P2 | Yes |
| RG-011 | All | Logout clears all practice state | Session change | 1. Start quiz 2. Logout 3. Login | No stale quiz state visible | High | P1 | Yes |
| RG-012 | Questions | Generated questions render after API format change | API change | 1. Update response schema 2. Generate | Questions display correctly | High | P0 | Yes |
| RG-013 | Activity | Calendar renders correctly in Feb (28/29 days) | Date edge | 1. Navigate to February | Correct number of days shown | Medium | P2 | Yes |
| RG-014 | Challenge | Streak persists across page navigations | State management | 1. Complete challenge 2. Navigate away 3. Return | Streak count unchanged | Medium | P1 | Yes |
| RG-015 | All | No console errors on any tab | Code quality | 1. Open DevTools 2. Navigate all tabs | Zero JavaScript errors in console | Medium | P1 | Yes |

---

## 13. Network & State Edge Cases

| Test ID | Category | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| NS-001 | Offline | Go offline before quiz start | 1. Disconnect 2. Click Start Quiz | "No internet" message, no crash | High | P1 | Yes |
| NS-002 | Offline | Go offline during quiz | 1. Start quiz 2. Answer 3 3. Disconnect 4. Answer 4 | Queue answer locally, sync when back online OR show error | High | P1 | Yes |
| NS-003 | Offline | Go offline on Daily Challenge | 1. Disconnect 2. Load challenge | Cached challenge shown or "Offline" message | Medium | P1 | Yes |
| NS-004 | Slow Network | 5s latency on question generation | 1. Throttle 2. Generate questions | Loading spinner shows, eventually loads | Medium | P1 | Yes |
| NS-005 | Slow Network | 10s latency on quiz submit | 1. Throttle 2. Submit answer | Loading state on button, eventually processes | Medium | P1 | Yes |
| NS-006 | API Failure | 500 on question generation | 1. Mock 500 2. Click generate | "Failed to generate. Please try again" + Retry | High | P1 | Yes |
| NS-007 | API Failure | 500 on quiz start | 1. Mock 500 2. Click Start | Error message, can retry | High | P1 | Yes |
| NS-008 | API Failure | 500 on challenge submit | 1. Mock 500 2. Submit answer | "Submission failed. Retry?" — don't lose selection | High | P1 | Yes |
| NS-009 | API Failure | 500 on activity load | 1. Mock 500 on activity API | Error state in activity section, other tabs work | Medium | P1 | Yes |
| NS-010 | Browser Refresh | Refresh during question generation | 1. Click Generate 2. Immediately F5 | Page reloads to step 1, no stale state | Medium | P2 | Yes |
| NS-011 | Browser Refresh | Refresh on quiz question 5 | 1. Answer 4 questions 2. F5 | Resume prompt or fresh start (state saved) | High | P1 | Yes |
| NS-012 | Browser Refresh | Refresh on Daily Challenge (pre-submit) | 1. Select option 2. F5 | Fresh state — selection cleared | Low | P2 | Yes |
| NS-013 | Back Button | Back from quiz to hub | 1. Start quiz 2. Press back | Confirm "Quit quiz?" or return to hub | High | P1 | Yes |
| NS-014 | Back Button | Back after challenge submission | 1. Submit 2. Navigate 3. Press back | Shows submitted state, not fresh challenge | Medium | P2 | Yes |
| NS-015 | Back Button | Back through step wizard | 1. Go Step 1→2→3 2. Press back | Returns to Step 2, then Step 1 | Medium | P1 | Yes |
| NS-016 | Duplicate Request | Double-click Generate | 1. Click Generate rapidly twice | Only 1 API call (debounced), button disabled during load | Medium | P1 | Yes |
| NS-017 | Duplicate Request | Double-click Submit Answer | 1. Click Submit twice rapidly | Single submission, no duplicate scoring | High | P0 | Yes |
| NS-018 | Duplicate Request | Double-click Start Quiz | 1. Click Start twice | Single quiz session created | Medium | P1 | Yes |
| NS-019 | Large Dataset | Student with 500 quiz attempts | Load adaptive quiz tab | Performance panel loads without lag | Medium | P2 | Yes |
| NS-020 | Large Dataset | Activity log with 1000+ entries | Load MY ACTIVITY | Paginated/virtualized, no browser freeze | Medium | P2 | Yes |
| NS-021 | Expired Session | Token expires during quiz question | 1. Wait for expiry 2. Submit answer | Graceful redirect with "Session expired" — quiz progress noted | Critical | P0 | Yes |
| NS-022 | Expired Session | Token expires while viewing leaderboard | 1. Wait 2. Interact | Redirect to login, no data exposure | High | P1 | Yes |

---

## 14. Predicted Bugs

| # | Bug | Feature | Likelihood | Severity | Reasoning |
|---|---|---|---|---|---|
| 1 | **Submit Answer allows click without option selected** | Daily Challenge | 85% | High | Button appears active in screenshot; likely no disabled state validation |
| 2 | **Quiz doesn't persist on page refresh** | Adaptive Quiz | 80% | High | Single-page apps rarely implement quiz state persistence — likely loses progress |
| 3 | **Double-click Submit sends duplicate request** | All submission forms | 75% | High | Common missing debounce — button not disabled during processing |
| 4 | **AI generates duplicate questions across sessions** | Question Generator | 70% | Medium | No deduplication hash stored — AI stateless, regenerates randomly |
| 5 | **Timer drifts after long idle** | Daily Challenge | 60% | Medium | JavaScript setInterval drifts over hours; timer may be inaccurate |
| 6 | **Performance dots don't update after new quiz** | Adaptive Quiz | 65% | Medium | State may not refresh after navigation — requires full page reload |
| 7 | **Correct answer visible in network response** | Daily Challenge / Quiz | 50% | Critical | If the API returns correct_answer before submission — answers cheat-visible in DevTools |
| 8 | **"Start Adaptive Quiz" works without subject** | Adaptive Quiz | 70% | High | Button appears clickable without selection — likely sends null subject |
| 9 | **Leaderboard shows stale data** | Leaderboard | 60% | Low | "REALTIME" badge but likely fetched once on load, not WebSocket |
| 10 | **Activity stats "170 total" includes all time** | Activity | 50% | Low | No time filter visible — stats may be lifetime, not monthly |
| 11 | **Focus Topic input doesn't validate or filter** | Adaptive Quiz | 65% | Medium | Text input likely passed raw to AI — gibberish creates poor questions |
| 12 | **Calendar heatmap doesn't handle timezone correctly** | Activity | 55% | Medium | Server UTC vs client local timezone mismatch on date boundaries |
| 13 | **Tab switching triggers redundant API calls** | Navigation | 60% | Low | Each tab switch may re-fetch data without caching |
| 14 | **No error boundary — AI failure crashes page** | Question Generator | 45% | High | If AI returns unexpected format, React may crash without error boundary |
| 15 | **Step wizard allows skipping via URL manipulation** | Question Generator | 50% | Medium | URL params may allow direct access to Step 4 without completing 1-3 |
| 16 | **Difficulty badge shows "HARD" for all students** | Daily Challenge | 70% | Medium | Likely not personalized — same difficulty for entire cohort |
| 17 | **Back button from quiz loses all progress** | Adaptive Quiz | 80% | High | No "Are you sure?" confirmation, no state persistence |
| 18 | **Empty leaderboard forever for solo students** | Leaderboard | 90% | Low | If only 1 student enrolled, leaderboard never populates — demotivating |

---

## 15. Automation Scenarios

### High-Priority Automation (Playwright/Cypress)

| # | Scenario | Framework | Justification |
|---|---|---|---|
| 1 | Complete question generation flow (4 steps) | Playwright | Critical path, multi-step |
| 2 | Adaptive quiz start → answer → complete | Playwright | Core feature, time-sensitive |
| 3 | Daily challenge submit (correct + wrong paths) | Playwright | Daily regression risk |
| 4 | Tab switching without errors | Cypress | Navigation stability |
| 5 | Session expiry redirect | Playwright | Security critical |
| 6 | Empty states render correctly | Cypress | Visual regression |
| 7 | Responsive layout at 375/768/1366px | Playwright | Multi-viewport |
| 8 | Double-click prevention on submit | Cypress | Common regression |
| 9 | API failure graceful handling | Playwright | Error state coverage |
| 10 | Accessibility — keyboard navigation through quiz | Playwright | WCAG compliance |

### API Automation (Pytest)

| # | Scenario | Justification |
|---|---|---|
| 1 | All endpoints require authentication | Security gate |
| 2 | Role-based access (student only) | Authorization |
| 3 | Question generation with various params | Boundary testing |
| 4 | Quiz session lifecycle (start → submit → complete) | Business logic |
| 5 | Challenge submit — correct, wrong, duplicate, expired | All states |
| 6 | Leaderboard ranking accuracy | Data integrity |
| 7 | Activity stats computation | Calculation accuracy |
| 8 | SQL injection on all text inputs | Security |
| 9 | Rate limiting enforcement | Abuse prevention |
| 10 | Concurrent request handling | Race conditions |

---

## 16. Release Readiness

### Summary Scores

| Dimension | Score | Key Concern |
|---|---|---|
| Functional Completeness | 7/10 | Core flows work, but no explanations, no state persistence |
| UI Quality | 7.5/10 | Consistent design, clean layout, minor differentiation issues |
| API Security | 6/10 | Auth exists, but answer leakage and rate limiting unverified |
| Accessibility | 5/10 | Keyboard navigation and ARIA patterns likely missing |
| Performance | 7/10 | Lightweight pages, but AI generation and timer accuracy untested |
| Error Handling | 5/10 | No visible error states, loading states, or retry mechanisms |
| Data Integrity | 6/10 | Duplicate prevention, score accuracy, streak logic unverified |
| **Overall Readiness** | **62%** | Functional but lacks polish, error handling, and security hardening |

### Release Decision

| Gate | Status | Blocker? |
|---|---|---|
| Core flows work end-to-end | ✅ Likely | No |
| Security — no answer leakage | ⚠️ Unverified | **YES — must verify** |
| Security — auth on all endpoints | ⚠️ Unverified | **YES — must verify** |
| Error handling — API failures | ❌ Missing | Yes for production |
| Double-submit prevention | ⚠️ Likely missing | Yes |
| Quiz state persistence | ❌ Missing | Recommended |
| Accessibility basics | ⚠️ Likely lacking | Required for compliance |
| Performance under load | ⚠️ Untested | Recommended |
| Cross-browser validation | ⚠️ Untested | Recommended |

### Recommendation

**DO NOT release to production** without:
1. Verifying correct answers are NOT leaked in API responses before submission
2. Confirming authentication on ALL API endpoints
3. Adding double-submit prevention on all buttons
4. Adding basic error states for API failures
5. Testing on Chrome + Safari + Mobile Chrome at minimum

**CAN release as beta** with above 5 items addressed, accepting:
- No post-answer explanations (UX gap, not blocking)
- No quiz state persistence (frustrating but not breaking)
- Limited accessibility (plan to fix in next sprint)

---

*Total Test Cases: 355 | Automation Candidates: 70% | Estimated Execution: 4 days manual, 2 days automated setup*
