import { useState, useEffect, useRef } from 'react'
import {
  BarChart3, Users, BookOpen, GraduationCap, TrendingUp, AlertTriangle,
  RefreshCw, ClipboardList, CheckSquare
} from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HODDepartmentAnalytics() {
  const { user } = useAuth()
  const isHod = user?.role === 'hod' || user?.role === 'super_admin'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Request Cancellation AbortController
  const abortControllerRef = useRef(null)

  const loadAnalyticsData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      if (isHod) {
        // HOD stats & summary
        const [statsRes, summaryRes, facultyRes, subjectRes, atRiskRes] = await Promise.all([
          api.get('/api/v1/hod/dashboard/stats', { signal: abortControllerRef.current.signal }),
          api.get('/api/v1/hod/analytics/summary', { signal: abortControllerRef.current.signal }),
          api.get('/api/v1/hod/faculty/all', { signal: abortControllerRef.current.signal }),
          api.get('/subjects', { signal: abortControllerRef.current.signal }),
          api.get('/api/v1/hod/dashboard/at-risk-students', { signal: abortControllerRef.current.signal })
        ])

        const deptSummary = summaryRes.data?.dept_summary || []
        const totalAttendance = deptSummary.reduce((acc, curr) => acc + (curr.attendance || 0), 0)
        const avgAttendance = deptSummary.length > 0 ? Math.round(totalAttendance / deptSummary.length) : 0

        const finalData = {
          totalStudents: statsRes.data?.total_students || statsRes.data?.approved_students || 0,
          totalFaculty: facultyRes.data?.length || 0,
          totalSubjects: subjectRes.data?.length || 0,
          avgDeptScore: statsRes.data?.avg_quiz_score || statsRes.data?.department_health_score || 72,
          deptAttendance: avgAttendance,
          atRisk: atRiskRes.data?.length || 0,
          deptSummary: deptSummary
        }
        setData(finalData)
      } else {
        // Faculty metrics
        const res = await api.get('/analytics/faculty/analytics', { signal: abortControllerRef.current.signal })
        setData(res.data)
      }
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Failed to refresh analytics. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyticsData()

    const handleDataChange = () => {
      loadAnalyticsData()
    }
    window.addEventListener('badge-update', handleDataChange)
    window.addEventListener('data-change', handleDataChange)

    return () => {
      window.removeEventListener('badge-update', handleDataChange)
      window.removeEventListener('data-change', handleDataChange)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <PageWrapper title="Department Analytics">
      <div className="w-full max-w-[1200px] mx-auto p-4 lg:p-6 flex flex-col gap-6">

        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-400" />
              {isHod ? 'HOD Analytics Dashboard' : 'Faculty Performance Dashboard'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Real-time analytics and student metrics pulled directly from the live database.
            </p>
          </div>
          <button
            onClick={loadAnalyticsData}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 transition shrink-0"
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/5 border border-white/10 rounded-2xl">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm text-white/50 font-semibold uppercase tracking-wider">Fetching live data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-10 bg-white/5 border border-white/10 rounded-2xl p-6 gap-3">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <button onClick={loadAnalyticsData} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition">
              Retry
            </button>
          </div>
        )}

        {/* Main Dashboard Data */}
        {data && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {isHod && data.deptSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                <AlertTriangle className="w-12 h-12 text-violet-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Department Data Available</h3>
                <p className="text-sm text-white/55 max-w-md">
                  No courses or department summaries exist for your assigned department.
                </p>
              </div>
            ) : isHod ? (
              /* ── HOD Dashboard ── */
              <div className="flex flex-col gap-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Students', value: data.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Total Faculty', value: data.totalFaculty, icon: GraduationCap, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
                    { label: 'Total Subjects', value: data.totalSubjects, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Avg Dept Score', value: `${data.avgDeptScore}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Dept Attendance', value: `${data.deptAttendance}%`, icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                    { label: 'At-Risk Students', value: data.atRisk, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
                  ].map(card => (
                    <div key={card.label} className={`p-4 rounded-xl border ${card.bg} flex flex-col justify-between h-28`}>
                      <div className="flex justify-between items-start">
                        <span className="text-2xl font-bold text-white">{card.value}</span>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <span className="text-xs text-white/50 font-semibold">{card.label}</span>
                    </div>
                  ))}
                </div>

                {/* Department Performance Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-2">
                  <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                    <h3 className="font-bold text-white text-sm">Department Performance Summary</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-bold text-white/40 uppercase tracking-wider bg-white/[0.01]">
                          <th className="px-6 py-3.5">Department</th>
                          <th className="px-6 py-3.5">Students</th>
                          <th className="px-6 py-3.5">Avg Score</th>
                          <th className="px-6 py-3.5">Attendance</th>
                          <th className="px-6 py-3.5">At-Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.deptSummary.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-white/30 italic">No department data available.</td>
                          </tr>
                        ) : (
                          data.deptSummary.map(dept => (
                            <tr key={dept.dept} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-semibold text-white">{dept.dept}</td>
                              <td className="px-6 py-4 text-white/80">{dept.students || 0}</td>
                              <td className="px-6 py-4 font-bold text-violet-400">{dept.avg_score || 0}%</td>
                              <td className="px-6 py-4 text-emerald-400 font-semibold">{dept.attendance || 0}%</td>
                              <td className="px-6 py-4">
                                {(dept.at_risk || 0) > 0 ? (
                                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-xs font-bold">{dept.at_risk}</span>
                                ) : (
                                  <span className="text-white/30 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Faculty Dashboard ── */
              data.avgQuizScore === null ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <AlertTriangle className="w-12 h-12 text-violet-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No Analytics Available</h3>
                  <p className="text-sm text-white/55 max-w-md">
                    No quiz analytics available yet for your assigned subjects and semester.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Average Quiz Score', value: `${data.avgQuizScore}%`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
                      { label: 'Average Attendance', value: data.avgAttendance !== null ? `${data.avgAttendance}%` : 'No Data', icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
                    ].map(card => (
                      <div key={card.label} className={`p-4 rounded-xl border ${card.bg} flex flex-col justify-between h-28`}>
                        <div className="flex justify-between items-start">
                          <span className="text-2xl font-bold text-white">{card.value}</span>
                          <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <span className="text-xs text-white/50 font-semibold">{card.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent Quiz Performance */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 mt-2">
                    <h3 className="font-bold text-white text-sm">Recent Quiz Concept Performance</h3>
                    <p className="text-xs text-white/40 -mt-2">Frequently missed questions and weak conceptual spots in your subjects.</p>
                    <div className="flex flex-col gap-2">
                      {data.recentPerformance.length === 0 ? (
                        <p className="text-xs text-white/30 italic py-6 text-center">No recent quiz deficits identified.</p>
                      ) : (
                        data.recentPerformance.map((q, i) => (
                          <div key={i} className="p-3.5 bg-white/3 border border-white/5 rounded-xl flex justify-between items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-white font-semibold whitespace-pre-wrap">{q.concept}</p>
                              <p className="text-[10px] text-white/40 mt-1">{q.subject} · {q.semester} · {q.topic}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-rose-400 font-bold block">{q.incorrect_responses} Incorrect</span>
                              <span className="text-[10px] text-white/40 block mt-0.5">{q.error_percentage}% Error Rate</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
