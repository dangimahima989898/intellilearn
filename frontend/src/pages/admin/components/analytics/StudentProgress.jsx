import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Search, Download, TrendingUp, TrendingDown, Minus, User, ChevronRight, X, Loader2 } from 'lucide-react'
import { DEPT_CONFIG, DEPARTMENTS } from './analyticsData'
import hodService from '../../../../services/hodService'

const STATUS_CONFIG = {
  good:    { label: '🟢 Good',    badge: 'bg-green-500/10 border-green-500/20 text-green-400' },
  average: { label: '🟡 Average', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  at_risk: { label: '🔴 At Risk', badge: 'bg-red-500/10 border-red-500/20 text-red-400' },
}

const DIST_COLORS = ['#ef4444','#ef4444','#ef4444','#ef4444','#ef4444','#f59e0b','#f59e0b','#22c55e','#22c55e','#22c55e']

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function StudentDetailDrawer({ student, onClose }) {
  if (!student) return null
  const cfg = DEPT_CONFIG[student.dept] || { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' }
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#0A0F1E] border-l border-white/10 z-50 flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0A0F1E] z-10">
          <h2 className="font-bold text-white">Student Details</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xl font-bold text-violet-400">
              {student.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-white">{student.name}</p>
              <p className="text-xs text-white/50">{student.enrollment}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} mt-1 inline-block`}>
                {student.dept} · {student.sem}
              </span>
            </div>
          </div>
          {[
            { label: 'Average Score', value: `${student.avg_score}%`, color: student.avg_score >= 75 ? 'text-green-400' : student.avg_score >= 50 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Score Change', value: student.change > 0 ? `+${student.change}%` : `${student.change}%`, color: student.change >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Quizzes Taken', value: student.quizzes, color: 'text-white' },
            { label: 'Status', value: STATUS_CONFIG[student.status]?.label, color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-sm text-white/60">{s.label}</span>
              <span className={`font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function StudentProgress({ deptFilter }) {
  const [view, setView] = useState('leaderboard')
  const [search, setSearch] = useState('')
  const [deptF, setDeptF] = useState('All')
  const [semF, setSemF] = useState('All')
  const [sortBy, setSortBy] = useState('avg_score')
  const [detail, setDetail] = useState(null)
  
  const [studentList, setStudentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await hodService.getStudentProgress()
      setStudentList(data)
      setError(null)
    } catch (err) {
      setError('Failed to load student progress')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const allSems = useMemo(() => {
    return [...new Set(studentList.map(s => s.sem))]
  }, [studentList])

  const filtered = useMemo(() => {
    return studentList
      .filter(s => {
        if (deptFilter !== 'All' && s.dept !== deptFilter) return false
        if (deptF !== 'All' && s.dept !== deptF) return false
        if (semF !== 'All' && s.sem !== semF) return false
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.enrollment.includes(search)) return false
        return true
      })
      .sort((a, b) => b[sortBy] - a[sortBy])
  }, [studentList, deptFilter, deptF, semF, search, sortBy])

  // Distribution Calculation
  const scoreDistribution = useMemo(() => {
    const bins = [
      { range: '0-10%', min: 0, max: 10, count: 0 },
      { range: '10-20%', min: 10, max: 20, count: 0 },
      { range: '20-30%', min: 20, max: 30, count: 0 },
      { range: '30-40%', min: 30, max: 40, count: 0 },
      { range: '40-50%', min: 40, max: 50, count: 0 },
      { range: '50-60%', min: 50, max: 60, count: 0 },
      { range: '60-70%', min: 60, max: 70, count: 0 },
      { range: '70-80%', min: 70, max: 80, count: 0 },
      { range: '80-90%', min: 80, max: 90, count: 0 },
      { range: '90-100%', min: 90, max: 101, count: 0 },
    ]
    studentList.forEach(s => {
      const score = s.avg_score || 0
      const bin = bins.find(b => score >= b.min && score < b.max)
      if (bin) bin.count++
    })
    return bins.map(b => ({ range: b.range, count: b.count }))
  }, [studentList])

  const totalStudents = studentList.length
  const above70 = studentList.filter(s => s.avg_score >= 70).length
  const below50 = studentList.filter(s => s.avg_score < 50).length

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1E293B] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
        <p className="font-bold text-white">{label}</p>
        <p className="text-white/60 mt-1">{payload[0].value} students</p>
      </div>
    )
  }

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
    <div className="flex flex-col gap-5">
      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 w-fit">
        {[
          { id: 'leaderboard', label: '📋 Leaderboard' },
          { id: 'distribution', label: '📊 Score Distribution' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${view === v.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/50 hover:text-white'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Leaderboard View ── */}
      {view === 'leaderboard' && (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or enrollment…"
                className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition" />
            </div>
            {[
              { value: deptF, set: setDeptF, opts: ['All', ...DEPARTMENTS], label: 'Department' },
              { value: semF, set: setSemF, opts: ['All', ...allSems], label: 'Semester' },
              { value: sortBy, set: setSortBy, opts: [{ v: 'avg_score', l: 'Sort: Score' }, { v: 'change', l: 'Sort: Improvement' }, { v: 'quizzes', l: 'Sort: Activity' }], isObj: true, label: 'Sort' },
            ].map(f => (
              <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
                {f.isObj ? f.opts.map(o => <option key={o.v} value={o.v} className="bg-[#0F172A]">{o.l}</option>)
                  : f.opts.map(o => <option key={o} value={o} className="bg-[#0F172A]">{o === 'All' ? `All ${f.label}s` : o}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    {['Rank', 'Student', 'Dept', 'Sem', 'Avg Score', 'Change', 'Quizzes', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-white/30 text-sm italic">No students match your filters.</td></tr>
                  ) : filtered.map((s, i) => {
                    const globalRank = i + 1
                    const cfg = DEPT_CONFIG[s.dept] || { color: 'gray', hex: '#6b7280', bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' }
                    const statusCfg = STATUS_CONFIG[s.status] || { label: 'Unknown', badge: 'bg-gray-500/10 border-gray-500/20 text-gray-400' }
                    return (
                      <tr key={s.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer ${s.status === 'at_risk' ? 'bg-red-500/[0.02]' : ''}`}
                        onClick={() => setDetail(s)}>
                        <td className="px-4 py-3">
                          <span className="text-base">{MEDAL[globalRank] || <span className="text-xs text-white/40 font-bold">#{globalRank}</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-xs">{s.name}</p>
                              <p className="text-[10px] text-white/40">{s.enrollment}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${cfg.text}`}>{s.dept}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/60">{s.sem}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${s.avg_score}%`, background: s.avg_score >= 75 ? '#22c55e' : s.avg_score >= 50 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold text-white">{s.avg_score}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold flex items-center gap-0.5 ${s.change > 0 ? 'text-green-400' : s.change < 0 ? 'text-red-400' : 'text-white/40'}`}>
                            {s.change > 0 ? <TrendingUp className="w-3 h-3" /> : s.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {s.change > 0 ? `+${s.change}%` : `${s.change}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/60">{s.quizzes}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.badge}`}>{statusCfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-white/5 text-xs text-white/30">
              Showing {filtered.length} student{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── Distribution View ── */}
      {view === 'distribution' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-white text-sm mb-4">Score Distribution — All Students</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreDistribution} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i] || '#6b7280'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interpretation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', text: totalStudents > 0 ? `${Math.round(above70 / totalStudents * 100)}% of students score above 70% — performing well overall` : 'No data' },
              { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', text: totalStudents > 0 ? `${below50} students (${Math.round(below50 / totalStudents * 100)}%) score below 50% — these students need immediate attention` : 'No data' },
              { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', text: `Peak score range is 80-90% with ${scoreDistribution[8]?.count || 0} students — department is performing above average` },
            ].map((card, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${card.bg}`}>
                <p className={`text-sm font-semibold leading-relaxed ${card.color}`}>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Detail Drawer */}
      <StudentDetailDrawer student={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
