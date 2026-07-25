import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, XCircle, Calendar, User, AlertTriangle } from 'lucide-react'
import api from '../../services/api'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'

export default function HodLeaveManagement() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/leave/pending')
      setLeaves(res.data)
    } catch {
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeaves() }, [])

  const handleReview = async (leaveId, action) => {
    setReviewingId(leaveId)
    try {
      await api.post(`/api/v1/leave/${leaveId}/review`, { status: action })
      toast.success(`Leave request ${action} successfully.`)
      fetchLeaves()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    } finally {
      setReviewingId(null)
    }
  }

  const calcDays = (start, end) => {
    return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <PageWrapper title="Leave Requests">
      <div className="max-w-5xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Leave Requests</h1>
          <p className="text-white/50 text-sm">Review and action faculty leave applications for your department.</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-300">Action Required</p>
            <p className="text-xs text-yellow-400/80 mt-0.5">Once you approve a leave, remember to update the timetable in <strong>Schedule Manager</strong> to arrange substitute faculty for the affected slots.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400/40 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">All Clear!</h3>
            <p className="text-white/50 text-sm">No pending leave requests at the moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {leaves.map(leave => {
              const days = calcDays(leave.start_date, leave.end_date)
              const isReviewing = reviewingId === leave.id
              return (
                <div key={leave.id} className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 rounded-2xl p-6 transition group">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Avatar + Faculty info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-11 h-11 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-violet-300" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{leave.faculty_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-xs text-white/50">{leave.start_date} → {leave.end_date} <span className="text-white/30">({days} day{days !== 1 ? 's' : ''})</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 text-xs font-bold shrink-0">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-sm text-white/80">{leave.reason}</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleReview(leave.id, 'rejected')}
                      disabled={isReviewing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(leave.id, 'approved')}
                      disabled={isReviewing}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isReviewing ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
