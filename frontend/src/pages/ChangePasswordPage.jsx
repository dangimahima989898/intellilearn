import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Lock, Eye, EyeOff, Loader2, KeyRound, AlertTriangle } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"

const API_BASE_URL = "http://localhost:8000/api"

export default function ChangePasswordPage() {
  const { user, token, completePasswordChange, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields")
      return
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setLoading(true)
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      toast.success("Password updated successfully!")
      
      // Update local reactive user state
      completePasswordChange()

      // Redirect to correct dashboard
      if (user?.role === "admin") {
        navigate("/admin")
      } else {
        navigate("/student")
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to change password."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-dm text-white flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-red-500/10 top-10 left-10" />
        <div className="aurora-orb w-80 h-80 bg-violet-500/20 bottom-20 right-5" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-20 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-outfit font-bold">Security Action Required</h2>
            <p className="text-white/40 text-xs mt-0.5">Please update your password to continue</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-sm text-white/70 leading-relaxed">
          Hello <strong>{user?.name}</strong>. Because this is your first time logging in with administrative credentials, you must change your password before gaining access to the student dashboard.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Current Temporary Password */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1">
              Current Temporary Password
            </label>
            <div className="relative group">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white/8 border border-white/15 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
                placeholder="Password from welcome email"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/8 border border-white/15 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
                placeholder="At least 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1">
              Confirm New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/8 border border-white/15 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
                placeholder="Confirm password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Security Credentials...
              </>
            ) : (
              "Confirm Password Change"
            )}
          </button>
          
          <button
            type="button"
            onClick={logout}
            className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
