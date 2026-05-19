import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"

// Placeholder layouts — will be replaced in Steps 5 & 6
const AdminPlaceholder = () => (
  <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white font-dm">
    <div className="text-center card max-w-sm bg-navy-800 border border-navy-700 p-8 rounded-2xl shadow-xl">
      <h1 className="text-2xl font-outfit font-bold text-brand mb-2">
        Admin Dashboard
      </h1>
      <p className="text-navy-600 text-sm">Coming in Step 5</p>
    </div>
  </div>
)

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
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPlaceholder />
            </ProtectedRoute>
          }
        />
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
