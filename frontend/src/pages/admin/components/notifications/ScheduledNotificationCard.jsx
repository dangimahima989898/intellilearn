import { useState } from 'react'
import { Clock, Edit2, Send, X, AlertTriangle } from 'lucide-react'
import { NOTIF_TYPES } from './CreateAnnouncementModal'

function formatScheduled(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 'Sending soon…'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `Sends in ${days} day${days !== 1 ? 's' : ''}`
  return `Sends in ${hours} hour${hours !== 1 ? 's' : ''}`
}

export default function ScheduledNotificationCard({ notification: n, onEdit, onSendNow, onCancel }) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const typeConfig = NOTIF_TYPES.find(t => t.value === n.type) || NOTIF_TYPES[0]

  return (
    <div className="bg-white/5 border border-blue-500/20 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-blue-500 to-violet-500" />
      <div className="p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" /> Scheduled
            </span>
            <span className="text-xl">{typeConfig.emoji}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${typeConfig.color}`}>{typeConfig.label}</span>
          </div>
          <span className="text-xs text-green-400 font-semibold shrink-0">{getCountdown(n.scheduled_for)}</span>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-bold text-white text-base">{n.title}</h3>
          <p className="text-sm text-white/50 line-clamp-2 mt-1">{n.message}</p>
        </div>

        {/* Schedule info */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full font-semibold">
            <Clock className="w-3 h-3" /> Sends on: {formatScheduled(n.scheduled_for)}
          </span>
          <span className="text-white/40">🎯 {n.target_label} · {n.target_count} recipients</span>
        </div>

        {/* Actions */}
        {!confirmCancel ? (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button onClick={() => setConfirmCancel(true)}
              className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition">
              Cancel Schedule
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={onSendNow}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition">
              <Send className="w-3.5 h-3.5" /> Send Now
            </button>
          </div>
        ) : (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/80">Cancel this scheduled announcement? It will be moved to Drafts.</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmCancel(false)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/60 text-xs font-bold transition">
                Keep Scheduled
              </button>
              <button onClick={onCancel}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition">
                Yes, Cancel & Move to Drafts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
