import { useState } from 'react'
import { Trash2, Eye, Send, MoreHorizontal, CheckCircle2 } from 'lucide-react'
import { NOTIF_TYPES } from './CreateAnnouncementModal'

const PRIORITY_BAR = {
  normal: 'from-blue-500 to-indigo-500',
  high: 'from-orange-500 to-amber-500',
  urgent: 'from-red-500 to-pink-500',
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function SentNotificationCard({ notification: n, onViewDetails, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const typeConfig = NOTIF_TYPES.find(t => t.value === n.type) || NOTIF_TYPES[0]
  const deliveryPct = n.target_count > 0 ? Math.round((n.delivered / n.target_count) * 100) : 0
  const readPct = n.target_count > 0 ? Math.round((n.read / n.target_count) * 100) : 0

  return (
    <div className="bg-white/5 border border-white/10 hover:border-violet-500/20 rounded-2xl overflow-hidden transition group">
      <div className={`h-0.5 bg-gradient-to-r ${PRIORITY_BAR[n.priority] || PRIORITY_BAR.normal} ${n.priority === 'urgent' ? 'animate-pulse' : ''}`} />

      <div className="p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl">{typeConfig.emoji}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            {n.priority !== 'normal' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${n.priority === 'urgent' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'}`}>
                {n.priority === 'urgent' ? '⚡ URGENT' : '🔶 HIGH'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/40">{formatDateTime(n.sent_at)}</span>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 w-40 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
                  <button onClick={() => { setShowMenu(false); onViewDetails() }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button onClick={() => { setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition">
                    <Send className="w-4 h-4" /> Resend
                  </button>
                  <div className="border-t border-white/5" />
                  <button onClick={() => { setShowMenu(false); onDelete() }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-bold text-white text-base mb-1">{n.title}</h3>
          <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{n.message}</p>
        </div>

        {/* Target + Sent by */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
          <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            🎯 {n.target_label} · {n.target_count} recipients
          </span>
          <span>Sent by: <strong className="text-white/70">{n.sent_by}</strong></span>
        </div>

        {/* Delivery Stats */}
        <div className="flex flex-col gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Delivered</span>
            <span className="font-bold text-white">{n.delivered}/{n.target_count} <span className="text-green-400">({deliveryPct}%)</span></span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${deliveryPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-white/50">Read</span>
            <span className="font-bold text-white">{n.read}/{n.target_count} <span className="text-blue-400">({readPct}%)</span></span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${readPct}%` }} />
          </div>
          {n.failed > 0 && <p className="text-[11px] text-red-400/80">{n.failed} deliveries failed</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition">
            <Send className="w-3.5 h-3.5" /> Resend
          </button>
          <button onClick={onViewDetails}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold transition">
            <Eye className="w-3.5 h-3.5" /> View Details
          </button>
        </div>
      </div>
    </div>
  )
}
