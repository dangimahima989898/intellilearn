import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const { login } = useAuth()
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
      toast.success(`Welcome back, ${data.name}!`)
      if (data.role === "admin") {
        navigate("/admin")
      } else {
        navigate("/student")
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password"
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

      {/* Left side: Branding & Feature Highlights (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10 border-r border-navy-800 bg-navy-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand/10 p-2.5 rounded-xl border border-brand/20">
            <GraduationCap className="w-8 h-8 text-brand" />
          </div>
          <span className="font-outfit font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-blue-400">
            IntelliLearn
          </span>
        </div>

        <div className="my-auto space-y-8 max-w-md">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
              <Sparkles className="w-3.5 h-3.5" /> Powered by Advanced AI
            </div>
            <h1 className="text-4xl font-outfit font-bold leading-tight">
              Elevate your MCA learning experience.
            </h1>
            <p className="text-navy-600 text-base leading-relaxed">
              Unlock a smarter way to study with adaptive tests, instant doubt-solving, and customized study timetables.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-navy-800 p-2 rounded-lg mt-0.5 border border-navy-700">
                <BookOpen className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="font-outfit font-semibold text-white">Smart Subject Hub</h4>
                <p className="text-navy-600 text-sm">
                  Access notes, lecture slides, and AI-curated assessments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-navy-800 p-2 rounded-lg mt-0.5 border border-navy-700">
                <MessageSquare className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="font-outfit font-semibold text-white">AI Doubt Assistant</h4>
                <p className="text-navy-600 text-sm">
                  Get instant explanations for complex algorithms & equations.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-navy-600 text-xs">
          &copy; {new Date().getFullYear()} IntelliLearn. All rights reserved.
        </p>
      </div>

      {/* Right side: Glassmorphism Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md card bg-navy-800/40 border border-navy-700/50 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl animate-fade-in">
          {/* Logo showing only on mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <GraduationCap className="w-7 h-7 text-brand" />
            <span className="font-outfit font-bold text-xl tracking-tight">
              IntelliLearn
            </span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-outfit font-bold text-white">Welcome Back</h2>
            <p className="text-navy-600 text-sm">
              Your AI-powered academic companion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-navy-600 text-xs font-semibold uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11 w-full bg-navy-950/60 border border-navy-700/60 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl py-3 text-white placeholder-navy-600 text-sm transition-all outline-none"
                  placeholder="••••••••"
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
            </div>

            {error && (
              <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {error}
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
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-navy-700/30 text-center">
            <p className="text-navy-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-brand hover:underline font-semibold"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
