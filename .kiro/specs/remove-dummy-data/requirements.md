# Requirements Document

## Introduction

The IntelliLearn frontend currently relies on hardcoded/mock data arrays in multiple components across the HOD, Student, and Notification panels. This feature removes all dummy data and replaces it with live API calls to the existing FastAPI backend, showing loading states during fetch, empty states when no data exists, and error feedback on failure. No new mock data is introduced as fallback under any circumstance.

## Glossary

- **Frontend**: The React/Vite client application serving Student, Faculty, and HOD panels
- **API_Service**: The centralized Axios-based HTTP client (`src/services/api`) used for all backend communication
- **Backend**: The FastAPI application with PostgreSQL (Neon DB) serving REST endpoints
- **HOD_Panel**: The Head of Department administrative interface
- **Student_Panel**: The student-facing interface for learning activities and progress tracking
- **ManageFacultyPage**: The HOD panel page (`ManageFacultyPage.jsx`) displaying faculty members, unassigned subjects, and leave requests
- **AnalyticsData_Module**: The shared mock data file (`analyticsData.js`) exporting heatmap, student, faculty, and department analytics constants
- **StudentHome**: The student dashboard page (`StudentHome.jsx`) displaying performance charts and summary statistics
- **ProgressPage**: The student progress page (`ProgressPage.jsx`) displaying radar charts and subject score breakdowns
- **CreateAnnouncementModal**: The HOD notification modal (`CreateAnnouncementModal.jsx`) for composing and sending announcements
- **AttendanceTab**: The HOD analytics tab (`AttendanceTab.jsx`) for attendance visualization
- **Empty_State**: A UI placeholder indicating no data is available, displayed when an API returns an empty dataset
- **Loading_State**: A UI indicator (spinner or skeleton) shown while an API request is in progress
- **Error_Toast**: A toast notification displayed to the user when an API request fails

## Requirements

### Requirement 1: Remove ManageFacultyPage Mock Data

**User Story:** As an HOD, I want the faculty management page to display real faculty data from the database, so that I can make informed management decisions based on actual records.

#### Acceptance Criteria

1. WHEN ManageFacultyPage mounts, THE Frontend SHALL fetch the faculty list from `/api/v1/hod/faculty/all` using the API_Service
2. WHEN ManageFacultyPage mounts, THE Frontend SHALL fetch unassigned subjects from `/api/v1/hod/faculty/unassigned-subjects` using the API_Service
3. WHEN ManageFacultyPage mounts, THE Frontend SHALL fetch pending leave requests from `/api/v1/hod/faculty/leave-requests` using the API_Service
4. WHILE the faculty data is being fetched, THE Frontend SHALL display a Loading_State in place of the faculty list
5. WHEN the faculty API returns an empty list, THE Frontend SHALL display an Empty_State with a message indicating no faculty members are found
6. WHEN the unassigned subjects API returns an empty list, THE Frontend SHALL display an Empty_State with a message indicating no unassigned subjects exist
7. WHEN the leave requests API returns an empty list, THE Frontend SHALL display an Empty_State with a message indicating no pending leave requests exist
8. IF any of the faculty-related API calls fail, THEN THE Frontend SHALL display an Error_Toast with a descriptive error message
9. THE Frontend SHALL NOT contain the `INITIAL_FACULTY`, `INITIAL_UNASSIGNED`, or `INITIAL_LEAVES` hardcoded arrays in ManageFacultyPage

### Requirement 2: Remove AnalyticsData Module Mock Data

**User Story:** As an HOD, I want the analytics dashboards to display real analytics data from the backend, so that I can monitor actual academic performance and trends.

#### Acceptance Criteria

1. WHEN an analytics tab component mounts, THE Frontend SHALL fetch heatmap data from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
2. WHEN an analytics tab component mounts, THE Frontend SHALL fetch most-missed questions from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
3. WHEN an analytics tab component mounts, THE Frontend SHALL fetch department summary data from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
4. WHEN an analytics tab component mounts, THE Frontend SHALL fetch score trend data from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
5. WHEN an analytics tab component mounts, THE Frontend SHALL fetch the student performance list from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
6. WHEN an analytics tab component mounts, THE Frontend SHALL fetch the faculty analytics list from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
7. WHEN an analytics tab component mounts, THE Frontend SHALL fetch comparative semester data from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
8. WHEN an analytics tab component mounts, THE Frontend SHALL fetch score distribution data from the appropriate `/api/v1/hod/analytics` endpoint using the API_Service
9. WHILE analytics data is being fetched, THE Frontend SHALL display a Loading_State in place of the analytics content
10. WHEN an analytics API returns an empty dataset, THE Frontend SHALL display an Empty_State with a contextual message
11. IF an analytics API call fails, THEN THE Frontend SHALL display an Error_Toast with a descriptive error message
12. THE Frontend SHALL NOT contain the `HEATMAP_DATA`, `MISSED_QUESTIONS`, `DEPT_SUMMARY`, `SCORE_TREND`, `STUDENT_LIST`, `FACULTY_LIST`, `COMPARATIVE_DATA`, or `SCORE_DISTRIBUTION` hardcoded arrays in the AnalyticsData_Module
13. THE Frontend SHALL retain the `DEPARTMENTS`, `DEPT_CONFIG`, `getHeatColor`, and `calcAvg` utility exports in the AnalyticsData_Module since these are configuration and helper functions, not mock data

### Requirement 3: Remove StudentHome Mock Data

**User Story:** As a student, I want my home dashboard to show my actual quiz performance and activity statistics, so that I can track my real learning progress.

#### Acceptance Criteria

1. WHEN StudentHome mounts, THE Frontend SHALL fetch the student overview data from `/analytics/student/overview` using the API_Service
2. WHILE the student overview data is being fetched, THE Frontend SHALL display a Loading_State in place of the performance chart and stats cards
3. WHEN the student overview API returns performance data, THE Frontend SHALL render the performance chart using the fetched subject scores
4. WHEN the student overview API returns activity statistics, THE Frontend SHALL render the stats cards (quizzes taken, average score, doubts asked, days active) using the fetched values
5. WHEN the student overview API returns an empty performance dataset, THE Frontend SHALL display an Empty_State with a message encouraging the student to take quizzes
6. IF the student overview API call fails, THEN THE Frontend SHALL display an Error_Toast with a descriptive error message
7. THE Frontend SHALL NOT contain the hardcoded `performanceData` array or the hardcoded `stats` array in StudentHome

### Requirement 4: Remove ProgressPage Mock Data

**User Story:** As a student, I want my progress page to reflect my actual subject-wise scores and skills breakdown, so that I can identify real strengths and weaknesses.

#### Acceptance Criteria

1. WHEN ProgressPage mounts, THE Frontend SHALL fetch student progress data from `/analytics/student/overview` using the API_Service
2. WHEN the API returns subject performance data, THE Frontend SHALL render the radar chart using actual subject scores
3. WHEN the API returns subject performance data, THE Frontend SHALL render the subject bar chart using actual subject averages
4. WHEN the API returns no subject performance data, THE Frontend SHALL display an Empty_State for the radar chart with a message indicating insufficient data
5. WHEN the API returns no subject performance data, THE Frontend SHALL display an Empty_State for the subject bar chart with a message indicating insufficient data
6. THE Frontend SHALL NOT contain the hardcoded `radarData` array in ProgressPage
7. THE Frontend SHALL NOT use a hardcoded fallback array in the `chartSubjects` assignment in ProgressPage

### Requirement 5: Remove CreateAnnouncementModal Mock Data

**User Story:** As an HOD, I want the announcement modal to show real subjects, faculty members, and recipient counts, so that I can target notifications accurately.

#### Acceptance Criteria

1. WHEN CreateAnnouncementModal opens, THE Frontend SHALL fetch the subject list from `/subjects` using the API_Service
2. WHEN CreateAnnouncementModal opens, THE Frontend SHALL fetch the faculty list from `/api/v1/hod/faculty/all` using the API_Service
3. WHEN CreateAnnouncementModal opens, THE Frontend SHALL fetch student summary counts from `/api/v1/hod/students/summary-counts` using the API_Service
4. WHEN the subject list is fetched, THE Frontend SHALL populate the subject dropdown options using the fetched subjects
5. WHEN the faculty list is fetched, THE Frontend SHALL populate the faculty dropdown options using the fetched faculty names
6. WHEN the summary counts are fetched, THE Frontend SHALL use the fetched counts in the `getRecipientCount` logic instead of hardcoded values
7. WHILE the dropdown data is being fetched, THE Frontend SHALL display a Loading_State within the dropdown fields
8. IF any dropdown data API call fails, THEN THE Frontend SHALL display an Error_Toast with a descriptive error message
9. THE Frontend SHALL NOT contain the hardcoded `SUBJECT_OPTIONS`, `FACULTY_OPTIONS`, or `TARGET_TYPES` count values in CreateAnnouncementModal
10. THE Frontend SHALL NOT contain the hardcoded department student counts in the `getRecipientCount` function

### Requirement 6: Replace AttendanceTab Mock Behavior

**User Story:** As an HOD, I want the attendance tab to show a clean empty state instead of fake random data, so that I am not misled by fabricated statistics.

#### Acceptance Criteria

1. THE Frontend SHALL NOT use `Math.random()` to generate attendance values in AttendanceTab
2. THE Frontend SHALL NOT use the `DATA_AVAILABLE` boolean flag to toggle between mock data and empty state in AttendanceTab
3. WHEN AttendanceTab mounts, THE Frontend SHALL display an Empty_State indicating that attendance tracking is not yet integrated
4. THE Empty_State in AttendanceTab SHALL include a descriptive message explaining that attendance data will be available once the feature is connected
5. THE Frontend SHALL remove all mock attendance percentage calculations from AttendanceTab

### Requirement 7: Consistent Loading States

**User Story:** As a user, I want to see visual feedback while data is loading, so that I know the application is working and not broken.

#### Acceptance Criteria

1. WHILE any API request initiated by removing mock data is in progress, THE Frontend SHALL display a Loading_State that is visually consistent with the existing application design system
2. THE Loading_State SHALL use skeleton loaders or spinner indicators appropriate to the content area size
3. THE Loading_State SHALL prevent interaction with data-dependent UI elements until the data has loaded

### Requirement 8: Consistent Error Handling

**User Story:** As a user, I want to be notified when data fails to load, so that I can understand what went wrong and retry if needed.

#### Acceptance Criteria

1. IF an API call fails due to a network error, THEN THE Frontend SHALL display an Error_Toast with a message indicating a connection problem
2. IF an API call fails due to a server error (HTTP 5xx), THEN THE Frontend SHALL display an Error_Toast with a message indicating a server issue
3. IF an API call fails due to an authentication error (HTTP 401/403), THEN THE Frontend SHALL display an Error_Toast with a message indicating an access problem
4. THE Frontend SHALL use the existing `react-hot-toast` library for all Error_Toast notifications
5. THE Frontend SHALL NOT crash or show a blank screen when an API call fails; the component SHALL remain rendered with the Empty_State or a retry prompt

### Requirement 9: Preserve UI Layout and Styling

**User Story:** As a user, I want the visual layout and styling to remain unchanged after mock data removal, so that my experience is not disrupted.

#### Acceptance Criteria

1. THE Frontend SHALL maintain the existing CSS classes, component structure, and visual layout after replacing mock data with API calls
2. THE Frontend SHALL maintain the existing chart types, colors, and configurations (bar charts, radar charts, line charts, heatmaps)
3. WHEN live data populates a component, THE Frontend SHALL render the data using the same UI components and visual styling previously used with mock data
