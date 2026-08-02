import React, { useState, useEffect, lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import ProtectedRoute from "./components/ProtectedRoute"

// Static minimal pages for fast entry
import SplashPage from "./pages/SplashPage"
import LoginPage from "./pages/LoginPage"
import StudentLoginPage from "./pages/student/StudentLoginPage"
import AdminLoginPage from "./pages/admin/AdminLoginPage"

// Lazy load other pages to split the bundle
const RequestAccessPage = lazy(() => import("./pages/RequestAccessPage"))
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"))
const NotFound = lazy(() => import("./pages/NotFound"))

// Admin Pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"))
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"))
const HodDashboard = lazy(() => import("./pages/admin/HodDashboard"))
const FacultyDashboard = lazy(() => import("./pages/admin/FacultyDashboard"))
const DepartmentsPage = lazy(() => import("./pages/admin/DepartmentsPage"))
const SubjectsPage = lazy(() => import("./pages/admin/SubjectsPage"))
const ManageFacultyPage = lazy(() => import("./pages/admin/ManageFacultyPage"))
const NotesPage = lazy(() => import("./pages/admin/NotesPage"))
const TimetablePage = lazy(() => import("./pages/admin/TimetablePage"))
const EventsPage = lazy(() => import("./pages/admin/EventsPage"))
const AdminNotesHub = lazy(() => import("./pages/admin/AdminNotesHub"))
const HODScheduleManager = lazy(() => import("./pages/admin/HODScheduleManager"))
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"))
const UploadStudentsPage = lazy(() => import("./pages/admin/UploadStudentsPage"))
const PendingRequestsPage = lazy(() => import("./pages/admin/PendingRequestsPage"))
const HODSubjectDetail = lazy(() => import("./pages/admin/HODSubjectDetail"))
const NotificationsPage = lazy(() => import("./pages/admin/NotificationsPage"))
const AdminDoubtBoardPage = lazy(() => import("./pages/admin/AdminDoubtBoardPage"))
const AdminDoubtDetailPage = lazy(() => import("./pages/admin/AdminDoubtDetailPage"))
const HODArchive = lazy(() => import("./pages/admin/HODArchive"))
const HODDepartmentAnalytics = lazy(() => import("./pages/admin/HODDepartmentAnalytics"))
const NoteUpload = lazy(() => import("./pages/admin/NoteUpload"))
const FacultyReviewPanel = lazy(() => import("./pages/admin/FacultyReviewPanel"))
const AdminNotesAnalytics = lazy(() => import("./pages/admin/AdminNotesAnalytics"))
const HODLeaveRequests = lazy(() => import("./pages/admin/HODLeaveRequests"))
const HODContentModeration = lazy(() => import("./pages/admin/HODContentModeration"))
const FacultyLeavePage = lazy(() => import("./pages/admin/FacultyLeavePage"))
const FacultySchedulePage = lazy(() => import("./pages/admin/FacultySchedulePage"))
const AIAnswerReview = lazy(() => import("./pages/admin/AIAnswerReview"))
const FacultyTopicsPage = lazy(() => import("./pages/admin/FacultyTopicsPage"))

// Student Pages
const StudentLayout = lazy(() => import("./pages/student/StudentLayout"))
const StudentHome = lazy(() => import("./pages/student/StudentHome"))
const StudentNotesPage = lazy(() => import("./pages/student/NotesPage"))
const StudentTimetablePage = lazy(() => import("./pages/student/TimetablePage"))
const StudentEventsPage = lazy(() => import("./pages/student/EventsPage"))
const StudentProgressPage = lazy(() => import("./pages/student/ProgressPage"))
const ChatbotPage = lazy(() => import("./pages/student/ChatbotPage"))
const QuestionGeneratorPage = lazy(() => import("./pages/student/QuestionGeneratorPage"))
const AdaptiveQuizPage = lazy(() => import("./pages/student/AdaptiveQuizPage"))
const DailyChallengePage = lazy(() => import("./pages/student/DailyChallengePage"))
const DoubtBoardPage = lazy(() => import("./pages/student/DoubtBoardPage"))
const DoubtDetailPage = lazy(() => import("./pages/student/DoubtDetailPage"))
const StudentSummaryView = lazy(() => import("./pages/student/StudentSummaryView"))

// Placement Test simulator components
const TestListingPage = lazy(() => import("./pages/student/TestListingPage"))
const TestInstructionsPage = lazy(() => import("./pages/student/TestInstructionsPage"))
const ActiveTestScreen = lazy(() => import("./pages/student/ActiveTestScreen"))
const ResultPage = lazy(() => import("./pages/student/ResultPage"))
const MyTestsDashboard = lazy(() => import("./pages/student/MyTestsDashboard"))
const AdminTestCreator = lazy(() => import("./pages/admin/AdminTestCreator"))

// Student Hubs
const StudentNotesHub = lazy(() => import("./pages/student/StudentNotesHub"))
const StudentScheduleHub = lazy(() => import("./pages/student/StudentScheduleHub"))
const StudentPracticeHub = lazy(() => import("./pages/student/StudentPracticeHub"))

// Icons
import { GraduationCap } from "lucide-react"

const PageFallback = () => (
  <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center relative overflow-hidden select-none">
    <div className="relative flex items-center justify-center w-24 h-24 z-10">
      <div className="absolute inset-0 rounded-full border border-violet-500/20 border-t-violet-500 animate-spin" />
      <div className="relative z-10 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
        <GraduationCap className="w-8 h-8 text-violet-400 animate-pulse" />
      </div>
    </div>
    <div className="mt-8 text-center space-y-2 relative z-10">
      <p className="text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">
        Initializing workspace...
      </p>
    </div>
  </div>
);

function AppContent() {
  const { loading, user } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const DynamicDashboard = () => {
    if (user?.role === 'super_admin') return <HodDashboard />
    if (user?.role === 'faculty') return <FacultyDashboard />
    return <AdminDashboard />
  }

  if (loading || showSplash) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center relative overflow-hidden select-none">
        
        {/* Animated Conic Gradient Style */}
        <style>{`
          @keyframes rotate-conic {
            100% { transform: rotate(360deg); }
          }
          .conic-ring {
            background: conic-gradient(from 0deg, transparent 20%, #3B82F6 50%, #8B5CF6 80%, transparent 100%);
            animation: rotate-conic 1.8s linear infinite;
          }
        `}</style>

        {/* Ambient Aurora Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="aurora-orb w-80 h-80 bg-blue-500/10 top-1/4 left-1/4" />
          <div className="aurora-orb w-64 h-64 bg-violet-500/10 bottom-1/4 right-1/4" style={{ animationDelay: '2s' }} />
        </div>

        {/* Logo and Spinning Ring */}
        <div className="relative flex items-center justify-center w-24 h-24 z-10 scale-in">
          {/* Conic Ring Wrapper */}
          <div className="absolute inset-0 rounded-full conic-ring p-[3px]">
            <div className="w-full h-full bg-[#0A0F1E] rounded-full" />
          </div>
          
          {/* Logo Center */}
          <div className="relative z-10 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
            <GraduationCap className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* Branding & Status */}
        <div className="mt-8 text-center space-y-2 relative z-10 scale-in">
          <h2 className="text-2xl font-outfit font-extrabold text-white tracking-tight">
            IntelliLearn
          </h2>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest animate-pulse">
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/student" element={<StudentLoginPage />} />
      <Route path="/login/admin" element={<AdminLoginPage />} />
      <Route path="/request-access" element={<RequestAccessPage />} />
      <Route path="/change-password" element={
        <ProtectedRoute allowMustChangePassword={true}>
          <ChangePasswordPage />
        </ProtectedRoute>
      } />
      
      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DynamicDashboard />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:subjectId" element={<HODSubjectDetail />} />
        <Route path="faculty" element={<ManageFacultyPage />} />
        
        {/* Hub Pages */}
        <Route path="notes" element={<AdminNotesHub />} />
        <Route path="schedule" element={<HODScheduleManager />} />

        {/* Redirects to Hub Pages */}
        <Route path="timetable" element={<Navigate to="/admin/schedule?tab=timetable" replace />} />
        <Route path="events" element={<Navigate to="/admin/schedule?tab=events" replace />} />
        <Route path="notes/upload" element={<Navigate to="/admin/notes?tab=upload" replace />} />
        <Route path="notes/review" element={<Navigate to="/admin/notes?tab=review" replace />} />
        <Route path="notes/analytics" element={<Navigate to="/admin/notes?tab=analytics" replace />} />

        {/* Other Pages */}
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/upload" element={<UploadStudentsPage />} />
        <Route path="pending-requests" element={<PendingRequestsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="archive" element={<HODArchive />} />
        <Route path="quiz-analytics" element={<HODDepartmentAnalytics />} />

        <Route path="doubts" element={<AdminDoubtBoardPage />} />
        <Route path="doubts/:id" element={<AdminDoubtDetailPage />} />

        {/* HOD-specific routes */}
        <Route path="leave-requests" element={<HODLeaveRequests />} />
        <Route path="content-moderation" element={<HODContentModeration />} />

        {/* Faculty-specific routes */}
        <Route path="my-subjects" element={<FacultyDashboard />} />
        <Route path="my-schedule" element={<FacultySchedulePage />} />
        <Route path="ai-answer-review" element={<AIAnswerReview />} />
        <Route path="apply-leave" element={<FacultyLeavePage />} />
        <Route path="leave-status" element={<FacultyLeavePage />} />
        <Route path="topics" element={<FacultyTopicsPage />} />
        <Route path="tests/create" element={<AdminTestCreator />} />
      </Route>

      
      {/* Placement Test Student Routes */}
      <Route path="/tests" element={
        <ProtectedRoute requiredRole="student">
          <TestListingPage />
        </ProtectedRoute>
      } />
      <Route path="/tests/:id" element={
        <ProtectedRoute requiredRole="student">
          <TestInstructionsPage />
        </ProtectedRoute>
      } />
      <Route path="/tests/:id/start" element={
        <ProtectedRoute requiredRole="student">
          <ActiveTestScreen />
        </ProtectedRoute>
      } />
      <Route path="/tests/:id/result/:attemptId" element={
        <ProtectedRoute requiredRole="student">
          <ResultPage />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/my-tests" element={
        <ProtectedRoute requiredRole="student">
          <MyTestsDashboard />
        </ProtectedRoute>
      } />

      {/* Student Protected Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentHome />} />
        {/* Student Hub Pages */}
        <Route path="notes" element={<StudentNotesHub />} />
        <Route path="schedule" element={<StudentScheduleHub />} />
        <Route path="practice" element={<StudentPracticeHub />} />

        {/* Redirects to Student Hub Pages */}
        <Route path="summaries" element={<Navigate to="/student/notes?tab=summaries" replace />} />
        <Route path="timetable" element={<Navigate to="/student/schedule?tab=timetable" replace />} />
        <Route path="events" element={<Navigate to="/student/schedule?tab=events" replace />} />
        <Route path="questions" element={<Navigate to="/student/practice?tab=questions" replace />} />
        <Route path="quiz" element={<Navigate to="/student/practice?tab=quiz" replace />} />
        <Route path="challenge" element={<Navigate to="/student/practice?tab=challenge" replace />} />

        {/* Other Pages */}
        <Route path="progress" element={<StudentProgressPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="doubts" element={<DoubtBoardPage />} />
        <Route path="doubts/:id" element={<DoubtDetailPage />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
