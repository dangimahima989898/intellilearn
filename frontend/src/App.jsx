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
// Placeholder layout for student — will be replaced in Step 6
const StudentPlaceholder = () => (
  <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white font-dm">
    <div className="text-center card max-w-sm bg-navy-800 border border-navy-700 p-8 rounded-2xl shadow-xl">
      <h1 className="text-2xl font-outfit font-bold text-brand mb-2">
        Student Dashboard
      </h1>
      <p className="text-navy-600 text-sm">Coming in Step 6</p>
    </div>
  </div>
)

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
          path="/student/*"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
