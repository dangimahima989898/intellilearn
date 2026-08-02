import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  Shield,
  BarChart3,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  ArrowLeft,
  Settings
} from "lucide-react"
import toast from "react-hot-toast"

export default function AdminLoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.role === "student") {
        throw new Error("This portal is only for administrators and faculty. Students please use the Student Portal.")
      }
      toast.success(`Welcome back, administrator ${data.name}!`)
      navigate("/admin")
    } catch (err) {
      const msg = err.message || err.response?.data?.detail || "Invalid administrative credentials"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail("hod@intellilearn.edu")
    setPassword("hod123")
    toast.success("Demo administrator credentials loaded!")
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A0F1E] font-dm text-white flex relative overflow-hidden">

      
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-indigo-500 top-10 left-10 opacity-30" style={{ animationDelay: '0s' }} />
        <div className="aurora-orb w-80 h-80 bg-purple-500 bottom-20 right-5 opacity-20" style={{ animationDelay: '3s' }} />
      </div>

      {/* LEFT COLUMN (hidden on mobile, lg:flex flex-col) */}
      <div className="hidden lg:flex flex-col w-1/2 p-16 relative z-10 justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-indigo-400" />
          <span className="font-outfit font-extrabold text-2xl text-white">
            IntelliLearn HOD
          </span>
        </div>

        <div className="my-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3.5 py-1.5 rounded-full font-semibold mb-6">
            <Shield className="w-3.5 h-3.5" />
            Super Admin (HOD) Desk
          </div>
          <h1 className="text-5xl font-outfit font-bold text-white mb-2 leading-tight">
            Manage & Oversee
          </h1>
          <h1 className="text-5xl font-outfit font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2 leading-tight">
            Academic Operations
          </h1>
          <h1 className="text-5xl font-outfit font-bold text-white mb-6 leading-tight">
            with Full Control.
          </h1>
          <p className="text-white/50 text-lg">
            Approve access requests, upload learning modules, schedule timetables, and monitor academic progress.
          </p>

          <div className="mt-12 flex flex-col gap-4 max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-indigo-500/30 transition-all duration-300">
              <Users className="w-6 h-6 text-indigo-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Cohort & Enrollment Management</h4>
                <p className="text-white/50 text-sm mt-1">Review applicant requests, manage user registers, and download templates.</p>
              </div>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-indigo-500/30 transition-all duration-300">
              <Settings className="w-6 h-6 text-purple-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Smart Module Deployment</h4>
                <p className="text-white/50 text-sm mt-1">Configure subjects, upload lecture handouts, and seed assessment models.</p>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-indigo-500/30 transition-all duration-300">
              <BarChart3 className="w-6 h-6 text-indigo-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Advanced Progress Analytics</h4>
                <p className="text-white/50 text-sm mt-1">Monitor study metrics, resolve complex student doubts, and push bulletins.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-sm">
          &copy; {new Date().getFullYear()} IntelliLearn Super Admin (HOD). Secured console access.
        </p>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md backdrop-blur-xl rounded-3xl p-8 shadow-2xl animate-fade-in relative z-20 transition-all duration-300"
             style={{
               background: "#F5F3FF",
               border: "1px solid #DDD6FE",
               color: "#1E1B4B",
             }}>
          
          <Link to="/login" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 text-xs font-semibold mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Portal Selector
          </Link>

          <div className="mb-8">
            <div className="inline-block bg-[#8B5CF6]/10 text-[#7C3AED] text-xs px-3 py-1 rounded-full font-semibold tracking-wide border border-[#DDD6FE]">
              🔒 Super Admin (HOD) Portal
            </div>
            <h2 className="text-3xl font-outfit font-bold text-[#1E1B4B] mt-3">Super Admin (HOD) Sign In</h2>
            <p className="text-violet-600/75 text-sm mt-1">Sign in with Super Admin (HOD) credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-violet-900 text-sm font-medium mb-1">
                Super Admin (HOD) Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400 group-focus-within:text-[#8B5CF6] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#DDD6FE] rounded-xl pl-10 pr-4 py-3.5 text-[#1E1B4B] placeholder-violet-400/60 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all font-medium"
                  placeholder="super_admin@intellilearn.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-violet-900 text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400 group-focus-within:text-[#8B5CF6] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#DDD6FE] rounded-xl pl-10 pr-10 py-3.5 text-[#1E1B4B] placeholder-violet-400/60 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-violet-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "#8B5CF6",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#7C3AED"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#8B5CF6"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In Secured Console"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-b border-[#DDD6FE]" />
            <span className="text-violet-400 text-xs uppercase tracking-wider font-semibold">Demo Access</span>
            <div className="flex-1 border-b border-[#DDD6FE]" />
          </div>

          <div className="mt-4">
            <button 
              type="button"
              onClick={fillDemo}
              className="w-full hover:bg-white border border-[#A78BFA] text-[#8B5CF6] hover:text-[#7C3AED] py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                background: "#F5F3FF"
              }}
            >
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
              Quick Super Admin (HOD) Demo Sign In
            </button>
          </div>

          <div className="mt-8 text-center text-xs border-t border-[#DDD6FE] pt-4 text-violet-400/80 leading-relaxed">
            Authorized Super Admin (HOD) and Faculty personnel only. IP logs are recorded for auditing purposes.
          </div>

        </div>
      </div>
    </div>
  )
}
