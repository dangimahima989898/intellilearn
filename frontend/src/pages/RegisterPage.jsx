import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import toast from "react-hot-toast"

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("student") // Default role

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Password strength logic
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-transparent" }
    if (password.length < 6)
      return { score: 1, label: "Too Short", color: "bg-red-500 w-1/3" }

    const hasLetters = /[a-zA-Z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)

    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) {
      return { score: 3, label: "Strong", color: "bg-emerald-500 w-full" }
    }
    if (hasLetters && hasNumbers) {
      return { score: 2, label: "Medium", color: "bg-yellow-500 w-2/3" }
    }
    return { score: 1, label: "Weak", color: "bg-red-500 w-1/3" }
  }, [password])

  // Real-time checks
  const isPasswordsMatching = password && password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (role !== "student" && role !== "admin") {
      setError("Role must be Student or Admin")
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), email, password, role)
      toast.success("Account created successfully! Please log in.")
      navigate("/login")
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed. Try again."
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white flex relative overflow-hidden font-dm">
      {/* Animated ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[130px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[130px] animate-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Form Container */}
      <div className="w-full flex items-center justify-center p-6 sm:p-12 relative z-10 my-8">
        <div className="w-full max-w-lg card bg-navy-800/40 border border-navy-700/50 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 justify-center">
            <GraduationCap className="w-8 h-8 text-brand" />
            <span className="font-outfit font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">
              IntelliLearn
            </span>
          </div>

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-outfit font-bold text-white">
              Create Your Account
            </h2>
            <p className="text-navy-600 text-sm">
              Join the MCA adaptive learning platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Toggle Cards */}
            <div>
              <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider mb-3 text-center">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    role === "student"
                      ? "bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10"
                      : "bg-navy-950/40 border-navy-700/50 text-navy-600 hover:border-navy-600"
                  }`}
                >
                  <GraduationCap className="w-6 h-6 mb-2" />
                  <span className="font-outfit font-semibold text-sm">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    role === "admin"
                      ? "bg-brand/10 border-brand text-brand shadow-lg shadow-brand/10"
                      : "bg-navy-950/40 border-navy-700/50 text-navy-600 hover:border-navy-600"
                  }`}
                >
                  <UserCheck className="w-6 h-6 mb-2" />
                  <span className="font-outfit font-semibold text-sm">Admin</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-600" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-11 w-full bg-navy-950/60 border border-navy-700/60 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl py-3 text-white placeholder-navy-600 text-sm transition-all outline-none"
                  placeholder="Mahima Dangi"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11 w-full bg-navy-950/60 border border-navy-700/60 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl py-3 text-white placeholder-navy-600 text-sm transition-all outline-none"
                  placeholder="name@student.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11 w-full bg-navy-950/60 border border-navy-700/60 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl py-3 text-white placeholder-navy-600 text-sm transition-all outline-none"
                  placeholder="•••••••• (Min 6 characters)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-600 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2.5 space-y-1.5 animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-navy-600">Password Strength:</span>
                    <span
                      className={`font-semibold ${
                        passwordStrength.score === 1
                          ? "text-red-400"
                          : passwordStrength.score === 2
                          ? "text-yellow-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-navy-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-600" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field pl-11 pr-11 w-full bg-navy-950/60 border rounded-xl py-3 text-white placeholder-navy-600 text-sm transition-all outline-none ${
                    isPasswordsMatching
                      ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500"
                      : "border-navy-700/60 focus:border-brand focus:ring-brand"
                  }`}
                  placeholder="••••••••"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isPasswordsMatching && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 animate-pulse" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-navy-600 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-outfit font-semibold text-sm transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Register"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-navy-700/30 text-center">
            <p className="text-navy-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-brand hover:underline font-semibold"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
