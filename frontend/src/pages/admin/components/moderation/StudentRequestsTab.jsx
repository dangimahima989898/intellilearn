import { useState, useMemo } from 'react'
import { ClipboardList, CheckCircle2, XCircle, FileText, ArrowRight, X, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  semester_correction: { label: 'Semester/Course Correction', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  content_access: { label: 'Content Access Request', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  quiz_reevaluation: { label: 'Quiz Re-evaluation', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
}

const DEPT_BADGE = {
  BCA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MCA: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'BSc CS': 'bg-green-500/20 text-green-300 border-green-500/30',
  'MSc IT': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

const SUB_FILTERS = ['All Requests', 'Semester/Course Correction', 'Content Access Request', 'Quiz Re-evaluation']
const TYPE_MAP = {
  'All Requests': null,
  'Semester/Course Correction': 'semester_correction',
  'Content Access Request': 'content_access',
  'Quiz Re-evaluation': 'quiz_reevaluation',
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StudentRequestsTab({ items, loading, deptFilter, searchQuery, onAction }) {
  const [typeFilter, setTypeFilter] = useState('All Requests')
  const [approveModal, setApproveModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)

  const filtered = useMemo(() => items.filter(r => {
    if (r.status !== 'pending') return false
    if (deptFilter !== 'All' && r.department !== deptFilter) return false
    const tgt = TYPE_MAP[typeFilter]
    if (tgt && r.type !== tgt) return false
    if (searchQuery && !r.student_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [items, deptFilter, typeFilter, searchQuery])

  const handleApprove = (item, verified) => {
    setApproveModal(null)
    onAction(item.id, 'approved')
    toast.success(`Request approved. ${item.student_name} notified.`)
  }

  const handleReject = (item, reason) => {
    setRejectModal(null)
    onAction(item.id, 'rejected')
    toast.success('Request rejected. Student notified.')
  }

  if (loading) return <div className="flex flex-col gap-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-filter */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_FILTERS.map(f => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${typeFilter === f ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Pending Requests</h3>
          <p className="text-white/50 text-sm max-w-sm">All student platform requests have been processed.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(item => {
            const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.semester_correction
            const deptBadge = DEPT_BADGE[item.department] || 'bg-gray-500/20 text-gray-300'
            return (
              <div key={item.id} className="bg-white/5 border border-white/10 hover:border-violet-500/20 rounded-2xl overflow-hidden transition">
                <div className="h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
                <div className="p-5 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${typeConf.bg} ${typeConf.color}`}>
                      {typeConf.label}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${deptBadge}`}>{item.department}</span>
                  </div>

                  {/* Student Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <p className="font-bold text-white">{item.student_name}</p>
                      <p className="text-white/40 text-xs">{item.enrollment}</p>
                    </div>
                    <p className="text-xs text-white/40">Requested: {formatDate(item.requested_at)}</p>
                  </div>

                  {/* Description */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-sm text-white/80 leading-relaxed">{item.description}</p>
                  </div>

                  {/* Current → Requested Change */}
                  {(item.current_value || item.requested_value) && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs">{item.current_value}</span>
                      <ArrowRight className="w-4 h-4 text-white/30" />
                      <span className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-violet-300 text-xs font-semibold">{item.requested_value}</span>
                    </div>
                  )}

                  {/* Document */}
                  {item.has_document && (
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <FileText className="w-4 h-4" />
                      <span>{item.document_name}</span>
                      <button className="underline hover:text-blue-300">View Document</button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/5">
                    <button onClick={() => setRejectModal(item)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => setApproveModal(item)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-violet-500/25">
                      <CheckCircle2 className="w-4 h-4" />
                      {item.type === 'semester_correction' ? 'Approve Change' : item.type === 'content_access' ? 'Grant Access' : 'Review & Approve'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <ApproveRequestModal
          item={approveModal}
          onApprove={(verified) => handleApprove(approveModal, verified)}
          onClose={() => setApproveModal(null)}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <RejectRequestModal
          item={rejectModal}
          onReject={(reason) => handleReject(rejectModal, reason)}
          onClose={() => setRejectModal(null)}
        />
      )}
    </div>
  )
}

function ApproveRequestModal({ item, onApprove, onClose }) {
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const typeConf = TYPE_CONFIG[item.type]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-violet-500/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Approve Request</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-white/40 mb-1">Student</p>
              <p className="font-semibold text-white">{item.student_name}</p>
              <p className="text-xs text-white/40">{item.enrollment}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-white/40 mb-1">Request Type</p>
              <p className={`font-semibold text-sm ${typeConf?.color}`}>{typeConf?.label}</p>
            </div>
            {item.current_value && (
              <div className="col-span-2 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-white/40 mb-2">Change Summary</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{item.current_value}</span>
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  <span className="text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20">{item.requested_value}</span>
                </div>
              </div>
            )}
          </div>
          <label className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer">
            <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}
              className="w-4 h-4 accent-amber-500 mt-0.5" />
            <span className="text-sm text-amber-200">I have verified this student's records and confirm this change is accurate.</span>
          </label>
        </div>
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm">Cancel</button>
          <button onClick={async () => { setLoading(true); await new Promise(r => setTimeout(r, 600)); setLoading(false); onApprove(verified) }}
            disabled={!verified || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold transition disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Approve & Notify Student</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectRequestModal({ item, onReject, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Reject Request</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-white/60">Provide a reason for rejecting <strong className="text-white">{item.student_name}</strong>'s request.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="e.g. The enrollment correction cannot be processed as the records do not match our administrative database."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none resize-none transition" />
        </div>
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm">Cancel</button>
          <button onClick={async () => { setLoading(true); await new Promise(r => setTimeout(r, 500)); setLoading(false); onReject(reason) }}
            disabled={!reason.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject & Notify</>}
          </button>
        </div>
      </div>
    </div>
  )
}
