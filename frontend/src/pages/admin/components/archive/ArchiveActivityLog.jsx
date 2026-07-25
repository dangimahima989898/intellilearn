import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ArchiveActivityLog({ logs = [] }) {
  const [open, setOpen] = useState(false)

  const displayLogs = (logs || []).map(l => {
    const isDelete = l.action_type === 'DELETE_SUBJECT'
    const isRestore = l.action_type === 'UNARCHIVE'
    return {
      date: l.timestamp ? l.timestamp.split('T')[0] : 'N/A',
      icon: isRestore ? '📤' : (isDelete ? '🗑️' : '📥'),
      text: l.details,
      color: isDelete ? 'text-red-400' : 'text-white/70',
      admin_name: l.admin_name || 'System',
      action_type: l.action_type || 'ARCHIVE'
    }
  })

  const handleExport = (e) => {
    e.stopPropagation()
    if (displayLogs.length === 0) {
      toast.error('No activity log data to export.')
      return
    }
    const headers = ['Date', 'Action', 'Admin', 'Details']
    const rows = (logs || []).map(l => [
      l.timestamp ? l.timestamp.split('T')[0] : 'N/A',
      l.action_type || 'N/A',
      l.admin_name || 'System',
      `"${(l.details || '').replace(/"/g, '""')}"`
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archive_activity_log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Activity log exported as CSV.')
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Archive Activity Log</span>
          <span className="text-xs text-white/40">Last {displayLogs.length} actions</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition">
            <Download className="w-3 h-3" /> Export
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10">
          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
            {displayLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-white/40 text-xs">
                No activity log found.
              </div>
            ) : (
              displayLogs.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition">
                  <span className="text-xs text-white/30 font-medium w-16 shrink-0 mt-0.5">{entry.date}</span>
                  <span className="text-base mt-0.5">{entry.icon}</span>
                  <p className={`text-xs leading-relaxed ${entry.color}`}>{entry.text}</p>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-white/20 italic">Archive actions are logged for accountability. Shown: last {displayLogs.length} actions.</p>
          </div>
        </div>
      )}
    </div>
  )
}
