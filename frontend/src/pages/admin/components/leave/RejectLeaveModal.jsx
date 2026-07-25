import { useState } from 'react'
import { X, XCircle, Loader2 } from 'lucide-react'

const REJECTION_REASONS = [
  { id: 'notice', label: 'Insufficient notice period' },
  { id: 'exam', label: 'Examination/Assessment period — faculty required' },
  { id: 'no_sub', label: 'No substitute available' },
  { id: 'dept', label: 'Department requirement' },
  { id: 'other', label: 'Other (custom reason)' },
]

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RejectLeaveModal({ leave, onConfirm, onClose }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const finalReason = selectedReason === 'other' ? customReason.trim() : REJECTION_REASONS.find(r => r.id === selectedReason)?.label || ''
  const isValid = finalReason.length > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    setSubmitting(false)
    onConfirm(leave, finalReason)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-red-500/5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Reject Leave Request
            </h2>
            <p className="text-white/50 text-sm mt-0.5">
              {leave.faculty_name} · {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          <p className="text-sm text-white/70">
            Please provide a reason for rejection. This will be shared with <strong className="text-white">{leave.faculty_name}</strong>.
          </p>

          {/* Reason Selector */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Select Reason</p>
            {REJECTION_REASONS.map(r => (
              <label
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  selectedReason === r.id
                    ? 'border-red-500/40 bg-red-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedReason === r.id ? 'border-red-400' : 'border-white/30'}`}>
                  {selectedReason === r.id && <span className="w-2 h-2 rounded-full bg-red-400" />}
                </span>
                <input
                  type="radio"
                  name="rejection_reason"
                  value={r.id}
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                  className="hidden"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>

          {/* Custom reason input */}
          {selectedReason === 'other' && (
            <div>
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Enter your reason here…"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none resize-none transition"
              />
              <p className="text-xs text-white/30 mt-1">{customReason.length}/200 characters</p>
            </div>
          )}

          {/* Preview notification */}
          {isValid && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Notification Preview</p>
              <p className="text-sm text-white/70 leading-relaxed">
                "Your leave request for <strong className="text-white">{formatDate(leave.start_date)} → {formatDate(leave.end_date)}</strong> has been rejected.
                Reason: <em className="text-red-300">{finalReason}</em>. Contact HOD if you need to discuss further."
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-600/40 text-white text-sm font-bold transition shadow-lg shadow-red-500/20"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</>
            ) : (
              <><XCircle className="w-4 h-4" /> Reject & Notify Faculty</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
