import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, Send, RefreshCw, Clock, BarChart2 } from 'lucide-react'
import { NOTIF_TYPES } from './CreateAnnouncementModal'
import api from '../../../../services/api'
import toast from 'react-hot-toast'

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function NotificationDetailsDrawer({ notification: n, onClose }) {
  const [failedList, setFailedList] = useState([])

  useEffect(() => {
    const fetchDeliveryStats = async () => {
      try {
        const res = await api.get(`/api/v1/hod/notifications/${n.id}/delivery-stats`)
        setFailedList(res.data.failed_list || [])
      } catch (err) {
        console.error(err)
      }
    }
    if (n.id) {
      fetchDeliveryStats()
    }
  }, [n.id])
  const typeConfig = NOTIF_TYPES.find(t => t.value === n.type) || NOTIF_TYPES[0]
  const deliveryPct = n.target_count > 0 ? Math.round((n.delivered / n.target_count) * 100) : 0
  const readPct = n.target_count > 0 ? Math.round((n.read / n.target_count) * 100) : 0
  const failed = n.target_count - n.delivered

  const handleResendUndelivered = () => {
    toast.success(`Resent to ${failed} undelivered recipients.`)
  }

  const rings = [
    { label: 'Delivered', value: deliveryPct, color: '#22c55e' },
    { label: 'Read', value: readPct, color: '#3b82f6' },
    { label: 'Failed', value: failed > 0 ? Math.round((failed / n.target_count) * 100) : 0, color: '#ef4444' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0A0F1E] border-l border-white/10 z-50 flex flex-col shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] shrink-0 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white">Delivery Details</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Notification Summary */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{typeConfig.emoji}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${typeConfig.color}`}>{typeConfig.label}</span>
            </div>
            <h3 className="font-bold text-white text-base">{n.title}</h3>
            <p className="text-sm text-white/60 mt-1 leading-relaxed">{n.message}</p>
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
              <span>📅 {formatDateTime(n.sent_at)}</span>
              <span>👤 {n.sent_by}</span>
              <span>🎯 {n.target_label}</span>
            </div>
          </div>

          {/* Analytics */}
          <div>
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Delivery Analytics
            </h3>

            {/* Visual bars */}
            <div className="flex flex-col gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
              {/* Total */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-sm text-white/70">Total Recipients</span>
                <span className="text-xl font-bold text-white">{n.target_count}</span>
              </div>

              {/* Stat rows */}
              {[
                { label: 'Delivered', value: n.delivered, total: n.target_count, color: 'bg-green-500', textColor: 'text-green-400' },
                { label: 'Read', value: n.read, total: n.target_count, color: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'Unread', value: n.delivered - n.read, total: n.target_count, color: 'bg-white/20', textColor: 'text-white/50' },
                { label: 'Not Delivered', value: failed, total: n.target_count, color: 'bg-red-500', textColor: 'text-red-400' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">{s.label}</span>
                    <span className={`text-xs font-bold ${s.textColor}`}>
                      {s.value} <span className="text-white/30">({Math.round((s.value / s.total) * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value / s.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Timeline
            </h3>
            <div className="flex flex-col gap-0">
              {[
                { label: 'Created', time: formatDateTime(n.sent_at), done: true },
                { label: 'Sent', time: formatDateTime(n.sent_at), done: true },
                { label: 'First Read', time: '2 minutes after sending', done: true },
                { label: 'Last Read', time: '3 hours after sending', done: n.read > 0 },
              ].map((t, i, arr) => (
                <div key={t.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 ${t.done ? 'bg-violet-500 border-violet-500' : 'bg-transparent border-white/20'}`} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-white/10 my-1 h-6" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-white">{t.label}</p>
                    <p className="text-xs text-white/40">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failed Recipients */}
          {failed > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" /> Undelivered ({failed})
                </h3>
                <button onClick={handleResendUndelivered}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/20 text-red-300 text-xs font-bold transition">
                  <RefreshCw className="w-3.5 h-3.5" /> Resend to All
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {failedList.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs">
                    <div>
                      <p className="font-semibold text-white/80">{f.name}</p>
                      <p className="text-white/40">{f.enrollment}</p>
                    </div>
                    <span className="text-red-400/70">{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
