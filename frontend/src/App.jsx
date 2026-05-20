import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"

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
// Remaining Step 7 placeholders (Questions, Quiz, Challenge, Doubts)
const PlaceholderQuestions = () => <div className="p-8 text-center text-white"><h1 className="text-2xl font-bold text-brand mb-4">Question Generator</h1><p className="text-navy-400">Coming in Step 8</p></div>
const PlaceholderQuiz = () => <div className="p-8 text-center text-white"><h1 className="text-2xl font-bold text-brand mb-4">Adaptive Quiz</h1><p className="text-navy-400">Coming in Step 8</p></div>
const PlaceholderChallenge = () => <div className="p-8 text-center text-white"><h1 className="text-2xl font-bold text-brand mb-4">Daily Challenge</h1><p className="text-navy-400">Coming in Step 8</p></div>
const PlaceholderDoubts = () => <div className="p-8 text-center text-white"><h1 className="text-2xl font-bold text-brand mb-4">Doubt Board</h1><p className="text-navy-400">Coming in Step 8</p></div>

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
          <Route path="questions" element={<PlaceholderQuestions />} />
          <Route path="quiz" element={<PlaceholderQuiz />} />
          <Route path="challenge" element={<PlaceholderChallenge />} />
          <Route path="doubts" element={<PlaceholderDoubts />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
