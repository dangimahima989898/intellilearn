import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, X, Send, Eye, Search, Loader2 } from 'lucide-react'
import { DEPT_CONFIG, DEPARTMENTS, getHeatColor, calcAvg } from './analyticsData'
import hodService from '../../../../services/hodService'
import toast from 'react-hot-toast'

const UNITS = ['u1', 'u2', 'u3', 'u4', 'u5']
const UNIT_LABELS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'AVG']

// ── Heatmap Cell ──────────────────────────────────────────────────────────────
function HeatCell({ value, subject, unit, dept, onClickCell }) {
  const { bg, text, border } = getHeatColor(value)
  return (
    <td className="px-2 py-2 text-center">
      <div
        onClick={() => value != null && onClickCell({ subject, unit, dept, value })}
        className={`mx-auto w-14 py-1.5 rounded-lg border text-xs font-bold cursor-pointer hover:scale-105 transition-transform select-none`}
        style={{ backgroundColor: bg, color: text, borderColor: border }}
        title={value != null ? `${subject} — ${unit}: ${value}%` : ''}
      >
        {value != null ? `${value}%` : '—'}
      </div>
    </td>
  )
}

// ── Drill-Down Modal ──────────────────────────────────────────────────────────
function DrillDownModal({ cell, onClose }) {
  if (!cell) return null
  const { bg, text } = getHeatColor(cell.value)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0A0F1E] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Unit Drill-Down</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition"><X className="w-4 h-4" /></button>
        </div>
        {/* Info */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Department', value: cell.dept },
            { label: 'Subject', value: cell.subject },
            { label: 'Unit', value: cell.unit },
          ].map(i => (
            <div key={i.label} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-white/40 uppercase">{i.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{i.value}</p>
            </div>
          ))}
        </div>
        {/* Score */}
        <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: bg + '40', borderColor: getHeatColor(cell.value).border }}>
          <div className="text-5xl font-black" style={{ color: text }}>{cell.value}%</div>
          <div>
            <p className="text-sm font-bold text-white">Average Accuracy</p>
            <p className={`text-xs mt-1 ${cell.value >= 75 ? 'text-green-400' : cell.value >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {cell.value >= 75 ? '✅ Good — above target' : cell.value >= 50 ? '⚠️ Average — needs attention' : '🔴 Needs Attention — critical'}
            </p>
          </div>
        </div>
        {/* Recommend */}
        <p className="text-xs text-white/50 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
          💡 <strong className="text-violet-300">Recommendation:</strong> Schedule an extra revision session for {cell.unit} of {cell.subject}. Consider assigning additional practice questions from the question bank.
        </p>
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button onClick={() => { toast.success('Reminders sent to weak students.'); onClose() }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition">
            <Send className="w-3.5 h-3.5" /> Send Reminders to Students
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Missed Questions Table ─────────────────────────────────────────────────────
function MissedQuestionsTable({ deptFilter, missedQuestions }) {
  const [qDept, setQDept] = useState('All')
  const [qDiff, setQDiff] = useState('All')
  const [qSearch, setQSearch] = useState('')
  const [page, setPage] = useState(0)
  const [reviewQ, setReviewQ] = useState(null)
  const PER_PAGE = 5

  const filtered = (missedQuestions || []).filter(q => {
    if (qDept !== 'All' && q.department !== qDept) return false
    if (deptFilter !== 'All' && q.department !== deptFilter) return false
    if (qDiff !== 'All' && q.difficulty !== qDiff) return false
    if (qSearch && !q.question.toLowerCase().includes(qSearch.toLowerCase())) return false
    return true
  })

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const DIFF_COLOR = { Easy: 'bg-green-500/10 text-green-400 border-green-500/20', Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Hard: 'bg-red-500/10 text-red-400 border-red-500/20' }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search questions…"
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition" />
        </div>
        {[
          { value: qDept, set: setQDept, opts: ['All', ...DEPARTMENTS], label: 'Dept' },
          { value: qDiff, set: setQDiff, opts: ['All', 'Easy', 'Medium', 'Hard'], label: 'Difficulty' },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition">
            {f.opts.map(o => <option key={o} value={o} className="bg-[#0F172A]">{o === 'All' ? `All ${f.label}s` : o}</option>)}
          </select>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Question', 'Subject', 'Dept', 'Unit', 'Difficulty', 'Wrong Attempts', 'Attempts', 'Error Rate', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-white/30 text-sm italic">No questions match your filters.</td></tr>
              ) : paged.map(q => {
                const isSuspect = q.error_rate > 60 && q.difficulty === 'Easy'
                return (
                  <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 max-w-[220px]">
                      <div>
                        <p className="text-xs text-white/80 line-clamp-2">{q.question}</p>
                        {isSuspect && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                            ⚠️ Review Question
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70 font-medium">{q.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${DEPT_CONFIG[q.department]?.text}`}>{q.department}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{q.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-white font-bold">{q.wrong_attempts}</td>
                    <td className="px-4 py-3 text-center text-white/50">{q.attempts}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-black ${q.error_rate >= 60 ? 'text-red-400' : q.error_rate >= 40 ? 'text-amber-400' : 'text-yellow-400'}`}>
                        {q.error_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setReviewQ(q)}
                        className="text-xs text-violet-400 hover:text-violet-300 font-bold transition">Review</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-white/40">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition">Prev</button>
              <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReviewQ(null)} />
          <div className="relative w-full max-w-md bg-[#0A0F1E] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Review Question</h3>
              <button onClick={() => setReviewQ(null)} className="p-2 text-white/40 hover:text-white rounded-xl transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-sm text-white leading-relaxed">{reviewQ.question}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              {[
                { label: 'Subject', value: reviewQ.subject },
                { label: 'Error Rate', value: `${reviewQ.error_rate}%` },
                { label: 'Difficulty', value: reviewQ.difficulty },
              ].map(i => (
                <div key={i.label} className="bg-white/5 rounded-xl p-2">
                  <p className="text-white/40">{i.label}</p>
                  <p className="font-bold text-white mt-1">{i.value}</p>
                </div>
              ))}
            </div>
            {reviewQ.error_rate > 60 && reviewQ.difficulty === 'Easy' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                ⚠️ High failure rate on an Easy question may indicate the question itself needs review or the answer options are ambiguous.
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setReviewQ(null)} className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 text-xs font-bold transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PerformanceHeatmap({ deptFilter }) {
  const [collapsed, setCollapsed] = useState({})
  const [drillCell, setDrillCell] = useState(null)
  const [heatmapData, setHeatmapData] = useState({})
  const [missedQuestions, setMissedQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const deptsToShow = deptFilter !== 'All' ? [deptFilter] : DEPARTMENTS

  const loadData = async () => {
    try {
      setLoading(true)
      const [heatmap, missed] = await Promise.all([
        hodService.getPerformanceHeatmap(),
        hodService.getMissedQuestions()
      ])
      setHeatmapData(heatmap)
      setMissedQuestions(missed)
      setError(null)
    } catch (err) {
      setError('Failed to load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-white/5 border border-white/10 rounded-2xl p-6 gap-3">
        <p className="text-red-400 text-sm font-semibold">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Heatmap */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-white">Syllabus Unit-wise Accuracy Heatmap</h3>
            <p className="text-xs text-white/50 mt-0.5">Click any cell to see detailed drill-down. Grouped by department.</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-white/40">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: getHeatColor(30).bg, border: `1px solid ${getHeatColor(30).border}` }} /><span>Needs Attention (&lt;50%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: getHeatColor(62).bg, border: `1px solid ${getHeatColor(62).border}` }} /><span>Average (50-74%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: getHeatColor(80).bg, border: `1px solid ${getHeatColor(80).border}` }} /><span>Good (75%+)</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {deptsToShow.map(dept => {
            const cfg = DEPT_CONFIG[dept] || { color: 'gray', hex: '#6b7280', bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', header: 'bg-gray-500/15 border-gray-500/25' }
            const rows = heatmapData[dept] || []
            const isOpen = !collapsed[dept]
            return (
              <div key={dept} className={`bg-white/5 border ${cfg.border} rounded-2xl overflow-hidden`}>
                {/* Dept Header */}
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [dept]: !c[dept] }))}
                  className={`w-full flex items-center justify-between px-5 py-3 border-b ${cfg.header} text-left transition`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full`} style={{ background: cfg.hex }} />
                    <span className={`font-bold text-sm ${cfg.text}`}>{dept} Department</span>
                    <span className="text-xs text-white/40">({rows.length} subjects)</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-5 py-2.5 text-left text-xs font-bold text-white/40 w-44">Subject</th>
                          {UNIT_LABELS.map(u => (
                            <th key={u} className={`px-2 py-2.5 text-xs font-bold text-center ${u === 'AVG' ? 'text-violet-400' : 'text-white/40'}`}>{u}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => {
                          const avg = calcAvg(row)
                          return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                              <td className="px-5 py-2 text-xs font-semibold text-white/80 max-w-[160px] truncate">{row.subject}</td>
                              {UNITS.map(u => (
                                <HeatCell key={u} value={row[u]} subject={row.subject} unit={`Unit ${u.slice(1)}`} dept={dept} onClickCell={setDrillCell} />
                              ))}
                              {/* AVG column */}
                              <td className="px-2 py-2 text-center">
                                <div className="mx-auto w-14 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-xs font-black text-violet-300">
                                  {avg != null ? `${avg}%` : '—'}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Most Commonly Missed Questions */}
      <div>
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          🔥 Most Commonly Missed Questions
        </h3>
        <MissedQuestionsTable deptFilter={deptFilter} missedQuestions={missedQuestions} />
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal cell={drillCell} onClose={() => setDrillCell(null)} />
    </div>
  )
}
