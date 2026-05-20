import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import NotFound from "./pages/NotFound"

import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import SubjectsPage from "./pages/admin/SubjectsPage"
import NotesPage from "./pages/admin/NotesPage"
import TimetablePage from "./pages/admin/TimetablePage"
import EventsPage from "./pages/admin/EventsPage"
import StudentsPage from "./pages/admin/StudentsPage"

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

// Remaining Step 7 placeholders (Doubts)

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
          <Route path="notifications" element={<div className="p-8 text-white">Notifications (Coming Soon)</div>} />
        </Route>
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
          
          {/* Step 7 Features */}
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="questions" element={<QuestionGeneratorPage />} />
          <Route path="quiz" element={<AdaptiveQuizPage />} />
          <Route path="challenge" element={<DailyChallengePage />} />
          <Route path="doubts" element={<DoubtBoardPage />} />
          <Route path="doubts/:id" element={<DoubtDetailPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
