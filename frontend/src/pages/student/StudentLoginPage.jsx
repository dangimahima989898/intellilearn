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
  BookOpen,
  MessageSquare,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  ArrowLeft,
  Sparkles
} from "lucide-react"
import toast from "react-hot-toast"

export default function StudentLoginPage() {
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
      if (data.role !== "student") {
        throw new Error("This portal is only for students. Admins please use the Admin Portal.")
      }
      toast.success(`Welcome back, ${data.name}!`)
      navigate("/student")
    } catch (err) {
      const msg = err.message || err.response?.data?.detail || "Invalid student credentials"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail("student@example.com")
    setPassword("student123")
    toast.success("Demo student credentials loaded!")
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A0F1E] font-dm text-white flex relative overflow-hidden">

      
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-blue-500 top-10 left-10 opacity-30" style={{ animationDelay: '0s' }} />
        <div className="aurora-orb w-80 h-80 bg-teal-500 bottom-20 right-5 opacity-20" style={{ animationDelay: '3s' }} />
      </div>

      {/* LEFT COLUMN (hidden on mobile, lg:flex flex-col) */}
      <div className="hidden lg:flex flex-col w-1/2 p-16 relative z-10 justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-blue-400" />
          <span className="font-outfit font-extrabold text-2xl text-white">
            IntelliLearn
          </span>
        </div>

        <div className="my-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3.5 py-1.5 rounded-full font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Student Hub
          </div>
          <h1 className="text-5xl font-outfit font-bold text-white mb-2 leading-tight">
            Empower Your
          </h1>
          <h1 className="text-5xl font-outfit font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400 mb-2 leading-tight">
            MCA Academics
          </h1>
          <h1 className="text-5xl font-outfit font-bold text-white mb-6 leading-tight">
            with Smart AI.
          </h1>
          <p className="text-white/50 text-lg">
            Track courses, clarify doubts, and master your subjects interactively.
          </p>

          <div className="mt-12 flex flex-col gap-4 max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-blue-500/30 transition-all duration-300">
              <BookOpen className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Interactive Subject Material</h4>
                <p className="text-white/50 text-sm mt-1">Access lecture notes, schedules, and past papers instantly.</p>
              </div>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-blue-500/30 transition-all duration-300">
              <MessageSquare className="w-6 h-6 text-teal-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">24/7 AI Doubt Companion</h4>
                <p className="text-white/50 text-sm mt-1">Stuck on a problem? Get step-by-step explanations anytime.</p>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-blue-500/30 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Adaptive Practice Quizzes</h4>
                <p className="text-white/50 text-sm mt-1">Quizzes adjust difficulty based on your performance history.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-sm">
          &copy; {new Date().getFullYear()} IntelliLearn. Created for MLSU MCA Cohort.
        </p>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md backdrop-blur-xl rounded-3xl p-8 shadow-2xl animate-fade-in relative z-20 transition-all duration-300"
             style={{
               background: "#EFF6FF",
               border: "1px solid #DBEAFE",
               color: "#1E3A8A",
             }}>
          
          <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-semibold mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Portal Selector
          </Link>

          <div className="mb-8">
            <div className="inline-block bg-blue-500/10 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold tracking-wide border border-[#DBEAFE]">
              🎓 Student Portal
            </div>
            <h2 className="text-3xl font-outfit font-bold text-[#1E3A8A] mt-3">Student Sign In</h2>
            <p className="text-blue-600/75 text-sm mt-1">Sign in with your verification details</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-blue-900 text-sm font-medium mb-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#DBEAFE] rounded-xl pl-10 pr-4 py-3.5 text-[#1E3A8A] placeholder-blue-400/60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                  placeholder="student@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-blue-900 text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#DBEAFE] rounded-xl pl-10 pr-10 py-3.5 text-[#1E3A8A] placeholder-blue-400/60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition-colors"
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
              className="w-full mt-2 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "#3B82F6",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#2563EB"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#3B82F6"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-b border-[#DBEAFE]" />
            <span className="text-blue-400 text-xs uppercase tracking-wider font-semibold">Demo Access</span>
            <div className="flex-1 border-b border-[#DBEAFE]" />
          </div>

          <div className="mt-4">
            <button 
              type="button"
              onClick={fillDemo}
              className="w-full hover:bg-white border border-[#93C5FD] text-[#3B82F6] hover:text-[#2563EB] py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                background: "#EFF6FF"
              }}
            >
              <Sparkles className="w-4 h-4 text-[#3B82F6]" />
              Quick Student Demo Sign In
            </button>
          </div>

          <div className="mt-8 text-center text-sm border-t border-[#DBEAFE] pt-4 flex flex-col gap-2">
            <Link to="/request-access" className="text-blue-600 hover:text-blue-800 transition-colors font-semibold">
              Don't have access? Request it here →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
