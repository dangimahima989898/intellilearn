import { useState } from 'react'
import { Plus, Edit2 } from 'lucide-react'

const BUILT_IN_TEMPLATES = [
  {
    id: 1,
    name: 'Attendance Warning',
    category: 'attendance',
    emoji: '⚠️',
    categoryColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    content: {
      type: 'attendance',
      title: 'Attendance Warning — [Subject]',
      message: 'Dear [Student Name], your attendance in [Subject] is [X]% which is below the required 75%. Please ensure regular attendance to avoid detention. Please contact HOD for any queries.',
      priority: 'high',
    },
    variables: ['[Student Name]', '[Subject]', '[X]%'],
  },
  {
    id: 2,
    name: 'Exam Reminder',
    category: 'exam',
    emoji: '📝',
    categoryColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    content: {
      type: 'exam',
      title: '[Exam Type] Examination — [Subject]',
      message: '[Exam Type] examination for [Subject] is scheduled on [Date] at [Time] in [Venue]. Please bring your college ID card and required stationery.',
      priority: 'high',
    },
    variables: ['[Exam Type]', '[Subject]', '[Date]', '[Time]', '[Venue]'],
  },
  {
    id: 3,
    name: 'Assignment Deadline',
    category: 'assignment',
    emoji: '🎯',
    categoryColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    content: {
      type: 'assignment',
      title: 'Assignment Deadline Reminder — [Assignment Name]',
      message: 'This is a reminder that your [Assignment Name] for [Subject] is due on [Date]. Late submissions will not be accepted. Please submit via the portal before the deadline.',
      priority: 'normal',
    },
    variables: ['[Assignment Name]', '[Subject]', '[Date]'],
  },
  {
    id: 4,
    name: 'Class Cancellation',
    category: 'urgent',
    emoji: '⚡',
    categoryColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    content: {
      type: 'urgent',
      title: '[Subject] Class Cancelled — [Date]',
      message: '[Subject] class scheduled on [Day] at [Time] stands cancelled. The class will be rescheduled and notified separately. Apologies for the inconvenience.',
      priority: 'urgent',
    },
    variables: ['[Subject]', '[Day]', '[Time]', '[Date]'],
  },
  {
    id: 5,
    name: 'Result Declaration',
    category: 'result',
    emoji: '📋',
    categoryColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    content: {
      type: 'result',
      title: '[Semester] Examination Results Declared',
      message: '[Semester] examination results have been declared. Students can check their marks on the IntelliLearn portal. Contact the exam section for any discrepancies.',
      priority: 'normal',
    },
    variables: ['[Semester]'],
  },
  {
    id: 6,
    name: 'Event Invitation',
    category: 'event',
    emoji: '🏆',
    categoryColor: 'bg-green-500/20 text-green-300 border-green-500/30',
    content: {
      type: 'event',
      title: '[Event Name] — Registration Open',
      message: 'Registrations are now open for [Event Name] on [Date] at [Venue]. [Prize/Benefit]. Register before [Last Date]. Contact [Faculty Name] for details.',
      priority: 'normal',
    },
    variables: ['[Event Name]', '[Date]', '[Venue]', '[Last Date]', '[Faculty Name]'],
  },
]

function highlightVars(text) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[.+\]$/.test(part)
      ? <mark key={i} className="bg-violet-500/20 text-violet-300 px-0.5 rounded not-italic">{part}</mark>
      : part
  )
}

export default function NotificationTemplates({ onUseTemplate }) {
  const [templates, setTemplates] = useState(BUILT_IN_TEMPLATES)
  const [preview, setPreview] = useState(null)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Announcement Templates</h2>
          <p className="text-sm text-white/50 mt-0.5">Pre-built templates for common HOD announcements. Click "Use Template" to customise and send.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm font-bold transition">
          <Plus className="w-4 h-4" /> Create Custom Template
        </button>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className={`bg-white/5 border border-white/10 hover:border-violet-500/20 rounded-2xl overflow-hidden transition ${preview?.id === t.id ? 'ring-1 ring-violet-500/40' : ''}`}>
            <div className="p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{t.emoji}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.categoryColor}`}>{t.category.charAt(0).toUpperCase() + t.category.slice(1)}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                </div>
                <button onClick={() => setPreview(preview?.id === t.id ? null : t)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition text-xs">
                  {preview?.id === t.id ? '▲ Hide' : '▼ Preview'}
                </button>
              </div>

              {/* Message Preview */}
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white/60 leading-relaxed">
                <p className="font-semibold text-white/70 mb-1">"{t.content.title}"</p>
                <p>{highlightVars(t.content.message.substring(0, 100))}…</p>
              </div>

              {/* Variables */}
              <div className="flex flex-wrap gap-1.5">
                {t.variables.map((v, i) => (
                  <span key={i} className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">{v}</span>
                ))}
              </div>

              {/* Preview expanded */}
              {preview?.id === t.id && (
                <div className="p-3 bg-[#1E293B] border border-white/10 rounded-xl text-sm text-white/80 leading-relaxed">
                  <p className="text-xs text-white/40 mb-2 font-semibold">Full Template Preview:</p>
                  <p className="font-bold text-white mb-1">{highlightVars(t.content.title)}</p>
                  <p>{highlightVars(t.content.message)}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold transition">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Template
                </button>
                <button onClick={() => onUseTemplate(t.content)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition">
                  Use Template →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
