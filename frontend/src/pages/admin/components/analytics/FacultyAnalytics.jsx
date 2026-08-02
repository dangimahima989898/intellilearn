import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, X, BookOpen, FileText, MessageCircle, Loader2 } from 'lucide-react'
import { DEPT_CONFIG } from './analyticsData'
import hodService from '../../../../services/hodService'

function FacultyDetailDrawer({ faculty, deptAvg, onClose }) {
  if (!faculty) return null
  const cfg = DEPT_CONFIG[faculty.dept] || { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' }
  const deptAvgVal = deptAvg || 70
  const diff = faculty.avg_score - deptAvgVal
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#0A0F1E] border-l border-white/10 z-50 flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0A0F1E] z-10">
          <h2 className="font-bold text-white">Faculty Analytics</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {/* Profile */}
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xl font-bold text-violet-400">
              {faculty.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{faculty.name}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} mt-1 inline-block`}>{faculty.dept}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Avg Student Score', value: `${faculty.avg_score}%`, icon: '📊' },
              { label: 'Students', value: faculty.students, icon: '👥' },
              { label: 'Notes Uploaded', value: faculty.notes, icon: '📄' },
              { label: 'Doubt Resolution', value: `${faculty.doubt_resolution}%`, icon: '💬' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-lg">{s.icon}</p>
                <p className="text-sm font-bold text-white mt-1">{s.value}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Subjects */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs font-bold text-white/40 uppercase mb-2">Subjects Taught</p>
            <div className="flex flex-wrap gap-1.5">
              {(faculty.subjects || []).map(s => (
                <span key={s} className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>

          {/* Insight */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${diff >= 0 ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
            {diff >= 0
              ? `✅ Students in ${faculty.name.split(' ').slice(-1)}'s subjects score ${diff}% above the ${faculty.dept} department average (${deptAvgVal}%).`
              : `⚠️ Students in ${faculty.name.split(' ').slice(-1)}'s subjects score ${Math.abs(diff)}% below the ${faculty.dept} department average (${deptAvgVal}%).`
            }
          </div>
        </div>
      </div>
    </>
  )
}

export default function FacultyAnalytics({ deptFilter }) {
  const [detail, setDetail] = useState(null)
  const [sortCol, setSortCol] = useState('avg_score')
  const [sortAsc, setSortAsc] = useState(false)
  
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const deptAvgMap = useMemo(() => {
    try {
      const sums = {}
      const counts = {}
      ;(facultyList || []).forEach(f => {
        if (!f || !f.dept) return
        if (!sums[f.dept]) {
          sums[f.dept] = 0
          counts[f.dept] = 0
        }
        sums[f.dept] += (f.avg_score || 0)
        counts[f.dept] += 1
      })
      const avgs = {}
      Object.keys(sums).forEach(dept => {
        avgs[dept] = Math.round(sums[dept] / counts[dept])
      })
      return avgs
    } catch { return {} }
  }, [facultyList])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await hodService.getFacultyPerformance()
      setFacultyList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Faculty analytics load error:', err)
      setError('Failed to load faculty performance data. Please check your connection and try again.')
      setFacultyList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    return facultyList
      .filter(f => deptFilter === 'All' || f.dept === deptFilter)
      .sort((a, b) => {
        const valA = a[sortCol]
        const valB = b[sortCol]
        
        let diff = 0
        if (typeof valA === 'string') {
          diff = valA.localeCompare(valB)
        } else if (Array.isArray(valA)) {
          diff = valA.length - valB.length
        } else {
          diff = valA - valB
        }
        return sortAsc ? diff : -diff
      })
  }, [facultyList, deptFilter, sortCol, sortAsc])

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }

  const SortIndicator = ({ col }) =>
    sortCol === col ? <span className="text-violet-400 ml-1">{sortAsc ? '↑' : '↓'}</span> : null

  const COLS = [
    { key: 'name', label: 'Faculty' },
    { key: 'dept', label: 'Dept' },
    { key: 'students', label: 'Students' },
    { key: 'avg_score', label: 'Avg Score' },
    { key: 'notes', label: 'Notes' },
    { key: 'doubt_resolution', label: 'Doubt Resolution' },
  ]

  // Insight cards
  const topFaculty = useMemo(() => {
    if (filtered.length === 0) return null
    return [...filtered].sort((a, b) => b.avg_score - a.avg_score)[0]
  }, [filtered])

  const mostImprovedFaculty = useMemo(() => {
    if (filtered.length === 0) return null
    return [...filtered].sort((a, b) => b.notes - a.notes)[0]
  }, [filtered])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading faculty performance data...</p>
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
      {/* Insight Cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topFaculty && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1.5">🏆 Top Performing Faculty</p>
              <p className="text-sm text-white/80">
                <strong className="text-white">{topFaculty.name}</strong>'s students score{' '}
                <strong className="text-green-400">{topFaculty.avg_score - (deptAvgMap[topFaculty.dept] || 70)}% above</strong>{' '}
                {topFaculty.dept} department average.
              </p>
            </div>
          )}
          {mostImprovedFaculty && (
            <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-1.5">📚 Most Active Faculty</p>
              <p className="text-sm text-white/80">
                <strong className="text-white">{mostImprovedFaculty.name}</strong> has uploaded{' '}
                <strong className="text-violet-400">{mostImprovedFaculty.notes} notes</strong>{' '}
                this semester — highest in department.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 transition whitespace-nowrap">
                    {col.label}<SortIndicator col={col.key} />
                  </th>
                ))}
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-white/30 text-sm italic">No faculty data for this filter.</td></tr>
              ) : filtered.map(f => {
                const cfg = DEPT_CONFIG[f.dept] || { color: 'gray', hex: '#6b7280', bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' }
                const deptAvg = deptAvgMap[f.dept] || 70
                const diff = f.avg_score - deptAvg
                return (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer"
                    onClick={() => setDetail(f)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
                          {f.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{f.name}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                          {(f.subjects || []).map(s => <span key={s} className="text-[9px] text-white/40">{s}</span>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} className="text-white/20 text-[9px]">, </span>, el], [])}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold ${cfg.text}`}>{f.dept}</span>
                    </td>
                    <td className="px-5 py-3.5 text-white/70">{f.students}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${f.avg_score}%` }} />
                        </div>
                        <span className="text-sm font-bold text-white">{f.avg_score}%</span>
                        <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {diff >= 0 ? `+${diff}%` : `${diff}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-white/60">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-sm">{f.notes}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.doubt_resolution}%` }} />
                        </div>
                        <span className="text-sm font-bold text-white">{f.doubt_resolution}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FacultyDetailDrawer faculty={detail} deptAvg={detail ? deptAvgMap[detail.dept] : 70} onClose={() => setDetail(null)} />
    </div>
  )
}
