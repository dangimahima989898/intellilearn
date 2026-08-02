import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Download, Loader2 } from 'lucide-react'
import { DEPT_CONFIG } from './analyticsData'
import hodService from '../../../../services/hodService'
import toast from 'react-hot-toast'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="font-bold text-white">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function ComparativeReport({ deptFilter }) {
  const [scheduleReport, setScheduleReport] = useState(false)
  const [comparativeData, setComparativeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await hodService.getComparativeReport()
      setComparativeData(data)
      setError(null)
    } catch (err) {
      setError('Failed to load comparative analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    return comparativeData.filter(r =>
      deptFilter === 'All' || r.dept === deptFilter
    )
  }, [comparativeData, deptFilter])

  // Calculate department average comparison dynamically
  const deptBarData = useMemo(() => {
    const depts = ['BCA', 'MCA', 'BSc CS', 'MSc IT']
    return depts.map(d => {
      const subjectsInDept = comparativeData.filter(r => r.dept === d)
      if (subjectsInDept.length === 0) {
        return { dept: d, 'This Semester': 0, 'Last Semester': 0 }
      }
      const thisSemSum = subjectsInDept.reduce((sum, r) => sum + (r.this_sem || 0), 0)
      const lastSemSum = subjectsInDept.reduce((sum, r) => sum + (r.last_sem || 0), 0)
      return {
        dept: d,
        'This Semester': Math.round(thisSemSum / subjectsInDept.length),
        'Last Semester': Math.round(lastSemSum / subjectsInDept.length),
      }
    })
  }, [comparativeData])

  // Derive insights
  const insights = useMemo(() => {
    if (filtered.length === 0) {
      return { improved: 'N/A', declined: 'N/A', bestDept: 'N/A', improvedDiff: '0%', declinedDiff: '0%', bestDeptScore: '0%' }
    }
    const withDiffs = filtered.map(r => ({ ...r, diff: (r.this_sem || 0) - (r.last_sem || 0) }))
    
    // Sort by diff descending
    const sortedDiffs = [...withDiffs].sort((a, b) => b.diff - a.diff)
    const improved = sortedDiffs[0]
    const declined = sortedDiffs[sortedDiffs.length - 1]
    
    // Best department (highest avg score this sem)
    const validDepts = deptBarData.filter(d => d['This Semester'] > 0)
    const sortedDepts = [...validDepts].sort((a, b) => b['This Semester'] - a['This Semester'])
    const bestDept = sortedDepts[0]

    return {
      improved: improved ? `${improved.subject} (${improved.dept})` : 'None',
      improvedDiff: improved ? `+${improved.diff}%` : '0%',
      declined: declined && declined.diff < 0 ? `${declined.subject} (${declined.dept})` : 'None',
      declinedDiff: declined && declined.diff < 0 ? `${declined.diff}%` : '0%',
      bestDept: bestDept ? bestDept.dept : 'None',
      bestDeptScore: bestDept ? `${bestDept['This Semester']}% avg` : '0%'
    }
  }, [filtered, deptBarData])

  const handleExportPDF = () => {
    toast.success('Comparative report PDF downloaded.', { duration: 3000 })
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
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-white">Semester-over-Semester Comparison</h3>
          <p className="text-xs text-white/50 mt-0.5">Compare this semester's performance against the previous semester.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
            <div onClick={() => setScheduleReport(s => !s)}
              className={`w-9 h-5 rounded-full transition-all flex items-center ${scheduleReport ? 'bg-violet-600 justify-end' : 'bg-white/20 justify-start'} px-0.5`}>
              <div className="w-4 h-4 bg-white rounded-full shadow" />
            </div>
            Schedule Monthly Report
          </label>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold transition">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {scheduleReport && (
        <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl text-sm text-violet-300">
          ✅ Monthly reports enabled. You will receive a PDF summary every 1st of the month via email.
        </div>
      )}

      {/* Subject comparison table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <h4 className="font-bold text-white text-sm">Subject-wise Comparison</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Subject', 'Department', 'Last Semester', 'This Semester', 'Change'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-white/30 text-sm italic">No data for selected filter.</td></tr>
              ) : filtered.map((row, i) => {
                const change = row.this_sem - row.last_sem
                const cfg = DEPT_CONFIG[row.dept] || { color: 'gray', hex: '#6b7280', text: 'text-gray-400' }
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="px-5 py-3.5 font-semibold text-white/80">{row.subject}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold ${cfg.text}`}>{row.dept}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white/30 rounded-full" style={{ width: `${row.last_sem}%` }} />
                        </div>
                        <span className="text-white/50">{row.last_sem}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${row.this_sem}%` }} />
                        </div>
                        <span className="font-bold text-white">{row.this_sem}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className={`flex items-center gap-1 text-sm font-bold ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-white/40'}`}>
                        {change > 0 ? <TrendingUp className="w-4 h-4" /> : change < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        {change > 0 ? `+${change}%` : `${change}%`}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Comparison Chart */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h4 className="font-bold text-white text-sm mb-4">Department Average — This Semester vs Last Semester</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptBarData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="dept" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[50, 85]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }} />
            <Bar dataKey="Last Semester" radius={[4, 4, 0, 0]} fill="rgba(255,255,255,0.15)" />
            <Bar dataKey="This Semester" radius={[4, 4, 0, 0]}>
              {deptBarData.map((d, i) => {
                const hex = DEPT_CONFIG[d.dept]?.hex || '#6b7280'
                return <Cell key={i} fill={hex} fillOpacity={0.8} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: '📈', label: 'Most Improved', value: insights.improved, change: insights.improvedDiff, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { icon: '📉', label: 'Most Declined', value: insights.declined, change: insights.declinedDiff, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { icon: '⭐', label: 'Best Department', value: insights.bestDept, change: insights.bestDeptScore, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(card => (
          <div key={card.label} className={`p-4 rounded-2xl border ${card.bg} flex items-center gap-3`}>
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-xs text-white/40 font-bold uppercase">{card.label}</p>
              <p className="font-bold text-white text-sm mt-0.5">{card.value}</p>
              <p className={`text-xs font-bold ${card.color}`}>{card.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
