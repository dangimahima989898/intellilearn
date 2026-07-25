import { useState, useMemo } from 'react'
import { X, AlertTriangle, Send, CheckCircle2, Loader2 } from 'lucide-react'

function groupBySubject(students) {
  return students.reduce((acc, s) => {
    const key = `${s.subject} — ${s.department} ${s.semester}`
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
}

const WARN_TEMPLATE = (name, subject, pct) =>
  `Dear ${name}, your attendance in ${subject} is ${pct}% which is below the required 75%. Please ensure regular attendance to avoid detention. Contact the HOD office for any queries.`

export default function AttendanceWarningQuickAction({ atRiskStudents, onSend, onClose }) {
  const [selected, setSelected] = useState(new Set(atRiskStudents.map(s => s.id)))
  const [sending, setSending] = useState(false)
  const groups = useMemo(() => groupBySubject(atRiskStudents), [atRiskStudents])

  const toggleStudent = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleGroup = (students) => {
    const allSelected = students.every(s => selected.has(s.id))
    setSelected(prev => {
      const next = new Set(prev)
      students.forEach(s => allSelected ? next.delete(s.id) : next.add(s.id))
      return next
    })
  }

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    onSend([...selected])
  }

  const selectedArr = atRiskStudents.filter(s => selected.has(s.id))

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0A0F1E] border-l border-amber-500/20 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-amber-500/5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Attendance Warnings
            </h2>
            <p className="text-xs text-amber-400/70 mt-0.5">{atRiskStudents.length} students below 75% attendance</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
            <p className="font-semibold mb-1">Personalised warnings will be sent</p>
            <p className="text-amber-400/70 text-xs">Each selected student will receive a personalised message with their name, subject, and attendance percentage pre-filled.</p>
          </div>

          {/* Groups */}
          {Object.entries(groups).map(([groupKey, students]) => {
            const allSelected = students.every(s => selected.has(s.id))
            const someSelected = students.some(s => selected.has(s.id))
            return (
              <div key={groupKey} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => el && (el.indeterminate = someSelected && !allSelected)}
                      onChange={() => toggleGroup(students)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span className="font-bold text-white text-sm">{groupKey}</span>
                  </label>
                  <span className="text-xs text-white/40">{students.length} student{students.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Students */}
                <div className="divide-y divide-white/5">
                  {students.map(s => (
                    <label key={s.id} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 accent-amber-500" />
                        <div>
                          <p className="text-sm font-semibold text-white">{s.name}</p>
                          <p className="text-xs text-white/40">{s.enrollment}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg ${s.attendance < 65 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {s.attendance}%
                      </span>
                    </label>
                  ))}
                </div>

                {/* Preview */}
                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">Message Preview</p>
                  <p className="text-xs text-white/50 leading-relaxed italic">
                    "{WARN_TEMPLATE(students[0].name, students[0].subject, students[0].attendance)}"
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-amber-500/20 bg-white/[0.02] shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-white/50">
            <strong className="text-white">{selectedArr.length}</strong> student{selectedArr.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-medium transition">
              Cancel
            </button>
            <button onClick={handleSend} disabled={selectedArr.length === 0 || sending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-amber-500/20">
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send to Selected ({selectedArr.length})</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
