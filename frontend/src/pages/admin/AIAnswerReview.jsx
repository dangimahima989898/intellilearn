import { useState, useEffect } from 'react'
import {
  Shield, HelpCircle, User, Calendar, AlertCircle, CheckCircle2,
  XCircle, Loader2, BookOpen, MessageSquare, ArrowUpRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'

export default function AIAnswerReview() {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Faculty feedback state
  const [decision, setDecision] = useState('Incorrect') // Correct, Incorrect, Needs Improvement
  const [comment, setComment] = useState('')

  const fetchReports = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/faculty/ai-reports')
      setReports(response.data)
      if (response.data.length > 0) {
        setSelectedReport(prev => {
          // Keep selection if it still exists in new data
          if (prev) {
            const found = response.data.find(r => r.report_id === prev.report_id)
            return found || response.data[0]
          }
          return response.data[0]
        })
      } else {
        setSelectedReport(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load AI answer reports')
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
      if (type === "flagged_answer_created") {
        setReports(prev => {
          if (prev.some(r => r.report_id === report.report_id)) return prev;
          return [report, ...prev];
        });
        setSelectedReport(prev => prev || report);
      } else if (type === "flagged_answer_updated") {
        setReports(prev => prev.map(r => 
          r.report_id === report.report_id ? report : r
        ));
        setSelectedReport(prev => (prev && prev.report_id === report.report_id) ? report : prev);
      }
    };

    window.addEventListener("ws-message", handleWsMessage);
    return () => window.removeEventListener("ws-message", handleWsMessage);
  }, []);

  useEffect(() => {
    if (selectedReport) {
      setDecision(selectedReport.faculty_decision || 'Incorrect')
      setComment(selectedReport.faculty_comment || '')
    }
  }, [selectedReport])

  const handleAction = async (actionType) => {
    if (!selectedReport) return
    if (!comment.trim()) {
      toast.error('Please enter a feedback comment for this review action.')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(`${actionType === 'escalate' ? 'Escalating' : 'Submitting review'}...`)
    try {
      await api.post(`/api/faculty/ai-reports/${selectedReport.report_id}/${actionType}`, {
        decision,
        comment: comment.trim()
      })
      toast.success(`AI answer report ${actionType}d successfully!`, { id: toastId })
      
      // Refresh report list
      const updatedReports = reports.map(r => 
        r.report_id === selectedReport.report_id
          ? { ...r, status: actionType === 'escalate' ? 'escalated' : actionType === 'approve' ? 'approved' : 'rejected', faculty_decision: decision, faculty_comment: comment }
          : r
      )
      setReports(updatedReports)
      setSelectedReport(updatedReports.find(r => r.report_id === selectedReport.report_id))
      fetchReports()
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.detail || `Failed to ${actionType} AI report`
      toast.error(errorMsg, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to dynamically calculate priority from student reason
  const getPriority = (reason) => {
    if (['Incorrect Concept', 'Wrong Code'].includes(reason)) {
      return { label: 'High', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
    }
    if (['Incomplete Answer', 'Outdated Syllabus'].includes(reason)) {
      return { label: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    }
    return { label: 'Low', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'rejected':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'escalated':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20'
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse'
    }
  }

  return (
    <div className={`w-full font-dm flex flex-col relative pt-2 ${isLight ? 'text-slate-800' : 'text-white'}`} style={{ minHeight: 'calc(100vh - 260px)' }}>
      
      {/* Workspace Header */}
      <div className="mb-6 mt-1 md:mt-2">
        <h1 className="text-3xl font-outfit font-bold tracking-tight">AI Answer Review</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
          Review AI flagged answers from students in subjects you teach.
        </p>
      </div>

      {/* Main split dashboard view */}
      <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden border rounded-2xl min-h-[600px] ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/10 backdrop-blur-md'
      }`}>
        
        {/* Left column: reports queue list */}
        <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r flex flex-col ${
          isLight ? 'bg-slate-50/30 border-slate-200' : 'bg-[#121829]/50 border-white/10'
        }`}>
          <div className={`p-4 border-b shrink-0 flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div>
              <h3 className={`font-bold text-sm uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-white'}`}>Reports Queue</h3>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'opacity-40'}`}>Select a report to inspect</span>
            </div>
            <button
              onClick={fetchReports}
              disabled={loading}
              className={`p-2 rounded-lg border transition disabled:opacity-30 ${
                isLight 
                  ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600' 
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
              }`}
              title="Refresh Queue"
            >
              <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] lg:max-h-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-xl p-4 ${
                isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/5 bg-white/3'
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>All Clear!</span>
                <span className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No AI answers flagged in your subjects.</span>
              </div>
            ) : (
              reports.map(r => {
                const priority = getPriority(r.student_reason)
                const isSelected = selectedReport?.report_id === r.report_id
                return (
                  <button
                    key={r.report_id}
                    onClick={() => setSelectedReport(r)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                      isSelected
                        ? isLight
                          ? 'bg-violet-500/10 border-violet-500/80 shadow-md shadow-violet-500/5'
                          : 'bg-indigo-600/15 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                        : isLight
                          ? 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                          : 'bg-white/3 border-white/5 hover:border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                          isLight 
                            ? 'bg-violet-100 border-violet-200 text-violet-700' 
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                        }`}>
                          {r.subject_code}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                      <h4 className={`font-semibold text-xs mt-2 truncate pr-4 ${isLight ? 'text-slate-800' : 'text-white'}`}>{r.question}</h4>
                      <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-400' : 'opacity-45'}`}>By {r.student_name}</span>
                    </div>

                    <div className={`flex items-center justify-between text-[9px] pt-1.5 border-t ${
                      isLight ? 'border-slate-100 text-slate-400' : 'border-white/5 opacity-35'
                    }`}>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className={`capitalize font-semibold ${getStatusBadge(r.status)} px-1.5 py-0.5 rounded border`}>
                        {r.status}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right column: detailed review workspace */}
        <div className={`flex-1 flex flex-col min-w-0 ${isLight ? 'bg-slate-50/10' : 'bg-[#0d1222]/30'}`}>
          {!selectedReport ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Shield className={`w-16 h-16 mb-4 ${isLight ? 'text-slate-300' : 'opacity-10'}`} />
              <h3 className={`text-xl font-bold ${isLight ? 'text-slate-600' : 'opacity-75'}`}>No Report Selected</h3>
              <p className={`text-sm mt-1 max-w-sm ${isLight ? 'text-slate-400' : 'opacity-40'}`}>
                Choose a reported AI response from the list on the left to begin moderation.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Header */}
              <div className={`px-6 pt-6 pb-4 border-b flex flex-wrap items-center justify-between gap-4 ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-violet-100 border-violet-200 text-violet-700'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                    }`}>
                      {selectedReport.subject_name} ({selectedReport.subject_code})
                    </span>
                    <span className={`text-xs capitalize font-semibold px-2 py-0.5 rounded border ${getStatusBadge(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'opacity-50'}`}>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedReport.student_name} ({selectedReport.student_email})</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selectedReport.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Reason flag */}
                <div className={`p-4 border rounded-xl flex items-start gap-3 ${
                  isLight 
                    ? 'bg-amber-50 border-amber-200/60' 
                    : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <div>
                    <h5 className={`text-sm font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Flagged Reason: {selectedReport.student_reason}</h5>
                    <p className={`text-xs mt-1 ${isLight ? 'text-amber-650' : 'text-amber-400/80'}`}>
                      Student submitted a review request claiming the AI chatbot reply is incorrect, outdated, or incomplete.
                    </p>
                  </div>
                </div>

                {/* Question & AI Response */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'opacity-45'
                    }`}>
                      <HelpCircle className="w-3.5 h-3.5" /> Student Question
                    </span>
                    <div className={`flex-1 p-4 border rounded-xl text-sm leading-relaxed ${
                      isLight ? 'bg-slate-50/50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      {selectedReport.question}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                      isLight ? 'text-slate-500' : 'opacity-45'
                    }`}>
                      <BookOpen className="w-3.5 h-3.5" /> Flagged AI Answer
                    </span>
                    <div className={`flex-1 p-4 border rounded-xl text-sm leading-relaxed font-mono text-xs max-h-[300px] overflow-y-auto ${
                      isLight ? 'bg-slate-50/50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-white/90'
                    }`}>
                      {selectedReport.ai_answer}
                    </div>
                  </div>
                </div>

                {/* Faculty review action box */}
                {selectedReport.status === 'pending' ? (
                  <div className={`p-5 border rounded-xl space-y-4 ${
                    isLight ? 'border-violet-100 bg-violet-50/20' : 'border-indigo-500/20 bg-indigo-600/5'
                  }`}>
                    <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isLight ? 'text-violet-900' : 'text-indigo-300'}`}>
                      <MessageSquare className="w-4 h-4" /> Faculty Resolution Form
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-semibold mb-2 ${isLight ? 'text-slate-600' : 'opacity-60'}`}>Faculty Verdict</label>
                        <select
                          value={decision}
                          onChange={(e) => setDecision(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none font-medium cursor-pointer ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-800 focus:border-violet-500'
                              : 'bg-[#0d1222] border-white/15 text-white focus:border-indigo-500'
                          }`}
                        >
                          <option value="Incorrect">Incorrect (AI reply needs update)</option>
                          <option value="Correct">Correct (AI reply is valid)</option>
                          <option value="Needs Improvement">Needs Improvement (Incomplete/Outdated)</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-2 ${isLight ? 'text-slate-600' : 'opacity-60'}`}>Detailed Comments</label>
                        <textarea
                          required
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Explain your verdict (e.g. The time complexity shown is incorrect; correct is O(N log N))."
                          className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none font-medium resize-none h-20 ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-405 focus:border-violet-500'
                              : 'bg-[#0d1222] border-white/15 text-white placeholder-white/20 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAction('approve')}
                        disabled={submitting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 !text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 !text-white" /> Approve Flag (Dismiss AI reply)
                      </button>

                      <button
                        onClick={() => handleAction('reject')}
                        disabled={submitting}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 !text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 !text-white" /> Reject Flag (Dismiss Flag)
                      </button>

                      <button
                        onClick={() => handleAction('escalate')}
                        disabled={submitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 !text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                      >
                        <ArrowUpRight className="w-4 h-4 !text-white" /> Escalate to HOD
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 border rounded-xl space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                    <h5 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-indigo-300'}`}>Faculty Resolution Submitted</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className={`block mb-0.5 ${isLight ? 'text-slate-500' : 'opacity-50'}`}>Verdict Decision</span>
                        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>{selectedReport.faculty_decision || 'N/A'}</span>
                      </div>
                      <div>
                        <span className={`block mb-0.5 ${isLight ? 'text-slate-500' : 'opacity-50'}`}>Resolution Comment</span>
                        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>{selectedReport.faculty_comment || 'No comment provided.'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
