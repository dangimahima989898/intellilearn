import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  History,
  Eye,
  Edit3,
  Calendar,
  Layers,
  ArrowRight,
  Maximize2,
  ExternalLink,
  ChevronDown,
  Filter,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react"
import toast from "react-hot-toast"
import summaryService from "../../services/summaryService"

const BACKEND_URL = "http://localhost:8000"

export default function FacultyReviewPanel() {
  const [drafts, setDrafts] = useState([])
  const [selectedDraft, setSelectedDraft] = useState(null)
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  
  // Editor & Preview State
  const [editorText, setEditorText] = useState("")
  const [activeTab, setActiveTab] = useState("preview") // "preview" | "write"
  
  // Inline Rejection Feedback State
  const [rejectionReason, setRejectionReason] = useState("")
  
  // Version history state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Actions loading state
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDrafts()
  }, [])

  useEffect(() => {
    if (selectedDraft) {
      setEditorText(selectedDraft.summary_text || "")
      setRejectionReason("")
      setIsHistoryOpen(false)
      setVersions([])
    }
  }, [selectedDraft])

  const fetchDrafts = async () => {
    setLoadingDrafts(true)
    try {
      const data = await summaryService.getDraftSummaries()
      setDrafts(data)
      if (data.length > 0) {
        setSelectedDraft(data[0])
      } else {
        setSelectedDraft(null)
      }
    } catch (err) {
      toast.error("Failed to fetch draft summaries")
    } finally {
      setLoadingDrafts(false)
    }
  }

  const loadVersionHistory = async () => {
    if (!selectedDraft) return
    setIsHistoryOpen(true)
    setLoadingVersions(true)
    try {
      const data = await summaryService.getSummaryVersions(selectedDraft.id)
      setVersions(data)
    } catch (err) {
      toast.error("Failed to load version history")
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDraft) return
    setSubmitting(true)
    const toastId = toast.loading("Saving and approving summary...")
    try {
      await summaryService.approveSummary(selectedDraft.id, editorText)
      toast.success("Summary approved successfully! Students have been notified.", { id: toastId })
      
      const updatedDrafts = drafts.filter(d => d.id !== selectedDraft.id)
      setDrafts(updatedDrafts)
      if (updatedDrafts.length > 0) {
        setSelectedDraft(updatedDrafts[0])
      } else {
        setSelectedDraft(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve summary", { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDraft) return
    if (!rejectionReason.trim()) {
      toast.error("Please enter feedback for the faculty in the input box before rejecting.")
      return
    }
    setSubmitting(true)
    const toastId = toast.loading("Submitting rejection feedback...")
    try {
      await summaryService.rejectSummary(selectedDraft.id, rejectionReason)
      toast.success("Summary rejected. Feedback sent back to queue.", { id: toastId })
      setRejectionReason("")
      
      const updatedDrafts = drafts.filter(d => d.id !== selectedDraft.id)
      setDrafts(updatedDrafts)
      if (updatedDrafts.length > 0) {
        setSelectedDraft(updatedDrafts[0])
      } else {
        setSelectedDraft(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject summary", { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Simple parser to format markdown for UI previewing
  const renderMarkdown = (text) => {
    if (!text) return <p className="text-slate-400 dark:text-white/40 italic">No content written yet.</p>
    
    return text.split("\n").map((line, idx) => {
      const lineStr = line.trim()
      if (!lineStr) return <div key={idx} className="h-2" />

      if (lineStr.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-sm font-bold font-outfit text-slate-900 dark:text-white mt-5 mb-2 uppercase tracking-wide">
            {lineStr.replace("## ", "")}
          </h3>
        )
      }

      if (lineStr.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-xs font-bold font-outfit text-violet-600 dark:text-violet-400 mt-4 mb-1.5">
            {lineStr.replace("### ", "")}
          </h4>
        )
      }

      if (lineStr.startsWith("•") || lineStr.startsWith("-")) {
        const content = lineStr.replace(/^[•-]\s*/, "")
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-655 dark:text-white/80 pl-3 mb-1.5 leading-relaxed">
            <span className="text-violet-500 shrink-0 select-none mt-1.5">&bull;</span>
            <span>{parseInlineBold(content)}</span>
          </div>
        )
      }

      if (/^\d+\./.test(lineStr)) {
        const content = lineStr.replace(/^\d+\.\s*/, "")
        const num = lineStr.match(/^\d+\./)[0]
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-655 dark:text-white/80 pl-3 mb-1.5 leading-relaxed">
            <span className="text-violet-500 shrink-0 font-bold font-mono">{num}</span>
            <span>{parseInlineBold(content)}</span>
          </div>
        )
      }

      return (
        <p key={idx} className="text-xs text-slate-655 dark:text-white/80 mb-2 leading-relaxed">
          {parseInlineBold(lineStr)}
        </p>
      )
    })
  }

  const parseInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|⚡)/g)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-slate-900 dark:text-white font-bold">{part.slice(2, -2)}</strong>
      }
      if (part === "⚡") {
        return <span key={i} className="text-amber-500 font-bold mr-1">⚡</span>
      }
      return part
    })
  }

  const getPdfUrl = (fileUrl) => {
    if (!fileUrl) return ""
    return fileUrl.startsWith("http") ? fileUrl : `${BACKEND_URL}${fileUrl}`
  }

  return (
    <div className="w-full font-dm text-slate-800 dark:text-white flex flex-col relative pt-2" style={{ minHeight: "calc(100vh - 260px)" }}>
      
      {/* Split Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* LEFT COLUMN: Review Queue (3 cols equivalent width) */}
        <div className="w-full lg:w-80 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl flex flex-col shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-outfit font-bold text-slate-900 dark:text-white">
                Review Queue
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-white/40 mt-0.5">Pending approval or edit verification</p>
            </div>
            <button className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[500px] lg:max-h-none">
            {loadingDrafts ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/40">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500 mb-2" />
                <span className="text-xs">Loading queue...</span>
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-white/30 border border-slate-100 dark:border-white/5 border-dashed rounded-xl bg-slate-50/50 dark:bg-white/2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white/80">Queue is clear!</span>
                <span className="text-[10px] text-slate-400 dark:text-white/40 mt-1 px-4">No notes awaiting professor approval.</span>
              </div>
            ) : (
              drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDraft(d)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                    selectedDraft?.id === d.id
                      ? "bg-violet-500/[0.04] dark:bg-violet-500/10 border-violet-500/80 shadow-sm"
                      : "bg-slate-50/30 dark:bg-white/3 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/15"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[9px] bg-violet-100 dark:bg-violet-500/10 text-violet-650 dark:text-violet-400 font-semibold px-2 py-0.5 rounded-md uppercase">
                      {d.unit || "Unit 4"}
                    </span>
                    <span className="text-[9px] bg-blue-550/10 text-blue-600 dark:text-blue-450 font-semibold px-2 py-0.5 rounded-md border border-blue-500/10">
                      D Draft
                    </span>
                  </div>
                  
                  <div className="min-w-0 mt-1">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate" title={d.title}>
                      {d.title}
                    </h4>
                    <span className="text-[10px] text-slate-450 dark:text-white/40 block mt-0.5 truncate">{d.subject_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30 pt-1.5 border-t border-slate-100 dark:border-white/5 w-full mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 dark:text-white/30" />
                      {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400 dark:text-white/30" />
                      {d.page_count || 12} pages
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          
          {/* Bottom Link */}
          <div className="p-3 border-t border-slate-100 dark:border-white/5 text-center shrink-0">
            <Link
              to="/admin/notes"
              className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              View All Notes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Split workspace & Actions */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-sm">
          {!selectedDraft ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[450px]">
              <FileText className="w-16 h-16 text-slate-300 dark:text-white/10 mb-4" />
              <h3 className="text-base font-bold text-slate-700 dark:text-white/70 font-outfit">No Summary Selected</h3>
              <p className="text-xs text-slate-450 dark:text-white/40 mt-1 max-w-sm">
                Select an uploaded note summary from the queue sidebar to inspect the source material and edit the AI summary draft.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Center Panel Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                <div>
                  <h3 className="text-sm font-outfit font-bold text-slate-900 dark:text-white truncate max-w-md" title={selectedDraft.title}>
                    {selectedDraft.title}
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-white/40 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Subject: <strong className="text-slate-700 dark:text-white">{selectedDraft.subject_name}</strong></span>
                    <span>&bull;</span>
                    <span>Unit: <strong className="text-slate-700 dark:text-white">{selectedDraft.unit}</strong></span>
                    <span>&bull;</span>
                    <span>Status: <strong className="text-violet-600 dark:text-violet-400 font-bold uppercase">{selectedDraft.status}</strong></span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={loadVersionHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-white transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Version Timeline
                  </button>
                  <a
                    href={getPdfUrl(selectedDraft.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Open Source PDF
                  </a>
                </div>
              </div>

              {/* SPLIT VIEW (50-50 Columns) */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0">
                
                {/* Source PDF Embed (Left 50%) */}
                <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5 flex flex-col h-[350px] md:h-auto min-h-0 bg-slate-50/[0.1] dark:bg-[#121829]/10">
                  <div className="flex-1 bg-slate-100 dark:bg-[#121829]/80 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-inner relative flex flex-col">
                    
                    {/* Mock PDF Toolbar */}
                    <div className="bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-white text-[11px] p-2 flex items-center justify-between border-b border-slate-350 dark:border-white/5 shrink-0">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
                        <span>1 / {selectedDraft.page_count || 12}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="hover:text-violet-500 font-bold">&ndash;</button>
                        <span className="font-semibold">100%</span>
                        <button className="hover:text-violet-500 font-bold">+</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-3 h-3 text-slate-500 dark:text-white/60" />
                      </div>
                    </div>

                    {selectedDraft.file_url ? (
                      <iframe
                        src={`${getPdfUrl(selectedDraft.file_url)}#toolbar=0`}
                        className="w-full flex-1 border-none bg-white"
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-white/40 text-xs italic bg-white">
                        Source file is previewing...
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Summary Editor / Preview (Right 50%) */}
                <div className="w-full md:w-1/2 p-4 flex flex-col h-[350px] md:h-auto min-h-0">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${
                          activeTab === "preview"
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <Eye className="w-3 h-3" /> Preview Rendered
                      </button>
                      <button
                        onClick={() => setActiveTab("write")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${
                          activeTab === "write"
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <Edit3 className="w-3 h-3" /> Write
                      </button>
                    </div>
                    
                    <span className="text-[9px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-500/10">
                      SUMMARY DRAFT
                    </span>
                  </div>

                  <div className="flex-1 bg-slate-50/50 dark:bg-[#121829]/60 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
                    {activeTab === "write" ? (
                      <textarea
                        value={editorText}
                        onChange={(e) => setEditorText(e.target.value)}
                        placeholder="Write note summary markdown..."
                        className="w-full flex-1 p-4 bg-slate-50 dark:bg-[#0f1424] border-none text-slate-800 dark:text-white font-mono text-[11px] leading-relaxed focus:outline-none resize-none overflow-y-auto"
                      />
                    ) : (
                      <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-white dark:bg-[#0d101d] text-slate-800 dark:text-white select-text">
                        {renderMarkdown(editorText)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER BAR */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#121829]/30 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                
                {/* Reject and Input Form */}
                <div className="flex items-center gap-3 w-full md:flex-1 max-w-xl">
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-4 py-2.5 rounded-xl transition-all text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <XCircle className="w-4 h-4" /> Reject & Feedback
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Add feedback for the faculty (optional)..."
                      maxLength={500}
                      className="w-full bg-slate-100 dark:bg-[#0f1424] border border-slate-200 dark:border-white/10 rounded-xl py-2 px-3 text-slate-800 dark:text-white text-xs focus:outline-none focus:border-violet-500"
                    />
                    <span className="absolute right-3 top-2.5 text-[9px] text-slate-400 dark:text-white/30 font-medium">
                      {rejectionReason.length}/500
                    </span>
                  </div>
                </div>

                {/* Approve Button */}
                <div className="flex items-center gap-1 w-full md:w-auto shrink-0 justify-end">
                  <button
                    onClick={handleApprove}
                    disabled={submitting || !editorText.trim()}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-l-xl transition-all text-xs flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-violet-600/20 disabled:opacity-50 flex-1 md:flex-initial"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Notify Students
                      </>
                    )}
                  </button>
                  <button className="bg-violet-600 hover:bg-violet-700 text-white border-l border-violet-500 p-2.5 rounded-r-xl transition-colors shrink-0">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* VERSION TIMELINE SIDE PANEL (Drawer) */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsHistoryOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="w-96 bg-white dark:bg-[#121829] border-l border-slate-200 dark:border-white/10 relative z-10 flex flex-col h-full shadow-2xl animate-slide-in text-slate-800 dark:text-white">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold font-outfit flex items-center gap-2">
                <History className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Version Timeline
              </h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white text-xs font-semibold px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-250 dark:border-white/10 rounded-md transition-colors"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingVersions ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500 mb-2" />
                  <span className="text-xs">Loading history...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-white/40 py-10 text-xs">No version history found.</div>
              ) : (
                versions.map((v, idx) => (
                  <div key={v.id} className="relative flex gap-4">
                    {idx < versions.length - 1 && (
                      <div className="absolute left-3 top-6 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-white/10" />
                    )}

                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-500 flex items-center justify-center text-xs shrink-0 relative z-10 font-bold font-mono text-violet-600 dark:text-violet-400">
                      {v.version_number}
                    </div>

                    <div className="flex-1 min-w-0 bg-slate-50 dark:bg-[#0f1424] border border-slate-150 dark:border-white/5 rounded-xl p-3.5 text-xs shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 dark:text-white/95">Version {v.version_number}</span>
                        <span className="text-[10px] text-slate-400 dark:text-white/40">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/40 text-[9px] mb-2.5">
                        {v.created_by_ai ? (
                          <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-650 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/10 font-bold">AI Generated</span>
                        ) : (
                          <span className="bg-teal-100 dark:bg-teal-500/10 text-teal-650 dark:text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/10 font-bold">Professor Commit</span>
                        )}
                        {v.approved_by_name && (
                          <span>&bull; Approved by {v.approved_by_name}</span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setEditorText(v.summary_text)
                          setIsHistoryOpen(false)
                          toast.success(`Restored Version ${v.version_number} summary text to editor!`)
                        }}
                        className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 mt-1 hover:underline"
                      >
                        Restore to Editor <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

