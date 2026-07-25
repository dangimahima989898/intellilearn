# Implementation Plan: Remove Dummy Data

## Overview

Systematically remove all hardcoded/mock data arrays from six frontend components and replace them with live API calls to the existing FastAPI backend. Each component already has backend endpoints available — this is purely frontend refactoring. The pattern is consistent: delete mock constants, add `useEffect` fetch calls using the existing service layer, and add loading/empty/error states.

## Tasks

- [x] 1. Clean ManageFacultyPage — remove dead mock arrays, add loading/empty states
  - [x] 1.1 Remove `INITIAL_FACULTY`, `INITIAL_UNASSIGNED`, and `INITIAL_LEAVES` constant arrays from `ManageFacultyPage.jsx`
    - Delete the three large hardcoded arrays (~200 lines of dead code)
    - Set the initial `loading` state to `true` instead of `false`
    - The existing `syncBackend()` function already fetches from `/api/v1/hod/faculty/all`, `/api/v1/hod/faculty/unassigned-subjects`, and `/api/v1/hod/leave/pending`
    - _Requirements: 1.1, 1.2, 1.3, 1.9_

  - [x] 1.2 Add empty states and error toasts to ManageFacultyPage
    - Add Empty_State component when faculty list is empty (message: "No faculty members found")
    - Add Empty_State component when unassigned subjects list is empty (message: "No unassigned subjects")
    - Add Empty_State component when leave requests list is empty (message: "No pending leave requests")
    - Add `toast.error()` in the `catch` block of `syncBackend()` (currently only `console.error`)
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 1.3 Write smoke test verifying mock arrays are removed from ManageFacultyPage
    - Grep `ManageFacultyPage.jsx` source for `INITIAL_FACULTY`, `INITIAL_UNASSIGNED`, `INITIAL_LEAVES` — assert none found
    - _Requirements: 1.9_

- [x] 2. Clean analyticsData.js — remove 8 mock exports, keep utilities
  - [x] 2.1 Remove mock data exports from `analyticsData.js`
    - Delete the `HEATMAP_DATA`, `MISSED_QUESTIONS`, `DEPT_SUMMARY`, `SCORE_TREND`, `STUDENT_LIST`, `FACULTY_LIST`, `COMPARATIVE_DATA`, and `SCORE_DISTRIBUTION` export declarations
    - Keep `DEPARTMENTS`, `DEPT_CONFIG`, `getHeatColor`, and `calcAvg` utility exports intact
    - _Requirements: 2.12, 2.13_

  - [x] 2.2 Verify no remaining imports of removed exports
    - Search the codebase for any import statements referencing the 8 deleted exports
    - Remove or update any stale import lines found (especially in `AttendanceTab.jsx` which may import `DEPT_SUMMARY`)
    - _Requirements: 2.12_

  - [ ]* 2.3 Write smoke test verifying mock exports are removed and utilities are preserved
    - Grep `analyticsData.js` for removed constant names — assert none found
    - Verify `DEPARTMENTS`, `DEPT_CONFIG`, `getHeatColor`, `calcAvg` still exist in the file
    - _Requirements: 2.12, 2.13_

- [x] 3. Fix StudentHome.jsx — replace hardcoded performanceData and stats with API data
  - [x] 3.1 Remove hardcoded arrays and add API fetch in `StudentHome.jsx`
    - Delete the `const performanceData = [...]` array
    - Delete the `const stats = [...]` array
    - Add state variables: `overview`, `overviewLoading`
    - Add `useEffect` call to `studentService.getOverview()` (or direct `api.get('/analytics/student/overview')`) on mount
    - Derive `performanceData` from `overview.subjects_studied.map(s => ({ subject: s.subject_name.substring(0, 10), score: s.avg_score }))`
    - Derive `stats` from overview fields: `total_quizzes`, `average_score`, `doubts_asked`, `days_active`
    - _Requirements: 3.1, 3.3, 3.4, 3.7_

  - [x] 3.2 Add loading state, empty state, and error handling to StudentHome
    - Show loading skeleton/spinner while `overviewLoading` is true in place of chart and stats cards
    - Show Empty_State for performance chart when `performanceData.length === 0` with message encouraging quizzes
    - Add `toast.error()` in catch block for the overview fetch
    - _Requirements: 3.2, 3.5, 3.6_

  - [ ]* 3.3 Write smoke test verifying hardcoded arrays are removed from StudentHome
    - Grep `StudentHome.jsx` for `const performanceData` and `const stats` as constant declarations — assert none found
    - _Requirements: 3.7_

- [x] 4. Fix ProgressPage.jsx — remove radarData and chartSubjects fallback arrays
  - [x] 4.1 Remove hardcoded `radarData` array and fallback in `chartSubjects` in `ProgressPage.jsx`
    - Delete the hardcoded `const radarData = [...]` array
    - Derive `radarData` from `overview.subjects_studied.map(s => ({ subject: s.subject_name.substring(0, 10), A: s.avg_score, fullMark: 100 }))`
    - Remove the hardcoded fallback array from `chartSubjects` assignment (replace `|| [hardcoded]` with `|| []`)
    - Derive `chartSubjects` from `overview.subjects_studied.map(s => ({ name: s.subject_name.substring(0, 10), percentage: s.avg_score })) || []`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

  - [x] 4.2 Add empty states for radar chart and bar chart in ProgressPage
    - Show Empty_State for radar chart when `radarData.length === 0` with message "Not enough data to display skills breakdown"
    - Show Empty_State for bar chart when `chartSubjects.length === 0` with message "Not enough data to display subject scores"
    - _Requirements: 4.4, 4.5_

  - [ ]* 4.3 Write smoke test verifying mock data is removed from ProgressPage
    - Grep `ProgressPage.jsx` for `const radarData` as a constant declaration — assert none found
    - Verify no hardcoded fallback array in `chartSubjects` assignment
    - _Requirements: 4.6, 4.7_

- [x] 5. Fix CreateAnnouncementModal.jsx — fetch subjects/faculty/counts from API
  - [x] 5.1 Remove hardcoded dropdown options from `CreateAnnouncementModal.jsx`
    - Delete `const SUBJECT_OPTIONS = [...]`
    - Delete `const FACULTY_OPTIONS = [...]`
    - Delete hardcoded department student counts in `getRecipientCount` (e.g., `{ BCA: 65, MCA: 89, ... }`)
    - Keep `DEPT_OPTIONS`, `SEM_OPTIONS`, `NOTIF_TYPES`, `PRIORITY_OPTIONS`, `STEPS` (static UI config)
    - _Requirements: 5.9, 5.10_

  - [x] 5.2 Add API fetches for subjects, faculty, and summary counts in CreateAnnouncementModal
    - Add state: `subjects`, `facultyList`, `summaryCounts`, `dropdownLoading`
    - Add `useEffect` triggered when modal opens to fetch from `/subjects`, `/api/v1/hod/faculty/all`, `/api/v1/hod/students/summary-counts`
    - Populate subject dropdown from `subjects.map(s => \`${s.name} — ${s.course_code} Sem ${s.semester}\`)`
    - Populate faculty dropdown from `facultyList.map(f => f.name)`
    - Modify `getRecipientCount` to use `summaryCounts.total_students`, `summaryCounts.by_department`, etc.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.3 Add loading and error states for CreateAnnouncementModal dropdowns
    - Show loading indicator within dropdown fields while `dropdownLoading` is true
    - Show `toast.error()` if any of the dropdown data APIs fail
    - _Requirements: 5.7, 5.8_

  - [ ]* 5.4 Write smoke test verifying hardcoded options are removed from CreateAnnouncementModal
    - Grep `CreateAnnouncementModal.jsx` for `SUBJECT_OPTIONS` and `FACULTY_OPTIONS` — assert none found
    - _Requirements: 5.9_

- [x] 6. Fix AttendanceTab.jsx — simplify to clean empty state only
  - [x] 6.1 Simplify `AttendanceTab.jsx` to a permanent empty state
    - Delete `const DATA_AVAILABLE = false` flag
    - Delete the entire `if (DATA_AVAILABLE)` conditional block containing mock tables, `Math.random()` calculations, and references to `ATTENDANCE_BY_SUBJECT` / `BELOW_75`
    - Remove `import { DEPT_SUMMARY, DEPT_CONFIG } from './analyticsData'` if present (no longer needed)
    - Keep only the existing "Attendance Data Not Integrated" empty state UI with CSV upload buttons as the sole render output
    - Remove all mock attendance percentage calculations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.2 Write smoke test verifying mock attendance logic is removed
    - Grep `AttendanceTab.jsx` for `DATA_AVAILABLE`, `Math.random` — assert none found
    - _Requirements: 6.1, 6.2, 6.5_

- [x] 7. Final verification checkpoint
  - [x] 7.1 Ensure all tests pass and no removed constants remain anywhere in `src/`
    - Run a project-wide grep for all removed constant names: `INITIAL_FACULTY`, `INITIAL_UNASSIGNED`, `INITIAL_LEAVES`, `HEATMAP_DATA`, `MISSED_QUESTIONS`, `SCORE_TREND`, `STUDENT_LIST`, `FACULTY_LIST`, `COMPARATIVE_DATA`, `SCORE_DISTRIBUTION`, `performanceData` (as const declaration), `radarData` (as const declaration), `SUBJECT_OPTIONS`, `FACULTY_OPTIONS`, `DATA_AVAILABLE`
    - Verify no broken imports exist across the codebase
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 1.9, 2.12, 3.7, 4.6, 4.7, 5.9, 6.1, 6.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific acceptance criteria from the requirements for traceability
- No new backend endpoints are needed — all APIs already exist
- The existing service layer (`hodService.js`, `studentService.js`, `api.js`) handles authentication and error interceptors
- Loading states should use existing project patterns (spinner or skeleton appropriate to content area)
- Error handling uses the existing `react-hot-toast` library already in the project
- Layout and styling must remain unchanged (Requirement 9) — only data source changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["1.3", "2.3", "3.2", "4.2", "5.2", "6.2"] },
    { "id": 3, "tasks": ["3.3", "4.3", "5.3"] },
    { "id": 4, "tasks": ["5.4", "7.1"] }
  ]
}
```
