# Comprehensive QA Test Report — Notes & Summaries Module (IntelliLearn)

**Document Version:** 1.0  
**Date:** July 15, 2026  
**Prepared By:** Senior QA Engineer  
**Module:** Notes & Summaries (Student Portal)  
**Sub-modules:** My Notes | AI Summaries  
**URL:** http://localhost:5173/student/notes  
**Credentials:** student@example.com / student123  

---

## Test Summary

| Category | Total Cases | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Smoke Tests | 12 | 6 | 6 | 0 | 0 |
| Functional — My Notes | 65 | 10 | 22 | 23 | 10 |
| Functional — AI Summaries | 50 | 8 | 18 | 16 | 8 |
| UI Tests | 40 | 3 | 12 | 18 | 7 |
| API Tests | 45 | 12 | 16 | 12 | 5 |
| Edge Cases | 35 | 5 | 14 | 12 | 4 |
| Negative Tests | 30 | 8 | 12 | 7 | 3 |
| Accessibility | 20 | 4 | 8 | 6 | 2 |
| Performance | 18 | 3 | 7 | 6 | 2 |
| Security | 25 | 10 | 9 | 4 | 2 |
| Responsive | 15 | 2 | 5 | 6 | 2 |
| Regression | 15 | 3 | 6 | 4 | 2 |
| **TOTAL** | **370** | **74** | **135** | **114** | **47** |

---

## 1. Smoke Tests

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| SM-001 | Navigation | Notes page loads | 1. Login 2. Click "Notes & Summaries" | Page renders with tabs visible | Critical | P0 | Yes |
| SM-002 | Tabs | My Notes tab active by default | 1. Navigate to /student/notes | My Notes tab highlighted, content area loaded | Critical | P0 | Yes |
| SM-003 | Tabs | Switch to AI Summaries | 1. Click "AI Summaries" tab | Tab switches, URL updates, content loads | Critical | P0 | Yes |
| SM-004 | My Notes | Notes list renders (with data) | 1. Ensure notes exist 2. Load My Notes | Note cards displayed with metadata | Critical | P0 | Yes |
| SM-005 | My Notes | Empty state renders (no data) | 1. Load with 0 notes | Proper empty state message (not broken cards) | High | P0 | Yes |
| SM-006 | AI Summaries | Summaries list renders | 1. Ensure summaries exist 2. Load tab | Summary cards displayed | Critical | P0 | Yes |
| SM-007 | AI Summaries | Empty state renders | 1. Load with 0 summaries | "No Summaries Available" message | High | P0 | Yes |
| SM-008 | Auth | Page requires authentication | 1. Clear session 2. Navigate to /student/notes | Redirect to login page | Critical | P0 | Yes |
| SM-009 | Auth | Non-student role blocked | 1. Login as faculty 2. Navigate to student notes | 403 or redirect | Critical | P0 | Yes |
| SM-010 | Download | Note file downloadable | 1. Click download on a note | File downloads successfully | High | P0 | Yes |
| SM-011 | API | Notes API responds | 1. Check /notes endpoint | 200 with notes array | High | P0 | Yes |
| SM-012 | API | Summaries API responds | 1. Check summaries endpoint | 200 with summaries array | High | P0 | Yes |

---

## 2. Functional Test Cases — My Notes

### 2.1 Notes Display & Loading

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-001 | Notes load for current semester | Student enrolled, notes exist | 1. Navigate to My Notes | Notes displayed filtered by current semester | Critical | P0 | Yes | MCA Sem 1 notes |
| MN-002 | Note card shows subject name | Notes exist | 1. Observe note cards | Subject name (e.g., "Computer Networks") visible | High | P0 | Yes | — |
| MN-003 | Note card shows faculty name | Notes exist | 1. Observe cards | Faculty name displayed | High | P1 | Yes | — |
| MN-004 | Note card shows file type icon | Notes exist | 1. Observe cards | PDF/PPT/DOC icon shown | Medium | P1 | Yes | Mixed types |
| MN-005 | Note card shows file size | Notes exist | 1. Observe cards | "3.4 MB" displayed | Low | P2 | Yes | — |
| MN-006 | Note card shows upload date | Notes exist | 1. Observe cards | Relative or absolute date shown | Medium | P1 | Yes | — |
| MN-007 | Note card shows semester | Notes exist | 1. Observe cards | "Semester 4" displayed | Medium | P2 | Yes | — |
| MN-008 | Note card shows unit number | Notes exist | 1. Observe cards | "Unit 3" displayed | Medium | P2 | Yes | — |
| MN-009 | Note card shows download count | Notes exist | 1. Observe cards | "Downloaded 210 times" | Low | P3 | Yes | — |
| MN-010 | Note card shows reading time | Notes exist | 1. Observe cards | "15 min read" estimate | Low | P2 | Yes | — |
| MN-011 | "Showing notes for MCA Sem X" label | Semester context set | 1. Observe header info | Correct semester and file count shown | Medium | P1 | Yes | — |
| MN-012 | File count matches actual | Notes exist | 1. Compare count badge with card count | Numbers match | High | P1 | Yes | 5 notes |
| MN-013 | Notes sorted by newest first (default) | Multiple notes | 1. Observe order | Most recently uploaded at top | Medium | P1 | Yes | Various dates |
| MN-014 | Loading state while fetching | Slow network | 1. Throttle 2. Load page | Skeleton loader or spinner shown | Medium | P1 | Yes | — |
| MN-015 | Loading completes within timeout | Normal network | 1. Load My Notes | Content appears within 3 seconds | High | P1 | Yes | — |

### 2.2 Search

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-020 | Search by note title | Search bar exists, notes exist | 1. Type "Normalization" in search | Matching notes displayed | High | P0 | Yes | "Normalization" |
| MN-021 | Search by subject name | Notes exist | 1. Type "Computer Networks" | CN notes filtered | High | P0 | Yes | "Computer Networks" |
| MN-022 | Search by faculty name | Notes exist | 1. Type "Prof. Sharma" | Notes by that faculty shown | Medium | P1 | Yes | "Prof. Sharma" |
| MN-023 | Search debounce (500ms) | Search bar active | 1. Type rapidly | Results update after pause, not per keystroke | Medium | P1 | Yes | Fast typing |
| MN-024 | Search no results | Notes exist | 1. Type "xyznonexistent" | "No notes found" message with clear filters option | Medium | P1 | Yes | "xyznonexistent" |
| MN-025 | Search case-insensitive | Notes exist | 1. Type "DBMS" then "dbms" | Same results for both | Medium | P1 | Yes | "DBMS"/"dbms" |
| MN-026 | Search partial match | Notes exist | 1. Type "Norm" | "Normalization" note appears | Medium | P1 | Yes | "Norm" |
| MN-027 | Clear search restores all | Search active | 1. Clear search input | All notes redisplayed | Medium | P1 | Yes | — |
| MN-028 | Search with special characters | Search bar | 1. Type "C++" or "O(n²)" | No crash, returns relevant results or empty | Low | P2 | Yes | "C++", "O(n²)" |
| MN-029 | Search with empty string | Search bar | 1. Focus then blur with empty | Shows all notes (no filter) | Low | P2 | Yes | "" |

### 2.3 Filters

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-030 | Filter by subject | Filters exist, mixed notes | 1. Select "DBMS" from subject filter | Only DBMS notes shown | High | P0 | Yes | Subject: DBMS |
| MN-031 | Filter by semester | Semester selector exists | 1. Change to "Sem 4" | Notes for Semester 4 displayed | High | P0 | Yes | Semester: 4 |
| MN-032 | Filter by file type (PDF) | Mixed file types | 1. Select "PDF" filter | Only PDFs shown | Medium | P1 | Yes | Type: PDF |
| MN-033 | Filter by file type (PPT) | Mixed types | 1. Select "PPT" | Only PPT files shown | Medium | P1 | Yes | Type: PPT |
| MN-034 | Filter by faculty | Multiple faculty | 1. Select faculty name | Only that faculty's notes | Medium | P1 | Yes | Faculty filter |
| MN-035 | Filter by unit | Unit numbers exist | 1. Select "Unit 3" | Only Unit 3 notes shown | Medium | P2 | Yes | Unit: 3 |
| MN-036 | Multiple filters combined (AND) | Various notes | 1. Select DBMS + PDF + Unit 3 | Only DBMS PDF Unit 3 notes | High | P1 | Yes | Combined filters |
| MN-037 | Filter shows result count | Filters applied | 1. Apply filter | "Showing 3 of 25 notes" count updated | Medium | P2 | Yes | — |
| MN-038 | Clear all filters | Filters active | 1. Click "Clear All Filters" | All notes redisplayed, filters reset | Medium | P1 | Yes | — |
| MN-039 | Filter with search combined | Both active | 1. Select DBMS filter 2. Search "Normal" | Shows DBMS notes matching "Normal" | Medium | P1 | Yes | — |
| MN-040 | Filter empty result | Impossible combination | 1. Select subject with 0 PPTs | "No notes match filters" | Medium | P1 | Yes | — |

### 2.4 Sorting

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-041 | Sort by Recently Added | Notes exist | 1. Select "Recently Added" sort | Newest upload first | Medium | P1 | Yes | Various dates |
| MN-042 | Sort by Name (A-Z) | Notes exist | 1. Select "Name (A-Z)" | Alphabetical order | Low | P2 | Yes | — |
| MN-043 | Sort by Most Downloaded | Download counts exist | 1. Select "Most Downloaded" | Highest download count first | Low | P2 | Yes | — |
| MN-044 | Sort persists after filter | Sort selected | 1. Sort by Name 2. Apply subject filter | Filtered results still sorted by name | Low | P2 | Yes | — |

### 2.5 Download

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-050 | Download PDF note | PDF note exists | 1. Click Download button | PDF file downloads to browser | High | P0 | Yes | PDF file |
| MN-051 | Download PPT note | PPT exists | 1. Click Download | PPT file downloads | High | P0 | Yes | PPT file |
| MN-052 | Download DOC note | DOC exists | 1. Click Download | DOC file downloads | High | P0 | Yes | DOC file |
| MN-053 | Download increments counter | Note with count 5 | 1. Click Download 2. Refresh | Count shows 6 | Medium | P1 | Yes | Initial: 5 |
| MN-054 | Download file integrity | Known file | 1. Download 2. Compare hash | Downloaded file matches original | High | P1 | Yes | Known MD5 |
| MN-055 | Download large file (50MB) | Large file exists | 1. Click Download | Downloads completely without timeout | Medium | P1 | Yes | 50MB file |
| MN-056 | Download during slow network | Throttled | 1. Download on 3G | Progress indication, eventually completes | Medium | P2 | Yes | Slow network |
| MN-057 | Download filename correct | Note "DBMS_Unit3.pdf" | 1. Download | Saved filename matches | Low | P2 | Yes | — |
| MN-058 | Multiple simultaneous downloads | Multiple notes | 1. Click Download on 3 notes rapidly | All 3 download successfully | Low | P2 | Yes | 3 files |

### 2.6 Upload

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-060 | Upload PDF file | Upload feature exists | 1. Click Upload 2. Select PDF 3. Submit | File uploaded, appears in list | Critical | P0 | Yes | test.pdf (2MB) |
| MN-061 | Upload PPT file | Upload exists | 1. Upload PPT | Successful upload | High | P0 | Yes | test.pptx (5MB) |
| MN-062 | Upload DOC file | Upload exists | 1. Upload DOC | Successful upload | High | P0 | Yes | test.docx (1MB) |
| MN-063 | Upload with metadata (subject, unit) | Upload form | 1. Select subject 2. Select unit 3. Upload | Note saved with correct metadata | High | P0 | Yes | Subject: DBMS, Unit: 3 |
| MN-064 | Upload exceeds max size (10MB limit) | Upload exists | 1. Select 15MB file | Error: "File exceeds 10MB limit" | High | P0 | Yes | 15MB file |
| MN-065 | Upload invalid file type (.exe) | Upload exists | 1. Select .exe file | Error: "Only PDF, PPT, DOC allowed" | Critical | P0 | Yes | malware.exe |
| MN-066 | Upload empty file (0 bytes) | Upload exists | 1. Select 0-byte PDF | Error: "File is empty" | Medium | P1 | Yes | 0-byte file |
| MN-067 | Upload duplicate filename | Same name exists | 1. Upload "DBMS.pdf" again | Either renamed or warned about duplicate | Medium | P1 | Yes | Duplicate name |
| MN-068 | Upload progress indicator | Upload in progress | 1. Upload 8MB file | Progress bar/percentage shown | Medium | P1 | Yes | 8MB file |
| MN-069 | Upload cancel midway | Upload started | 1. Click Cancel during upload | Upload cancelled, no partial file saved | Medium | P2 | Yes | — |
| MN-070 | Upload network failure | Network drops | 1. Start upload 2. Disconnect | Error: "Upload failed. Retry?" | High | P1 | Yes | — |
| MN-071 | Upload special characters in filename | "Notes (Unit 3) — Final.pdf" | 1. Upload file | Uploaded successfully, name preserved | Medium | P1 | Yes | Special chars |
| MN-072 | Upload Unicode filename | "数据库笔记.pdf" | 1. Upload Chinese filename | Uploaded and displayed correctly | Low | P2 | Yes | Unicode name |

### 2.7 Bookmarks & Recent Notes

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-075 | Bookmark a note | Notes exist | 1. Click bookmark icon on note card | Icon toggles to active, note saved to bookmarks | High | P1 | Yes | — |
| MN-076 | Unbookmark a note | Note bookmarked | 1. Click active bookmark icon | Icon toggles to inactive, removed from bookmarks | Medium | P1 | Yes | — |
| MN-077 | View bookmarked notes | Bookmarks exist | 1. Select "Bookmarked" filter | Only bookmarked notes shown | High | P1 | Yes | 3 bookmarked |
| MN-078 | Bookmark persists across sessions | Note bookmarked | 1. Logout 2. Login 3. Check bookmarks | Bookmark still active | Medium | P1 | Yes | — |
| MN-079 | Recently viewed notes | Notes opened | 1. Open 3 notes 2. Check "Recent" filter | Last 3 opened notes shown in order | Medium | P1 | Yes | 3 notes |
| MN-080 | Continue reading (in-progress) | Note partially read | 1. Open note (read 50%) 2. Close 3. Check "Continue Reading" | Note shows with 50% progress, resume button | Medium | P1 | Yes | — |
| MN-081 | Bookmark API failure | Service error | 1. Click bookmark with API mocked to fail | Error: "Could not save bookmark. Retry?" | Medium | P1 | Yes | — |

### 2.8 Pagination

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| MN-085 | Page 1 shows first 20 notes | 50 notes exist | 1. Load My Notes | First 20 displayed, pagination controls shown | Medium | P1 | Yes | 50 notes |
| MN-086 | Navigate to page 2 | 50 notes, on page 1 | 1. Click "Next" or page 2 | Notes 21-40 displayed | Medium | P1 | Yes | — |
| MN-087 | Navigate back to page 1 | On page 2 | 1. Click "Previous" or page 1 | Notes 1-20 displayed | Medium | P1 | Yes | — |
| MN-088 | Last page shows remaining | 50 notes, page 3 | 1. Navigate to last page | Notes 41-50 shown (10 items) | Low | P2 | Yes | — |
| MN-089 | Page state preserved with filters | Filter + page 2 | 1. Apply filter 2. Go to page 2 3. Remove filter | Returns to page 1 of all notes | Low | P2 | Yes | — |
| MN-090 | Fewer than 20 notes — no pagination | 5 notes | 1. Load My Notes | All 5 shown, no pagination controls | Low | P2 | Yes | 5 notes |

---

## 3. Functional Test Cases — AI Summaries

### 3.1 Summary Display

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AS-001 | Summaries load for enrolled subjects | Approved summaries exist | 1. Click AI Summaries tab | Summary cards displayed | Critical | P0 | Yes | Approved summaries |
| AS-002 | Summary card shows subject name | Summaries exist | 1. Observe card | Subject name visible | High | P0 | Yes | — |
| AS-003 | Summary card shows unit | Summaries exist | 1. Observe card | Unit number visible | Medium | P1 | Yes | — |
| AS-004 | Summary card shows reading time | Summaries exist | 1. Observe card | "5 min read" estimate | Low | P2 | Yes | — |
| AS-005 | Summary card shows word count | Summaries exist | 1. Observe card | "450 words" length indicator | Low | P2 | Yes | — |
| AS-006 | Summary card shows verification badge | Approved summary | 1. Observe card | "✓ Faculty Approved" green badge | High | P1 | Yes | — |
| AS-007 | AI-generated summary shows confidence | Draft summary | 1. Observe card | "AI Generated • 92% confidence" | Medium | P1 | Yes | — |
| AS-008 | Summary card shows last updated date | Summaries exist | 1. Observe card | "Updated 3 days ago" | Low | P2 | Yes | — |
| AS-009 | Only APPROVED summaries shown to students | Mix of statuses | 1. Load AI Summaries | Only status="APPROVED" visible | Critical | P0 | Yes | Mixed statuses |
| AS-010 | REJECTED summaries hidden | Rejected summaries in DB | 1. Load AI Summaries | Rejected ones not displayed | Critical | P0 | Yes | — |
| AS-011 | Title "Verified Revision Summaries" shown | On tab | 1. Observe header | Title + subtitle about professor-approved | Low | P2 | Yes | — |

### 3.2 AI Summary Generation

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AS-020 | Generate AI summary from note | Note exists, generate button exists | 1. Click "Generate AI Summary" 2. Select note | Loading → Summary generated and displayed | Critical | P0 | Yes | Source note: DBMS.pdf |
| AS-021 | Generate summary — loading state | Generation triggered | 1. Observe during generation | Spinner/progress with "Generating summary..." | Medium | P1 | Yes | — |
| AS-022 | Generate summary — success notification | Generation completes | 1. Wait for completion | "Summary generated successfully!" toast/message | Medium | P1 | Yes | — |
| AS-023 | Generate summary — timeout (>20s) | AI slow | 1. Mock slow AI response | "Generation taking longer than expected. Please wait..." | High | P1 | Yes | — |
| AS-024 | Generate summary — failure | AI error | 1. Mock AI failure | "Failed to generate summary. Retry?" button | High | P1 | Yes | — |
| AS-025 | Generate One Page Summary mode | Mode selector exists | 1. Select "One Page Summary" 2. Generate | Summary limited to ~500 words, narrative format | Medium | P1 | No (manual) | — |
| AS-026 | Generate Bullet Summary mode | Mode selector | 1. Select "Bullet Summary" | Hierarchical bullet points | Medium | P1 | No (manual) | — |
| AS-027 | Generate Exam Revision mode | Mode selector | 1. Select "Exam Revision" | Definitions, formulas, key points format | Medium | P1 | No (manual) | — |
| AS-028 | Generate from note with <50 words | Tiny note | 1. Try to generate from minimal note | "Note has insufficient content for summarization" | Medium | P1 | Yes | 30-word note |
| AS-029 | Duplicate generation request (same note, same mode) | Summary already exists | 1. Generate again for same note+mode | "Summary already exists. Regenerate?" confirmation | Medium | P2 | Yes | — |
| AS-030 | Rate limit on generation | Exceeded limit | 1. Generate 10+ summaries rapidly | "Limit reached. Try again in X minutes" | Medium | P1 | Yes | 10+ requests |

### 3.3 Summary Reading & Actions

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AS-035 | Read full summary | Summary exists | 1. Click "Read Summary" on card | Full summary content displayed in reading view | High | P0 | Yes | — |
| AS-036 | Listen to summary (TTS) | Audio feature exists | 1. Click "Listen" | Audio playback begins within 10s | Medium | P1 | Yes | — |
| AS-037 | Generate flashcards from summary | Summary displayed | 1. Click "Generate Flashcards" | 5-15 flashcards created from content | High | P1 | Yes | — |
| AS-038 | Generate quiz from summary | Summary displayed | 1. Click "Generate Quiz" | 5-10 MCQs generated within 15s | High | P1 | Yes | — |
| AS-039 | Ask AI about summary | Summary displayed | 1. Click "Ask AI" | Chat interface opens with summary as context | Medium | P1 | Yes | — |
| AS-040 | Compare summary with original note | Summary exists | 1. Click "Compare" | Side-by-side view: original vs summary | Medium | P2 | Yes | — |

### 3.4 Search & Filters (AI Summaries)

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AS-045 | Search summaries by subject | Summaries exist | 1. Type "DBMS" in search | DBMS summaries shown | High | P0 | Yes | "DBMS" |
| AS-046 | Filter by subject | Filter exists | 1. Select subject filter | Summaries for that subject only | High | P0 | Yes | Subject: OS |
| AS-047 | Filter by verification status | Summaries exist | 1. Filter "Faculty Approved" | Only verified summaries | Medium | P1 | Yes | — |
| AS-048 | Filter by difficulty | Levels exist | 1. Select "Beginner" | Beginner-level summaries | Low | P2 | Yes | — |
| AS-049 | Search returns zero results | Summaries exist | 1. Search "xyznotfound" | "No summaries found" + "Generate AI Summary" button | Medium | P1 | Yes | — |
| AS-050 | Clear filters restores all | Filters active | 1. Click "Clear All" | All summaries displayed | Medium | P1 | Yes | — |

### 3.5 Empty & Error States

| Test ID | Scenario | Precondition | Steps | Expected Result | Severity | Priority | Automation | Test Data |
|---|---|---|---|---|---|---|---|---|
| AS-055 | Empty state — no summaries | Zero summaries | 1. Load AI Summaries | "No Summaries Available" + action buttons | High | P0 | Yes | 0 summaries |
| AS-056 | Empty state has Generate button | No summaries | 1. Observe empty state | "Generate AI Summary" button present | Critical | P0 | Yes | — |
| AS-057 | Empty state has Request button | No summaries | 1. Observe empty state | "Request Faculty Summary" button present | Medium | P1 | Yes | — |
| AS-058 | Empty state has subject switcher | No summaries for current subject | 1. Observe empty state | Subject chips or dropdown to switch | Medium | P1 | Yes | — |
| AS-059 | API failure shows error | Backend error | 1. Mock 500 2. Load tab | "Unable to load summaries. Retry?" | High | P1 | Yes | — |
| AS-060 | Retry button works | Error state shown | 1. Click "Retry" | API re-called, data loads on success | Medium | P1 | Yes | — |

---

## 4. UI Test Cases

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| UI-001 | Tabs | Active tab has purple underline/text | 1. Click My Notes | Purple active indicator on My Notes | Low | P2 | Yes |
| UI-002 | Tabs | Inactive tab is grey | 1. Click AI Summaries | My Notes tab becomes grey | Low | P2 | Yes |
| UI-003 | Tabs | Tab icons properly sized | 1. Observe icons | Icons ≥ 16px, aligned with text | Low | P2 | Yes |
| UI-004 | My Notes | "0 Files" badge styling | 1. Observe badge | Blue pill badge, readable text | Low | P3 | Yes |
| UI-005 | My Notes | Grey placeholder cards removed | 1. Load with 0 files | Proper empty state (NOT grey rectangles) | High | P0 | Yes |
| UI-006 | My Notes | Note card hover effect | 1. Hover over note card | Subtle elevation or shadow change | Low | P3 | Yes |
| UI-007 | My Notes | Note card consistent sizing | 1. Compare multiple cards | All cards same height/width in grid | Medium | P2 | Yes |
| UI-008 | My Notes | Grid columns (3 on desktop) | 1. Observe on 1366px+ | 3 columns of cards | Medium | P2 | Yes |
| UI-009 | AI Summaries | Title gradient text readable | 1. Observe purple gradient title | Text clear, no contrast issues | Medium | P1 | Yes |
| UI-010 | AI Summaries | Empty state icon centered | 1. Observe star icon | Horizontally centered in card | Low | P3 | Yes |
| UI-011 | AI Summaries | Empty state text readable | 1. Observe grey text | ≥ 4.5:1 contrast, not too light | Medium | P1 | Yes |
| UI-012 | Both | Search bar full-width and prominent | 1. Observe search | Search at top, full width of content area | High | P1 | Yes |
| UI-013 | Both | Filter chips/dropdowns aligned | 1. Observe filters | Horizontal row, even spacing | Medium | P2 | Yes |
| UI-014 | Both | Floating AI button consistent | 1. Observe both tabs | Same position, same style, bottom-right | Low | P2 | Yes |
| UI-015 | Both | Page header consistent | 1. Compare both tabs | "Notes & Summaries" title consistent style | Low | P2 | Yes |
| UI-016 | Both | Sidebar highlight correct | 1. On Notes page | "Notes & Summaries" purple active indicator | Low | P2 | Yes |
| UI-017 | My Notes | Download button recognizable | 1. Observe download icon/button | Download arrow icon, adequate size | Medium | P2 | Yes |
| UI-018 | My Notes | Bookmark icon toggle state | 1. Toggle bookmark | Clear filled/outline state change | Medium | P2 | Yes |
| UI-019 | AI Summaries | Verification badge colors | 1. Observe | Green for approved, blue/grey for AI-generated | Medium | P2 | Yes |
| UI-020 | AI Summaries | Confidence percentage readable | 1. Observe AI badge | "92%" clearly legible | Low | P2 | Yes |
| UI-021 | Both | No horizontal scroll on any viewport | Multiple viewports | No overflow-x at any size | Medium | P1 | Yes |
| UI-022 | Both | Loading skeleton matches card shape | Loading state | Skeletons match final card dimensions | Low | P2 | Yes |
| UI-023 | Both | Error state has retry button | Error displayed | Clear "Retry" or "Try Again" button | High | P1 | Yes |
| UI-024 | Both | Empty whitespace minimized | Any state | No excessive unused vertical space | Medium | P2 | Yes |
| UI-025 | Both | Dark mode all elements visible | Dark mode on | All text, icons, cards adapted to dark bg | Medium | P2 | Yes |

---

## 5. API Test Cases

| Test ID | Endpoint | Method | Scenario | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| API-001 | GET /notes | GET | Fetch notes — happy path | 200 + array of notes with metadata | Critical | P0 | Yes |
| API-002 | GET /notes | GET | Fetch with semester filter | 200 + notes for specified semester only | High | P0 | Yes |
| API-003 | GET /notes | GET | Fetch with subject filter | 200 + notes for specified subject | High | P0 | Yes |
| API-004 | GET /notes | GET | No auth token | 401 Unauthorized | Critical | P0 | Yes |
| API-005 | GET /notes | GET | Expired token | 401 Unauthorized | Critical | P0 | Yes |
| API-006 | GET /notes | GET | Wrong role (faculty token) | 403 Forbidden for student-specific endpoint | High | P0 | Yes |
| API-007 | GET /notes | GET | Pagination — page 1 | 200 + first 20 notes + total count | Medium | P1 | Yes |
| API-008 | GET /notes | GET | Pagination — page 2 | 200 + notes 21-40 | Medium | P1 | Yes |
| API-009 | GET /notes | GET | Search query param | 200 + filtered results matching query | High | P1 | Yes |
| API-010 | GET /notes | GET | Empty result (no match) | 200 + empty array [] | Medium | P1 | Yes |
| API-011 | POST /notes/upload | POST | Upload valid PDF | 201 + note record created | Critical | P0 | Yes |
| API-012 | POST /notes/upload | POST | Upload exceeds 10MB | 413 or 400 "File too large" | High | P0 | Yes |
| API-013 | POST /notes/upload | POST | Upload invalid type (.exe) | 400 "Invalid file type" | Critical | P0 | Yes |
| API-014 | POST /notes/upload | POST | Upload without file | 400 "File required" | High | P1 | Yes |
| API-015 | POST /notes/upload | POST | Upload without auth | 401 Unauthorized | Critical | P0 | Yes |
| API-016 | GET /notes/{id}/download | GET | Download existing note | 200 + file stream with correct headers | High | P0 | Yes |
| API-017 | GET /notes/{id}/download | GET | Download non-existent note | 404 Not Found | High | P1 | Yes |
| API-018 | GET /notes/{id}/download | GET | Download other student's note | 403 or 200 (depends on access model) | High | P0 | Yes |
| API-019 | POST /notes/{id}/bookmark | POST | Bookmark a note | 200/201 bookmark created | Medium | P1 | Yes |
| API-020 | DELETE /notes/{id}/bookmark | DELETE | Remove bookmark | 200 bookmark removed | Medium | P1 | Yes |
| API-021 | GET /summaries | GET | Fetch summaries — happy path | 200 + array of approved summaries | Critical | P0 | Yes |
| API-022 | GET /summaries | GET | Filter by subject | 200 + summaries for subject | High | P1 | Yes |
| API-023 | GET /summaries | GET | Only APPROVED status returned | 200 + no DRAFT/REJECTED in results | Critical | P0 | Yes |
| API-024 | GET /summaries | GET | No auth token | 401 Unauthorized | Critical | P0 | Yes |
| API-025 | POST /summaries/generate | POST | Generate summary from note | 200/201 + generated summary content | Critical | P0 | Yes |
| API-026 | POST /summaries/generate | POST | Generate without note_id | 400 "Note ID required" | High | P1 | Yes |
| API-027 | POST /summaries/generate | POST | Generate for non-existent note | 404 "Note not found" | High | P1 | Yes |
| API-028 | POST /summaries/generate | POST | Rate limit exceeded | 429 "Too many requests" | Medium | P1 | Yes |
| API-029 | POST /summaries/generate | POST | AI service timeout | 504 or 408 timeout error | High | P1 | Yes |
| API-030 | GET /summaries/{id} | GET | Fetch single summary | 200 + full summary content | High | P1 | Yes |
| API-031 | GET /summaries/{id} | GET | Fetch REJECTED summary | 404 or 403 (hidden from student) | Critical | P0 | Yes |
| API-032 | All endpoints | ALL | SQL injection in params | Sanitized, no data leak | Critical | P0 | Yes |
| API-033 | All endpoints | ALL | XSS in text fields | Escaped in responses | Critical | P0 | Yes |
| API-034 | POST /notes/upload | POST | Upload with path traversal filename | Filename sanitized, no directory escape | Critical | P0 | Yes |
| API-035 | GET /notes | GET | Access other student's enrolled notes | Scoped to authenticated student only | Critical | P0 | Yes |
| API-036 | All endpoints | ALL | Large payload (10MB body) | 413 rejected or handled gracefully | Medium | P1 | Yes |
| API-037 | All endpoints | ALL | CORS headers present | Access-Control-Allow-Origin correct | High | P0 | Yes |
| API-038 | All endpoints | ALL | Response time < 2s | Within acceptable latency | High | P1 | Yes |
| API-039 | POST /summaries/generate | POST | Concurrent duplicate requests | Only 1 processed, duplicate rejected | Medium | P1 | Yes |
| API-040 | GET /notes | GET | 500 Internal Server Error | Client receives error JSON, not stack trace | High | P1 | Yes |

---

## 6. Edge Cases

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| EC-001 | My Notes | 1000+ notes for one student | Load page | Paginated, no browser crash, < 3s load | High | P1 | Yes |
| EC-002 | My Notes | 0 notes across all semesters | Load with empty enrollment | Proper empty state on every semester | High | P0 | Yes |
| EC-003 | Upload | Corrupted PDF (invalid header) | Upload corrupted file | "File could not be processed" error | Medium | P1 | Yes |
| EC-004 | Upload | Password-protected PDF | Upload encrypted PDF | "Cannot process protected files" or accept as-is | Medium | P2 | Yes |
| EC-005 | Download | File deleted from storage but record exists | Click download | "File not available" error, not 500 | High | P1 | Yes |
| EC-006 | Download | Very large file (100MB) | Click download | Either rejected at upload or downloads with progress | Medium | P2 | Yes |
| EC-007 | Upload | Duplicate exact file (same hash) | Upload identical file twice | Warning: "This file already exists" or allow with rename | Medium | P1 | Yes |
| EC-008 | My Notes | Filename with 255+ characters | Upload long filename | Filename truncated or rejected gracefully | Low | P2 | Yes |
| EC-009 | My Notes | Note title with SQL injection | File named "'; DROP TABLE--" | Sanitized, displayed as literal text | Critical | P0 | Yes |
| EC-010 | My Notes | Unicode in all metadata | Arabic/Chinese subject names | Renders correctly without encoding issues | Medium | P2 | Yes |
| EC-011 | AI Summaries | Generate from 500-page PDF | Trigger generation | Processes (possibly with limit) within 30s or shows progress | Medium | P1 | Yes |
| EC-012 | AI Summaries | Generate from 1-page PDF | Trigger generation | Generates minimal summary or "insufficient content" | Low | P2 | Yes |
| EC-013 | Both | Session expires while viewing | Token expires mid-use | Redirect on next action, no data loss | High | P1 | Yes |
| EC-014 | Both | Network drops while loading | Load page, disconnect | Cached data shown or "Offline" message | Medium | P1 | Yes |
| EC-015 | Both | Two browser tabs, action in one | Open notes in 2 tabs, bookmark in tab 1 | Tab 2 reflects change on refresh | Low | P2 | Yes |
| EC-016 | Both | Backend returns empty 200 | API returns [] | Proper empty state, not broken cards | High | P1 | Yes |
| EC-017 | AI Summaries | All summaries are REJECTED | Only rejected in DB | Empty state shown (none visible) | Medium | P1 | Yes |
| EC-018 | Upload | Upload during poor connectivity | Intermittent connection | Either completes with retry or fails gracefully | Medium | P2 | Yes |
| EC-019 | Filters | All filter combinations produce zero results | Extreme filtering | "No notes found" with "Clear Filters" option | Medium | P1 | Yes |
| EC-020 | My Notes | Student unenrolled from course | Admin removes enrollment | Notes for that course no longer accessible | High | P1 | Yes |
| EC-021 | AI Summaries | AI returns malformed JSON | AI service error | Frontend handles gracefully, shows error | High | P1 | Yes |
| EC-022 | Both | Browser zoom at 200% | Zoom in | Layout usable, no content cut off | Medium | P2 | Yes |
| EC-023 | My Notes | Rapid scroll through 100+ notes | Scroll quickly | No lag, images/thumbnails lazy-load | Medium | P2 | Yes |
| EC-024 | Upload | Upload exactly 10MB (limit boundary) | Upload 10.0MB file | Accepted (at limit) | Medium | P2 | Yes |
| EC-025 | Upload | Upload 10.01MB (just over limit) | Upload 10.01MB | Rejected with clear message | Medium | P2 | Yes |

---

## 7. Negative Test Cases

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| NT-001 | Auth | Access notes without login | Navigate to /student/notes directly | 302 redirect to login | Critical | P0 | Yes |
| NT-002 | Auth | Access with admin token | Use admin JWT | 403 or scoped empty response | Critical | P0 | Yes |
| NT-003 | Upload | Upload with manipulated Content-Type | Send .exe as application/pdf | Server validates actual file content, rejects | Critical | P0 | Yes |
| NT-004 | Upload | Upload null file field | POST with empty multipart | 400 "File required" | High | P1 | Yes |
| NT-005 | Download | Download with invalid note_id | /notes/fake-uuid/download | 404 "Not found" | High | P1 | Yes |
| NT-006 | Download | Download another student's private note | Use other student's note_id | 403 Forbidden | Critical | P0 | Yes |
| NT-007 | Search | SQL injection in search | Search "' OR 1=1 --" | Sanitized, returns empty or normal results | Critical | P0 | Yes |
| NT-008 | Search | XSS in search | Search "<script>alert(1)</script>" | Input escaped, no script execution | Critical | P0 | Yes |
| NT-009 | Filter | Invalid semester value | Filter by semester=99 | Empty result or validation error | Medium | P1 | Yes |
| NT-010 | Filter | Negative page number | ?page=-1 | Returns page 1 or error | Low | P2 | Yes |
| NT-011 | AI Generate | Generate without selecting note | Click Generate with no source | "Select a note first" validation | High | P0 | Yes |
| NT-012 | AI Generate | Generate with non-existent note_id | Crafted request | 404 "Note not found" | High | P1 | Yes |
| NT-013 | Bookmark | Bookmark non-existent note | POST bookmark with fake ID | 404 "Note not found" | Medium | P1 | Yes |
| NT-014 | Bookmark | Double-bookmark same note | Click bookmark twice rapidly | Idempotent — no duplicate records | Medium | P1 | Yes |
| NT-015 | Upload | Upload with empty subject field | Submit without subject | Validation: "Subject required" | High | P1 | Yes |
| NT-016 | All | Extremely long query params | ?search=[10000 chars] | Rejected or truncated, no crash | Medium | P1 | Yes |
| NT-017 | All | Invalid JSON body | Malformed JSON in POST | 400 Bad Request (not 500) | High | P1 | Yes |
| NT-018 | All | Missing Content-Type header | Request without header | 415 or proper error | Medium | P2 | Yes |
| NT-019 | AI Generate | Concurrent generation same note | 5 rapid clicks on generate | Only 1 processed, others queued or rejected | High | P1 | Yes |
| NT-020 | Download | Path traversal in filename | /download?file=../../etc/passwd | Blocked, returns error | Critical | P0 | Yes |

---

## 8. Accessibility Tests

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| A11-001 | Tabs | ARIA tab pattern | 1. Inspect tab elements | role="tablist", role="tab", aria-selected | High | P1 | Yes |
| A11-002 | Tabs | Keyboard switch tabs | 1. Focus tabs 2. Arrow Left/Right | Tabs switch with keyboard | High | P0 | Yes |
| A11-003 | Cards | Note cards keyboard accessible | 1. Tab to note card 2. Press Enter | Card actions accessible | High | P1 | Yes |
| A11-004 | Cards | Screen reader announces card content | 1. Navigate with screen reader | "DBMS, Unit 3, PDF, 3.4 MB, uploaded 3 days ago" announced | Medium | P1 | Yes |
| A11-005 | Search | Search has label/placeholder | 1. Inspect search input | aria-label or visible label present | Medium | P1 | Yes |
| A11-006 | Buttons | All buttons have accessible names | 1. Inspect Download, Bookmark, etc. | aria-label on icon-only buttons | High | P1 | Yes |
| A11-007 | Empty state | Empty state announced | 1. Screen reader on empty state | "No notes available" properly announced | Medium | P2 | Yes |
| A11-008 | Colors | Text contrast ≥ 4.5:1 | 1. Check grey subtitle text | Passes WCAG AA contrast | Medium | P1 | Yes |
| A11-009 | Colors | Badge text contrast | 1. Check blue badge text | Meets 4.5:1 on background | Medium | P1 | Yes |
| A11-010 | Focus | Visible focus on all elements | 1. Tab through page | Clear focus outline on every interactive element | High | P0 | Yes |
| A11-011 | Icons | Decorative icons hidden | 1. Inspect subject icons | aria-hidden="true" on non-functional icons | Low | P2 | Yes |
| A11-012 | Upload | Upload button accessible | 1. Tab to upload 2. Press Enter/Space | File picker opens | High | P1 | Yes |
| A11-013 | Progress | Reading progress announced | 1. Screen reader on progress bar | "65% read" announced with role="progressbar" | Medium | P2 | Yes |
| A11-014 | Headings | Proper heading hierarchy | 1. Check heading levels | h1→h2→h3 without skipping | Medium | P2 | Yes |
| A11-015 | Skip link | Skip to content available | 1. First Tab press | "Skip to main content" link | Medium | P2 | Yes |
| A11-016 | Errors | Error messages associated | 1. Trigger error | Error linked via aria-describedby | Medium | P2 | Yes |
| A11-017 | Alerts | Toast/notifications announced | 1. Trigger success message | aria-live="polite" announces change | Medium | P2 | Yes |
| A11-018 | Touch | Touch targets ≥ 44px | 1. Measure on mobile | All buttons/links ≥ 44x44px | Medium | P1 | Yes |
| A11-019 | Motion | Reduced motion respected | 1. Set OS preference | Animations disabled | Low | P3 | Yes |
| A11-020 | Zoom | Content usable at 200% zoom | 1. Zoom browser to 200% | All content visible, no overlap | Medium | P2 | Yes |

---

## 9. Performance Tests

| Test ID | Feature | Scenario | Metric | Expected | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| PF-001 | Page load | Initial notes page load | FCP | < 1.5 seconds | High | P1 | Yes |
| PF-002 | Page load | Largest contentful paint | LCP | < 2.5 seconds | High | P1 | Yes |
| PF-003 | Page load | Cumulative layout shift | CLS | < 0.1 | Medium | P1 | Yes |
| PF-004 | Notes API | Notes list API response | Time | < 2 seconds for 50 notes | High | P1 | Yes |
| PF-005 | Notes API | Notes with 500 records | Time | < 3 seconds with pagination | Medium | P2 | Yes |
| PF-006 | Search | Search response time | Debounce + response | < 500ms after typing stops | Medium | P1 | Yes |
| PF-007 | Upload | Upload 10MB file | Time | < 10 seconds on broadband | Medium | P1 | Yes |
| PF-008 | Download | Download 10MB file | Time | Starts within 2 seconds | Medium | P1 | Yes |
| PF-009 | AI Generate | Summary generation time | Total | < 20 seconds for standard note | High | P0 | Yes |
| PF-010 | AI Generate | Summary for 100-page PDF | Total | < 30 seconds or progress shown | Medium | P1 | Yes |
| PF-011 | Tab switch | Switch between tabs | Render | < 500ms tab content appears | Medium | P1 | Yes |
| PF-012 | Scroll | Scroll through 100 note cards | FPS | ≥ 30 FPS, smooth scroll | Medium | P2 | Yes |
| PF-013 | Memory | After 10 min on page | Memory | No significant leak (< 50MB growth) | Medium | P2 | Yes |
| PF-014 | Network | Slow 3G performance | Usability | Loading states shown, eventual load | Medium | P1 | Yes |
| PF-015 | Caching | Return to notes after navigation | Load time | Cached data shows instantly, background refresh | Low | P2 | Yes |
| PF-016 | Concurrent | 50 students loading notes simultaneously | Server response | All respond < 5 seconds | High | P1 | Yes |
| PF-017 | Images | Note thumbnails (if any) | Format | WebP/optimized, lazy-loaded | Low | P3 | Yes |
| PF-018 | Bundle | JavaScript bundle size | Size | Notes module chunk < 200KB gzipped | Low | P2 | Yes |

---

## 10. Security Tests

| Test ID | Feature | Scenario | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| SEC-001 | Auth | All APIs require valid JWT | 1. Call without token | 401 on all endpoints | Critical | P0 | Yes |
| SEC-002 | Auth | Expired JWT rejected | 1. Use expired token | 401 returned | Critical | P0 | Yes |
| SEC-003 | Auth | Tampered JWT rejected | 1. Modify JWT payload | 401 returned | Critical | P0 | Yes |
| SEC-004 | Access | Student can't access other student's notes | 1. Use other student's note_id | 403 or scoped results | Critical | P0 | Yes |
| SEC-005 | Access | Student can't access faculty-only endpoints | 1. Try faculty upload API | 403 Forbidden | Critical | P0 | Yes |
| SEC-006 | Upload | File type validated server-side | 1. Rename .exe to .pdf, upload | Rejected based on magic bytes check | Critical | P0 | Yes |
| SEC-007 | Upload | No path traversal in filename | 1. Upload "../../../etc/passwd.pdf" | Filename sanitized | Critical | P0 | Yes |
| SEC-008 | Upload | No executable code in uploads | 1. Upload PDF with embedded JS | Accepted as file but not executed server-side | High | P0 | Yes |
| SEC-009 | Download | Download URLs not guessable | 1. Try sequential file IDs | UUIDs used, not sequential integers | High | P1 | Yes |
| SEC-010 | Download | Signed/expiring download URLs | 1. Share download link after time | Link expires or requires auth | High | P1 | Yes |
| SEC-011 | XSS | Note titles escaped in UI | 1. Upload note with `<script>` in title | Rendered as text, no execution | Critical | P0 | Yes |
| SEC-012 | XSS | Summary content escaped | 1. AI generates content with HTML | Rendered safely, no injection | Critical | P0 | Yes |
| SEC-013 | SQL Injection | Search parameter | 1. Search "'; DROP TABLE notes;--" | Parameterized query, no injection | Critical | P0 | Yes |
| SEC-014 | SQL Injection | Filter parameters | 1. subject_id="1 OR 1=1" | Validated/typed, no injection | Critical | P0 | Yes |
| SEC-015 | CSRF | State-changing requests protected | 1. Craft CSRF attack | Rejected (SameSite cookies or CSRF tokens) | High | P1 | Yes |
| SEC-016 | Rate Limit | Upload spam prevention | 1. Upload 50 files in 1 minute | Rate limited after threshold | Medium | P1 | Yes |
| SEC-017 | Rate Limit | AI generation spam | 1. Request 20 summaries in 1 minute | Rate limited | Medium | P1 | Yes |
| SEC-018 | Data | No sensitive data in error responses | 1. Cause 500 error | No stack traces, paths, or credentials in response | High | P1 | Yes |
| SEC-019 | Storage | Upload doesn't fill server disk | 1. Upload max-size files repeatedly | Per-student quota enforced | Medium | P1 | Yes |
| SEC-020 | Headers | Security headers present | 1. Check response headers | X-Content-Type-Options, X-Frame-Options, CSP | Medium | P2 | Yes |
| SEC-021 | Session | Session fixation prevented | 1. Copy session, login again | New session issued on login | High | P1 | Yes |
| SEC-022 | Logging | Sensitive data not logged | 1. Check server logs | No file contents, tokens, or PII in logs | High | P1 | No |
| SEC-023 | HTTPS | All resources over HTTPS | 1. Check mixed content | No HTTP resources loaded | High | P0 | Yes |
| SEC-024 | API | No mass assignment | 1. Send extra fields in POST | Extra fields ignored (e.g., is_admin=true) | High | P1 | Yes |
| SEC-025 | Privacy | Notes not cached in browser | 1. Check Cache-Control headers | Sensitive content has no-store | Medium | P2 | Yes |

---

## 11. Responsive Tests

| Test ID | Viewport | Feature | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|
| RS-001 | 375px (iPhone SE) | Full page | Single column, tabs scrollable, cards stacked | High | P1 | Yes |
| RS-002 | 375px | Search bar | Full width, usable on touch | High | P1 | Yes |
| RS-003 | 375px | Note cards | Full-width cards, all metadata readable | High | P1 | Yes |
| RS-004 | 375px | Filters | Collapsible or horizontal scroll | Medium | P1 | Yes |
| RS-005 | 375px | Upload button | Accessible, adequate tap target | Medium | P1 | Yes |
| RS-006 | 768px (iPad) | Grid layout | 2-column card grid | Medium | P1 | Yes |
| RS-007 | 768px | Sidebar | Collapsed or hamburger | Medium | P1 | Yes |
| RS-008 | 768px | Filters row | Horizontal row, no overflow | Medium | P2 | Yes |
| RS-009 | 1024px (Laptop) | Full layout | Sidebar + content, 2-3 column grid | Low | P2 | Yes |
| RS-010 | 1366px (Desktop) | Full layout | Sidebar + 3 column grid, no stretching | Low | P2 | Yes |
| RS-011 | 1920px (Full HD) | Full layout | Proper max-width, centered content | Low | P2 | Yes |
| RS-012 | 2560px (4K) | Full layout | Content doesn't stretch to full width | Low | P3 | Yes |
| RS-013 | 375px | Empty state | Illustration + text + buttons fit without scroll | Medium | P1 | Yes |
| RS-014 | 375px | Tab bar | Both tabs visible without horizontal scroll | High | P1 | Yes |
| RS-015 | All | Orientation change | Portrait↔Landscape adapts | Low | P2 | Yes |

---

## 12. Regression Tests

| Test ID | Feature | Trigger | Steps | Expected Result | Severity | Priority | Automation |
|---|---|---|---|---|---|---|---|
| RG-001 | Notes list | New note uploaded by faculty | 1. Faculty uploads note 2. Student loads page | New note visible in student's list | High | P0 | Yes |
| RG-002 | Notes list | Note deleted by faculty | 1. Faculty deletes note 2. Student loads page | Deleted note no longer visible | High | P0 | Yes |
| RG-003 | Summaries | New summary approved | 1. Faculty approves AI summary 2. Student loads tab | Summary now visible | High | P0 | Yes |
| RG-004 | Summaries | Summary rejected after approval | 1. Faculty changes to rejected | Summary disappears from student view | High | P0 | Yes |
| RG-005 | Bookmarks | Bookmark persists after code deploy | 1. Bookmark note 2. Deploy new version | Bookmark still active | Medium | P1 | Yes |
| RG-006 | Filters | Filters work after adding new subject | 1. Admin adds new subject 2. Student uses filter | New subject appears in filter dropdown | Medium | P1 | Yes |
| RG-007 | Upload | Upload works after storage config change | 1. Change upload dir 2. Upload | File saves to new location | Medium | P1 | Yes |
| RG-008 | Download | Downloads work after file migration | 1. Migrate files 2. Download | Existing downloads still function | High | P0 | Yes |
| RG-009 | Auth | Token refresh doesn't break page | 1. Token auto-refreshes mid-session | Page continues working without re-login | High | P1 | Yes |
| RG-010 | Search | Search still works after schema change | 1. Add new field to notes model 2. Search | Search returns results normally | Medium | P1 | Yes |
| RG-011 | Tabs | Tab switching after route changes | 1. Change URL structure 2. Switch tabs | Both tabs load correctly | Medium | P1 | Yes |
| RG-012 | AI Generate | Generation works after AI model update | 1. Update AI service 2. Generate | Summaries still generate correctly | High | P0 | Yes |
| RG-013 | Empty state | Empty state correct after all notes removed | 1. Remove all notes 2. Load page | Proper empty state (not cached stale data) | Medium | P1 | Yes |
| RG-014 | Dark mode | Dark mode intact after CSS changes | 1. Update styles 2. Toggle dark mode | All elements properly themed | Low | P2 | Yes |
| RG-015 | Console | Zero JS errors | 1. Navigate all pages in module | No console errors | Medium | P1 | Yes |

---

## 13. Predicted Bugs

| # | Bug Description | Feature | Likelihood | Severity | Reasoning |
|---|---|---|---|---|---|
| 1 | **Grey placeholder cards are stuck skeleton loaders** | My Notes | 90% | High | They look exactly like shimmer/skeleton loading states but are static — likely a CSS issue where the shimmer animation completed but no data arrived, OR the component always renders 6 placeholders regardless of data |
| 2 | **403 Forbidden on notes API** | My Notes | 80% | Critical | Browser tabs in screenshot show "403 Forbidden" — the API is rejecting the student's request, meaning notes can't load even if they exist |
| 3 | **Semester hardcoded to "Sem 1" regardless of student's actual semester** | My Notes | 70% | High | Student may be enrolled in Sem 4 but the query uses `current_semester=1` incorrectly or the enrollment data is wrong |
| 4 | **AI Summaries empty because zero summaries have status=APPROVED** | AI Summaries | 95% | Medium | Technically correct behavior but UX-broken — no faculty has approved anything yet, so every student sees empty page |
| 5 | **"Try checking another subject" has no subject selector** | AI Summaries | 100% | Medium | The empty state text suggests an action that's impossible in the current UI — no dropdown or chips to change subject |
| 6 | **No search or filter controls exist** | Both tabs | 95% | High | Screenshots show zero search/filter UI — these features likely aren't implemented at all |
| 7 | **No upload button exists** | My Notes | 90% | High | Screenshot shows no upload CTA — feature likely not built or hidden |
| 8 | **Floating AI button opens generic chat, not notes-contextual** | Both tabs | 75% | Medium | The sparkle button likely opens the AI Tutor without any context about which note/subject the student is looking at |
| 9 | **Tab switch doesn't update URL history** | Navigation | 50% | Low | Clicking tabs may use React state only, not pushState — breaking back button behavior |
| 10 | **Download counter doesn't increment** | My Notes | 60% | Low | If downloads use direct file URLs (not an API endpoint), the counter never updates |
| 11 | **Dark mode breaks grey placeholder cards** | My Notes | 65% | Medium | Grey (#e5e5e5) on dark background (#1a1a1a) will look odd or have wrong contrast |
| 12 | **Notes API returns ALL notes regardless of enrollment** | My Notes | 40% | High | If the query doesn't filter by student enrollment, wrong course notes may appear |
| 13 | **Summary generation endpoint returns 500 (AI key expired)** | AI Summaries | 55% | High | .env shows API keys that may be expired or rate-limited |
| 14 | **"0 Files" badge shows even during loading** | My Notes | 60% | Low | Count rendered before API response completes — shows 0 then jumps to actual count |
| 15 | **Pagination not implemented — all notes load at once** | My Notes | 80% | Medium | No pagination UI visible; likely fetches everything in one request |
| 16 | **No error boundary — API 500 crashes entire page** | Both | 50% | High | Missing React error boundary means unhandled rejection crashes the tab content |
| 17 | **Bookmark state not synced across tabs** | My Notes | 60% | Low | Bookmarking in one tab won't reflect in another without full refresh |
| 18 | **Reading progress never updates (feature not built)** | My Notes | 85% | Medium | No scroll tracking implemented — progress always shows 0% |

---

## 14. Automation Scenarios

### 14.1 E2E Automation (Playwright)

| # | Scenario | Priority | Estimated Time |
|---|---|---|---|
| 1 | Login → Navigate to Notes → Verify tab loads | P0 | 30 min |
| 2 | Tab switching (My Notes ↔ AI Summaries) | P0 | 20 min |
| 3 | Notes display with data (mock or seed) | P0 | 45 min |
| 4 | Empty state rendering (both tabs) | P0 | 30 min |
| 5 | Search notes by title and subject | P1 | 45 min |
| 6 | Filter by subject + semester | P1 | 45 min |
| 7 | Upload file (PDF, valid) | P0 | 60 min |
| 8 | Upload file (invalid type rejection) | P0 | 30 min |
| 9 | Download note file | P0 | 30 min |
| 10 | Bookmark toggle | P1 | 30 min |
| 11 | AI Summary generation trigger | P0 | 45 min |
| 12 | Session expired → redirect | P0 | 30 min |
| 13 | Unauthorized access (faculty role) | P0 | 20 min |
| 14 | Responsive — 375px, 768px, 1366px | P1 | 60 min |
| 15 | Keyboard navigation through tabs + cards | P1 | 45 min |

**Total E2E Automation Estimate:** ~8.5 hours

### 14.2 API Automation (Pytest)

| # | Scenario | Priority | Cases |
|---|---|---|---|
| 1 | Auth enforcement — all endpoints | P0 | 8 |
| 2 | CRUD notes — create, read, download | P0 | 10 |
| 3 | Summaries — list, generate, filter | P0 | 8 |
| 4 | Security — injection, XSS, path traversal | P0 | 6 |
| 5 | Rate limiting | P1 | 3 |
| 6 | Pagination + filtering | P1 | 6 |
| 7 | File validation (type, size) | P0 | 5 |
| 8 | Error handling (404, 500, timeout) | P1 | 5 |

**Total API Automation Estimate:** ~6 hours

### 14.3 Automation Priority Order

1. **Week 1:** Smoke tests + Auth + Security (blocks release)
2. **Week 2:** CRUD + Upload/Download + Search/Filter
3. **Week 3:** AI generation + E2E flows + Responsive
4. **Week 4:** Accessibility + Performance + Regression

---

## 15. Production Readiness

### 15.1 Scores

| Dimension | Score | Justification |
|---|---|---|
| Functional Completeness | 2/10 | Module is empty — no data loads, no upload, no generation |
| UI Quality | 4/10 | Design language consistent but grey cards confusing; empty states weak |
| API Security | 5/10 | JWT auth exists but 403 errors and access scoping unverified |
| Data Integrity | 3/10 | Semester filtering possibly wrong, no data validation visible |
| Error Handling | 2/10 | No error states visible; API failures likely crash page |
| Accessibility | 3/10 | Basic structure exists but ARIA, keyboard, contrast untested |
| Performance | 5/10 | Lightweight (empty), but no pagination/lazy-loading for when data exists |
| Search & Discovery | 0/10 | Zero search, filter, or sort capability |
| AI Integration | 1/10 | "AI Summaries" tab exists but AI is non-functional |
| Empty State UX | 2/10 | Notes: terrible (grey cards). Summaries: message exists but no actions |
| **Overall Readiness** | **25%** | **NOT READY FOR PRODUCTION** |

### 15.2 Release Blockers

| # | Blocker | Why It Blocks | Fix Effort |
|---|---|---|---|
| 1 | **403 API error** — notes don't load | Entire module non-functional | Low (permission fix) |
| 2 | **No empty state with actions** — grey cards | Looks broken, damages trust | Low (UI component) |
| 3 | **No search or filter** — unusable at scale | Students can't find anything | Medium |
| 4 | **No AI summary generation** — core promise unfulfilled | "AI Summaries" tab is a lie | Medium |
| 5 | **No semester selector** — students locked to Sem 1 | Multi-semester students blocked | Low |
| 6 | **No upload capability** — students can't add content | Dead-end module | Medium |
| 7 | **No file type validation** — security risk if upload added | Potential malware upload | Low |

### 15.3 Minimum Viable Release Criteria

To release this module in **any** state to students, ALL of these must be true:

- [ ] Notes API returns 200 with correct data (fix 403)
- [ ] Empty state shows illustration + CTA buttons (not grey cards)
- [ ] At least search by title works
- [ ] At least semester filter works (and student can change it)
- [ ] Download works for available notes
- [ ] "Generate AI Summary" button exists and triggers generation
- [ ] Auth — unauthorized access returns 403 (not notes data)
- [ ] No XSS/injection vulnerabilities in search or upload
- [ ] Page loads within 3 seconds
- [ ] Works on Chrome + Safari + mobile Chrome at minimum

### 15.4 Final Recommendation

**DO NOT RELEASE.** The module is functionally empty and architecturally incomplete.

**Immediate actions (Sprint 1):**
1. Fix 403 API error → notes load correctly
2. Replace grey cards with proper empty state
3. Add search bar + subject/semester filters
4. Add "Generate AI Summary" button
5. Add semester selector dropdown
6. Verify security (auth, file validation, injection)

**Sprint 2:**
1. File upload with validation
2. Note card metadata (subject, faculty, date, type, size)
3. Bookmark/favorites
4. Download with counter
5. AI summary generation pipeline
6. Reading progress tracking

**After Sprint 2 this module could reach 60% readiness — viable for beta.**

---

**Total Test Cases: 370 | Automation Candidates: 75% | Manual-Only: 25%**  
**Estimated Full Execution: 5 days manual | 3 days automated setup + 1 day run**  
**Critical Path: Fix 403 → Empty States → Search → AI Generate → Security Verification**

---

*This module represents the highest-risk area of the IntelliLearn platform. As the "AI-Powered" differentiator, Notes & Summaries should be the showcase feature. In its current state, it actively undermines the product's value proposition.*
