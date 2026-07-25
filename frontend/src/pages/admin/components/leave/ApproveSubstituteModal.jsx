import { useState } from 'react'
import { X, CheckCircle2, ChevronRight, User, Clock, AlertTriangle, Loader2 } from 'lucide-react'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function calcDays(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1
}

export default function ApproveSubstituteModal({ leave, facultyList, onConfirm, onClose }) {
  const [step, setStep] = useState(1)  // 1 = confirm, 2 = substitutes
  const [submitting, setSubmitting] = useState(false)
  const [sameForAll, setSameForAll] = useState(false)
  // Map: class index → { substituteId, reschedule }
  const [assignments, setAssignments] = useState(() =>
    Object.fromEntries((leave.affected_classes || []).map((_, i) => [i, { substituteId: '', reschedule: false }]))
  )

  const days = calcDays(leave.start_date, leave.end_date)
  const affectedClasses = leave.affected_classes || []

  const availableFaculty = facultyList.filter(f => f.id !== leave.faculty_id)

  const handleSameForAll = (facultyId) => {
    const updated = {}
    affectedClasses.forEach((_, i) => {
      updated[i] = { substituteId: facultyId, reschedule: false }
    })
    setAssignments(updated)
  }

  const handleAssignment = (index, field, value) => {
    setAssignments(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }))
  }

  const handleSaveAndNotify = async () => {
    setSubmitting(true)
    // Small delay for UX
    await new Promise(r => setTimeout(r, 800))
    const subs = affectedClasses.map((cls, i) => ({
      ...cls,
      substitute_faculty_id: assignments[i]?.substituteId || null,
      reschedule: assignments[i]?.reschedule || false,
    }))
    setSubmitting(false)
    onConfirm(leave, subs)
  }

  const handleSkip = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 400))
    setSubmitting(false)
    onConfirm(leave, [])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-violet-600/10 to-indigo-600/10">
          <div>
            <h2 className="text-lg font-bold text-white">Approve Leave Request</h2>
            <p className="text-white/50 text-sm mt-0.5">{leave.faculty_name} · {formatDate(leave.start_date)} → {formatDate(leave.end_date)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 px-6 py-3 bg-white/[0.02] border-b border-white/5">
          {[{ n: 1, label: 'Confirm Approval' }, { n: 2, label: 'Arrange Substitutes' }].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-0">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${step >= n ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/40'}`}>
                  {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs font-medium ${step === n ? 'text-white' : 'text-white/40'}`}>{label}</span>
              </div>
              {idx === 0 && <ChevronRight className="w-4 h-4 text-white/20 mx-2" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl">
                <p className="text-sm font-semibold text-green-300 mb-3">Leave Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Faculty</p>
                    <p className="text-white font-semibold">{leave.faculty_name}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Department</p>
                    <p className="text-white font-semibold">{leave.department}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Leave Type</p>
                    <p className="text-white font-semibold">{leave.leave_type}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Duration</p>
                    <p className="text-white font-semibold">{days} day{days !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-xs mb-0.5">Dates</p>
                    <p className="text-white font-semibold">{formatDate(leave.start_date)} → {formatDate(leave.end_date)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-300">
                  {affectedClasses.length} class slot{affectedClasses.length !== 1 ? 's' : ''} will need coverage during this period.
                  You'll assign substitutes in the next step.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition shadow-lg shadow-violet-500/25"
              >
                Confirm Approval — Arrange Substitutes →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              
              {affectedClasses.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">No affected classes</p>
                  <p className="text-white/40 text-sm mt-1">This leave doesn't impact any scheduled classes.</p>
                </div>
              ) : (
                <>
                  {/* Same for all toggle */}
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      id="same-for-all"
                      checked={sameForAll}
                      onChange={e => setSameForAll(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                    <label htmlFor="same-for-all" className="text-sm text-white/70 cursor-pointer">
                      Assign same substitute for all {affectedClasses.length} slots
                    </label>
                    {sameForAll && (
                      <select
                        className="ml-auto text-sm bg-white/5 border border-violet-500/40 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                        onChange={e => handleSameForAll(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" className="bg-[#0F172A]">Select faculty…</option>
                        {availableFaculty.map(f => (
                          <option key={f.id} value={f.id} disabled={f.weekly_load >= f.max_load} className="bg-[#0F172A]">
                            {f.name} ({f.weekly_load}/{f.max_load} lec/wk){f.weekly_load >= f.max_load ? ' — FULL' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Per-slot assignment */}
                  <div className="flex flex-col gap-3">
                    {affectedClasses.map((cls, i) => (
                      <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Slot info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold shrink-0">
                            {cls.day.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{cls.subject}</p>
                            <p className="text-xs text-white/40">{cls.time} · {cls.course} {cls.semester}</p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {!assignments[i]?.reschedule && !sameForAll && (
                            <select
                              value={assignments[i]?.substituteId || ''}
                              onChange={e => handleAssignment(i, 'substituteId', e.target.value)}
                              className="text-sm bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-white focus:outline-none transition"
                            >
                              <option value="" className="bg-[#0F172A]">Select substitute…</option>
                              {availableFaculty.map(f => (
                                <option key={f.id} value={f.id} disabled={f.weekly_load >= f.max_load} className="bg-[#0F172A]">
                                  {f.name} ({f.weekly_load}/{f.max_load}){f.weekly_load >= f.max_load ? ' ✗' : ''}
                                </option>
                              ))}
                            </select>
                          )}
                          <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assignments[i]?.reschedule || false}
                              onChange={e => handleAssignment(i, 'reschedule', e.target.checked)}
                              className="accent-indigo-500 w-3.5 h-3.5"
                            />
                            Reschedule instead
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          {step === 2 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-white/50 text-sm hover:text-white transition"
              >
                Skip substitutes for now
              </button>
              <button
                onClick={handleSaveAndNotify}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold transition disabled:opacity-60 shadow-lg shadow-violet-500/25"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Save & Notify Everyone</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
