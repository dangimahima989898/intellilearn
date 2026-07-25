import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, CalendarDays, ArrowRight, Download,
  Layers, ArrowUpRight, RefreshCw, Clock, Activity,
  AlertTriangle, CheckCircle2, MessageSquareWarning, ListOrdered,
  FileBarChart, ChevronDown, BarChart2, FileText, Building
} from 'lucide-react'
import adminService from '../../services/adminService'
import courseService from '../../services/courseService'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import PerformanceHeatmap from '../../components/admin/PerformanceHeatmap'
import HeatmapDrillDown from '../../components/admin/HeatmapDrillDown'
import AtRiskStudents from '../../components/admin/AtRiskStudents'
import EngagementCharts from '../../components/admin/EngagementCharts'

// ── Helpers ────────────────────────────────────────────────────────────────────
function getEventBorderColor(type) {
  const t = (type || '').toLowerCase()
  if (t === 'exam')       return 'border-l-red-500'
  if (t === 'assignment') return 'border-l-orange-500'
  if (t === 'hackathon')  return 'border-l-green-500'
  return 'border-l-violet-500'
}

function getDaysChip(days) {
  if (days === 0)  return { label: 'Today',        cls: 'bg-red-500/20 text-red-500' }
  if (days <= 3)   return { label: `In ${days}d`,  cls: 'bg-orange-500/20 text-orange-500' }
  if (days <= 7)   return { label: `In ${days}d`,  cls: 'bg-yellow-500/20 text-yellow-600' }
  return           { label: `In ${days}d`,          cls: 'bg-emerald-500/20 text-emerald-600' }
}

function getActionBadgeStyle(type) {
  switch (type) {
    case 'UPLOAD':  return 'bg-blue-500/10 text-blue-500 border-blue-500/30'
    case 'APPROVE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    case 'REJECT':  return 'bg-red-500/10 text-red-500 border-red-500/30'
    case 'NOTIFY':  return 'bg-purple-500/10 text-purple-500 border-purple-500/30'
    default:        return 'bg-slate-500/10 text-slate-500 border-slate-500/30'
  }
}

const COURSE_THEMES = {
  MCA:      { color: 'text-indigo-500', badge: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25', glow: '#6366f1' },
  BCA:      { color: 'text-sky-500',    badge: 'bg-sky-500/15 text-sky-600 border-sky-500/25',         glow: '#0ea5e9' },
  'BSc CS': { color: 'text-emerald-500',badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25', glow: '#10b981' },
  'MSc CS': { color: 'text-rose-500',   badge: 'bg-rose-500/15 text-rose-600 border-rose-500/25',      glow: '#f43f5e' },
}
const DEFAULT_THEME = { color: 'text-violet-500', badge: 'bg-violet-500/15 text-violet-600 border-violet-500/25', glow: '#8b5cf6' }

// ── KPI tile component ─────────────────────────────────────────────────────────
function KpiTile({ label, value, Icon, glowColor }) {
  return (
    <div className="dash-card p-4 relative overflow-hidden group cursor-default" style={{ '--glow': glowColor }}>
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20"
           style={{ backgroundColor: glowColor }} />
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg dash-bg-subtle">
          <Icon className="w-4 h-4" style={{ color: glowColor }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-outfit dash-text-primary">{value ?? '—'}</div>
      <div className="text-[11px] font-semibold dash-text-muted mt-0.5">{label}</div>
    </div>
  )
}

// ── Select with chevron ────────────────────────────────────────────────────────
function ThemedSelect({ value, onChange, children }) {
  return (
    <div className="theme-select-wrap">
      <select className="theme-select" value={value} onChange={onChange}>
        {children}
      </select>
      <ChevronDown className="chevron-icon" />
    </div>
  )
}

// ── Action button ──────────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, label, color = 'blue' }) {
  const colors = {
    blue:    'bg-blue-500/10 border-blue-500/25 text-blue-500 hover:bg-blue-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/20',
  }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${colors[color]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user } = useAuth()

  // Core data
  const [courses, setCourses]           = useState([])
  const [courseStats, setCourseStats]   = useState({})
  const [upcomingEvents, setUpcoming]   = useState([])
  const [coreLoading, setCoreLoading]   = useState(true)

  // Analytics
  const [kpiStats, setKpiStats]                 = useState(null)
  const [heatmapData, setHeatmapData]           = useState([])
  const [heatmapLoading, setHeatmapLoading]     = useState(true)
  const [atRiskStudents, setAtRisk]             = useState([])
  const [atRiskLoading, setAtRiskLoading]       = useState(true)
  const [chartsData, setChartsData]             = useState(null)
  const [chartsLoading, setChartsLoading]       = useState(true)
  const [activityLog, setActivityLog]           = useState([])
  const [topDoubts, setTopDoubts]               = useState([])

  // Filters
  const [semester, setSemester]     = useState('')
  const [dateRange, setDateRange]   = useState('this_semester')

  // Drilldown
  const [drillOpen, setDrillOpen]       = useState(false)
  const [drillTarget, setDrillTarget]   = useState(null)

  // ── Load core data ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [events, activeCourses] = await Promise.all([
          adminService.getEvents(),
          courseService.getCourses(),
        ])
        setCourses(activeCourses)
        setUpcoming(
          events
            .filter(e => e.days_until >= 0)
            .sort((a, b) => a.days_until - b.days_until)
            .slice(0, 4)
        )
        const counts = {}
        await Promise.all(activeCourses.map(async c => {
          try { const d = await courseService.getStudentCount(c.id); counts[c.id] = d.count }
          catch { counts[c.id] = 0 }
        }))
        setCourseStats(counts)
      } catch (e) { console.error(e) }
      finally { setCoreLoading(false) }
    }
    load()
  }, [])

  // ── KPI stats ────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(r => setKpiStats(r.data))
      .catch(e => console.error('KPI:', e))
  }, [])

  // ── Heatmap ──────────────────────────────────────────────────────────────────
  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true)
    try {
      const p = new URLSearchParams()
      if (semester)  p.append('semester',   semester)
      if (dateRange) p.append('date_range', dateRange)
      const r = await api.get(`/admin/dashboard/heatmap?${p}`)
      setHeatmapData(r.data)
    } catch { console.warn('Failed to refresh heatmap') }
    finally { setHeatmapLoading(false) }
  }, [semester, dateRange])

  useEffect(() => { fetchHeatmap() }, [fetchHeatmap])

  // ── At-risk ──────────────────────────────────────────────────────────────────
  const fetchAtRisk = useCallback(async () => {
    setAtRiskLoading(true)
    try {
      const p = new URLSearchParams()
      if (semester) p.append('semester', semester)
      const r = await api.get(`/admin/dashboard/at-risk-students?${p}`)
      setAtRisk(r.data)
    } catch { console.error('at-risk failed') }
    finally { setAtRiskLoading(false) }
  }, [semester])

  useEffect(() => { fetchAtRisk() }, [fetchAtRisk])

  // ── Charts ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setChartsLoading(true)
    api.get('/admin/dashboard/engagement-charts')
      .then(r => setChartsData(r.data))
      .catch(e => console.error(e))
      .finally(() => setChartsLoading(false))
  }, [])

  // ── Sidebar data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      api.get('/admin/dashboard/activity-log'),
      api.get('/admin/dashboard/top-doubts'),
    ]).then(([logRes, doubtsRes]) => {
      setActivityLog(logRes.status === 'fulfilled' ? (logRes.value.data || []) : [])
      setTopDoubts(doubtsRes.status === 'fulfilled' ? (doubtsRes.value.data || []) : [])
    }).catch(e => console.error(e))
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCellClick = (subjectId, subjectCode, subjectName, unit) => {
    setDrillTarget({ subjectId, subjectCode, subjectName, unit })
    setDrillOpen(true)
  }

  const downloadBlob = async (url, filename, mimeType) => {
    const token = localStorage.getItem('intellilearn_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) { toast.error('Export failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Downloaded!')
  }

  const handleExportHeatmap = () => {
    const p = new URLSearchParams()
    if (semester)  p.append('semester',   semester)
    if (dateRange) p.append('date_range', dateRange)
    downloadBlob(`/admin/dashboard/export/heatmap?${p}`, 'heatmap.xlsx')
  }

  const handleExportAtRisk = () => {
    const p = new URLSearchParams()
    if (semester) p.append('semester', semester)
    downloadBlob(`/admin/dashboard/export/at-risk?${p}`, 'at_risk_report.pdf')
  }

  const handleRefresh = () => { fetchHeatmap(); fetchAtRisk() }

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-outfit font-bold dash-text-primary tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-sm dash-text-muted mt-0.5">
            Welcome, {user?.name || 'Administrator'} — real-time class performance & engagement.
          </p>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          <ThemedSelect value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </ThemedSelect>

          <ThemedSelect value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="this_semester">This Semester</option>
          </ThemedSelect>

          <ActionBtn onClick={handleExportHeatmap} icon={FileBarChart} label="Export Heatmap" color="emerald" />
          <ActionBtn onClick={handleRefresh}        icon={RefreshCw}   label="Refresh"         color="blue" />
        </div>
      </div>

      {/* ── KPI tiles ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <KpiTile label="Total Students"    value={kpiStats?.total_students}    Icon={Users}                 glowColor="#3b82f6" />
        <KpiTile label="Active Today"      value={kpiStats?.active_today}      Icon={Activity}              glowColor="#10b981" />
        <KpiTile label="Pending Summaries" value={kpiStats?.pending_summaries} Icon={Clock}                 glowColor="#f59e0b" />
        <KpiTile label="Flagged Doubts"    value={kpiStats?.flagged_doubts}    Icon={MessageSquareWarning}  glowColor="#ef4444" />
        <KpiTile label="Weekly Quizzes"    value={kpiStats?.weekly_attempts}   Icon={CheckCircle2}          glowColor="#8b5cf6" />
        <KpiTile label="Departments"       value={kpiStats?.total_departments} Icon={Building}             glowColor="#0ea5e9" />
        <KpiTile label="System Status"     value="99.98%"                      Icon={AlertTriangle}         glowColor="#14b8a6" />
      </div>

      {/* ── Heatmap section ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <PerformanceHeatmap
          data={heatmapData}
          isLoading={heatmapLoading}
          onCellClick={handleCellClick}
        />
      </div>

      {/* ── At-Risk + Activity Log ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <AtRiskStudents
          students={atRiskStudents}
          isLoading={atRiskLoading}
          onExportPdf={handleExportAtRisk}
        />

        {/* Admin Activity Log */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="dash-card-header">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-violet-500" />
              <span className="font-semibold text-sm font-outfit dash-text-primary">Recent Admin Actions</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-1.5">
            {activityLog.length === 0 ? (
              <p className="text-center dash-text-muted text-xs py-10 font-semibold">No actions logged yet.</p>
            ) : activityLog.map(log => (
              <div key={log.id} className="flex items-start gap-2.5 p-2.5 rounded-xl dash-bg-subtle border dash-border hover:opacity-90 transition-opacity">
                <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getActionBadgeStyle(log.action_type)}`}>
                  {log.action_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="dash-text-primary text-xs font-semibold truncate">{log.details}</p>
                  <p className="dash-text-muted text-[10px] mt-0.5">{log.admin_name} · {log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Engagement Charts ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <EngagementCharts data={chartsData || {}} isLoading={chartsLoading} />
      </div>

      {/* ── Top Doubts + Upcoming Events ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

        {/* Top Doubts */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="dash-card-header">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-sm font-outfit dash-text-primary">Top Student Doubts</span>
            </div>
            <Link to="/admin/doubts" className="text-brand text-xs font-bold flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 p-3 overflow-y-auto max-h-72">
            {topDoubts.length === 0 ? (
              <p className="text-center dash-text-muted text-xs py-8 font-semibold">No unresolved doubts.</p>
            ) : topDoubts.map((d, i) => (
              <div key={d.id} className="flex items-start gap-2.5 py-2.5 border-b dash-border last:border-0">
                <span className="text-xs font-black dash-text-muted mt-0.5 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="dash-text-primary text-xs font-semibold line-clamp-2">{d.question_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded font-bold">{d.subject_name}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">▲ {d.vote_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="dash-card-header">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-rose-500" />
              <span className="font-semibold text-sm font-outfit dash-text-primary">Upcoming Events</span>
            </div>
            <Link to="/admin/events" className="text-brand text-xs font-bold flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 p-3 flex flex-col gap-2">
            {upcomingEvents.length === 0 ? (
              <EmptyState title="No upcoming events" description="Your schedule is clear." icon={CalendarDays} />
            ) : upcomingEvents.map(event => {
              const chip = getDaysChip(event.days_until)
              return (
                <div key={event.id} className={`dash-bg-subtle border dash-border border-l-4 rounded-xl p-3 flex gap-3 items-center ${getEventBorderColor(event.event_type)}`}>
                  <div className="flex flex-col items-center justify-center w-12 h-11 rounded-lg dash-bg-surface border dash-border shrink-0">
                    <span className="text-[9px] dash-text-muted font-bold uppercase">
                      {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-base font-bold dash-text-primary leading-tight">
                      {new Date(event.event_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="dash-text-primary text-xs font-semibold truncate">{event.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-bold uppercase dash-bg-surface border dash-border px-1.5 py-0.5 rounded-full dash-text-secondary">
                        {event.event_type}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${chip.cls}`}>
                        {chip.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Course Overview ──────────────────────────────────────────────────── */}
      {!coreLoading && courses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-outfit font-semibold dash-text-primary mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand" />
            Course & Semester Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses.map(course => {
              const theme = COURSE_THEMES[course.code] || DEFAULT_THEME
              const count = courseStats[course.id] || 0
              return (
                <Link
                  key={course.id}
                  to={`/admin/students?course_id=${course.id}`}
                  className="dash-card p-5 relative overflow-hidden group flex flex-col justify-between no-underline"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
                       style={{ backgroundColor: theme.glow }} />
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                        {course.code}
                      </span>
                      <ArrowUpRight className="w-4 h-4 dash-text-muted group-hover:dash-text-primary transition-colors" />
                    </div>
                    <h3 className="text-sm font-semibold dash-text-primary mt-3 truncate">{course.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Layers className="w-3 h-3 dash-text-muted" />
                      <span className="text-xs dash-text-muted">{course.total_semesters} Semesters</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t dash-border pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-semibold dash-text-secondary">{count} Students</span>
                    </div>
                    <span className="text-[10px] dash-text-muted font-bold uppercase tracking-wide">View →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Drilldown Modal ──────────────────────────────────────────────────── */}
      {drillTarget && (
        <HeatmapDrillDown
          isOpen={drillOpen}
          onClose={() => setDrillOpen(false)}
          subjectId={drillTarget.subjectId}
          subjectCode={drillTarget.subjectCode}
          subjectName={drillTarget.subjectName}
          unit={drillTarget.unit}
        />
      )}
    </PageWrapper>
  )
}
