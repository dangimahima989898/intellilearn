import { useState, useEffect, useMemo } from 'react'
import {
  Shield, HelpCircle, User, Calendar, AlertCircle, CheckCircle2,
  XCircle, Loader2, BookOpen, MessageSquare, ArrowRight, CornerDownRight,
  Search, Filter, Clock, Eye, FileText, Cpu, Database, Network, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import PageWrapper from '../../components/PageWrapper'

export default function HODContentModeration() {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // HOD comment/notes state
  const [comment, setComment] = useState('')

  const fetchReports = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/hod/escalated-ai-reports')
      setReports(response.data)
      if (response.data.length > 0) {
        setSelectedReport(response.data[0])
      } else {
        setSelectedReport(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load escalated AI reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    const handleWsMessage = (e) => {
      const { type, report } = e.detail || {};
      if (type === "flagged_answer_updated") {
        setReports(prev => {
          const exists = prev.some(r => r.report_id === report.report_id);
          if (exists) {
            return prev.map(r => r.report_id === report.report_id ? report : r);
          } else if (report.status === "escalated" || report.escalated_to_hod) {
            return [report, ...prev];
          }
          return prev;
        });
        setSelectedReport(prev => (prev && prev.report_id === report.report_id) ? report : prev);
      }
    };

    window.addEventListener("ws-message", handleWsMessage);
    return () => window.removeEventListener("ws-message", handleWsMessage);
  }, []);

  useEffect(() => {
    setComment('')
  }, [selectedReport])

  const handleAction = async (actionPath) => {
    if (!selectedReport) return

    if (actionPath === 'reject' && !comment.trim()) {
      toast.error('Remarks are mandatory when discarding the recommendation.')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(`Submitting HOD action...`)
    try {
      await api.post(`/api/hod/ai-reports/${selectedReport.report_id}/${actionPath}`, {
        comment: comment.trim() || null
      })
      
      let successMsg = 'Action submitted successfully!'
      if (actionPath === 'approve') successMsg = 'Approved faculty decision!'
      if (actionPath === 'reject') successMsg = 'Discarded recommendation!'

      toast.success(successMsg, { id: toastId })
      
      // Refresh reports list
      fetchReports()
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.detail || 'Failed to submit HOD action'
      toast.error(errorMsg, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Helper: priority mapper
  const getPriority = (report) => {
    const code = report.subject_code?.toUpperCase() || ''
    const name = report.subject_name?.toLowerCase() || ''
    if (code.includes('CS') || name.includes('data structure') || name.includes('algorithm')) {
      return { label: 'High', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: '↑', accent: 'border-l-rose-500' }
    }
    if (code.includes('IT') || name.includes('dbms') || name.includes('database') || name.includes('operating') || name.includes('os')) {
      return { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: '↑', accent: 'border-l-amber-500' }
    }
    return { label: 'Low', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: '↓', accent: 'border-l-emerald-500' }
  }

  // Helper: icon mapper
  const getSubjectIcon = (subjectName) => {
    const name = subjectName?.toLowerCase() || ''
    if (name.includes('data structure') || name.includes('algorithm')) return BookOpen
    if (name.includes('dbms') || name.includes('database')) return Database
    if (name.includes('operating') || name.includes('os') || name.includes('cpu')) return Cpu
    if (name.includes('network') || name.includes('tcp') || name.includes('ip')) return Network
    return Shield
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100'
      case 'rejected':
        return 'text-rose-600 bg-rose-50 border-rose-100'
      case 'escalated':
        return 'text-violet-600 bg-violet-50 border-violet-100'
      default:
        return 'text-amber-600 bg-amber-50 border-amber-100'
    }
  }

  // Derive stats
  const stats = useMemo(() => {
    const total = reports.length
    const pending = reports.filter(r => r.status === 'escalated' || r.status === 'pending').length
    const underReview = reports.filter(r => r.status === 'under_review').length
    const resolved = reports.filter(r => ['approved', 'rejected'].includes(r.status)).length
    return { total, pending, underReview, resolved }
  }, [reports])

  // Filtered queue
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        r.subject_name?.toLowerCase().includes(q) ||
        r.subject_code?.toLowerCase().includes(q) ||
        r.student_name?.toLowerCase().includes(q) ||
        r.report_id?.toLowerCase().includes(q)
      )
    })
  }, [reports, searchQuery])

  return (
    <PageWrapper title="Escalated AI Reports">
      <div className="w-full max-w-[1400px] mx-auto p-4 lg:p-6 flex flex-col gap-6 font-dm">
        
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Shield className="w-6 h-6 text-violet-500" />
              Escalated AI Reports
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Moderation hub for AI flagged responses escalated by subject faculty for final HOD decision.
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 h-[42px] px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-[10px] transition text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>

        {/* ── Stats Cards Row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Escalated', value: stats.total, sub: 'Reports in queue', icon: FileText, color: 'text-violet-500 bg-violet-50' },
            { label: 'Pending Review', value: stats.pending, sub: 'Awaiting action', icon: Clock, color: 'text-amber-500 bg-amber-50' },
            { label: 'Under Review', value: stats.underReview, sub: 'In progress', icon: Eye, color: 'text-blue-500 bg-blue-50' },
            { label: 'Resolved', value: stats.resolved, sub: 'Completed', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{s.value}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Split Workspace layout ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
          
          {/* ── Left Queue Column ── */}
          <div className="w-full lg:w-[420px] shrink-0 flex flex-col bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Escalated Queue</h3>
              <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-xs font-black">
                {filteredReports.length}
              </span>
            </div>

            {/* Search and filter */}
            <div className="flex gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by subject, faculty or report ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[10px] pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-violet-500 text-slate-800 placeholder-slate-400 font-semibold"
                />
              </div>
              <button className="w-[42px] h-[42px] bg-slate-50 border border-slate-100 rounded-[10px] flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Queue items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[450px] lg:max-h-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-violet-500" />
                  <span className="text-xs">Loading queue...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 border border-slate-100 border-dashed rounded-2xl p-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <span className="text-sm font-extrabold text-slate-700">Queue is Clear!</span>
                  <span className="text-xs mt-1 leading-snug">No matching escalated reports.</span>
                </div>
              ) : (
                filteredReports.map(r => {
                  const isSelected = selectedReport?.report_id === r.report_id
                  const priority = getPriority(r)
                  const SubIcon = getSubjectIcon(r.subject_name)
                  const cleanFaculty = r.faculty_decision?.replace(/Escalated by\s*/i, '').split(':')[0] || 'Faculty'

                  return (
                    <button
                      key={r.report_id}
                      onClick={() => setSelectedReport(r)}
                      className={`w-full text-left p-4 rounded-2xl border border-l-4 transition-all flex flex-col gap-3 relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? `bg-violet-50/40 border-violet-500/80 shadow-md ${priority.accent}`
                          : `bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm ${priority.accent}`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <SubIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-800 truncate leading-snug">
                            {r.subject_name} — {r.question.split(' ').slice(0, 3).join(' ')}...
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                            Faculty: {cleanFaculty}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                            Report ID: REP-{new Date(r.created_at).getFullYear()}-{String(r.report_id).substring(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded border ${priority.color} flex items-center gap-1`}>
                          <span className="text-[8px]">{priority.icon}</span> {priority.label}
                        </span>
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" /> {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 shrink-0 select-none">
              <span>Showing 1 to {filteredReports.length} of {filteredReports.length} results</span>
              <button className="text-violet-600 hover:text-violet-700 cursor-pointer">View All →</button>
            </div>
          </div>

          {/* ── Right Detailed Workspace Column ── */}
          <div className="flex-1 flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            {!selectedReport ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]/30">
                <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 bg-violet-100 rounded-full scale-90 opacity-40 animate-pulse" />
                  <div className="relative w-20 h-20 bg-white border border-slate-100 rounded-2xl shadow-xl flex items-center justify-center">
                    <Shield className="w-10 h-10 text-violet-500 fill-violet-50" />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-800">No Escalation Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm font-medium leading-relaxed">
                  Choose a report from the escalated queue to review the student flag, AI response, and faculty recommendation.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* Header block */}
                <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[#F8FAFC]/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-violet-50 text-violet-600 font-extrabold px-3 py-1 rounded-full border border-violet-100">
                        {selectedReport.subject_name} ({selectedReport.subject_code})
                      </span>
                      <span className={`text-xs capitalize font-extrabold px-2.5 py-1 rounded-full border ${getStatusBadge(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-2">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-300" /> {selectedReport.student_name} ({selectedReport.student_email})</span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-300" /> {new Date(selectedReport.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  
                  {/* Faculty recommendation panel */}
                  <div className="p-4 bg-violet-50/40 border border-violet-100 rounded-2xl flex items-start gap-3">
                    <CornerDownRight className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-violet-700 uppercase tracking-wider">Faculty Recommendation</h5>
                      <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-semibold">
                        <strong>Verdict:</strong> {selectedReport.faculty_decision}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium italic">
                        " {selectedReport.faculty_comment || 'No comment provided' } "
                      </p>
                    </div>
                  </div>

                  {/* Student Flagged Reason */}
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-amber-700 uppercase tracking-wider">Student Flagged Reason</h5>
                      <p className="text-xs text-slate-700 mt-1 font-semibold leading-relaxed">
                        {selectedReport.student_reason || 'Inaccurate or faulty AI response'}
                      </p>
                    </div>
                  </div>

                  {/* Question & AI Response */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-slate-300" /> Student Question
                      </span>
                      <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {selectedReport.question}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-slate-300" /> Flagged AI Answer
                      </span>
                      <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono leading-relaxed text-slate-600 max-h-[250px] overflow-y-auto">
                        {selectedReport.ai_answer}
                      </div>
                    </div>
                  </div>

                  {/* HOD action box */}
                  {(selectedReport.status === 'escalated' || selectedReport.status === 'pending') && (
                    <div className="p-5 border border-violet-100 bg-violet-50/20 rounded-2xl space-y-4">
                      <h4 className="font-extrabold text-sm text-violet-700 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> HOD Moderation Action Form
                      </h4>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HOD Comments / Instructions (Optional)</label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Provide details about your decision or remarks for the faculty/admin."
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-500 font-semibold resize-none h-20 leading-relaxed"
                        />
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleAction('approve')}
                          disabled={submitting}
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve Faculty Recommendation
                        </button>

                        <button
                          onClick={() => handleAction('reject')}
                          disabled={submitting}
                          className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Discard Recommendation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
