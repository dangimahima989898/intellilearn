import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import StudentLoginPage from "./pages/student/StudentLoginPage"
import AdminLoginPage from "./pages/admin/AdminLoginPage"
import RequestAccessPage from "./pages/RequestAccessPage"
import ChangePasswordPage from "./pages/ChangePasswordPage"
import NotFound from "./pages/NotFound"
import SplashPage from "./pages/SplashPage"

// Icons
import { GraduationCap } from "lucide-react"

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import SubjectsPage from "./pages/admin/SubjectsPage"
import NotesPage from "./pages/admin/NotesPage"
import TimetablePage from "./pages/admin/TimetablePage"
import EventsPage from "./pages/admin/EventsPage"
import StudentsPage from "./pages/admin/StudentsPage"
import UploadStudentsPage from "./pages/admin/UploadStudentsPage"
import PendingRequestsPage from "./pages/admin/PendingRequestsPage"
import NotificationsPage from "./pages/admin/NotificationsPage"
import AdminDoubtBoardPage from "./pages/admin/AdminDoubtBoardPage"
import AdminDoubtDetailPage from "./pages/admin/AdminDoubtDetailPage"
import ArchivePage from "./pages/admin/ArchivePage"


// Student Pages
import StudentLayout from "./pages/student/StudentLayout"
import StudentHome from "./pages/student/StudentHome"
import StudentNotesPage from "./pages/student/NotesPage"
import StudentTimetablePage from "./pages/student/TimetablePage"
import StudentEventsPage from "./pages/student/EventsPage"
import StudentProgressPage from "./pages/student/ProgressPage"
import ChatbotPage from "./pages/student/ChatbotPage"
import QuestionGeneratorPage from "./pages/student/QuestionGeneratorPage"
import AdaptiveQuizPage from "./pages/student/AdaptiveQuizPage"
import DailyChallengePage from "./pages/student/DailyChallengePage"
import DoubtBoardPage from "./pages/student/DoubtBoardPage"
import DoubtDetailPage from "./pages/student/DoubtDetailPage"

function AppContent() {
  const { loading } = useAuth()

  if (loading) {
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
        <Route index element={<AdminDashboard />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/upload" element={<UploadStudentsPage />} />
        <Route path="requests" element={<PendingRequestsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="archive" element={<ArchivePage />} />

        <Route path="doubts" element={<AdminDoubtBoardPage />} />
        <Route path="doubts/:id" element={<AdminDoubtDetailPage />} />
      </Route>
      
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
        <Route path="notes" element={<StudentNotesPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="events" element={<StudentEventsPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="questions" element={<QuestionGeneratorPage />} />
        <Route path="quiz" element={<AdaptiveQuizPage />} />
        <Route path="challenge" element={<DailyChallengePage />} />
        <Route path="doubts" element={<DoubtBoardPage />} />
        <Route path="doubts/:id" element={<DoubtDetailPage />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
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
