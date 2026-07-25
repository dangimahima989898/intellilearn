import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Users, UserCheck, BookOpen, Clock, AlertTriangle, ChevronRight,
  CheckCircle2, XCircle, Calendar, RefreshCw, Eye, AlertCircle,
  GraduationCap, ArrowRight, X, FileText, Sliders, Bell, BarChart3,
  Building, TrendingUp, ClipboardList, Shield
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'

// ─── Enterprise palette ────────────────────────────────────────────────────────
// ─── Enterprise palette ────────────────────────────────────────────────────────
const P = {
  primary:     'var(--color-primary, #7C3AED)',
  primaryLt:   'var(--color-primary-hover, rgba(124, 58, 237, 0.15))',
  secondary:   'var(--color-success, #10B981)',
  secondaryLt: 'var(--color-success-bg, rgba(16, 185, 129, 0.15))',
  warning:     'var(--color-warning, #F59E0B)',
  warningLt:   'var(--color-warning-bg, rgba(245, 158, 11, 0.15))',
  danger:      'var(--color-danger, #EF4444)',
  dangerLt:    'var(--color-danger-bg, rgba(239, 68, 68, 0.15))',
  bg:          'var(--bg-navy-900, #0F172A)',
  card:        'var(--bg-navy-800, #1E293B)',
  border:      'var(--border-color, rgba(255, 255, 255, 0.1))',
  text:        'var(--text-primary, #FFFFFF)',
  textSec:     'var(--text-secondary, #94a3b8)',
  textCaption: 'var(--text-muted, #64748b)',
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const cardStyle  = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
const btnPrimary = { background: P.primary,     color: '#fff',     border: 'none',                          borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnDanger  = { background: P.dangerLt,    color: 'var(--color-danger-text, #EF4444)', border: `1px solid var(--color-danger)`, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSuccess = { background: P.secondaryLt, color: 'var(--color-success-text, #10B981)', border: `1px solid var(--color-success)`, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnGhost   = { background: 'transparent', color: P.textSec,  border: `1px solid ${P.border}`,        borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }

const statusBadge = (status) => {
  const base = { borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, display: 'inline-block' }
  if (status === 'balanced'    || status === 'On-Track')   return { ...base, background: 'var(--color-success-bg)', color: 'var(--color-success-text)', border: '1px solid var(--color-success)' }
  if (status === 'overloaded'  || status === 'Delayed')    return { ...base, background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger)' }
  if (status === 'underloaded' || status === 'Attention')  return { ...base, background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', border: '1px solid var(--color-warning)' }
  return { ...base, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: `1px solid ${P.border}` }
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ w = '100%', h = 14, r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF0F3', animation: 'hod-pulse 1.6s ease-in-out infinite' }} />
)

// ─── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count, action, onAction }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: P.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 17, height: 17, color: P.primary }} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{title}</span>
      {count !== undefined && count !== null && (
        <span style={{ background: P.primaryLt, color: P.primary, borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 700 }}>{count}</span>
      )}
    </div>
    {action && (
      <button onClick={onAction} style={{ ...btnGhost, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 10px' }}>
        {action} <ArrowRight style={{ width: 13, height: 13 }} />
      </button>
    )}
  </div>
)

// ─── Table helpers ─────────────────────────────────────────────────────────────
const thStyle = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.05em',
  background: '#F9FAFB', borderBottom: `1px solid ${P.border}`, whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 13, color: P.text,
  borderBottom: `1px solid ${P.border}`, verticalAlign: 'middle',
}

const EmptyRow = ({ message, cols = 6 }) => (
  <tr>
    <td colSpan={cols} style={{ textAlign: 'center', padding: '28px 0', color: P.textCaption, fontSize: 13 }}>
      <CheckCircle2 style={{ width: 22, height: 22, margin: '0 auto 6px', display: 'block', color: '#BBF7D0' }} />
      {message}
    </td>
  </tr>
)

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function HodDashboard() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [minutesAgo,  setMinutesAgo]  = useState(0)

  // Filters
  const [deptFilter, setDeptFilter] = useState('All')
  const [semFilter,  setSemFilter]  = useState('All')
  const [yearFilter, setYearFilter] = useState('2026-27')
  const [courses,    setCourses]    = useState([])

  // Data
  const [summaryData,      setSummaryData]      = useState(null)
  const [alertsData,       setAlertsData]       = useState([])
  const [academicProgress, setAcademicProgress] = useState([])
  const [facultyList,      setFacultyList]      = useState([])
  const [unassignedSubjects, setUnassignedSubjects] = useState([])
  const [pendingLeaves,    setPendingLeaves]    = useState([])
  const [pendingStudents,  setPendingStudents]  = useState([])

  // Modals
  const [selectedStudent,      setSelectedStudent]      = useState(null)
  const [correctionNote,       setCorrectionNote]       = useState('')
  const [showCorrectionInput,  setShowCorrectionInput]  = useState(false)
  const [assignModalSubject,   setAssignModalSubject]   = useState(null)
  const [workloadModalFaculty, setWorkloadModalFaculty] = useState(null)
  const [leaveResolveData,     setLeaveResolveData]     = useState(null)
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else         setRefreshing(true)
    try {
      const coursesRes = await api.get('/courses')
      setCourses(coursesRes.data || [])

      const [
        summaryRes, alertsRes, progressRes,
        facultyRes, unassignedRes, leavesRes, studentsRes,
      ] = await Promise.allSettled([
        api.get('/api/v1/hod/dashboard/summary'),
        api.get('/api/v1/hod/dashboard/alerts'),
        api.get('/api/v1/hod/dashboard/academic-progress'),
        api.get('/api/v1/hod/faculty/all'),
        api.get('/api/v1/hod/faculty/unassigned-subjects'),
        api.get('/api/v1/hod/faculty/leave-requests'),
        api.get('/api/v1/hod/students/pending-approvals'),
      ])

      const x = (r, label) => {
        if (r.status === 'fulfilled') return r.value.data
        console.warn(`[HOD Dashboard] Failed: "${label}"`, r.reason?.message)
        return null
      }

      setSummaryData(x(summaryRes,   'summary')            || null)
      setAlertsData(x(alertsRes,     'alerts')             || [])
      setAcademicProgress(x(progressRes, 'academic-progress') || [])
      setFacultyList(x(facultyRes,   'faculty')            || [])
      setUnassignedSubjects(x(unassignedRes, 'unassigned-subjects') || [])
      setPendingLeaves(x(leavesRes,  'leave-requests')     || [])
      setPendingStudents(x(studentsRes, 'pending-students') || [])

      setLastUpdated(new Date())
      setMinutesAgo(0)
    } catch (err) {
      console.error('Dashboard error', err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [deptFilter, semFilter, yearFilter])

  // Auto-refresh every 60 s
  useEffect(() => {
    const iv = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // Update "X min ago"
  useEffect(() => {
    if (!lastUpdated) return
    const timer = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000))
    }, 30000)
    return () => clearInterval(timer)
  }, [lastUpdated])

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleStudentReview = async (enrollmentId, action, note = '') => {
    try {
      await api.post(`/api/v1/hod/students/${enrollmentId}/review`, {
        action, note: note || `Reviewed by HOD (${action})`,
      })
      toast.success(`Student registration ${action} successfully`)
      setSelectedStudent(null)
      setShowCorrectionInput(false)
      setCorrectionNote('')
      fetchData(true)
    } catch (err) {
      toast.error(`Failed: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleAssignSubject = async (facultyId, subjectId) => {
    try {
      await api.post('/api/v1/hod/faculty/assign-subject', {
        faculty_id: facultyId, subject_id: subjectId, role: 'primary',
      })
      toast.success('Subject allocated successfully')
      setAssignModalSubject(null)
      fetchData(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign subject')
    }
  }

  const handleUnassignSubject = async (assignmentId) => {
    try {
      await api.delete(`/api/v1/hod/faculty/unassign-subject/${assignmentId}`)
      toast.success('Subject unassigned successfully')
      if (workloadModalFaculty) {
        setWorkloadModalFaculty(prev => ({
          ...prev, subjects: prev.subjects.filter(s => s.assignment_id !== assignmentId),
        }))
      }
      fetchData(true)
    } catch { toast.error('Failed to unassign subject') }
  }

  const handleResolveLeave = async (leaveId, substituteId, substituteName) => {
    if (!substituteId) return toast.error('Please select a substitute faculty')
    try {
      const isReject = substituteId === 'reject_leave'
      await api.post(`/api/v1/leave/${leaveId}/review`, { status: isReject ? 'rejected' : 'approved' })
      toast.success(isReject ? 'Leave rejected' : `Leave approved — substitute: ${substituteName}`)
      setLeaveResolveData(null)
      setSelectedSubstituteId('')
      fetchData(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const facultyWithWorkload = facultyList.map(fac => {
    const hours = (fac.subjects?.length || 0) * 4
    const status = hours > 16 ? 'overloaded' : hours < 8 ? 'underloaded' : 'balanced'
    return { ...fac, hours, status }
  }).filter(fac => {
    if (deptFilter === 'All') return true
    return fac.subjects?.some(s => s.code?.toUpperCase().startsWith(deptFilter.toUpperCase())) || fac.subjects?.length === 0
  })

  const filteredProgress = academicProgress.filter(item => {
    if (deptFilter !== 'All' && item.course_code !== deptFilter) return false
    if (semFilter  !== 'All' && item.semester    !== parseInt(semFilter)) return false
    return true
  })

  const filteredStudents = pendingStudents.filter(s => {
    if (deptFilter !== 'All' && !s.course?.toLowerCase().includes(deptFilter.toLowerCase())) return false
    if (semFilter  !== 'All' && s.semester !== parseInt(semFilter)) return false
    return true
  })

  const filteredLeaves = pendingLeaves.filter(l => {
    if (deptFilter === 'All') return true
    const fac = facultyList.find(f => f.name === l.faculty_name)
    if (!fac) return true
    return fac.subjects?.some(s => s.code?.toUpperCase().startsWith(deptFilter.toUpperCase()))
  })

  const filteredUnassigned = unassignedSubjects.filter(s => {
    if (deptFilter !== 'All' && s.department !== deptFilter) return false
    if (semFilter  !== 'All' && s.semester_number !== parseInt(semFilter)) return false
    return true
  })

  const faculty         = summaryData?.faculty          || { total: 0, present: 0, on_leave: 0 }
  const students        = summaryData?.students         || { total: 0, active: 0, pending: 0 }
  const pendingAppr     = summaryData?.pending_approvals || { leave_requests: 0, student_registrations: 0, subject_allocation: 0, total: 0 }
  const todayClasses    = summaryData?.todays_classes   || { scheduled: 0, no_faculty_slots: 0 }
  const subjectsSummary = summaryData?.subjects         || { total: 0, unassigned: 0 }

  const hodName    = user?.name || 'Department HOD'
  const totalAlert = alertsData.length

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <style>{`
        @keyframes hod-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        .hod-table { width: 100%; border-collapse: collapse; }
        .hod-table tbody tr:hover td { background: #F9FAFB; }
        .hod-row-hover:hover { background: #F9FAFB; }
        .hod-btn:hover { opacity: 0.88; }
        .hod-ghost:hover { background: #F5F7FA !important; }
        .hod-action:hover { background: #F9FAFB !important; }
        .hod-select:focus { outline: 2px solid ${P.primary}; outline-offset: 1px; }
        @media (max-width: 1200px) {
          .hod-main-grid { grid-template-columns: 1fr !important; }
          .hod-right-col { position: static !important; }
        }
        @media (max-width: 768px) {
          .hod-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hod-filter-row { flex-direction: column !important; align-items: flex-start !important; }
        }
        @media (max-width: 480px) {
          .hod-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: P.bg, padding: '20px 24px', fontFamily: "'DM Sans', Inter, sans-serif" }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ═══════════════════════════════════════════════════════ HEADER */}
          <div style={{ ...cardStyle, padding: '18px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: P.text, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                  Department Dashboard
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', rowGap: 6 }}>
                  {[
                    ['Department', 'Computer Science'],
                    ['HOD', hodName],
                    ['Current Semester', 'Odd Semester 2026'],
                    ['Academic Session', yearFilter],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: P.textCaption, fontWeight: 600 }}>{label}:</span>
                      <span style={{ fontSize: 12, color: P.textSec, fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: P.textCaption, fontWeight: 600 }}>Last Updated</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.textSec }}>
                    {lastUpdated ? (minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`) : '—'}
                  </div>
                </div>
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  style={{ ...btnGhost, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}
                  className="hod-ghost"
                >
                  <RefreshCw style={{ width: 14, height: 14, ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ FILTERS */}
          <div style={{ ...cardStyle, padding: '10px 20px' }}>
            <div className="hod-filter-row" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                Filter by:
              </span>
              {[
                {
                  label: 'Department', value: deptFilter, setter: setDeptFilter,
                  options: [{ v: 'All', l: 'All Departments' }, ...(courses || []).map(c => ({ v: c.code, l: `${c.code}` }))],
                },
                {
                  label: 'Semester', value: semFilter, setter: setSemFilter,
                  options: [{ v: 'All', l: 'All Semesters' }, ...[1,2,3,4].map(n => ({ v: String(n), l: `Semester ${n}` }))],
                },
                {
                  label: 'Academic Year', value: yearFilter, setter: setYearFilter,
                  options: [{ v: '2025-26', l: '2025-26' }, { v: '2026-27', l: '2026-27' }],
                },
              ].map(({ label, value, setter, options }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: P.textCaption, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</span>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="hod-select"
                    style={{ fontSize: 13, fontWeight: 600, color: P.text, border: `1px solid ${P.border}`, borderRadius: 8, padding: '5px 10px', background: P.card, cursor: 'pointer' }}
                  >
                    {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ STAT CARDS */}
          <div className="hod-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>

            {/* 1 — Faculty */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: P.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 18, height: 18, color: P.primary }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Faculty</span>
              </div>
              {loading ? <Skel h={38} /> : (
                <div style={{ fontSize: 34, fontWeight: 800, color: P.text, lineHeight: 1 }}>{faculty.total}</div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.secondary }}>{faculty.present}</div>
                  <div style={{ fontSize: 11, color: P.textCaption, marginTop: 2 }}>Present Today</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: faculty.on_leave > 0 ? P.warning : P.textSec }}>{faculty.on_leave}</div>
                  <div style={{ fontSize: 11, color: P.textCaption, marginTop: 2 }}>On Leave</div>
                </div>
              </div>
            </div>

            {/* 2 — Students */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EBF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap style={{ width: 18, height: 18, color: P.secondary }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Students</span>
              </div>
              {loading ? <Skel h={38} /> : (
                <div style={{ fontSize: 34, fontWeight: 800, color: P.text, lineHeight: 1 }}>{students.total}</div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.secondary }}>{students.active}</div>
                  <div style={{ fontSize: 11, color: P.textCaption, marginTop: 2 }}>Active</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: students.pending > 0 ? P.warning : P.textSec }}>{students.pending}</div>
                  <div style={{ fontSize: 11, color: P.textCaption, marginTop: 2 }}>Pending</div>
                </div>
              </div>
            </div>

            {/* 3 — Pending Approvals */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: P.warningLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList style={{ width: 18, height: 18, color: P.warning }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</span>
              </div>
              {loading ? <Skel h={38} /> : (
                <div style={{ fontSize: 34, fontWeight: 800, color: pendingAppr.total > 0 ? P.warning : P.text, lineHeight: 1 }}>{pendingAppr.total}</div>
              )}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['Leave Requests',       pendingAppr.leave_requests],
                  ['Student Registrations',pendingAppr.student_registrations],
                  ['Subject Allocation',   pendingAppr.subject_allocation],
                ].map(([label, count]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: P.textCaption }}>{label}</span>
                    <span style={{ fontWeight: 700, color: count > 0 ? P.warning : P.textSec }}>{loading ? '—' : count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 — Today's Classes */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: P.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar style={{ width: 18, height: 18, color: P.primary }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today</span>
              </div>
              {loading ? <Skel h={38} /> : (
                <div style={{ fontSize: 34, fontWeight: 800, color: P.text, lineHeight: 1 }}>{todayClasses.scheduled}</div>
              )}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: P.textCaption }}>Scheduled ({currentDay})</span>
                  <span style={{ fontWeight: 700, color: P.primary }}>{loading ? '—' : todayClasses.scheduled}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: P.textCaption }}>No Faculty Assigned</span>
                  <span style={{ fontWeight: 700, color: todayClasses.no_faculty_slots > 0 ? P.danger : P.secondary }}>{loading ? '—' : todayClasses.no_faculty_slots}</span>
                </div>
              </div>
            </div>

            {/* 5 — Alerts */}
            <div style={{ ...cardStyle, borderLeft: `3px solid ${totalAlert > 0 ? P.danger : P.secondary}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: totalAlert > 0 ? P.dangerLt : P.secondaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle style={{ width: 18, height: 18, color: totalAlert > 0 ? P.danger : P.secondary }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alerts</span>
              </div>
              {loading ? <Skel h={38} /> : (
                <div style={{ fontSize: 34, fontWeight: 800, color: totalAlert > 0 ? P.danger : P.secondary, lineHeight: 1 }}>{totalAlert}</div>
              )}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {totalAlert === 0 ? (
                  <div style={{ fontSize: 11, color: P.secondary }}>All systems operational</div>
                ) : alertsData.slice(0, 3).map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.severity === 'high' ? P.danger : P.warning, marginTop: 4, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: P.textSec, lineHeight: 1.4 }}>{a.title}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════════════ MAIN GRID */}
          <div className="hod-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* ACADEMIC PROGRESS */}
              <div style={cardStyle}>
                <SectionHeader icon={TrendingUp} title="Academic Progress Overview" />
                <div style={{ overflowX: 'auto' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        {['Sem', 'Course', 'Coverage', 'Pending Subjects', 'Faculty Assigned', 'Status'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{ padding: 20 }}><Skel h={50} /></td></tr>
                      ) : filteredProgress.length === 0 ? (
                        <EmptyRow message="No academic progress data." cols={6} />
                      ) : filteredProgress.map(item => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 700, color: P.primary }}>Sem {item.semester}</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{item.course_code}</div>
                            <div style={{ fontSize: 11, color: P.textCaption }}>{item.course_name}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                              <div style={{ flex: 1, height: 6, background: '#E4E7EC', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${item.coverage_pct}%`, background: item.coverage_pct >= 70 ? P.secondary : item.coverage_pct < 50 ? P.danger : P.warning, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: P.text, minWidth: 34 }}>{item.coverage_pct}%</span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600, color: item.pending_subjects > 0 ? P.warning : P.secondary }}>
                              {item.pending_subjects} / {item.total_subjects}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={statusBadge(item.internal_completed ? 'balanced' : 'underloaded')}>
                              {item.internal_completed ? 'Complete' : 'Incomplete'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={statusBadge(item.status === 'On-Track' ? 'balanced' : item.status === 'Delayed' ? 'overloaded' : 'underloaded')}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FACULTY WORKLOAD TABLE */}
              <div style={cardStyle}>
                <SectionHeader icon={Sliders} title="Faculty Workload" count={facultyWithWorkload.length} action="View All" onAction={() => navigate('/admin/faculty')} />
                <div style={{ overflowX: 'auto' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        {['Faculty Name', 'Subjects', 'Weekly Hours', 'Status', 'Actions'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ padding: 20 }}><Skel h={100} /></td></tr>
                      ) : facultyWithWorkload.length === 0 ? (
                        <EmptyRow message="No faculty found." cols={5} />
                      ) : facultyWithWorkload.map(fac => (
                        <tr key={fac.id}>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: P.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: P.primary, flexShrink: 0 }}>
                                {fac.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{fac.name}</div>
                                <div style={{ fontSize: 11, color: P.textCaption }}>{fac.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600 }}>{fac.subjects?.length || 0}</span>
                            <span style={{ color: P.textCaption, fontSize: 12 }}> assigned</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 52, height: 5, background: '#E4E7EC', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (fac.hours / 24) * 100)}%`, background: fac.status === 'overloaded' ? P.danger : fac.status === 'underloaded' ? P.warning : P.secondary }} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 13, color: fac.status === 'overloaded' ? P.danger : P.text }}>{fac.hours}h</span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={statusBadge(fac.status)}>
                              {fac.status.charAt(0).toUpperCase() + fac.status.slice(1)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => navigate('/admin/faculty')} style={{ ...btnGhost, fontSize: 12, padding: '5px 10px' }} className="hod-ghost">View Profile</button>
                              <button onClick={() => setWorkloadModalFaculty(fac)} style={{ ...btnGhost, fontSize: 12, padding: '5px 10px' }} className="hod-ghost">Adjust</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* UNASSIGNED TEACHING ALLOCATION */}
              <div style={cardStyle}>
                <SectionHeader icon={BookOpen} title="Unassigned Teaching Allocation" count={filteredUnassigned.length} />
                <div style={{ overflowX: 'auto' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        {['Subject', 'Course', 'Semester', 'Required Faculty', 'Action'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ padding: 20 }}><Skel h={60} /></td></tr>
                      ) : filteredUnassigned.length === 0 ? (
                        <EmptyRow message="All subjects have faculty assigned." cols={5} />
                      ) : filteredUnassigned.map(sub => (
                        <tr key={sub.id}>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: P.danger, background: P.dangerLt, padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{sub.code}</span>
                            <span style={{ fontWeight: 600 }}>{sub.name}</span>
                          </td>
                          <td style={tdStyle}><span style={{ color: P.textSec }}>{sub.department || '—'}</span></td>
                          <td style={tdStyle}>Sem {sub.semester_number}</td>
                          <td style={tdStyle}><span style={{ color: P.danger, fontWeight: 600 }}>1 Faculty</span></td>
                          <td style={tdStyle}>
                            <button onClick={() => setAssignModalSubject(sub)} style={{ ...btnPrimary, fontSize: 12, padding: '5px 12px' }} className="hod-btn">
                              Assign Faculty
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FACULTY LEAVE CONFLICTS */}
              <div style={cardStyle}>
                <SectionHeader icon={Clock} title="Faculty Leave Requests" count={filteredLeaves.length} action="View All" onAction={() => navigate('/admin/leave-requests')} />
                <div style={{ overflowX: 'auto' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        {['Faculty Name', 'Leave Period', 'Affected Classes', 'Reason', 'Action'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ padding: 20 }}><Skel h={60} /></td></tr>
                      ) : filteredLeaves.length === 0 ? (
                        <EmptyRow message="No pending leave requests." cols={5} />
                      ) : filteredLeaves.map(leave => {
                        const fac = facultyList.find(f => f.name === leave.faculty_name)
                        const affected = leave.affected_class_count ?? (fac?.subjects?.length || 0) * 3
                        return (
                          <tr key={leave.id}>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600 }}>{leave.faculty_name}</div>
                              <div style={{ fontSize: 11, color: P.textCaption }}>{leave.faculty_email}</div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: 12 }}>{leave.start_date}</div>
                              <div style={{ fontSize: 11, color: P.textCaption }}>to {leave.end_date}</div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 700, color: affected > 0 ? P.warning : P.textSec }}>{affected}</span>
                              <span style={{ fontSize: 11, color: P.textCaption }}> classes</span>
                            </td>
                            <td style={tdStyle}><span style={{ fontSize: 12, color: P.textSec }}>{leave.reason}</span></td>
                            <td style={tdStyle}>
                              <button
                                onClick={() => {
                                  setLeaveResolveData({ ...leave, affectedSubjects: fac?.subjects || [], affectedLecturesCount: affected })
                                  setSelectedSubstituteId('')
                                }}
                                style={{ ...btnGhost, fontSize: 12, padding: '5px 10px', borderColor: P.warning, color: P.warning }}
                                className="hod-ghost"
                              >
                                Assign Substitute
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STUDENT REGISTRATION REQUESTS */}
              <div style={cardStyle}>
                <SectionHeader icon={UserCheck} title="Student Registration Requests" count={filteredStudents.length} />
                <div style={{ overflowX: 'auto' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        {['Student', 'Course', 'Semester', 'Enrollment No.', 'Applied On', 'Actions'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{ padding: 20 }}><Skel h={60} /></td></tr>
                      ) : filteredStudents.length === 0 ? (
                        <EmptyRow message="All student registrations processed." cols={6} />
                      ) : filteredStudents.map(student => (
                        <tr key={student.enrollment_id}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{student.name}</div>
                            <div style={{ fontSize: 11, color: P.textCaption }}>{student.email}</div>
                          </td>
                          <td style={tdStyle}><span style={{ color: P.textSec }}>{student.course}</span></td>
                          <td style={tdStyle}>Sem {student.semester}</td>
                          <td style={tdStyle}><span style={{ fontSize: 12, fontFamily: 'monospace', color: P.textSec }}>{student.enrollment_number}</span></td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, color: P.textCaption }}>
                              {student.applied_at ? new Date(student.applied_at).toLocaleDateString('en-IN') : '—'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => setSelectedStudent(student)} style={{ ...btnGhost, fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }} className="hod-ghost">
                                <Eye style={{ width: 12, height: 12 }} /> View
                              </button>
                              <button onClick={() => handleStudentReview(student.enrollment_id, 'approved')} style={{ ...btnSuccess, fontSize: 12, padding: '4px 9px' }}>Approve</button>
                              <button onClick={() => handleStudentReview(student.enrollment_id, 'rejected')} style={{ ...btnDanger, fontSize: 12, padding: '4px 9px' }}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ALERTS DETAIL (only if any) */}
              {!loading && alertsData.length > 0 && (
                <div style={cardStyle}>
                  <SectionHeader icon={AlertTriangle} title="Department Alerts" count={alertsData.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alertsData.map(alert => (
                      <div key={alert.id} style={{
                        background: alert.severity === 'high' ? '#FFF8F8' : alert.severity === 'medium' ? '#FFFCF0' : '#F5F8FF',
                        border: `1px solid ${alert.severity === 'high' ? '#FECACA' : alert.severity === 'medium' ? '#FEF08A' : '#BFDBFE'}`,
                        borderLeft: `3px solid ${alert.severity === 'high' ? P.danger : alert.severity === 'medium' ? P.warning : P.primary}`,
                        borderRadius: 8, padding: '12px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 3 }}>{alert.title}</div>
                          <div style={{ fontSize: 12, color: P.textSec }}>{alert.message}</div>
                        </div>
                        <button onClick={() => navigate(alert.action_path)} style={{ ...btnGhost, fontSize: 12, padding: '5px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} className="hod-ghost">
                          {alert.action}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
            <div className="hod-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>

              {/* Department Summary */}
              <div style={cardStyle}>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building style={{ width: 16, height: 16, color: P.primary }} />
                  Department Summary
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { icon: Users,          label: 'Total Faculty',      value: faculty.total },
                    { icon: GraduationCap,  label: 'Total Students',     value: students.total },
                    { icon: BookOpen,       label: 'Active Subjects',     value: subjectsSummary.total },
                    { icon: AlertCircle,    label: 'Unassigned Subjects', value: subjectsSummary.unassigned, warn: subjectsSummary.unassigned > 0 },
                    { icon: Calendar,       label: "Today's Classes",     value: todayClasses.scheduled },
                    { icon: Clock,          label: 'Pending Leaves',      value: pendingAppr.leave_requests, warn: pendingAppr.leave_requests > 0 },
                  ].map(({ icon: Icon, label, value, warn }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${P.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon style={{ width: 13, height: 13, color: P.textCaption }} />
                        <span style={{ fontSize: 13, color: P.textSec }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: warn ? P.danger : P.text }}>{loading ? '—' : value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={cardStyle}>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield style={{ width: 16, height: 16, color: P.primary }} />
                  Quick Actions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { icon: ClipboardList, label: 'Approve Leave',     path: '/admin/leave-requests', color: P.warning },
                    { icon: UserCheck,     label: 'Assign Faculty',    path: '/admin/faculty',        color: P.primary },
                    { icon: Calendar,      label: 'Manage Timetable',  path: '/admin/schedule',       color: P.secondary },
                    { icon: BookOpen,      label: 'Manage Subjects',   path: '/admin/subjects',       color: P.primary },
                    { icon: Users,         label: 'View Students',     path: '/admin/students',       color: P.secondary },
                    { icon: BarChart3,     label: 'View Reports',      path: '/admin/quiz-analytics', color: P.textSec },
                  ].map(({ icon: Icon, label, path, color }) => (
                    <button
                      key={label}
                      onClick={() => navigate(path)}
                      className="hod-action"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.12s' }}
                    >
                      <Icon style={{ width: 15, height: 15, color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.text, flex: 1 }}>{label}</span>
                      <ChevronRight style={{ width: 13, height: 13, color: P.textCaption }} />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ MODALS */}

      {/* Student Dossier Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.48)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: P.text, margin: 0 }}>Review Student Registration</h2>
                <p style={{ fontSize: 13, color: P.textSec, margin: '3px 0 0' }}>{selectedStudent.name}</p>
              </div>
              <button onClick={() => { setSelectedStudent(null); setShowCorrectionInput(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textCaption, padding: 6 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Enrollment No.',   selectedStudent.enrollment_number],
                  ['Course',           `${selectedStudent.course} — Sem ${selectedStudent.semester}`],
                  ['Email',            selectedStudent.email],
                  ['Applied On',       selectedStudent.applied_at ? new Date(selectedStudent.applied_at).toLocaleDateString('en-IN') : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: P.textCaption, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, color: P.text, fontWeight: 500, wordBreak: 'break-all' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: P.primary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Verification Checklist</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {['University ID / Aadhaar Uploaded', 'Fee Receipt Verified', 'Academic Prerequisites Checked'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#F9FAFB', borderRadius: 8, border: `1px solid ${P.border}` }}>
                      <CheckCircle2 style={{ width: 15, height: 15, color: P.secondary }} />
                      <span style={{ fontSize: 13, color: P.text }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudent.id_card_url && (
                <a href={selectedStudent.id_card_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: P.primaryLt, border: `1px solid #BFDBFE`, borderRadius: 8, color: P.primary, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  <Eye style={{ width: 14, height: 14 }} /> View Uploaded ID Document
                </a>
              )}

              {showCorrectionInput ? (
                <div style={{ background: P.warningLt, border: `1px solid #FEF08A`, borderRadius: 10, padding: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: P.warning, display: 'block', marginBottom: 6 }}>Specify correction required:</label>
                  <textarea value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} rows={3}
                    placeholder="e.g. ID Card image is blurry. Please upload a clear photo."
                    style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button onClick={() => setShowCorrectionInput(false)} style={btnGhost} className="hod-ghost">Cancel</button>
                    <button onClick={() => handleStudentReview(selectedStudent.enrollment_id, 'correction', correctionNote)}
                      disabled={!correctionNote.trim()}
                      style={{ ...btnPrimary, background: P.warning, opacity: correctionNote.trim() ? 1 : 0.5 }}>
                      Send Correction Request
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: `1px solid ${P.border}` }}>
                  <button onClick={() => setShowCorrectionInput(true)} style={{ flex: 1, ...btnGhost, borderColor: P.warning, color: P.warning, padding: '9px 0' }} className="hod-ghost">Request Correction</button>
                  <button onClick={() => handleStudentReview(selectedStudent.enrollment_id, 'rejected')} style={{ ...btnDanger, padding: '9px 14px' }}>Reject</button>
                  <button onClick={() => handleStudentReview(selectedStudent.enrollment_id, 'approved')} style={{ flex: 1, ...btnPrimary, background: P.secondary, padding: '9px 0' }}>Approve</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Subject Modal */}
      {assignModalSubject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.48)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.danger, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Assign Faculty</div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: P.text, margin: 0 }}>{assignModalSubject.code} — {assignModalSubject.name}</h2>
              </div>
              <button onClick={() => setAssignModalSubject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textCaption }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: '18px 24px' }}>
              <p style={{ fontSize: 13, color: P.textSec, marginBottom: 14 }}>Faculty sorted by current teaching load (lowest first).</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {[...facultyWithWorkload].sort((a, b) => a.hours - b.hours).map(fac => (
                  <button key={fac.id} onClick={() => handleAssignSubject(fac.id, assignModalSubject.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 14px', border: `1px solid ${P.border}`, borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    className="hod-action"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: P.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: P.primary, flexShrink: 0 }}>
                        {fac.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{fac.name}</div>
                        <div style={{ fontSize: 11, color: P.textCaption }}>{fac.hours}h/week current load</div>
                      </div>
                    </div>
                    <span style={statusBadge(fac.status)}>{fac.status.charAt(0).toUpperCase() + fac.status.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workload Modal */}
      {workloadModalFaculty && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.48)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={statusBadge(workloadModalFaculty.status)}>{workloadModalFaculty.status.charAt(0).toUpperCase() + workloadModalFaculty.status.slice(1)}</span>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: P.text, margin: '6px 0 2px' }}>{workloadModalFaculty.name}</h2>
                <p style={{ fontSize: 12, color: P.textCaption, margin: 0 }}>{workloadModalFaculty.email}</p>
              </div>
              <button onClick={() => setWorkloadModalFaculty(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textCaption }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: P.textSec }}>Weekly teaching hours</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: workloadModalFaculty.status === 'overloaded' ? P.danger : P.text }}>{workloadModalFaculty.hours}h / week</span>
              </div>
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: P.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Assigned Subjects</h3>
                {(!workloadModalFaculty.subjects || workloadModalFaculty.subjects.length === 0) ? (
                  <p style={{ fontSize: 13, color: P.textCaption, fontStyle: 'italic' }}>No subjects allocated.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {workloadModalFaculty.subjects.map(sub => (
                      <div key={sub.assignment_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#F9FAFB', border: `1px solid ${P.border}`, borderRadius: 8 }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: P.primary, background: P.primaryLt, padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>{sub.code}</span>
                          <span style={{ fontSize: 13, color: P.text }}>{sub.name}</span>
                        </div>
                        <button onClick={() => handleUnassignSubject(sub.assignment_id)} style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Resolution Modal */}
      {leaveResolveData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.48)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.warning, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Leave Resolution</div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: P.text, margin: 0 }}>{leaveResolveData.faculty_name}</h2>
              </div>
              <button onClick={() => setLeaveResolveData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.textCaption }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: P.warningLt, border: `1px solid #FEF08A`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 4 }}>
                  {leaveResolveData.start_date} → {leaveResolveData.end_date}
                </div>
                <div style={{ fontSize: 13, color: P.danger, fontWeight: 600 }}>{leaveResolveData.affectedLecturesCount} classes affected</div>
                {leaveResolveData.affectedSubjects?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {leaveResolveData.affectedSubjects.map(s => (
                      <span key={s.subject_id || s.code} style={{ fontSize: 10, fontWeight: 700, background: '#fff', border: `1px solid ${P.border}`, padding: '2px 6px', borderRadius: 4, color: P.textSec }}>{s.code}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: P.primary, display: 'block', marginBottom: 6 }}>Select Substitute Faculty:</label>
                <select value={selectedSubstituteId} onChange={e => setSelectedSubstituteId(e.target.value)} className="hod-select"
                  style={{ width: '100%', border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">— Choose substitute —</option>
                  {facultyWithWorkload.filter(f => f.id !== leaveResolveData.faculty_id).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.hours}h/week, {f.status})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleResolveLeave(leaveResolveData.id, 'reject_leave', '')} style={{ flex: 1, ...btnDanger, padding: '10px 0' }}>
                  Decline Leave
                </button>
                <button
                  onClick={() => {
                    const subFac = facultyWithWorkload.find(f => f.id === selectedSubstituteId)
                    handleResolveLeave(leaveResolveData.id, selectedSubstituteId, subFac?.name || '')
                  }}
                  disabled={!selectedSubstituteId}
                  style={{ flex: 1, ...btnPrimary, padding: '10px 0', opacity: selectedSubstituteId ? 1 : 0.5 }}
                >
                  Approve &amp; Assign Substitute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  )
}
