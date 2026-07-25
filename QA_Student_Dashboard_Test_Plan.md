# QA Test Plan — Student Dashboard (IntelliLearn)

**Document Version:** 1.0  
**Date:** July 15, 2026  
**Prepared By:** Senior QA Engineer  
**Module:** Student Home Dashboard  
**URL:** http://localhost:5173/ (Student Portal)  
**Test Credentials:** student@example.com / student123  

---

## 1. Component Inventory

| # | Component | Location |
|---|-----------|----------|
| 1 | Sidebar Navigation | Left panel |
| 2 | Top Header Bar | Top of page |
| 3 | Streak Badge (Header) | Top center |
| 4 | Dark Mode Toggle | Top right |
| 5 | Notification Bell | Top right |
| 6 | User Profile Indicator | Top right |
| 7 | Greeting Banner | Main content top |
| 8 | Streak Card (Banner) | Greeting banner right |
| 9 | Quick Action Cards (4) | Below greeting |
| 10 | Today's Schedule | Main content center |
| 11 | Upcoming Events | Right sidebar |
| 12 | Your Stats | Right sidebar |
| 13 | Recent Performance Graph | Bottom main area |
| 14 | Floating AI Assistant Button | Bottom right |
| 15 | User Info (Sidebar Bottom) | Sidebar bottom |
| 16 | Logout Button | Sidebar bottom |

---

## 2. Comprehensive Test Cases

### 2.1 Sidebar Navigation

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| SB-001 | Verify all navigation items are visible | Student logged in | 1. Observe sidebar | Home, Notes & Summaries, Practice Hub, AI Tutor, Doubt Board, Schedule, My Progress links visible | | Medium | P1 | |
| SB-002 | Verify active page highlighting | Student on Home page | 1. Observe sidebar | "Home" item highlighted in purple/active state | | Low | P2 | |
| SB-003 | Navigate to Notes & Summaries | Student on Home | 1. Click "Notes & Summaries" | Page navigates to Notes module without errors | | High | P0 | |
| SB-004 | Navigate to Practice Hub | Student on Home | 1. Click "Practice Hub" | Page navigates to Practice Hub | | High | P0 | |
| SB-005 | Navigate to AI Tutor | Student on Home | 1. Click "AI Tutor" | Page navigates to AI Tutor chat interface | | High | P0 | |
| SB-006 | Navigate to Doubt Board | Student on Home | 1. Click "Doubt Board" | Page navigates to Doubt Board | | High | P0 | |
| SB-007 | Navigate to Schedule | Student on Home | 1. Click "Schedule" | Page navigates to full Schedule view | | High | P0 | |
| SB-008 | Navigate to My Progress | Student on Home | 1. Click "My Progress" | Page navigates to Progress/Analytics | | High | P0 | |
| SB-009 | Verify IntelliLearn branding | Student logged in | 1. Observe sidebar top | IntelliLearn logo and "STUDENT PORTAL" label visible | | Low | P3 | |
| SB-010 | Verify sidebar responsiveness on tablet | Screen width 768px | 1. Resize browser to 768px | Sidebar collapses to icon-only or hamburger menu | | Medium | P1 | |
| SB-011 | Verify sidebar responsiveness on mobile | Screen width 375px | 1. Resize to 375px | Sidebar hidden, hamburger menu accessible | | Medium | P1 | |
| SB-012 | Keyboard navigation through sidebar | Student on page | 1. Tab through sidebar items 2. Press Enter on item | Focus moves through items, Enter activates navigation | | Medium | P1 | |
| SB-013 | Verify user info at sidebar bottom | Student logged in | 1. Observe sidebar bottom | "Student User" name and email displayed | | Low | P2 | |
| SB-014 | Click logout button | Student logged in | 1. Click logout icon (arrow) at sidebar bottom | User logged out, redirected to login page | | Critical | P0 | |
| SB-015 | Verify sidebar scroll with many items | Student logged in | 1. Reduce viewport height | Sidebar becomes scrollable if content overflows | | Low | P2 | |

### 2.2 Top Header Bar

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| TH-001 | Verify "Home" page title displayed | Student on dashboard | 1. Observe top header left | "Home" text displayed as page title | | Low | P3 | |
| TH-002 | Verify streak badge in header | Student has streak data | 1. Observe header center | "1 Day Streak" badge with fire emoji displayed | | Medium | P2 | |
| TH-003 | Click streak badge | Student logged in | 1. Click streak badge | Either navigates to streak detail or shows tooltip/modal | | Low | P2 | |
| TH-004 | Verify dark mode toggle icon | Student logged in | 1. Observe top-right area | Moon/sun icon visible for dark mode toggle | | Low | P2 | |
| TH-005 | Toggle dark mode | Student logged in | 1. Click dark mode toggle | UI switches to dark theme, colors invert appropriately | | Medium | P2 | |
| TH-006 | Verify notification bell icon | Student logged in | 1. Observe notification icon | Bell icon with red badge (count "1") visible | | Medium | P1 | |
| TH-007 | Click notification bell | Student logged in | 1. Click notification bell | Notification panel/dropdown opens showing notifications | | High | P1 | |
| TH-008 | Verify notification badge count | Student has 1 unread notification | 1. Observe bell icon | Badge displays "1" | | Medium | P1 | |
| TH-009 | Verify user role label | Student logged in | 1. Observe top-right | "Student" name and "STUDENT" role badge visible | | Low | P3 | |
| TH-010 | Click user profile area | Student logged in | 1. Click user name/avatar | Profile dropdown or profile page navigation | | Medium | P2 | |
| TH-011 | Verify header is sticky on scroll | Page has scroll content | 1. Scroll page down | Header remains fixed at top | | Low | P2 | |

### 2.3 Greeting Banner

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| GB-001 | Verify personalized greeting text | Student logged in | 1. Observe greeting banner | "Good evening, Student! 👋" displayed (time-appropriate greeting) | | Medium | P2 | |
| GB-002 | Verify motivational subtext | Student logged in | 1. Observe subtitle | "Ready to conquer today's challenges?" displayed | | Low | P3 | |
| GB-003 | Verify time-based greeting (Morning) | Login at 9:00 AM | 1. Access dashboard | "Good morning, Student!" displayed | | Medium | P2 | |
| GB-004 | Verify time-based greeting (Afternoon) | Login at 2:00 PM | 1. Access dashboard | "Good afternoon, Student!" displayed | | Medium | P2 | |
| GB-005 | Verify time-based greeting (Evening) | Login at 7:00 PM | 1. Access dashboard | "Good evening, Student!" displayed | | Medium | P2 | |
| GB-006 | Verify streak card inside banner | Student has 1-day streak | 1. Observe right side of banner | Fire icon, "1 Day Streak", "KEEP GOING!" text displayed | | Medium | P2 | |
| GB-007 | Verify streak card with zero streak | Student has 0-day streak | 1. Access dashboard with no streak | Streak card shows "0 Day Streak" or motivational start message | | Medium | P2 | |
| GB-008 | Verify streak card with high streak | Student has 30-day streak | 1. Access dashboard | "30 Day Streak" displayed correctly without overflow | | Low | P3 | |
| GB-009 | Verify banner gradient/background | Student logged in | 1. Observe banner | Dark gradient background with proper contrast for white text | | Low | P3 | |
| GB-010 | Verify student name is dynamic | Different student logged in | 1. Login as different student | Greeting shows that student's actual name | | High | P1 | |

### 2.4 Quick Action Cards

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| QA-001 | Verify Daily Challenge card visible | Student logged in | 1. Observe quick actions row | "Daily Challenge" card with trophy icon, "New challenge waiting!" subtitle, arrow button | | Medium | P1 | |
| QA-002 | Click Daily Challenge card | Student logged in | 1. Click Daily Challenge card or arrow | Navigates to Daily Challenge page/modal | | High | P0 | |
| QA-003 | Verify AI Tutor card visible | Student logged in | 1. Observe quick actions row | "AI Tutor" card with robot icon, "24/7 available" subtitle | | Medium | P1 | |
| QA-004 | Click AI Tutor card | Student logged in | 1. Click AI Tutor card or arrow | Navigates to AI Tutor chat interface | | High | P0 | |
| QA-005 | Verify Generate Questions card | Student logged in | 1. Observe quick actions row | "Generate Questions" card with lightning icon, "Practice any topic" subtitle | | Medium | P1 | |
| QA-006 | Click Generate Questions card | Student logged in | 1. Click card or arrow | Navigates to question generation interface | | High | P0 | |
| QA-007 | Verify Adaptive Quiz card | Student logged in | 1. Observe quick actions row | "Adaptive Quiz" card with target icon, "Auto-difficulty" subtitle | | Medium | P1 | |
| QA-008 | Click Adaptive Quiz card | Student logged in | 1. Click card or arrow | Navigates to adaptive quiz start page | | High | P0 | |
| QA-009 | Verify all 4 cards have consistent styling | Student logged in | 1. Compare all 4 cards | Same height, same padding, same icon size, same font sizes | | Low | P2 | |
| QA-010 | Verify hover effect on action cards | Student logged in | 1. Hover over each card | Card shows hover animation (scale, shadow, or color change) | | Low | P3 | |
| QA-011 | Verify cards responsive on tablet | Screen 768px | 1. Resize to tablet | Cards wrap to 2x2 grid or scroll horizontally | | Medium | P1 | |
| QA-012 | Verify cards responsive on mobile | Screen 375px | 1. Resize to mobile | Cards stack vertically or 2 per row | | Medium | P1 | |
| QA-013 | Verify arrow button color matches card theme | Student logged in | 1. Observe arrows on cards | Daily Challenge arrow is orange, others have respective accent colors | | Low | P3 | |
| QA-014 | Keyboard accessibility of action cards | Student on page | 1. Tab to cards 2. Press Enter | Focus visible on card, Enter triggers navigation | | Medium | P1 | |

### 2.5 Today's Schedule

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| TS-001 | Verify schedule section title | Student logged in | 1. Observe schedule section | "Today's Schedule" title with calendar icon displayed | | Low | P3 | |
| TS-002 | Verify current date displayed | Student logged in | 1. Observe schedule header right | "WED, JUL 15" (current date) shown | | Medium | P2 | |
| TS-003 | Verify schedule entries are listed | Student has classes today | 1. Observe schedule list | All today's classes listed with subject name, room, and time | | High | P0 | |
| TS-004 | Verify subject name in schedule entry | Student logged in | 1. Observe each entry | Subject name (e.g., "Computer Networks") clearly displayed | | Medium | P1 | |
| TS-005 | Verify room number displayed | Student logged in | 1. Observe each entry | "Room: Room 101" displayed below subject name | | Medium | P2 | |
| TS-006 | Verify time slot displayed | Student logged in | 1. Observe each entry | Time range (e.g., "09:00 - 10:00") with clock icon | | Medium | P1 | |
| TS-007 | Verify schedule entries sorted by time | Student has multiple classes | 1. Observe order | Classes listed in chronological order (earliest first) | | High | P1 | |
| TS-008 | Verify purple left border on entries | Student logged in | 1. Observe entries | Each entry has a left purple border/accent line | | Low | P3 | |
| TS-009 | Schedule with no classes today | Student has no classes | 1. Access dashboard on free day | Empty state: "No classes scheduled today" or similar message | | Medium | P1 | |
| TS-010 | Verify schedule with 1 class only | Student has 1 class | 1. Access dashboard | Only 1 schedule entry displayed, layout not broken | | Low | P2 | |
| TS-011 | Verify schedule with 10+ classes | Student has many classes | 1. Access dashboard | All classes listed, scroll or pagination available if overflow | | Medium | P2 | |
| TS-012 | Verify duplicate subject handling | Same subject multiple slots | 1. Observe schedule (as screenshot shows) | Each slot shown individually (e.g., Computer Networks at 09:00, 10:00, 11:00) | | Medium | P2 | |
| TS-013 | Verify current class highlighting | During class time | 1. Access dashboard during a scheduled class | Current active class entry visually highlighted | | Medium | P2 | |
| TS-014 | Verify past class muted styling | After class ended | 1. Access dashboard after some classes ended | Past classes shown in muted/greyed style | | Low | P3 | |
| TS-015 | Click on schedule entry | Student logged in | 1. Click a schedule entry | Either shows details or navigates to class detail | | Low | P2 | |
| TS-016 | Verify schedule API failure | Backend down | 1. Disconnect schedule API 2. Load dashboard | Error message or retry button shown in schedule section | | High | P1 | |
| TS-017 | Verify loading state for schedule | Slow network | 1. Throttle network 2. Load dashboard | Skeleton loader or spinner shown for schedule | | Medium | P2 | |

### 2.6 Upcoming Events

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| UE-001 | Verify Upcoming Events section title | Student logged in | 1. Observe right panel | "Upcoming Events" title displayed | | Low | P3 | |
| UE-002 | Verify empty state message | No events scheduled | 1. Observe events section | "No upcoming events scheduled." displayed | | Medium | P1 | |
| UE-003 | Verify "View all events" link | Student logged in | 1. Observe events section bottom | "View all events →" link visible | | Medium | P2 | |
| UE-004 | Click "View all events" link | Student logged in | 1. Click "View all events →" | Navigates to full events page | | High | P1 | |
| UE-005 | Verify events listed when available | Events exist for student | 1. Create upcoming event 2. Load dashboard | Event card with date, title, details shown | | High | P1 | |
| UE-006 | Verify event card with multiple events | 3+ events exist | 1. Load dashboard | Events listed with proper spacing, no overflow issues | | Medium | P2 | |
| UE-007 | Verify event date formatting | Events exist | 1. Observe event entries | Dates displayed in readable format (e.g., "Jul 20, 2026") | | Low | P3 | |
| UE-008 | Verify events API failure | Backend issue | 1. Mock API failure 2. Load dashboard | Error state or retry option in events section | | Medium | P1 | |

### 2.7 Your Stats

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| YS-001 | Verify "Your Stats" section title | Student logged in | 1. Observe stats section | "Your Stats" title displayed | | Low | P3 | |
| YS-002 | Verify Quizzes Taken metric | Student has quiz data | 1. Observe stats card | "24" with "QUIZZES TAKEN" label displayed | | High | P1 | |
| YS-003 | Verify Avg Score metric | Student has quiz data | 1. Observe stats card | "78%" with "AVG SCORE" label displayed | | High | P1 | |
| YS-004 | Verify Doubts Asked metric | Student has doubt data | 1. Observe stats card | "6" with "DOUBTS ASKED" label displayed | | Medium | P2 | |
| YS-005 | Verify Days Active metric | Student has activity data | 1. Observe stats card | "32" with "DAYS ACTIVE" label displayed | | Medium | P2 | |
| YS-006 | Verify stats are accurate | Known test data | 1. Cross-check with API response | Displayed values match backend data | | Critical | P0 | |
| YS-007 | Verify stats with zero values | New student, no activity | 1. Login as new student | "0" displayed for all metrics without errors | | Medium | P1 | |
| YS-008 | Verify stats with large numbers | Student with 9999 quizzes | 1. Load dashboard | Number displayed without overflow or truncation | | Low | P2 | |
| YS-009 | Verify 4-card grid layout | Student logged in | 1. Observe stats layout | 2x2 grid with equal card sizes | | Low | P3 | |
| YS-010 | Verify stats API failure | Backend issue | 1. Mock stats API failure | Fallback "N/A" or error state shown | | Medium | P1 | |
| YS-011 | Verify percentage formatting | Student has 78.4% avg | 1. Observe avg score | Displayed as "78%" (whole number) | | Low | P3 | |

### 2.8 Recent Performance Graph

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| RP-001 | Verify "Recent Performance" section title | Student logged in | 1. Observe graph section | "Recent Performance" title displayed | | Low | P3 | |
| RP-002 | Verify "LAST 5 QUIZZES" subtitle | Student logged in | 1. Observe graph header right | "LAST 5 QUIZZES" label shown | | Low | P3 | |
| RP-003 | Verify line graph rendered | Student has quiz data | 1. Observe graph area | Line chart with data points plotted correctly | | High | P1 | |
| RP-004 | Verify X-axis labels (subjects) | Student has quiz data | 1. Observe X-axis | Subject abbreviations shown (e.g., "DSA", "DBMS", "OS", "CN", "Java") | | Medium | P2 | |
| RP-005 | Verify Y-axis scale (0-100) | Student logged in | 1. Observe Y-axis | Scale from 0 to 100 with gridlines at 25, 50, 75, 100 | | Medium | P2 | |
| RP-006 | Verify data points plotted correctly | Known quiz scores | 1. Cross-check with API | Data points match actual quiz scores | | Critical | P0 | |
| RP-007 | Verify hover tooltip on data points | Student logged in | 1. Hover over a data point | Tooltip shows exact score value and subject name | | Medium | P2 | |
| RP-008 | Verify graph with no quiz data | New student | 1. Login with no quizzes taken | Empty state: "No quiz data available" or placeholder | | Medium | P1 | |
| RP-009 | Verify graph with 1 quiz only | Student with 1 quiz | 1. Load dashboard | Single data point shown, graph renders correctly | | Low | P2 | |
| RP-010 | Verify graph with all 100% scores | Student aced all quizzes | 1. Load dashboard | Line at top of graph, Y-axis max visible | | Low | P3 | |
| RP-011 | Verify graph with all 0% scores | Student scored 0 | 1. Load dashboard | Line at bottom, graph renders without breaking | | Low | P3 | |
| RP-012 | Verify colored data points | Student logged in | 1. Observe graph | Different colored dots (orange, green, red) indicating performance levels | | Low | P3 | |
| RP-013 | Verify graph responsiveness | Tablet viewport | 1. Resize to 768px | Graph resizes proportionally without data loss | | Medium | P2 | |
| RP-014 | Verify graph API failure | Backend issue | 1. Mock performance API failure | Error message or empty state in graph area | | Medium | P1 | |
| RP-015 | Verify graph loading state | Slow network | 1. Throttle network | Skeleton or spinner shown while loading | | Medium | P2 | |

### 2.9 Floating AI Assistant Button

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| FA-001 | Verify floating button visible | Student logged in | 1. Observe bottom-right corner | Purple floating button with AI/sparkle icon visible | | Medium | P1 | |
| FA-002 | Verify button persists on scroll | Page scrollable | 1. Scroll page up and down | Floating button remains fixed in bottom-right | | Medium | P2 | |
| FA-003 | Click floating AI button | Student logged in | 1. Click floating button | AI assistant menu expands or chat opens | | High | P1 | |
| FA-004 | Verify button on both tabs/pages | Navigate between pages | 1. Navigate to different pages | Floating button visible on all pages | | Medium | P2 | |
| FA-005 | Verify button doesn't overlap content | Various viewports | 1. Check at different screen sizes | Button does not cover important content or text | | Medium | P2 | |
| FA-006 | Keyboard access to floating button | Student on page | 1. Tab to floating button | Button reachable via keyboard, activatable with Enter | | Medium | P1 | |
| FA-007 | Verify ARIA label on floating button | Student on page | 1. Inspect element | Button has aria-label="AI Assistant" or equivalent | | Medium | P2 | |
| FA-008 | Close expanded AI menu | AI menu open | 1. Click outside or press Escape | Menu collapses back to single button | | Medium | P2 | |

---

## 3. Cross-Cutting Test Areas

### 3.1 Responsive Design Testing

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| RD-001 | Dashboard at 1920x1080 (Desktop) | Standard display | 1. Load dashboard at 1920px | Full layout visible, no horizontal scroll | | Low | P2 | |
| RD-002 | Dashboard at 1366x768 (Laptop) | Laptop display | 1. Load at 1366px | All components visible, minor adjustments | | Medium | P1 | |
| RD-003 | Dashboard at 1024x768 (Tablet landscape) | Tablet | 1. Resize to 1024px | Layout adapts, sidebar may collapse | | Medium | P1 | |
| RD-004 | Dashboard at 768x1024 (Tablet portrait) | Tablet portrait | 1. Resize to 768px | Sidebar collapses, content stacks | | Medium | P1 | |
| RD-005 | Dashboard at 375x667 (iPhone SE) | Mobile | 1. Resize to 375px | Single-column layout, all content accessible | | Medium | P1 | |
| RD-006 | Dashboard at 390x844 (iPhone 14) | Mobile | 1. Resize to 390px | All cards readable, no text truncation | | Medium | P1 | |
| RD-007 | Dashboard at 412x915 (Android) | Mobile | 1. Resize to 412px | Layout consistent with other mobile sizes | | Low | P2 | |
| RD-008 | Dashboard at 2560x1440 (4K) | Large display | 1. Load at 2560px | Content centered or fills appropriately, no stretching | | Low | P3 | |

### 3.2 Cross-Browser Testing

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| CB-001 | Dashboard in Chrome (latest) | Chrome installed | 1. Open dashboard | All components render correctly | | High | P0 | |
| CB-002 | Dashboard in Firefox (latest) | Firefox installed | 1. Open dashboard | All components render correctly | | High | P1 | |
| CB-003 | Dashboard in Safari (latest) | Safari available | 1. Open dashboard | All components render correctly | | High | P1 | |
| CB-004 | Dashboard in Edge (latest) | Edge installed | 1. Open dashboard | All components render correctly | | Medium | P1 | |
| CB-005 | Dashboard in Chrome mobile | Chrome Android | 1. Open on Android device | Touch interactions work, layout adapts | | Medium | P1 | |
| CB-006 | Dashboard in Safari iOS | Safari iPhone | 1. Open on iPhone | All interactions work, no viewport issues | | Medium | P1 | |

### 3.3 Accessibility Testing (WCAG 2.1 AA)

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| AC-001 | Color contrast — Greeting text on dark bg | Student logged in | 1. Check white text on dark banner | Contrast ratio ≥ 4.5:1 for normal text | | Medium | P1 | |
| AC-002 | Color contrast — Stats numbers | Student logged in | 1. Check stat values on white bg | Contrast ratio ≥ 4.5:1 | | Medium | P1 | |
| AC-003 | Color contrast — Subtitle text | Student logged in | 1. Check grey subtitle text | Contrast ratio ≥ 4.5:1 for "New challenge waiting!" etc. | | Medium | P1 | |
| AC-004 | Screen reader — Page structure | Screen reader active | 1. Navigate with screen reader | Proper heading hierarchy (h1-h6), landmarks defined | | High | P1 | |
| AC-005 | Screen reader — Schedule entries | Screen reader active | 1. Navigate to schedule | Each entry read as "Computer Networks, Room 101, 09:00 to 10:00" | | Medium | P1 | |
| AC-006 | Screen reader — Stats section | Screen reader active | 1. Navigate to stats | "24 Quizzes Taken", "78% Average Score" announced | | Medium | P1 | |
| AC-007 | Focus indicators visible | Keyboard navigation | 1. Tab through all interactive elements | Clear focus outline visible on each element | | High | P1 | |
| AC-008 | Alt text for icons | Screen reader | 1. Navigate over icons | All icons have aria-label or alt text | | Medium | P2 | |
| AC-009 | Skip navigation link | Keyboard user | 1. Press Tab from page load | "Skip to main content" link available | | Medium | P2 | |
| AC-010 | Graph accessibility | Screen reader | 1. Navigate to performance graph | Chart has accessible description or data table fallback | | Medium | P2 | |
| AC-011 | Touch target size (mobile) | Mobile viewport | 1. Measure tap targets | All interactive elements ≥ 44x44px | | Medium | P1 | |
| AC-012 | Reduced motion preference | prefers-reduced-motion: reduce | 1. Set OS to reduce motion 2. Load page | Animations respect reduced motion setting | | Low | P3 | |

### 3.4 Keyboard Navigation Testing

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| KN-001 | Tab order follows visual layout | Student on page | 1. Press Tab repeatedly | Focus moves: Header → Sidebar → Quick Actions → Schedule → Stats → Graph → FAB | | Medium | P1 | |
| KN-002 | Enter key activates links/buttons | Focus on interactive element | 1. Tab to element 2. Press Enter | Action triggered (navigation, modal open, etc.) | | High | P1 | |
| KN-003 | Escape key closes modals | Modal/dropdown open | 1. Open any modal 2. Press Escape | Modal closes, focus returns to trigger | | Medium | P1 | |
| KN-004 | No keyboard trap | Student tabbing | 1. Tab through entire page | Focus eventually leaves page content (no infinite loop) | | High | P0 | |
| KN-005 | Arrow keys in dropdowns | Dropdown focused | 1. Open dropdown 2. Press Up/Down arrows | Options navigable with arrows | | Medium | P2 | |

### 3.5 Performance Testing

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| PT-001 | Initial page load time | Clear cache | 1. Hard reload dashboard | Page fully rendered in < 3 seconds | | High | P1 | |
| PT-002 | Time to First Contentful Paint | Chrome DevTools | 1. Measure FCP | FCP < 1.5 seconds | | Medium | P1 | |
| PT-003 | Largest Contentful Paint | Chrome DevTools | 1. Measure LCP | LCP < 2.5 seconds | | Medium | P1 | |
| PT-004 | Cumulative Layout Shift | Chrome DevTools | 1. Measure CLS | CLS < 0.1 | | Medium | P2 | |
| PT-005 | API response times | Network tab | 1. Monitor API calls | Each API responds in < 2 seconds | | High | P1 | |
| PT-006 | Memory usage after 5 min | Chrome Task Manager | 1. Stay on dashboard 5 min | Memory stable, no leaks | | Medium | P2 | |
| PT-007 | Dashboard with slow 3G | Network throttle | 1. Set to Slow 3G 2. Load page | Content loads progressively with loaders | | Medium | P2 | |
| PT-008 | Multiple rapid navigations | Student on page | 1. Rapidly click sidebar items | No crashes, smooth transitions | | Medium | P2 | |

### 3.6 Security Validation

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| SE-001 | Access dashboard without login | Not authenticated | 1. Navigate to /dashboard directly | Redirected to login page | | Critical | P0 | |
| SE-002 | Access with expired token | Token expired | 1. Wait for token expiry 2. Refresh | Redirected to login with message | | Critical | P0 | |
| SE-003 | Access with invalid token | Tampered token | 1. Modify JWT in storage 2. Refresh | Logged out, redirected to login | | Critical | P0 | |
| SE-004 | XSS in greeting name | Student name contains `<script>` | 1. Set name to `<script>alert(1)</script>` 2. Load dashboard | Name rendered as text, no script execution | | Critical | P0 | |
| SE-005 | Access other student's data | Student A logged in | 1. Modify API calls to use Student B's ID | API returns 403 Forbidden | | Critical | P0 | |
| SE-006 | Admin routes inaccessible | Student logged in | 1. Navigate to /admin or admin API endpoints | 403 Forbidden or redirect | | Critical | P0 | |
| SE-007 | Sensitive data in localStorage | Student logged in | 1. Check localStorage/sessionStorage | No passwords or sensitive PII exposed | | High | P0 | |
| SE-008 | HTTPS enforcement | Production env | 1. Access via HTTP | Redirected to HTTPS | | Critical | P0 | |

### 3.7 API Integration Checks

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| API-001 | Dashboard loads all API data | Student logged in | 1. Monitor Network tab on load | Schedule, stats, events, performance APIs called successfully | | High | P0 | |
| API-002 | Streak API returns correct value | Student has streak | 1. Check /analytics or streak endpoint | Returns streak count matching UI display | | Medium | P1 | |
| API-003 | Schedule API returns today's classes | Student has timetable | 1. Check timetable API | Returns only today's entries sorted by time | | High | P1 | |
| API-004 | Stats API returns all 4 metrics | Student has activity | 1. Check analytics endpoint | quizzes_taken, avg_score, doubts_asked, days_active returned | | High | P1 | |
| API-005 | Performance API returns last 5 quizzes | Student has quizzes | 1. Check performance endpoint | Returns scores for last 5 quiz attempts with subjects | | High | P1 | |
| API-006 | Events API returns upcoming events | Events exist | 1. Check events endpoint | Returns upcoming events sorted by date | | Medium | P1 | |
| API-007 | API auth header sent correctly | Student logged in | 1. Check request headers | Authorization: Bearer <token> present on all API calls | | Critical | P0 | |
| API-008 | Handle 500 Internal Server Error | Backend crash | 1. Cause 500 error | Dashboard shows graceful error state | | High | P1 | |
| API-009 | Handle network timeout | Network offline | 1. Go offline 2. Refresh | "Unable to connect" message shown | | High | P1 | |
| API-010 | Handle 429 rate limiting | Rapid requests | 1. Make many rapid API calls | Graceful handling, retry after delay | | Medium | P2 | |

### 3.8 Error Handling & Empty States

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| EH-001 | Schedule empty state | No classes today | 1. Load dashboard on weekend | "No classes scheduled today" message shown | | Medium | P1 | |
| EH-002 | Events empty state | No events exist | 1. Load dashboard | "No upcoming events scheduled." displayed (as shown) | | Medium | P1 | |
| EH-003 | Stats empty state | New student | 1. Login as brand new student | Stats show "0" values, no NaN or undefined | | High | P1 | |
| EH-004 | Performance graph empty state | No quizzes taken | 1. Login as student with no quizzes | "Take your first quiz to see performance" or empty chart | | Medium | P1 | |
| EH-005 | All APIs fail simultaneously | Backend completely down | 1. Stop backend 2. Refresh page | Page shows error state without crashing | | High | P1 | |
| EH-006 | Partial API failure | One API fails | 1. Mock one endpoint returning 500 | Failed section shows error, other sections load normally | | High | P1 | |
| EH-007 | Network reconnection | Network drops and restores | 1. Go offline 2. Come back online | Dashboard auto-refreshes or shows reconnection prompt | | Medium | P2 | |

### 3.9 Loading State Validation

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| LS-001 | Initial dashboard loading | First load | 1. Clear cache 2. Load dashboard | Skeleton loaders or spinners shown for each section | | Medium | P1 | |
| LS-002 | Schedule loading state | Slow API | 1. Throttle timetable API | Schedule section shows loading indicator | | Medium | P2 | |
| LS-003 | Stats loading state | Slow API | 1. Throttle stats API | Stats cards show loading shimmer | | Medium | P2 | |
| LS-004 | Graph loading state | Slow API | 1. Throttle performance API | Graph area shows loading state | | Medium | P2 | |
| LS-005 | No flash of unstyled content | Normal load | 1. Load page | No FOUC — styled content appears from start | | Low | P3 | |

### 3.10 Session Handling

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| SH-001 | Session persistence on refresh | Student logged in | 1. Refresh browser | Dashboard loads without re-login | | Critical | P0 | |
| SH-002 | Session expiry handling | Token expires | 1. Wait for token to expire 2. Interact | Redirected to login with appropriate message | | Critical | P0 | |
| SH-003 | Multi-tab session | Student in 2 tabs | 1. Open dashboard in 2 tabs 2. Logout in tab 1 | Tab 2 redirects to login on next interaction | | High | P1 | |
| SH-004 | Back button after logout | Just logged out | 1. Logout 2. Press browser back | Cannot access dashboard, stays on login | | Critical | P0 | |
| SH-005 | Concurrent sessions | Same user 2 devices | 1. Login on device A and B | Both sessions work (or policy enforced) | | Medium | P2 | |

### 3.11 Dark Mode Testing

| Test Case ID | Scenario | Precondition | Steps | Expected Result | Actual Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| DM-001 | Toggle to dark mode | Light mode active | 1. Click dark mode toggle | All backgrounds turn dark, text turns light | | Medium | P2 | |
| DM-002 | Sidebar in dark mode | Dark mode active | 1. Observe sidebar | Sidebar background dark, text/icons visible | | Medium | P2 | |
| DM-003 | Cards in dark mode | Dark mode active | 1. Observe action cards, stats, schedule | White cards become dark cards, text readable | | Medium | P2 | |
| DM-004 | Graph in dark mode | Dark mode active | 1. Observe performance graph | Graph lines and labels visible on dark background | | Medium | P2 | |
| DM-005 | Persist dark mode on refresh | Dark mode selected | 1. Toggle dark mode 2. Refresh | Dark mode persists after page reload | | Medium | P2 | |
| DM-006 | Dark mode respects OS preference | OS set to dark | 1. Set OS dark mode 2. Load page | Dashboard auto-applies dark theme | | Low | P3 | |
| DM-007 | Purple accent in dark mode | Dark mode active | 1. Observe active states/accents | Purple accent remains visible and has good contrast | | Low | P3 | |

---

## 4. Likely Bugs

| # | Bug Description | Severity | Component | Reasoning |
|---|---|---|---|---|
| 1 | **Schedule shows duplicate "Computer Networks" entries with same room** — All 3 morning slots show identical subject+room, likely a data issue or missing faculty/section differentiation | Medium | Today's Schedule | Repeated identical entries without context confuse students |
| 2 | **No loading skeletons visible** — Dashboard likely renders empty then fills, causing layout shift (CLS) | Medium | All sections | Common SPA issue, no skeleton loaders implemented |
| 3 | **Greeting shows generic "Student!" instead of actual name** — Banner says "Student!" which may be the actual stored name rather than parsing the full name | Low | Greeting Banner | The seed data stores "Student User" but only "Student" displayed |
| 4 | **No current-class highlighting in schedule** — All schedule entries appear identical regardless of current time | Medium | Today's Schedule | At 9:30 AM, the 09:00-10:00 slot should be highlighted |
| 5 | **Quick Action card arrows lack hover states** — Small arrow buttons likely don't have visible hover/focus feedback | Low | Quick Actions | Missing interactive feedback |
| 6 | **Performance graph doesn't show score values on data points** — Values only visible on hover, not accessible to screen readers | Medium | Performance Graph | Accessibility gap for chart data |
| 7 | **Events section "View all events" may 404** — If the events page route doesn't exist or is improperly configured | Medium | Upcoming Events | Common issue with placeholder links |
| 8 | **Notification badge doesn't update in real-time** — Badge count "1" won't change without page refresh (no WebSocket) | Low | Notification Bell | No real-time update mechanism visible |
| 9 | **Dark mode toggle may not persist state** — If using only React state without localStorage, preference lost on refresh | Medium | Dark Mode Toggle | Common implementation gap |
| 10 | **Floating AI button may overlap schedule entries on mobile** — Fixed position button can cover last schedule item | Medium | Floating AI | Z-index/positioning issue on small screens |
| 11 | **Stats "DAYS ACTIVE" may not account for today** — If computed from yesterday's data, could be off by 1 | Low | Your Stats | Off-by-one in date calculation |
| 12 | **Graph X-axis labels truncated** — "DSA" and other abbreviated labels may not match full subject names | Low | Performance Graph | Inconsistent naming between chart and schedule |

---

## 5. UX Improvement Suggestions

| # | Suggestion | Impact | Effort |
|---|---|---|---|
| 1 | **Add "Continue where you left off" section** — Show last accessed note/quiz with one-click resume | High | Medium |
| 2 | **Highlight current class in schedule** — Use purple glow or different background for the active class slot | High | Low |
| 3 | **Add attendance percentage to schedule entries** — Show "Present/Absent" status or overall attendance % | Medium | Medium |
| 4 | **Make stats cards clickable** — Click "24 Quizzes Taken" to navigate to quiz history | High | Low |
| 5 | **Add upcoming deadlines widget** — Show assignment due dates with urgency indicators (red/orange/green) | High | Medium |
| 6 | **Add progress bar on greeting banner** — Show semester completion % or learning goal progress | Medium | Low |
| 7 | **Add "Quick Submit" for pending assignments** — If assignments due today, show alert in banner | High | Medium |
| 8 | **Differentiate schedule entries visually** — Use color coding per subject (e.g., CN=blue, DSA=green) | Medium | Low |
| 9 | **Add class countdown timer** — "Next class in 23 minutes" for the upcoming slot | Medium | Low |
| 10 | **Make performance graph interactive** — Click data point to see quiz details | Medium | Medium |
| 11 | **Add "Weak Topics" section** — Surface topics where accuracy < 60% for quick action | High | Medium |
| 12 | **Empty events section is wasted space** — Replace with AI recommendations when no events scheduled | Medium | Medium |

---

## 6. Accessibility Improvements

| # | Issue | WCAG Criterion | Fix Required |
|---|---|---|---|
| 1 | Subtitle text ("New challenge waiting!", "24/7 available") may have insufficient contrast against white bg | 1.4.3 Contrast (Minimum) | Darken text color to meet 4.5:1 ratio |
| 2 | Graph data not accessible to screen readers | 1.1.1 Non-text Content | Add hidden data table or aria-description with values |
| 3 | Floating AI button likely missing aria-label | 4.1.2 Name, Role, Value | Add `aria-label="Open AI Assistant"` |
| 4 | Quick action cards may not be announced as links/buttons | 4.1.2 Name, Role, Value | Ensure cards have `role="link"` or are semantic `<a>` elements |
| 5 | Schedule time format not screen-reader friendly | 1.3.1 Info and Relationships | Add aria-label "09:00 to 10:00" instead of icon-dependent time |
| 6 | No skip-to-content link | 2.4.1 Bypass Blocks | Add skip navigation link at page top |
| 7 | Sidebar active state relies on color alone | 1.4.1 Use of Color | Add icon weight change or underline in addition to purple color |
| 8 | Stats card labels in uppercase ("QUIZZES TAKEN") | 1.4.12 Text Spacing | Uppercase via CSS `text-transform`, not hardcoded — verify screen reader pronunciation |
| 9 | Notification badge count not announced | 4.1.3 Status Messages | Add `aria-live="polite"` region for notification count changes |
| 10 | Performance graph colors may not be distinguishable for colorblind users | 1.4.1 Use of Color | Add shapes (circle, square, diamond) in addition to colors for data points |

---

## 7. Scores

### UI Quality Score: 7.5 / 10

| Criteria | Score | Notes |
|---|---|---|
| Visual Consistency | 8/10 | Clean card design, consistent purple theme |
| Typography | 7/10 | Good hierarchy but uppercase labels are hard to scan |
| Spacing & Alignment | 8/10 | Cards well-aligned, good padding |
| Color Usage | 7/10 | Purple accent nice, but some contrast issues on subtitles |
| Iconography | 8/10 | Consistent icon style (Lucide icons) |
| Responsiveness | 6/10 | No evidence of mobile optimization in current view |
| Empty States | 6/10 | Events empty state OK, but no loading states visible |
| Micro-interactions | 7/10 | Arrow buttons suggest hover states, but unverified |
| Information Density | 8/10 | Good balance of data without overwhelming |
| Modern Aesthetics | 8/10 | Clean SaaS design language |

### Functional Completeness Score: 6.5 / 10

| Criteria | Score | Notes |
|---|---|---|
| Data Accuracy | 7/10 | Stats and schedule populated, need verification |
| Navigation | 8/10 | All sidebar items present, quick actions available |
| Interactive Elements | 6/10 | Cards are clickable but stats/schedule entries may not be |
| Error Handling | 5/10 | No visible error states or retry mechanisms |
| Loading States | 4/10 | No skeleton loaders observed |
| Real-time Updates | 4/10 | No WebSocket for notifications/schedule updates |
| Personalization | 6/10 | Greeting is time-based, streak shown, but no AI recommendations |
| Empty State Coverage | 6/10 | Events covered, but graph/stats empty states unverified |
| Performance | 7/10 | Vite build should be fast, but chart library adds weight |
| Security | 8/10 | JWT auth in place, role-based access likely configured |

---

## 8. Test Summary

| Category | Total Test Cases | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Sidebar Navigation | 15 | 1 | 4 | 5 | 5 |
| Top Header Bar | 11 | 0 | 1 | 5 | 5 |
| Greeting Banner | 10 | 0 | 1 | 5 | 4 |
| Quick Action Cards | 14 | 0 | 4 | 5 | 5 |
| Today's Schedule | 17 | 0 | 3 | 8 | 6 |
| Upcoming Events | 8 | 0 | 2 | 4 | 2 |
| Your Stats | 11 | 1 | 1 | 4 | 5 |
| Performance Graph | 15 | 1 | 1 | 8 | 5 |
| Floating AI Button | 8 | 0 | 1 | 6 | 1 |
| Responsive Design | 8 | 0 | 0 | 5 | 3 |
| Cross-Browser | 6 | 0 | 2 | 4 | 0 |
| Accessibility | 12 | 0 | 2 | 8 | 2 |
| Keyboard Navigation | 5 | 0 | 2 | 3 | 0 |
| Performance | 8 | 0 | 2 | 5 | 1 |
| Security | 8 | 6 | 1 | 1 | 0 |
| API Integration | 10 | 1 | 5 | 3 | 1 |
| Error Handling | 7 | 0 | 3 | 4 | 0 |
| Loading States | 5 | 0 | 0 | 4 | 1 |
| Session Handling | 5 | 3 | 1 | 1 | 0 |
| Dark Mode | 7 | 0 | 0 | 5 | 2 |
| **TOTAL** | **195** | **13** | **36** | **93** | **53** |

---

## 9. Recommended Test Execution Priority

1. **P0 (Must pass before release):** Security validation, session handling, critical navigation, data accuracy
2. **P1 (High priority):** API integration, accessibility focus indicators, responsive tablet/mobile, error handling
3. **P2 (Standard):** Dark mode, loading states, edge cases, UX polish
4. **P3 (Nice to have):** Micro-interactions, cosmetic alignment, 4K support

---

*Note: Full WCAG compliance validation requires manual testing with assistive technologies (NVDA, VoiceOver, JAWS) and expert accessibility review beyond automated tooling.*
