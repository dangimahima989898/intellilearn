import { createContext, useContext, useState, useEffect, useCallback } from "react"
import authService from "../services/authService"
import toast from "react-hot-toast"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true) // true while checking stored token

  // On app load: check if there's a saved token and validate it
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("intellilearn_token")
      const savedUser = localStorage.getItem("intellilearn_user")

      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        // Validate token with backend
        try {
          const freshUser = await authService.getMe()
          setUser(prev => {
            const merged = { ...prev, ...freshUser }
            localStorage.setItem("intellilearn_user", JSON.stringify(merged))
            return merged
          })
        } catch {
          // Token invalid — clear everything
          localStorage.removeItem("intellilearn_token")
          localStorage.removeItem("intellilearn_user")
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    localStorage.setItem("intellilearn_token", data.access_token)
    
    const userObj = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      course_id: data.course_id || null,
      course_code: data.course_code || null,
      course_name: data.course_name || null,
      current_semester: data.current_semester || null,
      enrollment_no: data.enrollment_no || null,
      section: data.section || null,
      must_change_password: data.must_change_password || false,
    }
    
    localStorage.setItem("intellilearn_user", JSON.stringify(userObj))
    setToken(data.access_token)
    setUser(userObj)
    return data

  }, [])

  const register = useCallback(
    async (name, email, password, role = "student", extra = {}) => {
      const payload = {
        course_id: extra.courseId || null,
        current_semester: extra.currentSemester || 1,
        enrollment_no: extra.enrollmentNo || null,
        roll_number: extra.rollNumber || null,
        section: extra.section || null,
        phone: extra.phone || null,
        admission_year: extra.admissionYear || null,
      }
      const data = await authService.register(name, email, password, role, payload)
      return data
    },
    []
  )

  const completePasswordChange = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, must_change_password: false };
      localStorage.setItem("intellilearn_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    authService.logout()
    setToken(null)
    setUser(null)
    toast.success("Logged out successfully")
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    completePasswordChange,
    logout,
    isAuthenticated: !!token && !!user,

    isAdmin: ["super_admin", "faculty"].includes(user?.role),
    isStudent: user?.role === "student",
    semesterLabel: user?.current_semester ? `Semester ${user.current_semester}` : "",
    courseLabel: user?.course_code && user?.current_semester ? `${user.course_code} Semester ${user.current_semester}` : ""
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
