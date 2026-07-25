import { X, RotateCcw, BookOpen, FileText, Megaphone } from 'lucide-react'

const TYPE_DESTINATION = {
  subject:      'Subject Management',
  note:         'Notes section',
  announcement: 'Announcements (as Draft)',
}

const TYPE_ICON = { subject: BookOpen, note: FileText, announcement: Megaphone }

export default function RestoreModal({ item, onClose, onConfirm, loading }) {
  if (!item) return null
  const TypeIcon = TYPE_ICON[item.type] || BookOpen
  const destination = TYPE_DESTINATION[item.type] || 'its original section'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0A0F1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-green-500 to-emerald-500" />
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-green-400" />
            </div>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Restore this {item.type}?</h2>
            <p className="text-sm text-white/50 mt-1">
              This will restore the item to <strong className="text-white">{destination}</strong> and make it visible again.
            </p>
          </div>

          {/* Item preview */}
          <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <TypeIcon className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{item.name}</p>
              {item.department && <p className="text-xs text-white/50 mt-0.5">{item.department}{item.semester ? ` · ${item.semester}` : ''}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
              Cancel
            </button>
            <button onClick={() => onConfirm(item)} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-green-500/20">
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
