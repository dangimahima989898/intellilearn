import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

// Full-page loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-brand animate-spin" />
      </div>
      <p className="mt-4 text-white/60 font-dm text-sm font-medium">Loading IntelliLearn...</p>
    </div>
  )
}

export default function ProtectedRoute({ children, requiredRole, allowMustChangePassword = false }) {
  const { isAuthenticated, isAdmin, isStudent, user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) {
    if (requiredRole === "admin") {
      return <Navigate to="/login/admin" replace />
    } else if (requiredRole === "student") {
      return <Navigate to="/login/student" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (user?.must_change_password && !allowMustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/student" replace />
  }

  if (requiredRole === "student" && !isStudent) {
    return <Navigate to="/admin" replace />
  }

  return children
}

