import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

// Full-page loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-navy-700" />
        <div className="absolute inset-0 rounded-full border-4 border-t-brand animate-spin" />
      </div>
      <p className="mt-4 text-navy-600 font-dm text-sm">Loading IntelliLearn...</p>
    </div>
  )
}

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isAdmin, isStudent, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/student" replace />
  }

  if (requiredRole === "student" && !isStudent) {
    return <Navigate to="/admin" replace />
  }

  return children
}
