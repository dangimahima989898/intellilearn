import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Award, Clock, ArrowRight, ClipboardList, ShieldAlert, BarChart3, TrendingUp, Sparkles } from 'lucide-react'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

export default function MyTestsDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await placementService.getDashboardStats()
      setStats(data)
    } catch (error) {
      toast.error("Failed to load test attempt history")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  const { total_tests_taken, average_score, best_score, attempts } = stats

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'timed_out':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'submitted':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_progress': return 'In Progress'
      case 'timed_out': return 'Timed Out'
      case 'submitted':
      default:
        return 'Submitted'
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-outfit font-extrabold tracking-tight">My Placement Dashboard</h1>
            <p className="text-white/60 text-sm mt-1">Review your practice history, performance analytics, and preparation metrics.</p>
          </div>
          <Link 
            to="/tests"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/10 self-start"
          >
            Browse New Tests
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase font-extrabold">Total Tests Taken</div>
              <div className="text-2xl font-black font-outfit mt-0.5">{total_tests_taken}</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase font-extrabold">Average Score</div>
              <div className="text-2xl font-black font-outfit mt-0.5">{average_score.toFixed(2)}%</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase font-extrabold">Best Attempt Score</div>
              <div className="text-2xl font-black font-outfit mt-0.5">{best_score.toFixed(2)}%</div>
            </div>
          </div>

        </div>

        {/* Attempts Table / List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-outfit">Attempt History</h2>
          
          {attempts.length === 0 ? (
            <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
              <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 font-medium mb-3">You haven't attempted any placement tests yet.</p>
              <Link
                to="/tests"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all"
              >
                Browse available tests
              </Link>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-xs text-white/40 font-extrabold uppercase">
                      <th className="p-4">Test Name</th>
                      <th className="p-4">Score / Marks</th>
                      <th className="p-4">Percentage</th>
                      <th className="p-4">Time Taken</th>
                      <th className="p-4">Attempt Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold">{attempt.test_name}</td>
                        <td className="p-4">
                          {attempt.status === 'in_progress' ? (
                            <span className="text-white/40">—</span>
                          ) : (
                            <span>{attempt.score} / {attempt.total_marks}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {attempt.status === 'in_progress' ? (
                            <span className="text-white/40">—</span>
                          ) : (
                            <span className="font-semibold">{attempt.percentage.toFixed(2)}%</span>
                          )}
                        </td>
                        <td className="p-4 text-white/70">
                          {attempt.status === 'in_progress' ? (
                            <span className="text-white/40">Active</span>
                          ) : (
                            <span>
                              {attempt.time_taken_seconds 
                                ? `${Math.floor(attempt.time_taken_seconds / 60)}m ${attempt.time_taken_seconds % 60}s` 
                                : '0s'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-white/60">
                          {new Date(attempt.started_at).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric' 
                          })}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-bold ${getStatusBadge(attempt.status)}`}>
                            {getStatusLabel(attempt.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {attempt.status === 'in_progress' ? (
                            <button
                              onClick={() => navigate(`/tests/${attempt.test_id}/start`)}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#0A0F1E] text-xs font-extrabold rounded transition-colors"
                            >
                              Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/tests/${attempt.test_id}/result/${attempt.id}`)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-extrabold rounded transition-colors"
                            >
                              Report
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
