import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  GraduationCap,
  Mail,
  User,
  Hash,
  Layers,
  Award,
  BookOpen,
  HelpCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import courseService from "../services/courseService"

const API_BASE_URL = "http://localhost:8000/api"

export default function RequestAccessPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [enrollmentNumber, setEnrollmentNumber] = useState("")
  const [semester, setSemester] = useState(1)
  const [branch, setBranch] = useState("MCA")
  const [section, setSection] = useState("A")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Tabs for Application vs Status Check
  const [activeTab, setActiveTab] = useState("apply") // "apply" or "check"
  
  // Status check states
  const [searchQuery, setSearchQuery] = useState("")
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [statusResult, setStatusResult] = useState(null)

  const [courses, setCourses] = useState([])

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await courseService.getCourses()
        setCourses(data)
        if (data.length > 0) {
          setBranch(data[0].code)
        }
      } catch (err) {
        console.error("Failed to load courses:", err)
      }
    }
    fetchCourses()
  }, [])

  const coursesToRender = courses.length > 0 ? courses.map(c => ({ id: c.id, code: c.code })) : [
    { id: "MCA", code: "MCA" },
    { id: "BCA", code: "BCA" },
    { id: "BSc CS", code: "BSc CS" },
    { id: "MSc CS", code: "MSc CS" },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !enrollmentNumber || !branch || !section) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/request-access`, {
        full_name: fullName,
        email: email,
        enrollment_number: enrollmentNumber,
        semester: Number(semester),
        branch: branch,
        section: section,
        reason: reason || null
      })
      toast.success(response.data.message || "Request submitted successfully!")
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to submit request."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast.error("Please enter your email or enrollment number")
      return
    }

    setCheckingStatus(true)
    setStatusResult(null)
    try {
      const isEmail = searchQuery.includes("@")
      const params = isEmail 
        ? { email: searchQuery.trim() }
        : { enrollment_number: searchQuery.trim() }

      const response = await axios.get(`${API_BASE_URL}/auth/request-status`, { params })
      setStatusResult(response.data)
      toast.success("Request status found!")
    } catch (err) {
      const msg = err.response?.data?.detail || "No matching access request found."
      toast.error(msg)
    } finally {
      setCheckingStatus(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] font-dm text-white flex items-center justify-center relative overflow-hidden">
        {/* Aurora Background Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="aurora-orb w-96 h-96 bg-blue-500 top-10 left-10 opacity-30" />
          <div className="aurora-orb w-80 h-80 bg-violet-500 bottom-20 right-5 opacity-30" />
        </div>

        <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl text-center relative z-20 animate-fade-in">
          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-outfit font-bold mb-4">Request Submitted!</h2>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            Your request has been successfully received. We will cross-check your details with administrative lists. You will receive your temporary login credentials via email once approved.
          </p>
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-left text-white/60">
              <span className="font-semibold text-white block mb-1">What happens next?</span>
              1. Admin reviews and verifies your enrollment status.<br />
              2. Welcome email is dispatched with secure credentials.<br />
              3. Log in and change your password on first access.
            </div>
            <button
              onClick={() => {
                setSuccess(false)
                setActiveTab("check")
                setSearchQuery(email)
                // Proactively trigger the status fetch
                const triggerSearch = async () => {
                  setCheckingStatus(true)
                  try {
                    const response = await axios.get(`${API_BASE_URL}/auth/request-status`, {
                      params: { email: email.trim() }
                    })
                    setStatusResult(response.data)
                  } catch (err) {}
                  setCheckingStatus(false)
                }
                triggerSearch()
              }}
              className="bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-white/10 text-sm"
            >
              Track Request Status
            </button>
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-dm text-white flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-blue-500/20 top-10 left-10" />
        <div className="aurora-orb w-80 h-80 bg-violet-500/20 bottom-20 right-5" />
      </div>

      <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-20 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-8 h-8 text-blue-400" />
          <span className="font-outfit font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            IntelliLearn Access Request
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => {
              setActiveTab("apply")
              setStatusResult(null)
            }}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "apply"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            Apply for Access
          </button>
          <button
            onClick={() => {
              setActiveTab("check")
              setStatusResult(null)
            }}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "check"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            Track Status Indicator
          </button>
        </div>

        {activeTab === "apply" ? (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Apply for Credentials</h3>
              <p className="text-white/50 text-sm mt-1">Student self-registration is closed. Submit this request to verify and activate your portal access.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm"
                    placeholder="Mahima Dangi"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Enrollment Number */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">
                  Enrollment Number <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm"
                    placeholder="MLSU-2025-10493"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Semester */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">
                    Semester <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 transition-all text-sm appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem} className="bg-[#0f172a] text-white">
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course / Branch */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">
                    Course <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 transition-all text-sm appearance-none"
                    >
                      {coursesToRender.map((b) => (
                        <option key={b.id} value={b.code} className="bg-[#0f172a] text-white">
                          {b.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">
                    Section <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 transition-all text-sm appearance-none"
                    >
                      {["A", "B", "C"].map((sec) => (
                        <option key={sec} value={sec} className="bg-[#0f172a] text-white">
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reason (Optional) */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">
                  Reason for Access Request <span className="text-white/30 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm resize-none"
                  placeholder="Provide context or specify enrollment status if recently enrolled."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  "Submit Verification Request"
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="mb-2">
              <h3 className="text-xl font-semibold text-white">Access Status Checker</h3>
              <p className="text-white/50 text-sm mt-1">Track the live progress of your verification application below.</p>
            </div>

            <form onSubmit={handleCheckStatus} className="flex gap-3">
              <div className="relative flex-1 group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm"
                  placeholder="Enter email or enrollment no."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={checkingStatus}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shrink-0"
              >
                {checkingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
              </button>
            </form>

            {statusResult && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden animate-scale-in">
                {/* Visual Status Indicator Glow */}
                <div className={`absolute -right-4 -bottom-4 w-32 h-32 rounded-full blur-3xl opacity-15 transition-opacity ${
                  statusResult.status === 'pending' ? 'bg-amber-500' :
                  statusResult.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                }`} />

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="text-lg font-bold text-white pr-2">{statusResult.full_name}</h4>
                    <p className="text-white/40 text-xs mt-0.5">{statusResult.email}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                    statusResult.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    statusResult.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {statusResult.status}
                  </span>
                </div>

                <div className="space-y-3 text-sm border-t border-white/5 pt-4 mb-4 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-white/40 text-xs">Enrollment No:</span>
                    <span className="text-white font-mono text-xs font-semibold">{statusResult.enrollment_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-xs">Course / Branch:</span>
                    <span className="text-white text-xs font-semibold">{statusResult.branch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-xs">Semester & Sec:</span>
                    <span className="text-white text-xs font-semibold">Sem {statusResult.semester} (Sec {statusResult.section})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40 text-xs">Submitted:</span>
                    <span className="text-white text-xs font-semibold">{new Date(statusResult.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-xl text-xs relative z-10 border leading-relaxed ${
                  statusResult.status === 'pending' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                  statusResult.status === 'approved' ? 'bg-green-500/10 text-green-300 border-green-500/20' : 
                  'bg-red-500/10 text-red-300 border-red-500/20'
                }`}>
                  {statusResult.status === 'pending' && (
                    <div className="flex items-start gap-2">
                      <Loader2 className="w-4.5 h-4.5 animate-spin shrink-0 mt-0.5 text-amber-400" />
                      <span><strong>Under Review:</strong> Your onboarding application is pending. We are cross-checking your credentials against our student cohort directory. A welcome email containing your login details and a temporary password will be sent automatically once approved.</span>
                    </div>
                  )}
                  {statusResult.status === 'approved' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-green-400 shrink-0 mt-0.5" />
                        <span><strong>Approved:</strong> Your portal access has been verified and active. Your welcome credentials have been dispatched. You can now login.</span>
                      </div>
                      <Link
                        to="/login"
                        className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl text-center transition-all text-xs block"
                      >
                        Proceed to Login
                      </Link>
                    </div>
                  )}
                  {statusResult.status === 'rejected' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                        <span><strong>Declined:</strong> Unfortunately, your request was declined because: <em>{statusResult.rejection_reason || "Details provided do not match administrative records."}</em></span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("apply")
                          setFullName(statusResult.full_name)
                          setEmail(statusResult.email)
                          setEnrollmentNumber(statusResult.enrollment_number)
                          setSemester(statusResult.semester)
                          setBranch(statusResult.branch)
                          setSection(statusResult.section)
                          setStatusResult(null)
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold py-2.5 rounded-xl text-center transition-all text-xs block"
                      >
                        Reapply with Correct Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm border-t border-white/10 pt-4">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
