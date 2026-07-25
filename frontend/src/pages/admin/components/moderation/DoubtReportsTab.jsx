import { useState, useMemo } from 'react'
import { MessageSquareWarning, Trash2, CheckCircle2, AlertTriangle, User, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DEPT_BADGE = {
  BCA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MCA: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'BSc CS': 'bg-green-500/20 text-green-300 border-green-500/30',
  'MSc IT': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DoubtReportsTab({ items, loading, deptFilter, searchQuery, onAction }) {
  const [removeModal, setRemoveModal] = useState(null)
  const [warnModal, setWarnModal] = useState(null)

  const filtered = useMemo(() => items.filter(r => {
    if (r.status !== 'pending') return false
    if (deptFilter !== 'All' && r.department !== deptFilter) return false
    if (searchQuery && !r.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [items, deptFilter, searchQuery])

  const handleRemove = async (item) => {
    setRemoveModal(null)
    onAction(item.id, 'remove')
    toast.success('Answer removed from Doubt Board. Student notified.')
  }

  const handleKeep = (item) => {
    onAction(item.id, 'keep')
    toast.success('Report dismissed. Answer kept on Doubt Board.')
  }

  const handleWarn = async (item, msg) => {
    setWarnModal(null)
    onAction(item.id, 'warn')
    toast.success(`Warning sent to ${item.answerer_name}.`)
  }

  if (loading) return <div className="flex flex-col gap-4">{[1, 2].map(i => <div key={i} className="h-40 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />)}</div>

  if (filtered.length === 0) return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Reported Answers</h3>
      <p className="text-white/50 text-sm max-w-sm">No student answers have been reported on the Doubt Board. The community is clean!</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {filtered.map(item => {
        const deptBadge = DEPT_BADGE[item.department] || 'bg-gray-500/20 text-gray-300'
        return (
          <div key={item.id} className="bg-white/5 border border-orange-500/20 rounded-2xl overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
            <div className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                  <MessageSquareWarning className="w-3 h-3" /> Reported Answer
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${deptBadge}`}>{item.department}</span>
                <span className="text-xs text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{item.subject} · {item.semester}</span>
              </div>

              {/* Reporter Info */}
              <div className="flex flex-wrap gap-4 text-xs text-white/50">
                <span>Reported by: <strong className="text-white">{item.reporter_name}</strong> ({item.reporter_enrollment})</span>
                <span>{formatDateTime(item.reported_at)}</span>
              </div>

              {/* Report Reason */}
              <div className="p-3 bg-orange-500/[0.06] border border-orange-500/20 rounded-xl">
                <p className="text-[11px] font-bold text-orange-400/70 uppercase tracking-wider mb-1">Report Reason</p>
                <p className="text-sm text-white/80 italic">"{item.report_reason}"</p>
              </div>

              {/* Content Sections */}
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Original Question</p>
                  <p className="text-sm text-white/80">{item.question}</p>
                </div>
                <div className="p-3 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
                  <p className="text-[11px] font-bold text-red-400/70 uppercase tracking-wider mb-1.5">
                    Reported Answer <span className="text-white/30 font-normal">— posted by {item.answerer_name} ({item.answerer_enrollment})</span>
                  </p>
                  <p className="text-sm text-white/80">{item.reported_answer}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button onClick={() => handleKeep(item)}
                  className="px-4 py-2 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-bold transition">
                  Keep Answer
                </button>
                <button onClick={() => setWarnModal(item)}
                  className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-bold transition">
                  Warn Student
                </button>
                <button onClick={() => setRemoveModal(item)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition">
                  <Trash2 className="w-4 h-4" /> Remove Answer
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Remove Confirm Modal */}
      {removeModal && (
        <SimpleConfirmModal
          title="Remove Answer from Doubt Board?"
          message={`This will permanently remove the answer posted by ${removeModal.answerer_name}. They will be notified.`}
          confirmLabel="Remove Answer"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => handleRemove(removeModal)}
          onClose={() => setRemoveModal(null)}
        />
      )}

      {/* Warn Student Modal */}
      {warnModal && (
        <WarnStudentModal
          item={warnModal}
          onSend={(msg) => handleWarn(warnModal, msg)}
          onClose={() => setWarnModal(null)}
        />
      )}
    </div>
  )
}

function SimpleConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium">Cancel</button>
          <button onClick={async () => { setLoading(true); await new Promise(r => setTimeout(r, 400)); setLoading(false); onConfirm() }}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition ${confirmClass}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function WarnStudentModal({ item, onSend, onClose }) {
  const defaultMsg = `Your answer on "${item.subject}" topic "${item.question}" has been reviewed by HOD and found to contain incorrect information. Please ensure answers are accurate before posting on the Doubt Board.`
  const [msg, setMsg] = useState(defaultMsg)
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-amber-500/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Warn {item.answerer_name}</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-white/50">This warning message will be sent to <strong className="text-white">{item.answerer_name}</strong>. You can edit it below.</p>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
            className="w-full px-4 py-3 bg-white/5 border border-amber-500/30 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none resize-none transition" />
        </div>
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium">Cancel</button>
          <button onClick={async () => { setLoading(true); await new Promise(r => setTimeout(r, 500)); setLoading(false); onSend(msg) }}
            disabled={loading || !msg.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Warning'}
          </button>
        </div>
      </div>
    </div>
  )
}
