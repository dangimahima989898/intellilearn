import { useState } from 'react'
import { X, XCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function DismissCorrectModal({ item, onDismiss, onClose }) {
  const [note, setNote] = useState('')
  const [notifyStudent, setNotifyStudent] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 500))
    setSubmitting(false)
    onDismiss(note.trim(), notifyStudent)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-green-500/30 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-green-500/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Dismiss Flag — AI was Correct
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
            <p className="font-semibold mb-1">This means the AI answer was actually correct.</p>
            <p className="text-green-300/70 text-xs">The student's flag will be marked as invalid. The AI response stands as correct.</p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">AI Answer (Confirming as CORRECT)</p>
            <p className="text-sm text-white/80">{item.ai_answer}</p>
          </div>

          {/* Optional note */}
          <div>
            <label className="text-sm font-semibold text-white/70 block mb-1.5">
              Optional Note to Student <span className="text-white/30 font-normal text-xs">(helps student understand why)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. The AI answer is correct. Please review Unit 3 of your DSA notes for clarification on this topic."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-green-500/50 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none resize-none transition"
            />
          </div>

          {/* Notify toggle */}
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <input type="checkbox" id="dismiss-notify" checked={notifyStudent} onChange={e => setNotifyStudent(e.target.checked)}
              className="w-4 h-4 accent-green-500 cursor-pointer mt-0.5 shrink-0" />
            <label htmlFor="dismiss-notify" className="cursor-pointer">
              <p className="text-sm text-white/80">Notify <strong className="text-white">{item.student_name}</strong> about this decision</p>
              <p className="text-xs text-white/40 mt-0.5">Student will receive a message explaining the AI answer is correct. {note && 'Your note will be included.'}</p>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition shadow-lg shadow-green-500/20">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Dismissing…</>
              : <><XCircle className="w-4 h-4" /> Dismiss & {notifyStudent ? 'Notify Student' : 'Save'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
