import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Users,
  Search,
  Activity,
  SearchX,
  Filter,
  Eye,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  GraduationCap,
  Loader2,
  Upload,
  RefreshCw,
  UserCheck,
  UserX,
  FileCheck,
  Trash2,
  X
} from 'lucide-react'
import adminService from '../../services/adminService'
import courseService from '../../services/courseService'
import PageWrapper from '../../components/PageWrapper'
import { statusBadge } from '../../utils/badgeColors'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('registered') // 'registered' | 'enrolled'
  
  // Enrolled Registry State
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [enrolledLoading, setEnrolledLoading] = useState(false)
  const [enrolledSearch, setEnrolledSearch] = useState('')
  const [enrolledSemester, setEnrolledSemester] = useState('')
  const [enrolledBranch, setEnrolledBranch] = useState('')
  const [enrolledStatus, setEnrolledStatus] = useState('All')
  const [credentialActionLoading, setCredentialActionLoading] = useState({}) // { [id]: boolean }

  // Search parameters from URL (e.g. when navigated from AdminDashboard course card click)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlCourseId = searchParams.get('course_id') || ''

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState(urlCourseId)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('')
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Advance Semester Modal States
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
  const [advanceCourseId, setAdvanceCourseId] = useState('')
  const [advanceFromSemester, setAdvanceFromSemester] = useState('')
  const [advanceToSemester, setAdvanceToSemester] = useState('')
  const [affectedCount, setAffectedCount] = useState(null)
  const [countLoading, setCountLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  // Fetch all courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await courseService.getCourses()
        setCourses(data || [])
      } catch (err) {
        console.error("Failed to load courses:", err)
      }
    }
    fetchCourses()
  }, [])

  // Sync search param course_id
  useEffect(() => {
    if (urlCourseId) {
      setSelectedCourseFilter(urlCourseId)
    }
  }, [urlCourseId])

  // Fetch filtered students
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const data = await adminService.getStudents(
        selectedCourseFilter || null,
        selectedSemesterFilter ? parseInt(selectedSemesterFilter) : null,
        selectedSectionFilter === 'All' ? null : selectedSectionFilter,
        searchTerm || null
      )
      setStudents(data || [])
    } catch (err) {
      console.error("Failed to fetch students list:", err)
      toast.error("Failed to load students list")
    } finally {
      setLoading(false)
    }
  }

  // Fetch pre-authorized enrolled students
  const fetchEnrolledStudents = async () => {
    try {
      setEnrolledLoading(true)
      const data = await adminService.getEnrolledStudents(
        enrolledSemester ? parseInt(enrolledSemester) : null,
        enrolledBranch || null,
        enrolledStatus === 'All' ? null : enrolledStatus,
        enrolledSearch || null
      )
      setEnrolledStudents(data || [])
    } catch (err) {
      console.error("Failed to fetch enrolled students:", err)
      toast.error("Failed to load pre-authorized registry")
    } finally {
      setEnrolledLoading(false)
    }
  }

  const handleGenerateCredentials = async (studentId) => {
    setCredentialActionLoading(prev => ({ ...prev, [studentId]: true }))
    try {
      const response = await adminService.generateCredentials(studentId)
      toast.success(response.message || "Credentials generated and email sent successfully!")
      fetchEnrolledStudents()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate credentials")
    } finally {
      setCredentialActionLoading(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const handleResendCredentials = async (studentId) => {
    setCredentialActionLoading(prev => ({ ...prev, [studentId]: true }))
    try {
      const response = await adminService.resendCredentials(studentId)
      toast.success(response.message || "Credentials successfully resent!")
      fetchEnrolledStudents()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend credentials")
    } finally {
      setCredentialActionLoading(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const handleDeleteStudent = async (studentId, name) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete student account "${name}"?\nThis will delete their registered account and all associated data.`)) {
      return
    }
    try {
      await adminService.deleteStudent(studentId)
      toast.success(`Successfully deleted student account: ${name}`)
      fetchStudents()
    } catch (err) {
      console.error("Failed to delete student:", err)
      toast.error(err.response?.data?.detail || "Failed to delete student")
    }
  }

  const handleDeleteEnrolledStudent = async (enrolledId, name) => {
    if (!window.confirm(`Are you sure you want to delete pre-authorized student record "${name}"?`)) {
      return
    }
    try {
      await adminService.deleteEnrolledStudent(enrolledId)
      toast.success(`Successfully deleted pre-authorized record: ${name}`)
      fetchEnrolledStudents()
    } catch (err) {
      console.error("Failed to delete pre-authorized record:", err)
      toast.error(err.response?.data?.detail || "Failed to delete record")
    }
  }

  useEffect(() => {
    if (activeTab === 'registered') {
      fetchStudents()
    } else {
      fetchEnrolledStudents()
    }
  }, [selectedCourseFilter, selectedSemesterFilter, selectedSectionFilter, searchTerm, enrolledSemester, enrolledBranch, enrolledStatus, enrolledSearch, activeTab])


  // Active course object for listing filters
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseFilter)
  }, [courses, selectedCourseFilter])

  // Reset semester filter when course filter changes
  const handleCourseFilterChange = (courseId) => {
    setSelectedCourseFilter(courseId)
    setSelectedSemesterFilter('')
    
    // Update Search Params
    if (courseId) {
      setSearchParams({ course_id: courseId })
    } else {
      setSearchParams({})
    }
  }

  // Active course for advance modal
  const advanceActiveCourse = useMemo(() => {
    return courses.find(c => c.id === advanceCourseId)
  }, [courses, advanceCourseId])

  // Fetch count of students affected by semester advancement
  useEffect(() => {
    const fetchAffectedCount = async () => {
      if (!advanceCourseId || !advanceFromSemester) {
        setAffectedCount(null)
        return
      }
      setCountLoading(true)
      try {
        const data = await courseService.getStudentCount(advanceCourseId, parseInt(advanceFromSemester))
        setAffectedCount(data.count)
      } catch (err) {
        console.error("Failed to fetch student count for advancement:", err)
        setAffectedCount(0)
      } finally {
        setCountLoading(false)
      }
    }
    fetchAffectedCount()
  }, [advanceCourseId, advanceFromSemester])

  // Automatically compute target semester
  const handleFromSemChange = (semVal) => {
    setAdvanceFromSemester(semVal)
    if (semVal) {
      setAdvanceToSemester(String(parseInt(semVal) + 1))
    } else {
      setAdvanceToSemester('')
    }
  }

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault()
    if (!advanceCourseId || !advanceFromSemester || !advanceToSemester) {
      toast.error("Please fill in all advancement fields")
      return
    }

    if (affectedCount === 0) {
      toast.error("No active students found in this cohort to advance")
      return
    }

    const confirmMsg = `Are you absolutely sure you want to advance all ${advanceActiveCourse?.code} Semester ${advanceFromSemester} students to Semester ${advanceToSemester}? This is a permanent administrative cohort progression.`
    if (!window.confirm(confirmMsg)) {
      return
    }

    setAdvancing(true)
    try {
      const response = await adminService.advanceSemester(
        advanceCourseId,
        parseInt(advanceFromSemester),
        parseInt(advanceToSemester)
      )
      toast.success(response.message || "Students semester advanced successfully!")
      setIsAdvanceModalOpen(false)
      // Reset
      setAdvanceCourseId('')
      setAdvanceFromSemester('')
      setAdvanceToSemester('')
      fetchStudents()
    } catch (err) {
      console.error("Advancement error:", err)
      toast.error(err.response?.data?.detail || "Failed to advance cohort semester")
    } finally {
      setAdvancing(false)
    }
  }

  // Filter students reactively on client side for status
  const finalFilteredStudents = useMemo(() => {
    return students.filter(s => {
      return statusFilter === 'All' || s.status.toLowerCase() === statusFilter.toLowerCase()
    })
  }, [students, statusFilter])

  const getInitials = (name) => {
    if (!name) return 'ST'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <PageWrapper>
      {/* Tab Selectors */}
      <div className="flex border-b border-white/10 mb-8 gap-6 text-sm relative z-10">
        <button
          onClick={() => setActiveTab('registered')}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'registered'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Registered student users
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'enrolled'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pre-Authorized Registry
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 relative z-10">
        {activeTab === 'registered' ? (
          <>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Students</h1>
                <span className="bg-[#8B5CF6]/20 text-[#8B5CF6] text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">
                  {finalFilteredStudents.length} Active Accounts
                </span>
              </div>
              <p className="text-white/50 text-sm mt-1">Monitor student cohorts, platform streaks, and academic progression.</p>
            </div>

            {/* Cohort Semester Promotion Button */}
            <button 
              onClick={() => setIsAdvanceModalOpen(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              Advance Cohort Semester
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Pre-Authorized Students</h1>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">
                  {enrolledStudents.length} Enrolled
                </span>
              </div>
              <p className="text-white/50 text-sm mt-1">Manage bulk-imported cohorts, review credentials sent, or manually issue access keys.</p>
            </div>

            {/* Bulk Upload Button */}
            <Link 
              to="/admin/students/upload"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              Upload Student Roster
            </Link>
          </>
        )}
      </div>

      {/* MULTIVARIABLE FILTERS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 backdrop-blur-md relative z-10">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Multivariable Cohort Filtering</h3>
        
        {activeTab === 'registered' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Search Name or Enrollment..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all text-sm font-medium"
              />
            </div>

            {/* Course Dropdown */}
            <div className="relative">
              <select
                value={selectedCourseFilter}
                onChange={(e) => handleCourseFilterChange(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="" className="bg-[#0F172A]">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0F172A]">{c.name} ({c.code})</option>
                ))}
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>

            {/* Semester Dropdown */}
            <div className="relative">
              <select
                value={selectedSemesterFilter}
                onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                disabled={!selectedCourseFilter}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 disabled:opacity-40 disabled:border-white/5 rounded-xl px-4 py-2.5 text-sm text-white/80 disabled:text-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="" className="bg-[#0F172A]">{selectedCourseFilter ? "All Semesters" : "Select Course..."}</option>
                {activeCourse && Array.from({ length: activeCourse.total_semesters }).map((_, i) => (
                  <option key={i+1} value={i+1} className="bg-[#0F172A]">Semester {i+1}</option>
                ))}
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>

            {/* Section Dropdown */}
            <div className="relative">
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="All" className="bg-[#0F172A]">All Sections</option>
                <option value="A" className="bg-[#0F172A]">Section A</option>
                <option value="B" className="bg-[#0F172A]">Section B</option>
                <option value="C" className="bg-[#0F172A]">Section C</option>
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="All" className="bg-[#0F172A]">All Statuses</option>
                <option value="active" className="bg-[#0F172A]">Active</option>
                <option value="inactive" className="bg-[#0F172A]">Inactive</option>
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Search Name or Enrollment..." 
                value={enrolledSearch}
                onChange={(e) => setEnrolledSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all text-sm font-medium"
              />
            </div>

            {/* Branch Filter */}
            <div className="relative">
              <select
                value={enrolledBranch}
                onChange={(e) => setEnrolledBranch(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="" className="bg-[#0F172A]">All Branches</option>
                <option value="MCA" className="bg-[#0F172A]">MCA</option>
                <option value="BCA" className="bg-[#0F172A]">BCA</option>
                <option value="BSc CS" className="bg-[#0F172A]">BSc CS</option>
                <option value="MSc CS" className="bg-[#0F172A]">MSc CS</option>
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>

            {/* Semester Filter */}
            <div className="relative">
              <select
                value={enrolledSemester}
                onChange={(e) => setEnrolledSemester(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="" className="bg-[#0F172A]">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem} className="bg-[#0F172A]">Semester {sem}</option>
                ))}
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={enrolledStatus}
                onChange={(e) => setEnrolledStatus(e.target.value)}
                className="w-full appearance-none bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-medium cursor-pointer"
              >
                <option value="All" className="bg-[#0F172A]">All Statuses</option>
                <option value="approved" className="bg-[#0F172A]">Approved</option>
                <option value="pending" className="bg-[#0F172A]">Pending</option>
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC DATA TABLE PANEL */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative z-10">
        {activeTab === 'registered' ? (
          loading ? (
            <div className="animate-pulse">
              <div className="h-12 bg-white/5 border-b border-white/10" />
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 border-b border-white/10 opacity-50" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1000px]">
                <thead>
                  <tr className="bg-white/5 text-white/40 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-5 rounded-tl-2xl">Student & Enrollment</th>
                    <th className="p-5">Email</th>
                    <th className="p-5">Course & Sem</th>
                    <th className="p-5">Sec</th>
                    <th className="p-5">CGPA</th>
                    <th className="p-5">Streak</th>
                    <th className="p-5">Last Active</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {finalFilteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-12 text-center">
                        <EmptyState title="No students found" description="Try broadening your search or selection filters." icon={SearchX} />
                      </td>
                    </tr>
                  ) : (
                    finalFilteredStudents.map((student, idx) => {
                      const avatarColors = [
                        'bg-blue-500/30 text-blue-300 border-blue-500/20',
                        'bg-violet-500/30 text-violet-300 border-violet-500/20',
                        'bg-emerald-500/30 text-emerald-300 border-emerald-500/20',
                        'bg-orange-500/30 text-orange-300 border-orange-500/20',
                        'bg-pink-500/30 text-pink-300 border-pink-500/20'
                      ]
                      const themeClass = avatarColors[idx % avatarColors.length]

                      return (
                        <tr key={student.id} className="hover:bg-white/3 transition-colors group">
                          
                          {/* Student Avatar, Name, Enrollment */}
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${themeClass}`}>
                                {getInitials(student.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-semibold text-sm truncate">{student.name}</p>
                                <p className="text-[10px] text-white/40 font-mono mt-0.5">{student.enrollment || "N/A"}</p>
                              </div>
                            </div>
                          </td>
                          
                          {/* Email */}
                          <td className="p-5 text-white/60 text-sm truncate max-w-[180px]">{student.email}</td>
                          
                          {/* Course & Sem */}
                          <td className="p-5">
                            {student.course_code ? (
                              <div className="flex flex-col">
                                <span className="text-white font-bold text-xs">{student.course_code}</span>
                                <span className="text-[10px] text-white/40 font-medium">Semester {student.current_semester}</span>
                              </div>
                            ) : (
                              <span className="text-white/30 text-xs">Unassigned</span>
                            )}
                          </td>

                          {/* Section */}
                          <td className="p-5">
                            <span className="text-white font-semibold text-sm">{student.section || "-"}</span>
                          </td>

                          {/* CGPA */}
                          <td className="p-5">
                            <span className="text-white font-mono font-bold text-sm">{(student.cgpa || 0.0).toFixed(2)}</span>
                          </td>

                          {/* Streak */}
                          <td className="p-5">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              student.streak > 5 
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' 
                                : student.streak === 0
                                ? 'bg-white/5 text-white/30 border border-white/10'
                                : 'bg-white/10 text-white/60 border border-white/10'
                            }`}>
                              🔥 {student.streak} days
                            </div>
                          </td>
                          
                          {/* Last Active */}
                          <td className="p-5">
                            <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
                              <Activity className="w-3.5 h-3.5 text-white/20" />
                              {student.last_active}
                            </div>
                          </td>
                          
                          {/* Status */}
                          <td className="p-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              student.status === 'active' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              {student.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          
                          {/* Action View & Delete Buttons */}
                          <td className="p-5 text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-2">
                              <button 
                                onClick={() => toast.success(`Viewing profile of ${student.name}\nEnrollment: ${student.enrollment || "N/A"}\nPhone: ${student.phone || "N/A"}\nRoll No: ${student.roll_number || "N/A"}`)}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-violet-400 hover:text-white hover:bg-violet-500/20 bg-white/5 font-semibold text-xs transition-all border border-transparent hover:border-violet-500/25 cursor-pointer animate-pulse-hover"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 bg-white/5 font-semibold text-xs transition-all border border-transparent hover:border-red-500/25 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          enrolledLoading ? (
            <div className="animate-pulse">
              <div className="h-12 bg-white/5 border-b border-white/10" />
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 border-b border-white/10 opacity-50" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1000px]">
                <thead>
                  <tr className="bg-white/5 text-white/40 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-5 rounded-tl-2xl">Student Details</th>
                    <th className="p-5">Enrollment No.</th>
                    <th className="p-5">Semester</th>
                    <th className="p-5">Branch</th>
                    <th className="p-5">Status</th>
                    <th className="p-5">Credentials Sent</th>
                    <th className="p-5 text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center">
                        <EmptyState title="Authorized Registry is empty" description="Upload CSV cohort rosters or add students manually to authorise access." icon={SearchX} />
                      </td>
                    </tr>
                  ) : (
                    enrolledStudents.map((enrolled) => (
                      <tr key={enrolled.id} className="hover:bg-white/3 transition-colors group">
                        {/* Student Detail */}
                        <td className="p-5">
                          <div>
                            <span className="font-bold text-white block text-sm">{enrolled.full_name}</span>
                            <span className="text-white/40 text-xs block mt-0.5">{enrolled.email}</span>
                          </div>
                        </td>

                        {/* Enrollment number */}
                        <td className="p-5">
                          <span className="text-white font-semibold font-mono text-sm">{enrolled.enrollment_number}</span>
                        </td>

                        {/* Semester */}
                        <td className="p-5">
                          <span className="text-white/70 text-xs font-semibold">Semester {enrolled.semester} (Sec {enrolled.section})</span>
                        </td>

                        {/* Branch */}
                        <td className="p-5">
                          <span className="text-white/70 text-xs font-semibold">{enrolled.branch}</span>
                        </td>

                        {/* Status Approved/Pending */}
                        <td className="p-5">
                          {(() => {
                            const badge = statusBadge(enrolled.is_approved ? 'active' : 'pending');
                            return (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border animate-fade-in"
                                style={{
                                  background: badge.bg,
                                  color: badge.color,
                                  borderColor: `${badge.color}30`
                                }}
                              >
                                {enrolled.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Credentials Sent indicator */}
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            enrolled.credentials_sent 
                              ? 'text-teal-400' 
                              : 'text-white/30'
                          }`}>
                            {enrolled.credentials_sent ? (
                              <>
                                <FileCheck className="w-4 h-4 text-teal-400" />
                                Yes
                              </>
                            ) : (
                              'No'
                            )}
                          </span>
                        </td>

                        {/* Trigger Actions per row */}
                        <td className="p-5 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            {enrolled.is_approved ? (
                              <button
                                type="button"
                                onClick={() => handleResendCredentials(enrolled.id)}
                                disabled={credentialActionLoading[enrolled.id]}
                                className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              >
                                {credentialActionLoading[enrolled.id] ? (
                                  <Loader2 className="w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                Resend Access
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateCredentials(enrolled.id)}
                                disabled={credentialActionLoading[enrolled.id]}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50 hover:shadow-md hover:shadow-blue-500/20 cursor-pointer"
                              >
                                {credentialActionLoading[enrolled.id] ? (
                                  <Loader2 className="w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3 h-3" />
                                )}
                                Issue Keys
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEnrolledStudent(enrolled.id, enrolled.full_name)}
                              className="bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Advance Semester Cohort Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5.5 h-5.5 text-white/60" />
                Advance Semester Cohort
              </h2>
              <button disabled={advancing} onClick={() => setIsAdvanceModalOpen(false)} className="text-white/50 hover:text-white transition-colors disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
              {/* Select Course */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Select Course</label>
                <select
                  required
                  value={advanceCourseId}
                  onChange={(e) => {
                    setAdvanceCourseId(e.target.value)
                    setAdvanceFromSemester('')
                    setAdvanceToSemester('')
                  }}
                  disabled={advancing}
                  className="w-full bg-[#0A0F1E] border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0f172a] text-white">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Advancement Steps */}
              {advanceCourseId && (
                <div className="grid grid-cols-2 gap-4 items-center bg-white/5 border border-white/5 p-4 rounded-xl">
                  {/* From Semester */}
                  <div>
                    <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-1.5">From Semester</label>
                    <select
                      required
                      value={advanceFromSemester}
                      onChange={(e) => handleFromSemChange(e.target.value)}
                      disabled={advancing}
                      className="w-full bg-[#0A0F1E] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer font-bold"
                    >
                      <option value="" disabled>Select...</option>
                      {advanceActiveCourse && Array.from({ length: advanceActiveCourse.total_semesters - 1 }).map((_, i) => (
                        <option key={i+1} value={i+1} className="bg-[#0f172a] text-white">
                          Semester {i+1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center pt-5">
                    <ChevronRight className="w-6 h-6 text-white/40 animate-pulse" />
                  </div>

                  {/* To Semester */}
                  <div className="col-span-2 mt-2">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/60">Target Semester</span>
                      <span className="text-sm font-bold text-white uppercase tracking-wider bg-white/10 px-3 py-1 rounded-lg">
                        {advanceToSemester ? `Semester ${advanceToSemester}` : "..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Target Count Indicator */}
              {advanceCourseId && advanceFromSemester && affectedCount !== null && (
                <div className="animate-fade-in flex items-center gap-2.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/10 rounded-xl px-3 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Warning: This cohort progression will advance ~{affectedCount} active {advanceActiveCourse?.code} students from Semester {advanceFromSemester} to Semester {advanceToSemester}.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  disabled={advancing}
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advancing || countLoading || !advanceFromSemester || affectedCount === 0}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-3 rounded-xl shadow-lg shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {advancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Advancing...
                    </>
                  ) : (
                    "Confirm & Advance"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
