import { useState, useMemo, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import courseService from "../services/courseService"
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Sun,
  Moon,
  Phone,
  Hash,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Edit3
} from "lucide-react"
import toast from "react-hot-toast"

export default function RegisterPage() {
  const { register } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Form states
  const [step, setStep] = useState(1)
  const [role, setRole] = useState("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Academic states
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedSemester, setSelectedSemester] = useState(1)

  // College states (Student only)
  const [enrollmentNo, setEnrollmentNo] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [section, setSection] = useState("A")
  const [admissionYear, setAdmissionYear] = useState(new Date().getFullYear())

  // UI / UX states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [globalError, setGlobalError] = useState("")
  const [success, setSuccess] = useState(false)

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true)
      try {
        const data = await courseService.getCourses()
        setCourses(data)
        if (data.length > 0) {
          setSelectedCourseId(data[0].id)
        }
      } catch (err) {
        toast.error("Failed to load courses. Please refresh.")
      } finally {
        setCoursesLoading(false)
      }
    }
    fetchCourses()
  }, [])

  // Find active course object
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)
  }, [courses, selectedCourseId])

  // Reset semester selection when course changes
  useEffect(() => {
    setSelectedSemester(1)
  }, [selectedCourseId])

  // Real-time validations
  const nameError = name.length > 0 && name.length < 2 ? "Name must be at least 2 characters" : ""
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailError = email.length > 0 && !emailRegex.test(email) ? "Please enter a valid email" : ""

  const passwordError = password.length > 0 && password.length < 6 ? "Password must be at least 6 characters" : ""

  const isPasswordsMatching = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const isPasswordsNotMatching = confirmPassword.length > 0 && password !== confirmPassword
  const confirmPasswordError = isPasswordsNotMatching ? "Passwords do not match" : ""

  // Password strength: 0 to 4
  const passwordStrength = useMemo(() => {
    if (!password) return { value: 0, label: "", classes: ["bg-white/10", "bg-white/10", "bg-white/10", "bg-white/10"], textColor: "text-white/30" }
    if (password.length < 6) return { value: 1, label: "Weak", classes: ["bg-red-500", "bg-white/10", "bg-white/10", "bg-white/10"], textColor: "text-red-400" }

    const hasLetters = /[a-zA-Z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)
    
    let strength = 1
    if (hasLetters && hasNumbers) strength = 2
    if (hasLetters && hasNumbers && password.length >= 8) strength = 3
    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) strength = 4

    switch (strength) {
      case 2: return { value: 2, label: "Fair", classes: ["bg-orange-400", "bg-orange-400", "bg-white/10", "bg-white/10"], textColor: "text-orange-400" }
      case 3: return { value: 3, label: "Good", classes: ["bg-yellow-400", "bg-yellow-400", "bg-yellow-400", "bg-white/10"], textColor: "text-yellow-400" }
      case 4: return { value: 4, label: "Strong", classes: ["bg-emerald-500", "bg-emerald-500", "bg-emerald-500", "bg-emerald-500"], textColor: "text-emerald-400" }
      default: return { value: 1, label: "Weak", classes: ["bg-red-500", "bg-white/10", "bg-white/10", "bg-white/10"], textColor: "text-red-400" }
    }
  }, [password])

  // Multi-step navigation logic
  const handleNextStep = () => {
    setGlobalError("")
    if (step === 1) {
      if (!name || !email || !password || !confirmPassword) {
        setGlobalError("Please fill in all required fields")
        return
      }
      if (nameError || emailError || passwordError || confirmPasswordError) {
        setGlobalError("Please resolve all input validation errors before continuing")
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (role === "student" && !selectedCourseId) {
        setGlobalError("Please select a target course")
        return
      }
      if (role === "student") {
        setStep(3)
      } else {
        setStep(4) // Skip college details for Admin
      }
    } else if (step === 3) {
      if (!enrollmentNo || !rollNumber) {
        setGlobalError("Enrollment and Roll numbers are required for student registration")
        return
      }
      setStep(4)
    }
  }

  const handlePrevStep = () => {
    setGlobalError("")
    if (step === 4 && role === "admin") {
      setStep(2)
    } else {
      setStep(prev => prev - 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError("")
    setLoading(true)

    try {
      const extraPayload = role === "student" ? {
        courseId: selectedCourseId,
        currentSemester: selectedSemester,
        enrollmentNo: enrollmentNo.trim(),
        rollNumber: rollNumber.trim(),
        section: section,
        phone: phone.trim() || null,
        admissionYear: parseInt(admissionYear)
      } : {
        phone: phone.trim() || null
      }

      await register(name.trim(), email, password, role, extraPayload)
      setSuccess(true)
      toast.success("Account created successfully! Please login.")
      
      setTimeout(() => {
        navigate("/login")
      }, 1500)
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || "Registration failed. Try again."
      setGlobalError(msg)
      toast.error(msg)
    }
  }

  // Dynamic step labels
  const stepsList = useMemo(() => {
    if (role === "student") {
      return [
        { num: 1, label: "Personal Info" },
        { num: 2, label: "Academic details" },
        { num: 3, label: "College Details" },
        { num: 4, label: "Review & Submit" }
      ]
    } else {
      return [
        { num: 1, label: "Personal Info" },
        { num: 2, label: "Academic details" },
        { num: 4, label: "Review & Submit" } // Step 3 skipped
      ]
    }
  }, [role])

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-dm text-white flex relative overflow-hidden">

      
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-blue-500 top-10 left-10" style={{ animationDelay: '0s' }} />
        <div className="aurora-orb w-80 h-80 bg-violet-500 bottom-20 right-5" style={{ animationDelay: '3s' }} />
        <div className="aurora-orb w-64 h-64 bg-teal-500 top-1/2 left-1/2" style={{ animationDelay: '5s' }} />
      </div>

      {/* LEFT COLUMN (hidden on mobile, lg:flex flex-col) */}
      <div className="hidden lg:flex flex-col w-1/2 p-16 relative z-10 justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-white" />
          <span className="font-outfit font-extrabold text-2xl text-white">
            IntelliLearn
          </span>
        </div>

        <div className="my-auto">
          <h1 className="text-5xl font-outfit font-bold text-white mb-2">
            Elevate Your
          </h1>
          <h1 className="text-5xl font-outfit font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400 mb-2">
            MSU Curriculum
          </h1>
          <h1 className="text-5xl font-outfit font-bold text-white mb-6">
            Experience.
          </h1>
          <p className="text-white/50 text-lg">
            Powered by AI • Tailored for MSU Udaipur CS Portal
          </p>

          <div className="mt-12 flex flex-col gap-4">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
              <BookOpen className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Course & Semester Flow</h4>
                <p className="text-white/50 text-sm mt-1">Directly maps assessments to your specific semester classes</p>
              </div>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
              <MessageSquare className="w-6 h-6 text-violet-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">AI Doubt Assistant</h4>
                <p className="text-white/50 text-sm mt-1">24/7 instant doubt resolution matched to your curriculum syllabus</p>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
              <TrendingUp className="w-6 h-6 text-teal-400 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Weekly Timetables & Events</h4>
                <p className="text-white/50 text-sm mt-1">Track course-specific lecture schedules and examinations seamlessly</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-sm">
          &copy; {new Date().getFullYear()} IntelliLearn. All rights reserved.
        </p>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-10 overflow-y-auto max-h-screen">
        <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in relative z-20 my-auto">
          
          {/* Header */}
          <div className="mb-6">
            <div className="inline-block bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full font-semibold tracking-wide">
              🎓 Step {step === 4 ? (role === "student" ? 4 : 3) : step} of {role === "student" ? 4 : 3}
            </div>
            <h2 className="text-3xl font-outfit font-bold text-white mt-3">Join IntelliLearn</h2>
            <p className="text-white/50 text-sm mt-1">Start your AI-powered university learning journey</p>
          </div>

          {/* Stepper Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {stepsList.map((s, index) => {
              const isActive = step === s.num
              const isCompleted = step > s.num || (step === 4 && s.num === 4)
              return (
                <div key={s.num} className="flex-1 flex flex-col gap-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive 
                      ? "bg-blue-500 shadow-md shadow-blue-500/50" 
                      : isCompleted 
                        ? "bg-emerald-500" 
                        : "bg-white/10"
                  }`} />
                  <span className={`text-[10px] font-semibold truncate transition-colors duration-200 text-center ${
                    isActive 
                      ? "text-blue-400" 
                      : isCompleted 
                        ? "text-emerald-400" 
                        : "text-white/20"
                  }`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* ================= STEP 1: PERSONAL INFO ================= */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Full Name</label>
                  <div className="relative group">
                    <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${nameError ? 'text-red-400' : 'text-white/30 group-focus-within:text-blue-500'}`} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="Mahima Dangi"
                      required
                    />
                  </div>
                  {nameError && <p className="text-red-400 text-xs mt-1 font-medium">{nameError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Email Address</label>
                  <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${emailError ? 'text-red-400' : 'text-white/30 group-focus-within:text-blue-500'}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="mahima@intellilearn.edu"
                      required
                    />
                  </div>
                  {emailError && <p className="text-red-400 text-xs mt-1 font-medium">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Phone Number (Optional)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${passwordError ? 'text-red-400' : 'text-white/30 group-focus-within:text-blue-500'}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-10 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-400 text-xs mt-1 font-medium">{passwordError}</p>}

                  {password && (
                    <div className="mt-2 text-[10px] w-full flex items-center gap-2">
                      <div className="flex flex-1 gap-1 h-1">
                        <div className={`flex-1 rounded-full h-1 ${passwordStrength.classes[0]}`} />
                        <div className={`flex-1 rounded-full h-1 ${passwordStrength.classes[1]}`} />
                        <div className={`flex-1 rounded-full h-1 ${passwordStrength.classes[2]}`} />
                        <div className={`flex-1 rounded-full h-1 ${passwordStrength.classes[3]}`} />
                      </div>
                      <span className={`font-semibold shrink-0 w-12 text-right ${passwordStrength.textColor}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative group">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${confirmPasswordError ? 'text-red-400' : 'text-white/30 group-focus-within:text-blue-500'}`} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="Re-enter password"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isPasswordsMatching && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {isPasswordsNotMatching && <XCircle className="w-4 h-4 text-red-500" />}
                      {!isPasswordsNotMatching && !isPasswordsMatching && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-white/30 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {confirmPasswordError && <p className="text-red-400 text-xs mt-1 font-medium">{confirmPasswordError}</p>}
                </div>
              </div>
            )}

            {/* ================= STEP 2: ACADEMIC DETAILS ================= */}
            {step === 2 && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2.5 uppercase tracking-wider">Select Portal Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                        role === "student"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <GraduationCap className={`w-5 h-5 ${role === "student" ? "text-blue-400" : ""}`} />
                        <span className="font-bold text-sm">Student</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-medium leading-relaxed">I'm here to study and access class material</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                        role === "admin"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <UserCheck className={`w-5 h-5 ${role === "admin" ? "text-blue-400" : ""}`} />
                        <span className="font-bold text-sm">Admin</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-medium leading-relaxed">I manage university curricula & timetables</span>
                    </button>
                  </div>
                </div>

                {role === "student" && (
                  <div className="flex flex-col gap-4 animate-fade-in mt-1">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">University Course</label>
                      {coursesLoading ? (
                        <div className="flex items-center gap-2 text-white/40 text-xs py-3">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          Loading university courses...
                        </div>
                      ) : (
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium appearance-none cursor-pointer"
                        >
                          {courses.map((course) => (
                            <option key={course.id} value={course.id} className="bg-[#0f172a] text-white">
                              {course.name} ({course.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {activeCourse && (
                      <div className="animate-fade-in">
                        <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Current Semester</label>
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: activeCourse.total_semesters }).map((_, i) => {
                            const semNum = i + 1
                            const isSelected = selectedSemester === semNum
                            return (
                              <button
                                key={semNum}
                                type="button"
                                onClick={() => setSelectedSemester(semNum)}
                                className={`py-3 rounded-xl font-bold border transition-all text-sm cursor-pointer ${
                                  isSelected
                                    ? "bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/25"
                                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/8 hover:text-white"
                                }`}
                              >
                                {semNum}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= STEP 3: COLLEGE DETAILS ================= */}
            {step === 3 && role === "student" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Enrollment Number</label>
                  <div className="relative group">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="217543591"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Roll Number</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="MCA/2024/001"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2.5 uppercase tracking-wider">Section Assignment</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["A", "B", "C"].map((sec) => {
                      const isSelected = section === sec
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSection(sec)}
                          className={`py-3 rounded-xl font-bold border transition-all text-sm cursor-pointer ${
                            isSelected
                              ? "bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/25"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/8"
                          }`}
                        >
                          Section {sec}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Admission Year</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-blue-500" />
                    <input
                      type="number"
                      value={admissionYear}
                      onChange={(e) => setAdmissionYear(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                      placeholder="2024"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 4: REVIEW & SUBMIT ================= */}
            {step === 4 && (
              <div className="flex flex-col gap-4 animate-fade-in text-white/90">
                <div className="border border-white/10 bg-white/5 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="font-outfit font-bold text-base text-white">Everything correct?</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded">Summary</span>
                  </div>

                  <div className="flex flex-col gap-3.5 text-xs">
                    {/* Block 1: Personal */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-white/40">
                        <span className="font-medium tracking-wide uppercase text-[10px]">Personal Info</span>
                        <button type="button" onClick={() => setStep(1)} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5">
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      <div className="font-semibold text-white">{name} ({email})</div>
                      {phone && <div className="text-white/60">Phone: {phone}</div>}
                    </div>

                    {/* Block 2: Academic */}
                    <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                      <div className="flex justify-between items-center text-white/40">
                        <span className="font-medium tracking-wide uppercase text-[10px]">Academic Details</span>
                        <button type="button" onClick={() => setStep(2)} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5">
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      <div className="font-semibold text-white">Role: <span className="capitalize">{role}</span></div>
                      {role === "student" && activeCourse && (
                        <div className="text-white/60 font-medium">
                          {activeCourse.name} ({activeCourse.code}) • Semester {selectedSemester}
                        </div>
                      )}
                    </div>

                    {/* Block 3: College (Student only) */}
                    {role === "student" && (
                      <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                        <div className="flex justify-between items-center text-white/40">
                          <span className="font-medium tracking-wide uppercase text-[10px]">College Details</span>
                          <button type="button" onClick={() => setStep(3)} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                        <div className="text-white/70 flex flex-col gap-0.5">
                          <div>Enrollment No: <span className="font-semibold text-white">{enrollmentNo}</span></div>
                          <div>Roll Number: <span className="font-semibold text-white">{rollNumber}</span></div>
                          <div>Section: <span className="font-semibold text-white">{section}</span></div>
                          <div>Admission Year: <span className="font-semibold text-white">{admissionYear}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {globalError && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3.5 text-red-300 text-xs flex items-start gap-2.5 mt-1 animate-shake">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span>{globalError}</span>
              </div>
            )}

            {/* Form controls */}
            <div className="flex gap-3 mt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              {step < 4 && (role === "student" || step < 2) ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                step === 4 && (
                  <button
                    type="submit"
                    disabled={loading || success}
                    className={`flex-1 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed text-sm ${
                      success 
                        ? "bg-emerald-500 hover:bg-emerald-500 scale-[1.02] shadow-lg shadow-emerald-500/20" 
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 cursor-pointer"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating account...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Redirecting to Login...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                )
              )}
            </div>
          </form>

          <div className="mt-8 text-center text-sm border-t border-white/5 pt-6">
            <span className="text-white/40 font-medium">Already have an account? </span>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
