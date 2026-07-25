import React, { useState } from "react"
import { AlertOctagon, UserX, ChevronDown, ChevronUp, Send, Loader2, FileDown, CheckCircle } from "lucide-react"
import api from "../../services/api"

export default function AtRiskStudents({
  students = [],
  isLoading = false,
  onNudgeSuccess,
  onExportPdf,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [nudgeStates, setNudgeStates] = useState({})

  const toggleExpand = id => setExpandedId(expandedId === id ? null : id)

  const handleNudge = async (e, studentId, studentName) => {
    e.stopPropagation()
    setNudgeStates(p => ({ ...p, [studentId]: 'sending' }))
    try {
      await api.post(`/admin/dashboard/send-nudge/${studentId}`, {
        custom_message: `Hi ${studentName}, this is a gentle reminder to complete your pending daily challenges and review your course doubts on IntelliLearn. Let's get back on track!`,
      })
      setNudgeStates(p => ({ ...p, [studentId]: 'sent' }))
      onNudgeSuccess?.(studentId)
      setTimeout(() => setNudgeStates(p => { const u = {...p}; delete u[studentId]; return u }), 4000)
    } catch {
      setNudgeStates(p => ({ ...p, [studentId]: 'failed' }))
    }
  }

  const handleBulkNudge = () =>
    students.filter(s => s.risk_level === "High").forEach(s =>
      handleNudge({ stopPropagation: () => {} }, s.student_id, s.name)
    )

  return (
    <div className="dash-card h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="dash-card-header">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold font-outfit dash-text-primary">At-Risk Cohort</h2>
          {students.length > 0 && (
            <span className="text-[10px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-full">
              {students.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {students.length > 0 && onExportPdf && (
            <button
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 px-3 h-8 dash-bg-subtle border dash-border dash-text-secondary hover:dash-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <FileDown className="w-3 h-3" /> PDF Audit
            </button>
          )}
          {students.filter(s => s.risk_level === "High").length > 0 && (
            <button
              onClick={handleBulkNudge}
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-red-500/10 border border-red-500/25 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Send className="w-3 h-3" /> Nudge High Risk
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            <p className="dash-text-muted text-xs font-semibold">Running cohort diagnostics…</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 dash-bg-subtle rounded-xl border dash-border border-dashed">
            <CheckCircle className="w-9 h-9 text-emerald-500/80 mb-2 animate-pulse" />
            <p className="dash-text-primary font-bold text-sm">Zero Risk Flags 🎉</p>
            <p className="dash-text-muted text-xs mt-1 max-w-xs">No student currently matches the warning criteria.</p>
          </div>
        ) : students.map(student => {
          const isExpanded = expandedId === student.student_id
          const nudgeStatus = nudgeStates[student.student_id]
          const isHigh = student.risk_level === "High"

          return (
            <div
              key={student.student_id}
              onClick={() => toggleExpand(student.student_id)}
              className={`border rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${
                isExpanded ? "dash-bg-subtle border-brand/30 shadow-md" : "dash-bg-surface border-transparent hover:border-brand/20 hover:dash-bg-subtle"
              }`}
              style={{ borderColor: isExpanded ? undefined : 'var(--border-color)' }}
            >
              {/* Row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg dash-bg-subtle border dash-border shrink-0">
                    <UserX className={`w-3.5 h-3.5 ${isHigh ? "text-red-500 animate-pulse" : "text-orange-500"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold dash-text-primary text-xs truncate">{student.name}</div>
                    <div className="text-[10px] dash-text-muted font-semibold truncate">{student.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border ${
                    isHigh
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  }`}>{student.risk_level.toUpperCase()}</span>

                  {nudgeStatus === 'sent' ? (
                    <span className="text-[9px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">✓ Sent</span>
                  ) : nudgeStatus === 'failed' ? (
                    <button onClick={e => handleNudge(e, student.student_id, student.name)} className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-bold hover:bg-red-500/20">Retry</button>
                  ) : (
                    <button
                      onClick={e => handleNudge(e, student.student_id, student.name)}
                      disabled={nudgeStatus === 'sending'}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 rounded text-[9px] font-bold transition-all disabled:opacity-50"
                    >
                      {nudgeStatus === 'sending' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Send className="w-2.5 h-2.5" />}
                      Nudge
                    </button>
                  )}

                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 dash-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 dash-text-muted" />}
                </div>
              </div>

              {/* Expanded Panel */}
              {isExpanded && (
                <div className="dash-bg-subtle border-t dash-border p-3 text-xs space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5 pb-2.5 border-b dash-border">
                    {[
                      { label: 'Last Active',       value: student.inactive_days === 999 ? "Never" : `${student.inactive_days}d ago` },
                      { label: 'Quiz Average',      value: student.avg_quiz },
                      { label: 'Unresolved Doubts', value: student.unresolved_doubts },
                      { label: 'Challenge Rate',    value: student.challenge_completion },
                    ].map(item => (
                      <div key={item.label}>
                        <span className="dash-text-muted block text-[9px] uppercase tracking-wide">{item.label}</span>
                        <span className="dash-text-primary text-xs font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="dash-text-muted block text-[9px] uppercase tracking-wide mb-1">Risk Reasons</span>
                    <ul className="space-y-0.5">
                      {student.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1 dash-text-secondary leading-relaxed">
                          <span className="text-red-500 font-bold mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
