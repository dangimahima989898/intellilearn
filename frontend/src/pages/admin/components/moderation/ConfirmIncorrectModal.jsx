import { useState } from 'react'
import { X, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'

export default function ConfirmIncorrectModal({ item, onConfirm, onClose }) {
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [notifyStudent, setNotifyStudent] = useState(true)
  const [addToFeedback, setAddToFeedback] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!correctAnswer.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    setSubmitting(false)
    onConfirm(correctAnswer.trim(), notifyStudent)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-red-500/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Confirm — AI Answer Incorrect
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Summary */}
          <div className="flex flex-col gap-2">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">Question</p>
              <p className="text-sm text-white/80">{item.question}</p>
            </div>
            <div className="p-3 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
              <p className="text-[11px] font-bold text-red-400/70 uppercase tracking-wider mb-1">AI Answer (Marking as INCORRECT)</p>
              <p className="text-sm text-white/70 line-through">{item.ai_answer}</p>
            </div>
          </div>

          {/* Correct Answer Input */}
          <div>
            <label className="text-sm font-semibold text-white/70 block mb-1.5">
              Correct Answer <span className="text-red-400">*</span>
            </label>
            <textarea
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              rows={3}
              placeholder="Type the correct answer here (will be saved for AI improvement)…"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none resize-none transition"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-3">
            <CheckboxRow
              id="notify"
              checked={notifyStudent}
              onChange={setNotifyStudent}
              label={<>Notify <strong className="text-white">{item.student_name}</strong> that their flag was correct</>}
              description="Student gets: 'Your flag was reviewed by HOD. The AI answer was confirmed incorrect.'"
            />
            <CheckboxRow
              id="feedback"
              checked={addToFeedback}
              onChange={setAddToFeedback}
              label="Add this correction to AI improvement feedback"
              description="Helps improve AI answer quality for future students."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!correctAnswer.trim() || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-red-500/20">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="w-4 h-4" /> Confirm & {notifyStudent ? 'Notify Student' : 'Save'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckboxRow({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-violet-500 cursor-pointer mt-0.5 shrink-0" />
      <label htmlFor={id} className="cursor-pointer">
        <p className="text-sm text-white/80">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </label>
    </div>
  )
}
