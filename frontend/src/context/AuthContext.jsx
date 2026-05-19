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
          setUser(freshUser)
          localStorage.setItem("intellilearn_user", JSON.stringify(freshUser))
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
    localStorage.setItem(
      "intellilearn_user",
      JSON.stringify({
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
      })
    )
    setToken(data.access_token)
    setUser({
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
    })
    return data
  }, [])

  const register = useCallback(
    async (name, email, password, role = "student") => {
      const data = await authService.register(name, email, password, role)
      return data
    },
    []
  )

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
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "admin",
    isStudent: user?.role === "student",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
