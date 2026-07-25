import { useState, useEffect } from 'react'
import { Calendar, Send, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'

const statusConfig = {
  pending:  { label: 'Pending',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',   icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       icon: XCircle },
}

export default function FacultyLeavePage() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' })
  const today = new Date().toISOString().split('T')[0]

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/leave/mine')
      setLeaves(res.data)
    } catch {
      toast.error('Failed to load leave history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeaves() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      return toast.error('Please fill in all fields')
    }
    if (form.start_date > form.end_date) {
      return toast.error('Start date cannot be after end date')
    }
    setSubmitting(true)
    try {
      await api.post('/api/v1/leave/apply', form)
      toast.success('Leave application submitted successfully!')
      setForm({ start_date: '', end_date: '', reason: '' })
      fetchLeaves()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit leave')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper title="Leave Management">
      <div className="max-w-5xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Apply for Leave</h1>
          <p className="text-white/50 text-sm">Submit a leave application to your HOD for approval.</p>
        </div>

        {/* Apply Leave Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-400" /> New Application
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">Start Date</label>
                <input
                  type="date"
                  min={today}
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white/70">End Date</label>
                <input
                  type="date"
                  min={form.start_date || today}
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-white/70">Reason for Leave</label>
              <textarea
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition resize-none"
                rows={4}
                placeholder="Briefly describe your reason for leave..."
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white font-semibold rounded-xl transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>

        {/* Leave History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Leave History</h2>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />)}
            </div>
          ) : leaves.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No leave applications found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {leaves.map(leave => {
                const cfg = statusConfig[leave.status] || statusConfig.pending
                const StatusIcon = cfg.icon
                const days = Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <div key={leave.id} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{leave.start_date} → {leave.end_date}</span>
                        <span className="text-xs text-white/40">({days} day{days !== 1 ? 's' : ''})</span>
                      </div>
                      <p className="text-sm text-white/60 line-clamp-2">{leave.reason}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold shrink-0 ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
