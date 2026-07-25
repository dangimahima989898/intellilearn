import { useState, useMemo } from 'react'
import { Download, Search, ArrowUpDown, CheckCircle2, XCircle, Trash2, FileText } from 'lucide-react'

const DECISION_STYLE = {
  'Confirmed Incorrect': 'bg-red-500/10 text-red-300 border-red-500/20',
  'Verified Correct': 'bg-green-500/10 text-green-300 border-green-500/20',
  'Answer Removed': 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  'Student Warned': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  'Report Dismissed': 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  'Approved': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'Rejected': 'bg-red-500/10 text-red-300 border-red-500/20',
}

const TYPE_ICON = {
  'AI Flag': '🚩',
  'Doubt Report': '⚠️',
  'Platform Request': '📋',
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ModerationHistoryTab({ items, loading, searchQuery, onExport }) {
  const [sortAsc, setSortAsc] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All')

  const types = ['All', 'AI Flag', 'Doubt Report', 'Platform Request']

  const filtered = useMemo(() => {
    return items
      .filter(h => {
        if (typeFilter !== 'All' && h.type !== typeFilter) return false
        if (searchQuery && !h.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const diff = new Date(a.date) - new Date(b.date)
        return sortAsc ? diff : -diff
      })
  }, [items, typeFilter, searchQuery, sortAsc])

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white/5 border border-white/10 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${typeFilter === t ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
          <Download className="w-4 h-4" /> Export History
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 font-semibold">No moderation history found</p>
          <p className="text-white/30 text-sm mt-1">Moderation actions will appear here after you review content.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => setSortAsc(a => !a)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/50">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/50">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/50">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/50">Decision</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white/50">Notified</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => (
                  <tr key={h.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{formatDate(h.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{TYPE_ICON[h.type] || '📌'}</span>{' '}
                      <span className="text-xs text-white/70">{h.type}</span>
                    </td>
                    <td className="px-4 py-3 text-white/80 text-xs max-w-[200px] truncate" title={h.description}>{h.description}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{h.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${DECISION_STYLE[h.decision] || 'bg-white/5 text-white/50 border-white/10'}`}>
                        {h.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {h.student_notified
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <XCircle className="w-4 h-4 text-white/20 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-white/5 text-xs text-white/30">
            Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
