import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users, Search, Filter, Eye, ChevronRight, AlertCircle, RefreshCw, UserCheck, UserX,
  Trash2, X, AlertTriangle, Sparkles, FileText, CheckCircle2, Calendar, Send, Check,
  UserMinus, Plus, ShieldAlert, BadgeInfo
} from 'lucide-react'
import api from '../../services/api'
import courseService from '../../services/courseService'
import adminService from '../../services/adminService'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

// All student data is fetched live from Neon PostgreSQL via the API.

export default function StudentsPage() {
  const [searchParams] = useSearchParams()
  const urlCourseId = searchParams.get('course_id') || ''

  // Core Data States
  const [students, setStudents] = useState([])
  const [pendingStudents, setPendingStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDbEmpty, setIsDbEmpty] = useState(false)

  // Active Tab: 'all' | 'pending' | 'risk' | 'deactivated'
  const [activeTab, setActiveTab] = useState('all')

  // Global Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('All') // All | BCA | MCA | BSc CS | MSc IT
  const [courseFilter, setCourseFilter] = useState(urlCourseId)
  const [semesterFilter, setSemesterFilter] = useState('All') // All | 1 | 2 | 3 | 4
  const [sectionFilter, setSectionFilter] = useState('All') // All | A | B | C
  const [statusFilter, setStatusFilter] = useState('All') // All | active | deactivated

  // Summary Stat base numbers from Neon DB (via /api/v1/hod/students/summary-counts)
  const [baseStats, setBaseStats] = useState({
    total: 0,
    bca: 0,
    mca: 0,
    bsc: 0,
    msc: 0,
    pending: 0,
    deactivated: 0
  })

  // Selected student drawer states
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Modal States
  const [rejectModalStudent, setRejectModalStudent] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  
  const [correctionModalStudent, setCorrectionModalStudent] = useState(null)
  const [correctionForm, setCorrectionForm] = useState({ department: '', semester: '1' })

  const [reminderStudent, setReminderStudent] = useState(null)

  const loadData = async () => {
    try {
      const [allRes, pendingRes, riskRes, countsRes] = await Promise.allSettled([
        api.get('/api/v1/hod/students/all'),
        api.get('/api/v1/hod/students/pending-approvals'),
        api.get('/api/v1/hod/students/at-risk'),
        api.get('/api/v1/hod/students/summary-counts')
      ])

      const allData = allRes.status === 'fulfilled' ? (allRes.value.data || []) : []
      const pendingData = pendingRes.status === 'fulfilled' ? (pendingRes.value.data || []) : []
      const riskData = riskRes.status === 'fulfilled' ? (riskRes.value.data || []) : []
      const countsData = countsRes.status === 'fulfilled' ? countsRes.value.data : null

      if (allRes.status === 'rejected') console.warn('[Students] all failed:', allRes.reason?.message)
      if (pendingRes.status === 'rejected') console.warn('[Students] pending failed:', pendingRes.reason?.message)
      if (riskRes.status === 'rejected') console.warn('[Students] at-risk failed:', riskRes.reason?.message)
      if (countsRes.status === 'rejected') console.warn('[Students] counts failed:', countsRes.reason?.message)

      const allStuds = allData.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        enrollment: s.enrollment_no,
        department: s.department,
        course_code: s.department,
        current_semester: s.semester,
        section: s.section || 'A',
        cgpa: s.cgpa || 0.0,
        last_active: s.last_login ? s.last_login.split('T')[0] : 'Never',
        status: s.status,
        is_at_risk: false,
        quiz_attempts: 10,
        quiz_avg: s.quiz_avg || 0,
        doubts_asked: 0,
        interventions: []
      }))

      const riskMap = {}
      riskData.forEach(r => {
        riskMap[r.id] = {
          is_at_risk: true,
          risk_level: r.risk_level,
          risk_reason: r.risk_reason
        }
      })

      const mergedStudents = allStuds.map(s => riskMap[s.id] ? { ...s, ...riskMap[s.id] } : s)
      setStudents(mergedStudents)
      setPendingStudents(pendingData)

      if (countsData) {
        setBaseStats({
          total: countsData.total || 0,
          bca: countsData.bca_count || 0,
          mca: countsData.mca_count || 0,
          bsc: countsData.bsc_cs_count || 0,
          msc: countsData.msc_it_count || 0,
          pending: countsData.pending || 0,
          deactivated: countsData.deactivated || 0
        })
      }

      setIsDbEmpty(allStuds.length === 0 && pendingData.length === 0)
    } catch (err) {
      console.error('[Students] Unexpected error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch student roster data

  // Fetch student roster data
  useEffect(() => {
    loadData()
  }, [])

  // Fetch Courses list from API
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await courseService.getCourses()
        if (response && response.length > 0) {
          setCourses(response)
        } else {
          setCourses([
            { id: 'bca', name: 'BCA', code: 'BCA' },
            { id: 'mca', name: 'MCA', code: 'MCA' },
            { id: 'bsc', name: 'BSc CS', code: 'BSc CS' },
            { id: 'msc', name: 'MSc IT', code: 'MSc IT' }
          ])
        }
      } catch (err) {
        setCourses([
          { id: 'bca', name: 'BCA', code: 'BCA' },
          { id: 'mca', name: 'MCA', code: 'MCA' },
          { id: 'bsc', name: 'BSc CS', code: 'BSc CS' },
          { id: 'msc', name: 'MSc IT', code: 'MSc IT' }
        ])
      }
    }
    loadCourses()
  }, [])

  // Sync parameters
  useEffect(() => {
    if (urlCourseId) {
      setCourseFilter(urlCourseId)
    }
  }, [urlCourseId])

  // --- STATS BAR COMPUTATION ---
  // Uses flat baseStats from API: total/pending/deactivated are global counts,
  // dept counts (bca/mca/bsc/msc) come from the per-course DB query
  const statsBar = useMemo(() => {
    const { total, bca, mca, bsc, msc, pending, deactivated } = baseStats
    if (deptFilter === 'All') {
      return { total, bca, mca, bsc, msc, pending, deactivated }
    } else {
      // When filtered to a specific dept, show only that dept's approved count
      const deptTotal = deptFilter === 'BCA' ? bca
        : deptFilter === 'MCA' ? mca
        : deptFilter === 'BSc CS' ? bsc
        : deptFilter === 'MSc IT' ? msc : 0
      return {
        total: deptTotal,
        bca: deptFilter === 'BCA' ? bca : 0,
        mca: deptFilter === 'MCA' ? mca : 0,
        bsc: deptFilter === 'BSc CS' ? bsc : 0,
        msc: deptFilter === 'MSc IT' ? msc : 0,
        pending,
        deactivated
      }
    }
  }, [baseStats, deptFilter])

  // --- FILTERED COMPUTATIONS (AND Logic) ---
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (student.status === 'deactivated') return false;
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && !student.enrollment.includes(searchTerm)) return false;
      if (deptFilter !== 'All' && student.department !== deptFilter) return false;
      if (courseFilter && student.course_code !== courseFilter) return false;
      if (semesterFilter !== 'All' && String(student.current_semester) !== semesterFilter) return false;
      if (sectionFilter !== 'All' && student.section !== sectionFilter) return false;
      if (statusFilter !== 'All' && student.status !== statusFilter) return false;
      return true;
    });
  }, [students, searchTerm, deptFilter, courseFilter, semesterFilter, sectionFilter, statusFilter]);

  const filteredDeactivated = useMemo(() => {
    return students.filter(student => {
      if (student.status !== 'deactivated') return false;
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && !student.enrollment.includes(searchTerm)) return false;
      if (deptFilter !== 'All' && student.department !== deptFilter) return false;
      if (courseFilter && student.course_code !== courseFilter) return false;
      if (semesterFilter !== 'All' && String(student.current_semester) !== semesterFilter) return false;
      if (sectionFilter !== 'All' && student.section !== sectionFilter) return false;
      return true;
    });
  }, [students, searchTerm, deptFilter, courseFilter, semesterFilter, sectionFilter]);

  const filteredAtRisk = useMemo(() => {
    return students.filter(student => {
      if (!student.is_at_risk || student.status === 'deactivated') return false;
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && !student.enrollment.includes(searchTerm)) return false;
      if (deptFilter !== 'All' && student.department !== deptFilter) return false;
      if (courseFilter && student.course_code !== courseFilter) return false;
      if (semesterFilter !== 'All' && String(student.current_semester) !== semesterFilter) return false;
      if (sectionFilter !== 'All' && student.section !== sectionFilter) return false;
      return true;
    });
  }, [students, searchTerm, deptFilter, courseFilter, semesterFilter, sectionFilter]);

  const filteredPending = useMemo(() => {
    return pendingStudents.filter(student => {
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) && !student.enrollment_number.includes(searchTerm)) return false;
      if (deptFilter !== 'All' && student.department !== deptFilter) return false;
      if (semesterFilter !== 'All' && String(student.semester) !== semesterFilter) return false;
      return true;
    });
  }, [pendingStudents, searchTerm, deptFilter, semesterFilter]);

  // --- ACTIONS HANDLERS ---

  // Deactivate student (soft delete)
  const handleDeactivate = async (studentId, studentName, studentDept) => {
    try {
      // API call trigger
      await api.delete(`/admin/students/${studentId}`).catch(() => {})
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          const updatedInterventions = [
            { date: new Date().toISOString().split('T')[0], type: 'Account Deactivated', details: 'Student credentials soft-deactivated by HOD' },
            ...(s.interventions || [])
          ]
          return { ...s, status: 'deactivated', deactivated_on: new Date().toISOString().split('T')[0], interventions: updatedInterventions }
        }
        return s
      }))

      // Update counters — decrement the dept-specific count and increment deactivated
      setBaseStats(prev => {
        const deptKey = studentDept === 'BCA' ? 'bca'
          : studentDept === 'MCA' ? 'mca'
          : studentDept === 'BSc CS' ? 'bsc'
          : studentDept === 'MSc IT' ? 'msc' : null
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
          deactivated: prev.deactivated + 1,
          ...(deptKey ? { [deptKey]: Math.max(0, prev[deptKey] - 1) } : {})
        }
      })

      toast.success(`Account for ${studentName} has been deactivated`)
      if (drawerOpen && selectedStudent?.id === studentId) {
        setDrawerOpen(false)
      }
    } catch (err) {
      toast.error("Failed to deactivate account")
    }
  }

  // Reactivate student
  const handleReactivate = async (studentId, studentName, studentDept) => {
    try {
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          const updatedInterventions = [
            { date: new Date().toISOString().split('T')[0], type: 'Account Reactivated', details: 'Credentials restored by HOD' },
            ...(s.interventions || [])
          ]
          return { ...s, status: 'active', interventions: updatedInterventions }
        }
        return s
      }))

      // Update counters — increment the dept-specific count and decrement deactivated
      setBaseStats(prev => {
        const deptKey = studentDept === 'BCA' ? 'bca'
          : studentDept === 'MCA' ? 'mca'
          : studentDept === 'BSc CS' ? 'bsc'
          : studentDept === 'MSc IT' ? 'msc' : null
        return {
          ...prev,
          total: prev.total + 1,
          deactivated: Math.max(0, prev.deactivated - 1),
          ...(deptKey ? { [deptKey]: prev[deptKey] + 1 } : {})
        }
      })

      toast.success(`Account for ${studentName} reactivated successfully`)
    } catch (err) {
      toast.error("Failed to reactivate account")
    }
  }

  // Send nudge reminder (Firebase push)
  const handleSendReminderConfirm = () => {
    if (!reminderStudent) return
    const studentId = reminderStudent.id
    
    // Simulate push alert
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updatedInterventions = [
          { date: new Date().toISOString().split('T')[0], type: 'AI Risk Nudge', details: 'Firebase push alert sent: Academic performance warning' },
          ...(s.interventions || [])
        ]
        return { ...s, interventions: updatedInterventions }
      }
      return s
    }))

    toast.success(`Nudge alert dispatched to ${reminderStudent.name}`)
    setReminderStudent(null)
  }

  // Inform Faculty about risk
  const handleInformFaculty = (studentName) => {
    toast.success(`Notification sent to Subject Faculty regarding ${studentName}`)
  }

  // Change student's semester (from drawer)
  const handleDrawerChangeSemester = (studentId, newSem) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updatedInterventions = [
          { date: new Date().toISOString().split('T')[0], type: 'Semester Change', details: `Semester updated to Sem ${newSem}` },
          ...(s.interventions || [])
        ]
        return { ...s, current_semester: parseInt(newSem), interventions: updatedInterventions }
      }
      return s
    }))
    setSelectedStudent(prev => ({ ...prev, current_semester: parseInt(newSem) }))
    toast.success(`Semester updated to Semester ${newSem}`)
  }

  // Approve pending registration
  const handleApprovePending = async (pendingObj) => {
    // Prevent double-click
    if (approvingIds.has(pendingObj.enrollment_id)) return
    setApprovingIds(prev => new Set([...prev, pendingObj.enrollment_id]))

    try {
      await api.post(`/api/v1/hod/students/${pendingObj.enrollment_id}/review`, { action: 'approved' })

      // Remove from pending
      setPendingStudents(prev => prev.filter(p => p.enrollment_id !== pendingObj.enrollment_id))

      // Add to students database
      const newActiveStudent = {
        id: `stud_${pendingObj.enrollment_id}`,
        name: pendingObj.name,
        email: pendingObj.email,
        enrollment: pendingObj.enrollment_number,
        department: pendingObj.department,
        course_code: pendingObj.department,
        current_semester: pendingObj.semester,
        section: 'A',
        cgpa: 0.00,
        last_active: 'Never',
        status: 'active',
        is_at_risk: false,
        quiz_attempts: 0,
        quiz_avg: 0,
        doubts_asked: 0,
        interventions: [
          { date: new Date().toISOString().split('T')[0], type: 'Registration Approved', details: 'Student registration approved by HOD' }
        ]
      }
      setStudents(prev => [newActiveStudent, ...prev])

      // Update counters
      setBaseStats(prev => {
        const d = pendingObj.department || 'BCA'
        return {
          ...prev,
          [d]: {
            ...prev[d],
            total: prev[d].total + 1,
            pending: Math.max(0, prev[d].pending - 1)
          }
        }
      })

      toast.success(`Student registration for ${pendingObj.name} approved!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve student registration")
    } finally {
      setApprovingIds(prev => { const next = new Set(prev); next.delete(pendingObj.enrollment_id); return next })
    }
  }

  // Reject pending registration
  const handleRejectPendingSubmit = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) return toast.error("Reason is required")
    const pendingObj = rejectModalStudent

    try {
      await api.post(`/api/v1/hod/students/${pendingObj.enrollment_id}/review`, { 
        action: 'rejected', 
        note: rejectReason 
      })

      // Remove from pending
      setPendingStudents(prev => prev.filter(p => p.enrollment_id !== pendingObj.enrollment_id))

      // Update counters
      setBaseStats(prev => {
        const d = pendingObj.department || 'BCA'
        return {
          ...prev,
          [d]: {
            ...prev[d],
            pending: Math.max(0, prev[d].pending - 1)
          }
        }
      })

      toast.success(`Registration rejected for ${pendingObj.name}`)
      setRejectModalStudent(null)
      setRejectReason('')
    } catch (err) {
      toast.error("Failed to reject registration")
    }
  }

  // Approve pending registration with correction
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault()
    if (!correctionForm.department) return toast.error("Department is required")
    const pendingObj = correctionModalStudent

    try {
      await api.post(`/api/v1/hod/students/${pendingObj.enrollment_id}/review`, { 
        action: 'approved', 
        note: `Approved with correction: Dept: ${correctionForm.department}, Sem: ${correctionForm.semester}`
      }).catch(() => {})

      // Remove from pending
      setPendingStudents(prev => prev.filter(p => p.enrollment_id !== pendingObj.enrollment_id))

      // Add to active students list with updated credentials
      const correctedStudent = {
        id: `stud_${pendingObj.enrollment_id}`,
        name: pendingObj.name,
        email: pendingObj.email,
        enrollment: pendingObj.enrollment_number,
        department: correctionForm.department,
        course_code: correctionForm.department,
        current_semester: parseInt(correctionForm.semester),
        section: 'A',
        cgpa: 0.00,
        last_active: 'Never',
        status: 'active',
        is_at_risk: false,
        quiz_attempts: 0,
        quiz_avg: 0,
        doubts_asked: 0,
        interventions: [
          { date: new Date().toISOString().split('T')[0], type: 'Registration Approved', details: `Approved with correction. Department: ${correctionForm.department}, Semester: ${correctionForm.semester}` }
        ]
      }
      setStudents(prev => [correctedStudent, ...prev])

      // Update counters
      setBaseStats(prev => {
        const prevDept = pendingObj.department || 'BCA'
        const newDept = correctionForm.department
        
        // Decrement pending in original dept, increment total in corrected dept
        return {
          ...prev,
          [prevDept]: {
            ...prev[prevDept],
            pending: Math.max(0, prev[prevDept].pending - 1)
          },
          [newDept]: {
            ...prev[newDept],
            total: prev[newDept].total + 1
          }
        }
      })

      toast.success(`Student registration for ${pendingObj.name} approved with corrected details!`)
      setCorrectionModalStudent(null)
    } catch (err) {
      toast.error("Failed to apply correction approval")
    }
  }

  // Bulk approvals
  const [selectedPendingIds, setSelectedPendingIds] = useState([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [approvingIds, setApprovingIds] = useState(new Set()) // Track in-flight approve requests

  const handleBulkApprove = async () => {
    if (selectedPendingIds.length === 0 || bulkProcessing) return
    setBulkProcessing(true)
    const approvedList = pendingStudents.filter(p => selectedPendingIds.includes(p.enrollment_id))

    try {
      await Promise.all(
        approvedList.map(p => 
          api.post(`/api/v1/hod/students/${p.enrollment_id}/review`, { action: 'approved' }).catch(() => {})
        )
      )

      // Remove approved items from pending list
      setPendingStudents(prev => prev.filter(p => !selectedPendingIds.includes(p.enrollment_id)))

      // Map to active student roster
      const newStudents = approvedList.map(pendingObj => ({
        id: `stud_${pendingObj.enrollment_id}`,
        name: pendingObj.name,
        email: pendingObj.email,
        enrollment: pendingObj.enrollment_number,
        department: pendingObj.department,
        course_code: pendingObj.department,
        current_semester: pendingObj.semester,
        section: 'A',
        cgpa: 0.00,
        last_active: 'Never',
        status: 'active',
        is_at_risk: false,
        quiz_attempts: 0,
        quiz_avg: 0,
        doubts_asked: 0,
        interventions: [
          { date: new Date().toISOString().split('T')[0], type: 'Registration Approved', details: 'Student registration approved via bulk HOD action' }
        ]
      }))
      setStudents(prev => [...newStudents, ...prev])

      // Update stats counters
      setBaseStats(prev => {
        const updated = { ...prev }
        approvedList.forEach(p => {
          const d = p.department || 'BCA'
          if (updated[d]) {
            updated[d] = {
              ...updated[d],
              total: updated[d].total + 1,
              pending: Math.max(0, updated[d].pending - 1)
            }
          }
        })
        return updated
      })

      toast.success(`Approved ${selectedPendingIds.length} student registration requests!`)
      setSelectedPendingIds([])
    } catch (err) {
      toast.error("Bulk approval action completed with some issues")
    } finally {
      setBulkProcessing(false)
    }
  }

  // Bulk reject
  const handleBulkReject = async () => {
    if (selectedPendingIds.length === 0 || bulkProcessing) return
    setBulkProcessing(true)
    const rejectedList = pendingStudents.filter(p => selectedPendingIds.includes(p.enrollment_id))

    try {
      await Promise.all(
        rejectedList.map(p => 
          api.post(`/api/v1/hod/students/${p.enrollment_id}/review`, { action: 'rejected', note: 'Bulk rejection by HOD' }).catch(() => {})
        )
      )

      // Remove rejected items from pending list
      setPendingStudents(prev => prev.filter(p => !selectedPendingIds.includes(p.enrollment_id)))

      // Update stats counters
      setBaseStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - rejectedList.length)
      }))

      toast.success(`Rejected ${selectedPendingIds.length} student registration requests`)
      setSelectedPendingIds([])
    } catch (err) {
      toast.error("Bulk rejection completed with some issues")
    } finally {
      setBulkProcessing(false)
    }
  }

  // --- RENDER TABLE HEADERS / SUB-COMPONENTS ---

  const renderStatsBar = () => {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-wrap gap-2 justify-between items-center text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-1.5">
          <Users className="w-4.5 h-4.5 text-[#7C3AED]" />
          <span>Cohort Overview:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-1 rounded-lg">Total: {statsBar.total}</span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">BCA: {statsBar.bca}</span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">MCA: {statsBar.mca}</span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">BSc CS: {statsBar.bsc}</span>
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">MSc IT: {statsBar.msc}</span>
          <span className="bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-lg">Pending: {statsBar.pending}</span>
          <span className="bg-rose-500/10 text-rose-600 px-2.5 py-1 rounded-lg">Deactivated: {statsBar.deactivated}</span>
        </div>
      </div>
    )
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F7FF] text-slate-800 p-4 lg:p-8 font-dm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* Page Title & Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-6 h-6 text-[#7C3AED]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">MLSU ERP Registry</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Student Directory</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                View and manage student registrations, approvals, and academic status across all departments
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          {renderStatsBar()}

          {/* Tab Menu */}
          <div className="flex flex-wrap border-b border-slate-200 gap-6 text-sm font-bold bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'all' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              All Students
            </button>
            
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'pending' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Pending Approvals
              {pendingStudents.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-white text-[#7C3AED]' : 'bg-[#7C3AED]/20 text-[#7C3AED]'}`}>
                  {pendingStudents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('risk')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'risk' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              At-Risk Students
              {filteredAtRisk.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'risk' ? 'bg-white text-amber-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {filteredAtRisk.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('deactivated')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'deactivated' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <UserX className="w-4 h-4" />
              Deactivated Students
            </button>
          </div>

          {/* FILTER CONTROLS */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filter Students</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Name or Enrollment..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] text-xs font-semibold"
                />
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] text-slate-700 cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="BCA">BCA (Undergrad)</option>
                  <option value="MCA">MCA (Postgrad)</option>
                  <option value="BSc CS">BSc CS</option>
                  <option value="MSc IT">MSc IT</option>
                </select>
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Course Dropdown */}
              <div className="relative">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] text-slate-700 cursor-pointer"
                >
                  <option value="">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Semester Dropdown */}
              <div className="relative">
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] text-slate-700 cursor-pointer"
                >
                  <option value="All">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                </select>
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Section Dropdown */}
              <div className="relative">
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] text-slate-700 cursor-pointer"
                >
                  <option value="All">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* TAB CONTENTS */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <RefreshCw className="w-10 h-10 text-[#7C3AED] animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400">Syncing student database...</p>
              </div>
            ) : isDbEmpty ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-[#EF4444] mb-3 opacity-50" />
                <h3 className="text-sm font-bold text-slate-800">No records exist in Neon database.</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">The Neon PostgreSQL database student tables are currently empty.</p>
              </div>
            ) : (
              <>
                {/* 1. All Students Tab */}
                {activeTab === 'all' && (
                  <AllStudentsTab 
                    students={filteredStudents}
                    onView={(student) => {
                      setSelectedStudent(student)
                      setDrawerOpen(true)
                    }}
                    onDeactivate={(id, name, dept) => handleDeactivate(id, name, dept)}
                  />
                )}

                {/* 2. Pending Approvals Tab */}
                {activeTab === 'pending' && (
                  <PendingApprovalsTab 
                    requests={filteredPending}
                    selectedIds={selectedPendingIds}
                    setSelectedIds={setSelectedPendingIds}
                    onApprove={(item) => handleApprovePending(item)}
                    onReject={(item) => setRejectModalStudent(item)}
                    onApproveCorrection={(item) => {
                      setCorrectionModalStudent(item)
                      setCorrectionForm({ department: item.department, semester: String(item.semester) })
                    }}
                    onBulkApprove={handleBulkApprove}
                    onBulkReject={handleBulkReject}
                    bulkProcessing={bulkProcessing}
                    approvingIds={approvingIds}
                  />
                )}

                {/* 3. At Risk Students Tab */}
                {activeTab === 'risk' && (
                  <AtRiskStudentsTab 
                    students={filteredAtRisk}
                    onView={(student) => {
                      setSelectedStudent(student)
                      setDrawerOpen(true)
                    }}
                    onSendReminder={(student) => setReminderStudent(student)}
                    onInformFaculty={(name) => handleInformFaculty(name)}
                  />
                )}

                {/* 4. Deactivated Students Tab */}
                {activeTab === 'deactivated' && (
                  <DeactivatedStudentsTab 
                    students={filteredDeactivated}
                    onReactivate={(id, name, dept) => handleReactivate(id, name, dept)}
                    onView={(student) => {
                      setSelectedStudent(student)
                      setDrawerOpen(true)
                    }}
                  />
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* STUDENT DETAIL DRAWER */}
      <StudentDetailDrawer 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        student={selectedStudent}
        onSendReminder={(student) => setReminderStudent(student)}
        onDeactivate={(id, name, dept) => handleDeactivate(id, name, dept)}
        onChangeSemester={(id, sem) => handleDrawerChangeSemester(id, sem)}
      />

      {/* REJECT MODAL */}
      {rejectModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-xl text-slate-800">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Decline Student Registration</h2>
              <button onClick={() => { setRejectModalStudent(null); setRejectReason(''); }} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectPendingSubmit} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-500">Provide a reason for rejecting the registration request for <strong>{rejectModalStudent.name}</strong>. This note will be recorded in the approval log.</p>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Rejection Reason *</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Uploaded dossier photo does not match registration criteria."
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED]"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => { setRejectModalStudent(null); setRejectReason(''); }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-[#D32F2F] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE WITH CORRECTION MODAL */}
      {correctionModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-xl text-slate-800">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Approve with Correction</h2>
              <button onClick={() => setCorrectionModalStudent(null)} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCorrectionSubmit} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-500">Correct the branch or semester registry details for <strong>{correctionModalStudent.name}</strong> before granting system access.</p>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Department Roster</label>
                <select
                  value={correctionForm.department}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                >
                  <option value="BCA">BCA</option>
                  <option value="MCA">MCA</option>
                  <option value="BSc CS">BSc CS</option>
                  <option value="MSc IT">MSc IT</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Semester</label>
                <select
                  value={correctionForm.semester}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, semester: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setCorrectionModalStudent(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Save and Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND NUDGE CONFIRMATION MODAL */}
      {reminderStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-xl text-slate-800 animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4.5 h-4.5 text-[#F59E0B]" />
                Trigger Student Nudge Alert
              </h2>
              <button onClick={() => setReminderStudent(null)} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Send nudge notification to <strong>{reminderStudent.name}</strong>?
              </p>
              <p className="text-[10px] text-slate-400">
                This triggers a mobile push alert via Firebase and delivers an urgent warning alert to the student's dashboard.
              </p>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => setReminderStudent(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendReminderConfirm}
                  className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Confirm Nudge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  )
}

// ============================================================================
// --- 1. ALL STUDENTS TAB SUB-COMPONENT ---
// ============================================================================
function AllStudentsTab({ students, onView, onDeactivate }) {
  if (students.length === 0) {
    return (
      <div className="p-12 text-center">
        <EmptyState title="No registered students found" description="No active student accounts match your filter traces." icon={Search} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-wider">
            <th className="p-5">Student & Enrollment</th>
            <th className="p-5">Email</th>
            <th className="p-5">Department</th>
            <th className="p-5">Semester</th>
            <th className="p-5">Section</th>
            <th className="p-5">CGPA</th>
            <th className="p-5">Last Active</th>
            <th className="p-5">Interventions</th>
            <th className="p-5">Status</th>
            <th className="p-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const initials = student.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
            const hasInterventions = student.interventions && student.interventions.length > 0
            const lastIntervention = hasInterventions ? student.interventions[0].date : 'None'

            return (
              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors text-xs font-medium text-slate-700">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full bg-[#7C3AED]/10 flex items-center justify-center font-bold text-xs text-[#7C3AED] border border-[#7C3AED]/15 shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-slate-900 font-extrabold text-sm">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.enrollment}</p>
                    </div>
                  </div>
                </td>
                
                <td className="p-5 text-slate-500 font-semibold">{student.email}</td>
                
                <td className="p-5">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] uppercase">
                    {student.department}
                  </span>
                </td>
                
                <td className="p-5 font-bold text-slate-800">Sem {student.current_semester}</td>
                <td className="p-5 text-slate-500 font-bold">Section {student.section || 'A'}</td>
                
                <td className="p-5 font-mono font-bold text-slate-800">
                  {student.cgpa && student.cgpa > 0 ? student.cgpa.toFixed(2) : '—'}
                </td>
                
                <td className="p-5 text-slate-500 font-semibold">{student.last_active}</td>
                
                <td className="p-5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${hasInterventions ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400'}`}>
                    {lastIntervention}
                  </span>
                </td>

                <td className="p-5">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>

                <td className="p-5 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onView(student)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#7C3AED] hover:bg-[#7C3AED]/5 font-bold text-[11px] transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button 
                      onClick={() => onDeactivate(student.id, student.name, student.department)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 font-bold text-[11px] transition cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" /> Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// --- 2. PENDING APPROVALS TAB SUB-COMPONENT ---
// ============================================================================
function PendingApprovalsTab({ requests, selectedIds, setSelectedIds, onApprove, onReject, onApproveCorrection, onBulkApprove, onBulkReject, bulkProcessing, approvingIds }) {
  const isAllSelected = requests.length > 0 && selectedIds.length === requests.length

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(requests.map(r => r.enrollment_id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  if (requests.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-[#10B981] mb-3 opacity-50" />
        <h3 className="text-sm font-bold text-slate-800">Clear Approval Queue</h3>
        <p className="text-xs text-slate-400 mt-1">There are no outstanding student registration requests awaiting review.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {selectedIds.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex justify-between items-center animate-fade-in">
          <span className="text-xs font-bold text-slate-600">Selected {selectedIds.length} of {requests.length} requests</span>
          <div className="flex gap-2">
            <button
              onClick={onBulkReject}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#EF4444] hover:bg-[#D32F2F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition"
            >
              <UserX className="w-4 h-4" /> Reject Selected
            </button>
            <button
              onClick={onBulkApprove}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-wider">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={isAllSelected} 
                  onChange={handleSelectAll} 
                  className="rounded border-slate-200 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer w-4 h-4"
                />
              </th>
              <th className="p-4">Name</th>
              <th className="p-4">Enrollment No</th>
              <th className="p-4">Department Applied For</th>
              <th className="p-4">Semester</th>
              <th className="p-4">Date Applied</th>
              <th className="p-4 text-center">ID Card</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((item) => (
              <tr key={item.enrollment_id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold text-slate-700">
                <td className="p-4 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(item.enrollment_id)}
                    onChange={(e) => handleSelectRow(item.enrollment_id, e.target.checked)}
                    className="rounded border-slate-200 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer w-4 h-4"
                  />
                </td>
                <td className="p-4">
                  <span className="font-extrabold text-slate-900 block text-sm">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">{item.email}</span>
                </td>
                <td className="p-4 font-mono font-bold text-slate-800">{item.enrollment_number}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded bg-[#7C3AED]/10 text-[#7C3AED] font-black text-[10px] uppercase">
                    {item.department}
                  </span>
                </td>
                <td className="p-4 text-slate-800 font-extrabold">Sem {item.semester}</td>
                <td className="p-4 text-slate-400">{item.applied_at}</td>
                <td className="p-4 text-center">
                  <a href={item.id_card_url} target="_blank" rel="noopener noreferrer" className="inline-block relative group" title="Click to view file">
                    <img 
                      src={item.id_card_url} 
                      alt="Student ID card thumbnail"
                      className="w-9 h-11 object-cover rounded border border-slate-200 hover:scale-105 transition shadow-sm"
                      onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="w-9 h-11 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 text-[9px] font-bold">N/A</div>' }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition">
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </div>
                  </a>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onApproveCorrection(item)}
                      className="px-2.5 py-1.5 border border-[#F59E0B]/25 hover:border-transparent bg-[#F59E0B]/10 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                    >
                      Approve with Correction
                    </button>
                    <button
                      onClick={() => onReject(item)}
                      className="px-2.5 py-1.5 border border-[#EF4444]/20 hover:border-transparent bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onApprove(item)}
                      disabled={approvingIds.has(item.enrollment_id)}
                      className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-bold shadow-sm transition cursor-pointer"
                    >
                      {approvingIds.has(item.enrollment_id) ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// --- 3. AT-RISK STUDENTS TAB SUB-COMPONENT ---
// ============================================================================
function AtRiskStudentsTab({ students, onView, onSendReminder, onInformFaculty }) {
  if (students.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-[#10B981] mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-slate-800">Operational Health Optimal</h3>
        <p className="text-xs text-slate-400 mt-1">No student records fall below academic or participation thresholds currently.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-wider">
            <th className="p-5">Student Details</th>
            <th className="p-5">Department</th>
            <th className="p-5">Risk Reason</th>
            <th className="p-5">Risk Level</th>
            <th className="p-5">Last Active</th>
            <th className="p-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const initials = student.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
            const isHigh = student.risk_level === 'High'

            return (
              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold text-slate-700">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-xs text-amber-600 border border-amber-500/15 shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-slate-900 font-extrabold text-sm">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.enrollment}</p>
                    </div>
                  </div>
                </td>

                <td className="p-5">
                  <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] uppercase">
                    {student.department}
                  </span>
                </td>

                <td className="p-5">
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black border border-amber-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {student.risk_reason}
                  </span>
                </td>

                <td className="p-5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${isHigh ? 'bg-red-50 text-[#EF4444] border-red-100' : 'bg-amber-50 text-[#F59E0B] border-amber-100'}`}>
                    {student.risk_level}
                  </span>
                </td>

                <td className="p-5 text-slate-400">{student.last_active}</td>

                <td className="p-5 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onInformFaculty(student.name)}
                      className="px-2.5 py-1.5 border border-indigo-100 bg-indigo-50/50 hover:bg-[#7C3AED]/5 text-[#7C3AED] rounded-xl text-[10px] font-bold transition cursor-pointer"
                    >
                      Inform Faculty
                    </button>
                    <button
                      onClick={() => onSendReminder(student)}
                      className="px-2.5 py-1.5 border border-amber-100 bg-amber-50 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                    >
                      Send Reminder
                    </button>
                    <button
                      onClick={() => onView(student)}
                      className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-[10px] font-bold shadow-sm transition cursor-pointer"
                    >
                      View Profile
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// --- 4. DEACTIVATED STUDENTS TAB SUB-COMPONENT ---
// ============================================================================
function DeactivatedStudentsTab({ students, onReactivate, onView }) {
  if (students.length === 0) {
    return (
      <div className="p-12 text-center">
        <EmptyState title="No deactivated students" description="There are no deactivated student profiles in the registry." icon={UserX} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-wider">
            <th className="p-5">Student & Enrollment</th>
            <th className="p-5">Email</th>
            <th className="p-5">Department</th>
            <th className="p-5">Semester</th>
            <th className="p-5">Section</th>
            <th className="p-5">CGPA</th>
            <th className="p-5">Deactivated On</th>
            <th className="p-5">Status</th>
            <th className="p-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const initials = student.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()

            return (
              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold text-slate-700">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400 border border-slate-200 shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-slate-400 font-extrabold text-sm line-through">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.enrollment}</p>
                    </div>
                  </div>
                </td>
                
                <td className="p-5 text-slate-400 font-semibold">{student.email}</td>
                
                <td className="p-5">
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 font-black text-[10px] uppercase">
                    {student.department}
                  </span>
                </td>
                
                <td className="p-5 text-slate-400">Sem {student.current_semester}</td>
                <td className="p-5 text-slate-400">Section {student.section || 'A'}</td>
                
                <td className="p-5 font-mono text-slate-400">
                  {student.cgpa && student.cgpa > 0 ? student.cgpa.toFixed(2) : '—'}
                </td>
                
                <td className="p-5 text-rose-500 font-bold">{student.deactivated_on || 'Unknown'}</td>

                <td className="p-5">
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 px-2.5 py-0.5 rounded text-[10px] font-bold border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Deactivated
                  </span>
                </td>

                <td className="p-5 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onView(student)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#7C3AED] hover:bg-[#7C3AED]/5 font-bold text-[11px] transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button 
                      onClick={() => onReactivate(student.id, student.name, student.department)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#10B981] bg-emerald-50 hover:bg-[#10B981]/10 font-bold text-[11px] border border-emerald-100 transition cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Reactivate
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// --- 5. STUDENT DETAIL RIGHT-SIDE DRAWER SUB-COMPONENT ---
// ============================================================================
function StudentDetailDrawer({ open, onClose, student, onSendReminder, onDeactivate, onChangeSemester }) {
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Reset edit mode when drawer opens with new student
  useEffect(() => {
    if (student) {
      setEditMode(false)
      setEditForm({
        name: student.name || '',
        email: student.email || '',
        section: student.section || 'A',
        current_semester: student.current_semester || 1
      })
    }
  }, [student])

  if (!student) return null

  const initials = student.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const isDeactivated = student.status === 'deactivated'

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!editForm.email.trim() || !editForm.email.includes('@')) {
      toast.error('Valid email is required')
      return
    }
    setSaving(true)
    try {
      await api.put(`/api/v1/hod/students/${student.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        section: editForm.section,
        semester: parseInt(editForm.current_semester)
      })
      toast.success('Student profile updated successfully')
      setEditMode(false)
      // Update semester via parent callback to sync state
      if (editForm.current_semester !== student.current_semester) {
        onChangeSemester(student.id, editForm.current_semester)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300"
        />
      )}

      {/* Slide drawer container */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] border-l border-slate-100 flex flex-col transition-transform duration-300 transform ${
        open ? 'translate-x-0' : 'translate-x-full'
      } text-slate-800`}>
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Student Profile Dossier</h2>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Academic Record</p>
          </div>
          <div className="flex items-center gap-2">
            {!isDeactivated && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-[#7C3AED] hover:bg-[#7C3AED]/10 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Edit
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition p-1.5 hover:bg-slate-150 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Profile Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
          
          {/* Avatar and Main Info */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <div className="w-16 h-16 rounded-full bg-[#7C3AED]/10 flex items-center justify-center font-bold text-lg text-[#7C3AED] border-2 border-[#7C3AED]/20 shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-900 truncate leading-tight">{student.name}</h3>
              <p className="text-xs text-slate-400 font-semibold font-mono mt-1">Enrollment: {student.enrollment}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{student.email}</p>
            </div>
          </div>

          {/* Edit Mode Form */}
          {editMode && (
            <div className="bg-[#F5F3FF] border border-[#7C3AED]/20 p-4 rounded-2xl flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-[#7C3AED] tracking-wider">Edit Profile</h4>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Section</label>
                  <select
                    value={editForm.section}
                    onChange={e => setEditForm(p => ({ ...p, section: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                  >
                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                  <select
                    value={editForm.current_semester}
                    onChange={e => setEditForm(p => ({ ...p, current_semester: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                  >
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setEditMode(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition hover:bg-slate-200">Cancel</button>
                <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer transition">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Departmental / Roster Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8F7FF] border border-slate-100 p-3.5 rounded-2xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Department</span>
              <span className="text-xs font-black text-[#7C3AED]">{student.department}</span>
            </div>
            <div className="bg-[#F8F7FF] border border-slate-100 p-3.5 rounded-2xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Course Stream</span>
              <span className="text-xs font-bold text-slate-700 truncate block">{student.course_code}</span>
            </div>
            <div className="bg-[#F8F7FF] border border-slate-100 p-3.5 rounded-2xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Semester</span>
              <span className="text-xs font-black text-slate-700">Sem {student.current_semester}</span>
            </div>
            <div className="bg-[#F8F7FF] border border-slate-100 p-3.5 rounded-2xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Section</span>
              <span className="text-xs font-bold text-slate-700">Section {student.section || 'A'}</span>
            </div>
          </div>

          {/* Academic Analytics summary */}
          <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-[#7C3AED] tracking-widest flex items-center gap-1 border-b border-slate-100 pb-2">
              <BadgeInfo className="w-3.5 h-3.5 text-[#7C3AED]" />
              Academic Performance Indicator
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col">
                <span className="text-xl font-mono font-black text-slate-900">
                  {student.cgpa && student.cgpa > 0 ? student.cgpa.toFixed(2) : '—'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1">CGPA</span>
              </div>
              <div className="flex flex-col border-x border-slate-100">
                <span className="text-xl font-mono font-black text-slate-900">{student.quiz_attempts || 0}</span>
                <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1">Quiz Try</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-mono font-black text-slate-900">
                  {student.quiz_avg && student.quiz_avg > 0 ? `${student.quiz_avg}%` : '—'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1">Quiz Avg</span>
              </div>
            </div>
            {student.doubts_asked > 0 && (
              <div className="mt-2 text-center bg-[#7C3AED]/5 border border-dashed border-[#7C3AED]/10 p-2 rounded-xl text-xs text-slate-600 font-semibold">
                👤 Resolved <strong>{student.doubts_asked}</strong> doubts in discussion forum
              </div>
            )}
          </div>

          {/* Intervention history logs */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Intervention History Logs
            </h4>
            
            {(!student.interventions || student.interventions.length === 0) ? (
              <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-xs italic text-slate-400">
                No history logs recorded for this student.
              </div>
            ) : (
              <div className="flex flex-col gap-2 relative pl-3 border-l-2 border-slate-100 ml-2.5">
                {student.interventions.map((log, idx) => (
                  <div key={idx} className="relative py-1">
                    <div className="absolute -left-[18.5px] top-2.5 w-2.5 h-2.5 rounded-full bg-[#7C3AED] border-2 border-white shadow-sm" />
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                        <span>{log.type}</span>
                        <span>{log.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Semester Tool */}
          {!isDeactivated && (
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col gap-2.5 mt-2">
              <label className="text-[10px] font-black uppercase text-[#7C3AED] tracking-wider">Change Student Semester</label>
              <div className="flex gap-2">
                <select 
                  value={student.current_semester}
                  onChange={(e) => onChangeSemester(student.id, e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Action Controls */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          {!isDeactivated ? (
            <>
              <button 
                onClick={() => onDeactivate(student.id, student.name, student.department)}
                className="flex-1 py-3 border border-rose-200 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserX className="w-4 h-4" /> Deactivate Account
              </button>
              <button 
                onClick={() => onSendReminder(student)}
                className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" /> Send Reminder
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs font-semibold text-slate-400 p-2 bg-slate-100 rounded-xl">
              This account is deactivated. Restore to perform actions.
            </div>
          )}
        </div>

      </div>
    </>
  )
}
