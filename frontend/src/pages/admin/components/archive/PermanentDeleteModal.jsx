import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

export default function PermanentDeleteModal({ item, onClose, onConfirm, loading }) {
  const [inputVal, setInputVal] = useState('')
  if (!item) return null

  const itemName = item.name || item.subject_name || ''
  const matches = inputVal.trim().toLowerCase() === itemName.trim().toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0A0F1E] border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-red-700 to-red-400" />
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Permanently Delete?</h2>
                <p className="text-xs text-red-400/80 font-semibold mt-0.5">⚠️ This action CANNOT be undone</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Item info */}
          <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
            <p className="text-sm font-bold text-white">{itemName}</p>
            {item.department && <p className="text-xs text-white/50 mt-0.5">{item.department}{item.semester ? ` · ${item.semester}` : ''}</p>}
            {item.type === 'subject' && (
              <p className="text-xs text-red-400/70 mt-2 leading-relaxed">
                All linked notes, question bank entries, and AI knowledge chunks will be permanently removed. Student scores and doubts will be retained for historical records.
              </p>
            )}
            {item.type !== 'subject' && (
              <p className="text-xs text-red-400/70 mt-2">This item will be permanently removed and cannot be recovered.</p>
            )}
          </div>

          {/* Name confirmation input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/60">
              Type <span className="text-white font-black">"{itemName}"</span> to confirm:
            </label>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={itemName}
              className={`w-full px-3 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition ${matches ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-white/30'}`}
            />
            {inputVal.length > 0 && !matches && (
              <p className="text-[10px] text-red-400/70">Name doesn't match. Type it exactly as shown.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
              Cancel
            </button>
            <button onClick={() => matches && !loading && onConfirm(item)}
              disabled={!matches || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow-lg shadow-red-500/20">
              <Trash2 className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Deleting…' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
