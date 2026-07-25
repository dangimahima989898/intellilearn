import { useState } from 'react'
import {
  User, Calendar, Clock, AlertTriangle, BookOpen,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Briefcase, HeartPulse, Award, Coffee
} from 'lucide-react'

// ── Leave type config ──────────────────────────────────────────────────────────
const LEAVE_TYPE_CONFIG = {
  CL:  { label: 'Casual Leave',        color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',   icon: Coffee },
  ML:  { label: 'Medical Leave',       color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',     icon: HeartPulse },
  EL:  { label: 'Earned Leave',        color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30', icon: Award },
  OD:  { label: 'On Duty Leave',       color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30', icon: Briefcase },
  Maternity:     { label: 'Maternity Leave',    color: 'text-pink-400',   bg: 'bg-pink-400/10 border-pink-400/30',   icon: User },
  Compensatory:  { label: 'Compensatory Leave', color: 'text-cyan-400',   bg: 'bg-cyan-400/10 border-cyan-400/30',   icon: Clock },
}

const DEPT_BADGE = {
  BCA:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MCA:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'BSc CS': 'bg-green-500/20 text-green-300 border-green-500/30',
  'MSc IT': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',   icon: Clock },
  approved: { label: 'Approved', color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',   icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       icon: XCircle },
}

function calcDays(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name) {
  return (name || '').replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').split(' ')
    .map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function noticeDaysWarning(appliedOn, startDate, minNoticeDays) {
  const noticeGiven = Math.floor((new Date(startDate) - new Date(appliedOn)) / 86400000)
  if (noticeGiven < minNoticeDays) {
    return `⚠️ Short notice: applied only ${noticeGiven} day${noticeGiven !== 1 ? 's' : ''} before (minimum ${minNoticeDays} days)`
  }
  return null
}

export default function LeaveRequestCard({ leave, policy, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false)

  const days = calcDays(leave.start_date, leave.end_date)
  const typeConfig = LEAVE_TYPE_CONFIG[leave.leave_type] || LEAVE_TYPE_CONFIG.CL
  const TypeIcon = typeConfig.icon
  const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const deptBadge = DEPT_BADGE[leave.department] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  const warning = policy ? noticeDaysWarning(leave.applied_on, leave.start_date, policy.minNoticeDays) : null
  const initials = getInitials(leave.faculty_name)

  // Determine avatar color by department
  const avatarColors = {
    BCA: 'bg-blue-600/30 text-blue-300 border-blue-600/30',
    MCA: 'bg-violet-600/30 text-violet-300 border-violet-600/30',
    'BSc CS': 'bg-green-600/30 text-green-300 border-green-600/30',
    'MSc IT': 'bg-orange-600/30 text-orange-300 border-orange-600/30',
  }
  const avatarColor = avatarColors[leave.department] || 'bg-slate-600/30 text-slate-300 border-slate-600/30'

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 rounded-2xl overflow-hidden transition-all duration-200 group">
      
      {/* ── Top Strip: Status Indicator ───────────────────────────────── */}
      <div className={`h-1 w-full ${leave.status === 'pending' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : leave.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />

      <div className="p-5 flex flex-col gap-4">
        
        {/* ── Row 1: Avatar + Faculty Info + Status Badge ────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor}`}>
              {initials}
            </div>

            {/* Faculty Info */}
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{leave.faculty_name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${deptBadge}`}>
                  {leave.department}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeConfig.bg} ${typeConfig.color}`}>
                  <TypeIcon className="w-3 h-3" /> {typeConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </div>
        </div>

        {/* ── Row 2: Date Range + Applied On ───────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <Calendar className="w-4 h-4 text-violet-400" />
            <span className="font-semibold">{formatDate(leave.start_date)}</span>
            <span className="text-white/30">→</span>
            <span className="font-semibold">{formatDate(leave.end_date)}</span>
            <span className="text-white/40">({days} day{days !== 1 ? 's' : ''})</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Applied: {formatDate(leave.applied_on)}
          </div>
        </div>

        {/* ── Short Notice Warning ──────────────────────────────────────── */}
        {warning && leave.status === 'pending' && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {warning}
          </div>
        )}

        {/* ── Reason ────────────────────────────────────────────────────── */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Reason</p>
          <p className="text-sm text-white/80 leading-relaxed">{leave.reason}</p>
        </div>

        {/* ── Rejection Reason (if rejected) ───────────────────────────── */}
        {leave.status === 'rejected' && leave.rejection_reason && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-[11px] font-semibold text-red-400/70 uppercase tracking-wider mb-1">Rejection Reason</p>
            <p className="text-sm text-red-300">{leave.rejection_reason}</p>
          </div>
        )}

        {/* ── Expandable Details ────────────────────────────────────────── */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center justify-between w-full text-sm text-white/50 hover:text-white transition py-1"
        >
          <span className="font-medium">
            {expanded ? 'Hide details' : `Show details · ${leave.affected_classes?.length || 0} affected class${(leave.affected_classes?.length || 0) !== 1 ? 'es' : ''}`}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="flex flex-col gap-4 pt-2 border-t border-white/5">
            
            {/* Affected Classes */}
            {leave.affected_classes?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white/70">
                    Affected Classes ({leave.affected_classes.length} slot{leave.affected_classes.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {leave.affected_classes.map((cls, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 text-[11px] font-bold flex items-center justify-center border border-violet-500/20">
                          {cls.day.slice(0, 3)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{cls.subject}</p>
                          <p className="text-xs text-white/40">{cls.course} · {cls.semester}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-white/50">{cls.time}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400/80">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Substitute Status: Not Arranged
                </div>
              </div>
            )}

            {/* Leave Balance */}
            {leave.leave_balance && (
              <div>
                <p className="text-sm font-semibold text-white/60 mb-2">
                  {leave.faculty_name.split(' ').slice(-1)[0]}'s Leave Balance (2024-25)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(leave.leave_balance).map(([type, remaining]) => {
                    const max = leave.leave_max?.[type] || 12
                    const pct = (remaining / max) * 100
                    const isCurrentType = leave.leave_type === type
                    return (
                      <div
                        key={type}
                        className={`p-2.5 rounded-xl border ${isCurrentType ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}
                      >
                        <p className={`text-[11px] font-bold mb-1 ${isCurrentType ? 'text-violet-300' : 'text-white/40'}`}>
                          {type} {isCurrentType && '←'}
                        </p>
                        <p className="text-sm font-bold text-white">{remaining} <span className="text-white/30 text-xs">/ {max}</span></p>
                        <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {leave.leave_balance[leave.leave_type] <= 2 && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Low {LEAVE_TYPE_CONFIG[leave.leave_type]?.label} balance
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action Buttons (only for pending) ───────────────────────── */}
        {leave.status === 'pending' && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-violet-500/25"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve & Arrange Substitute
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
