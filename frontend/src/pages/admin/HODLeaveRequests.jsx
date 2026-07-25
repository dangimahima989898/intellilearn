import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ClipboardList, Filter, Search, Settings, Download, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertTriangle, Calendar,
  TrendingUp, Users, ChevronDown, X, BarChart3
} from 'lucide-react'
import hodService from '../../services/hodService'
import api from '../../services/api'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'
import LeaveRequestCard from './components/leave/LeaveRequestCard'
import ApproveSubstituteModal from './components/leave/ApproveSubstituteModal'
import RejectLeaveModal from './components/leave/RejectLeaveModal'
import LeaveCalendarPanel from './components/leave/LeaveCalendarPanel'
import LeavePolicyDrawer from './components/leave/LeavePolicyDrawer'


const TABS = ['Pending', 'Approved', 'Rejected', 'All Requests']
const DEPT_OPTIONS = ['All', 'BCA', 'MCA', 'BSc CS', 'MSc IT']
const LEAVE_TYPE_OPTIONS = ['All', 'CL', 'ML', 'EL', 'OD', 'Maternity', 'Compensatory']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function HODLeaveRequests() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth())
  const [yearFilter] = useState(new Date().getFullYear())
  const [facultyList, setFacultyList] = useState([])

  // Modal state
  const [approveModal, setApproveModal] = useState(null)   // leave object
  const [rejectModal, setRejectModal] = useState(null)     // leave object
  const [policyDrawer, setPolicyDrawer] = useState(false)

  // Leave policy (stored in localStorage)
  const [policy, setPolicy] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hod_leave_policy')) || {
        CL: 12, ML: 15, EL: 10, OD: 5,
        minNoticeDays: 3,
        requireMedCert: true,
        allowHalfDay: true,
      }
    } catch { return { CL: 12, ML: 15, EL: 10, OD: 5, minNoticeDays: 3, requireMedCert: true, allowHalfDay: true } }
  })

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hodService.getAllLeaves()
      setLeaves(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load leave requests from database')
      setLeaves([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFaculty = useCallback(async () => {
    try {
      const data = await hodService.getFacultyList()
      setFacultyList(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load faculty list from database')
      setFacultyList([])
    }
  }, [])

  useEffect(() => {
    fetchLeaves()
    fetchFaculty()
  }, [fetchLeaves, fetchFaculty])

  // ── Computed statistics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const pending = leaves.filter(l => l.status === 'pending').length
    const approvedThisMonth = leaves.filter(l => {
      if (l.status !== 'approved') return false
      const d = new Date(l.start_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const rejected = leaves.filter(l => l.status === 'rejected').length
    const onLeaveToday = leaves.filter(l => {
      if (l.status !== 'approved') return false
      const today = now.toISOString().split('T')[0]
      return l.start_date <= today && l.end_date >= today
    }).length
    return { pending, approvedThisMonth, rejected, onLeaveToday }
  }, [leaves])

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredLeaves = useMemo(() => {
    const statusMap = {
      'Pending': 'pending',
      'Approved': 'approved',
      'Rejected': 'rejected',
      'All Requests': null,
    }
    const targetStatus = statusMap[activeTab]
    return leaves.filter(l => {
      if (targetStatus && l.status !== targetStatus) return false
      if (deptFilter !== 'All' && l.department !== deptFilter) return false
      if (typeFilter !== 'All' && l.leave_type !== typeFilter) return false
      if (searchQuery && !l.faculty_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      const leaveMonth = new Date(l.start_date).getMonth()
      if (leaveMonth !== monthFilter) return false
      return true
    })
  }, [leaves, activeTab, deptFilter, typeFilter, searchQuery, monthFilter])

  const pendingCount = useMemo(() => leaves.filter(l => l.status === 'pending').length, [leaves])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const [actionInFlight, setActionInFlight] = useState(null) // leave id being processed
  
  const handleApproveWithSubs = (leave) => {
    if (leave.status !== 'pending') {
      toast.error('This leave request has already been processed')
      return
    }
    setApproveModal(leave)
  }
  const handleRejectOpen = (leave) => {
    if (leave.status !== 'pending') {
      toast.error('This leave request has already been processed')
      return
    }
    setRejectModal(leave)
  }

  const handleApproveConfirm = async (leave, substitutes) => {
    if (actionInFlight === leave.id) return
    setActionInFlight(leave.id)
    try {
      await hodService.reviewLeave(leave.id, 'approved', '', substitutes)
      setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: 'approved' } : l))
      setApproveModal(null)
      toast.success(`✅ Leave approved. Substitutes assigned & all parties notified.`, {
        duration: 4000,
        style: { background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #4c1d95' }
      })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to approve leave')
    } finally {
      setActionInFlight(null)
    }
  }

  const handleRejectConfirm = async (leave, reason) => {
    if (actionInFlight === leave.id) return
    setActionInFlight(leave.id)
    try {
      await hodService.reviewLeave(leave.id, 'rejected', reason)
      setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: 'rejected', rejection_reason: reason } : l))
      setRejectModal(null)
      toast.success(`Leave rejected. Faculty has been notified.`, {
        style: { background: '#1a0a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }
      })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reject leave')
    } finally {
      setActionInFlight(null)
    }
  }

  const handlePolicySave = (newPolicy) => {
    setPolicy(newPolicy)
    localStorage.setItem('hod_leave_policy', JSON.stringify(newPolicy))
    setPolicyDrawer(false)
    toast.success('Leave policy updated.')
  }

  const handleExport = () => {
    if (filteredLeaves.length === 0) {
      toast.error('No leave records to export. Adjust filters or select a different tab.')
      return
    }
    const rows = [
      ['Faculty', 'Dept', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Applied On'],
      ...filteredLeaves.map(l => {
        const days = Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1
        return [l.faculty_name, l.department, l.leave_type, l.start_date, l.end_date, days, l.status, l.applied_on]
      })
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leave_requests.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as CSV')
  }

  return (
    <PageWrapper title="Leave Requests">
      <div className="w-full max-w-[1400px] mx-auto p-4 lg:p-6 flex flex-col gap-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-violet-400" />
              Leave Requests
            </h1>
            <p className="text-white/50 text-sm mt-1 max-w-xl">
              Review and approve faculty leave applications. Approved leaves automatically flag affected classes for substitute arrangement.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchLeaves()}
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setPolicyDrawer(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-sm font-medium transition"
            >
              <Settings className="w-4 h-4" /> Leave Policy
            </button>
          </div>
        </div>

        {/* ── Statistics Cards ──────────────────────────────────────────────── */}
        <StatCards stats={stats} onCardClick={(tab) => setActiveTab(tab)} />

        {/* ── Main Layout: Tabs+Cards | Calendar ───────────────────────────── */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Left: Tabs, Filters, Cards */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Tab Bar */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                  {tab === 'Pending' && pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <FilterBar
              searchQuery={searchQuery} onSearch={setSearchQuery}
              deptFilter={deptFilter} onDeptChange={setDeptFilter}
              typeFilter={typeFilter} onTypeChange={setTypeFilter}
              monthFilter={monthFilter} onMonthChange={setMonthFilter}
            />

            {/* Leave Cards */}
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredLeaves.length === 0 ? (
              <EmptyState activeTab={activeTab} stats={stats} />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredLeaves.map(leave => (
                  <LeaveRequestCard
                    key={leave.id}
                    leave={leave}
                    policy={policy}
                    onApprove={() => handleApproveWithSubs(leave)}
                    onReject={() => handleRejectOpen(leave)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Calendar Panel */}
          <div className="xl:w-80 shrink-0">
            <LeaveCalendarPanel
              leaves={leaves}
              month={monthFilter}
              year={yearFilter}
              onMonthChange={setMonthFilter}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {approveModal && (
        <ApproveSubstituteModal
          leave={approveModal}
          facultyList={facultyList}
          onConfirm={handleApproveConfirm}
          onClose={() => setApproveModal(null)}
        />
      )}
      {rejectModal && (
        <RejectLeaveModal
          leave={rejectModal}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectModal(null)}
        />
      )}
      {policyDrawer && (
        <LeavePolicyDrawer
          policy={policy}
          onSave={handlePolicySave}
          onClose={() => setPolicyDrawer(false)}
        />
      )}
    </PageWrapper>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCards({ stats, onCardClick }) {
  const cards = [
    {
      label: 'Pending Action',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10 border-amber-400/20',
      tab: 'Pending',
    },
    {
      label: 'Approved This Month',
      value: stats.approvedThisMonth,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10 border-green-400/20',
      tab: 'Approved',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-400/10 border-red-400/20',
      tab: 'Rejected',
    },
    {
      label: 'On Leave Today',
      value: stats.onLeaveToday,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10 border-blue-400/20',
      tab: 'Approved',
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <button
          key={c.label}
          onClick={() => onCardClick(c.tab)}
          className={`flex items-center gap-3 p-4 rounded-2xl border ${c.bg} hover:brightness-110 transition text-left group`}
        >
          <div className={`p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform`}>
            <c.icon className={`w-5 h-5 ${c.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-white/50 leading-tight">{c.label}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function FilterBar({ searchQuery, onSearch, deptFilter, onDeptChange, typeFilter, onTypeChange, monthFilter, onMonthChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search faculty..."
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      {/* Dept */}
      <SelectFilter label="Dept" value={deptFilter} options={DEPT_OPTIONS} onChange={onDeptChange} />

      {/* Type */}
      <SelectFilter label="Type" value={typeFilter} options={LEAVE_TYPE_OPTIONS} onChange={onTypeChange} />

      {/* Month */}
      <SelectFilter
        label="Month"
        value={MONTHS[monthFilter]}
        options={MONTHS}
        onChange={(m) => onMonthChange(MONTHS.indexOf(m))}
      />
    </div>
  )
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition cursor-pointer"
      >
        {options.map(o => <option key={o} value={o} className="bg-[#0F172A]">{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
    </div>
  )
}

function EmptyState({ activeTab, stats }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Pending Leave Requests</h3>
      <p className="text-white/50 text-sm max-w-sm mb-6">
        All faculty leave applications have been reviewed. No action needed.
      </p>
      {(stats.approvedThisMonth > 0 || stats.rejected > 0) && (
        <div className="flex items-center gap-4 text-sm text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {stats.approvedThisMonth} approved this month
          </span>
          {stats.rejected > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {stats.rejected} rejected
            </span>
          )}
        </div>
      )}
    </div>
  )
}
