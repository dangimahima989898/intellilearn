import { useState, useEffect, useRef } from "react"
import {
  BookOpen,
  Download,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  FileText,
  Loader2
} from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import studentService from "../../services/studentService"
import summaryService from "../../services/summaryService"

const DocumentSearchIllustration = ({ isLight }) => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6">
    {/* Sparkle Left */}
    <path d="M25 75L27.5 82.5L35 85L27.5 87.5L25 95L22.5 87.5L15 85L22.5 82.5L25 75Z" fill="#A78BFA" opacity="0.6" />
    <circle cx="28" cy="110" r="2" fill="#C084FC" opacity="0.4" />
    
    {/* Sparkle Right */}
    <path d="M135 75L137.5 82.5L145 85L137.5 87.5L135 95L132.5 87.5L125 85L132.5 82.5L135 75Z" fill="#A78BFA" opacity="0.6" />
    <circle cx="138" cy="60" r="2" fill="#C084FC" opacity="0.4" />
    
    {/* Document Body */}
    <rect x="45" y="30" width="70" height="90" rx="12" fill={isLight ? "#F5F3FF" : "#1E1B4B"} stroke="#C084FC" strokeWidth="2.5" />
    {/* Document Lines */}
    <line x1="57" y1="50" x2="85" y2="50" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
    <line x1="57" y1="65" x2="103" y2="65" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
    <line x1="57" y1="80" x2="90" y2="80" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
    <line x1="57" y1="95" x2="80" y2="95" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
    
    {/* Magnifying Glass */}
    <circle cx="100" cy="110" r="15" fill={isLight ? "#FFFFFF" : "#0F172A"} stroke="#7C3AED" strokeWidth="3.5" />
    <line x1="110.5" y1="120.5" x2="122.5" y2="132.5" stroke="#7C3AED" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

export default function StudentSummaryView() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === "light"

  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("")
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  
  // Track start times for reading metrics: { [summaryId]: timestamp }
  const timeTrackers = useRef({})
  const [votedMap, setVotedMap] = useState({}) // { [summaryId]: 'up' | 'down' }
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      fetchSummaries(selectedSubject)
    } else {
      setSummaries([])
    }
  }, [selectedSubject])

  const fetchSubjects = async () => {
    try {
      const data = await studentService.getSubjects()
      setSubjects(data)
      if (data.length > 0) {
        setSelectedSubject(data[0].id)
      }
    } catch (err) {
      toast.error("Failed to load subjects")
    }
  }

  const fetchSummaries = async (subjectId) => {
    setLoading(true)
    try {
      const data = await summaryService.getApprovedSummaries(subjectId)
      setSummaries(data)
    } catch (err) {
      toast.error("Failed to load summaries")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExpand = async (summaryId) => {
    if (expandedId === summaryId) {
      // Closing card: record reading time log if not already voted
      const startTime = timeTrackers.current[summaryId]
      if (startTime) {
        const timeSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000))
        // Log time spent passively
        if (!votedMap[summaryId]) {
          try {
            await summaryService.submitSummaryFeedback(summaryId, true, timeSpent)
          } catch (e) {
            console.warn("Passive feedback submission failed", e)
          }
        }
        delete timeTrackers.current[summaryId]
      }
      setExpandedId(null)
    } else {
      // Opening card: start timer and increment views
      timeTrackers.current[summaryId] = Date.now()
      setExpandedId(summaryId)
      
      try {
        await summaryService.incrementSummaryViews(summaryId)
        // Update local views count
        setSummaries(prev => prev.map(s => s.id === summaryId ? { ...s, views_count: s.views_count + 1 } : s))
      } catch (err) {
        console.error("Failed to register view", err)
      }
    }
  }

  const handleVote = async (summaryId, isHelpful) => {
    const startTime = timeTrackers.current[summaryId] || Date.now()
    const timeSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000))
    
    const toastId = toast.loading("Recording your vote...")
    try {
      const res = await summaryService.submitSummaryFeedback(summaryId, isHelpful, timeSpent)
      setVotedMap(prev => ({ ...prev, [summaryId]: isHelpful ? "up" : "down" }))
      
      // Update local aggregates
      setSummaries(prev => prev.map(s => {
        if (s.id === summaryId) {
          return {
            ...s,
            helpful_count: res.helpful_count,
            not_helpful_count: res.not_helpful_count,
            avg_read_time_seconds: res.avg_read_time_seconds
          }
        }
        return s
      }))
      
      toast.success("Thank you for your feedback! 🚀", { id: toastId })
    } catch (err) {
      toast.error("Failed to submit feedback", { id: toastId })
    }
  }

  const handleDownloadPdf = async (summaryId, title) => {
    setDownloadingId(summaryId)
    try {
      const blob = await summaryService.downloadSummaryPdf(summaryId)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${title}_Revision_Summary.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      toast.success("PDF downloaded successfully! 📚")
    } catch (err) {
      toast.error("Failed to generate and download PDF summary.")
    } finally {
      setDownloadingId(null)
    }
  }

  // Formatting markdown sections into clean UI elements
  const renderSummaryDetails = (text) => {
    if (!text) return <p className="text-white/40 italic">Summary content is empty.</p>

    const sections = []
    let currentSection = null
    
    text.split("\n").forEach((line) => {
      const lineStr = line.trim()
      if (!lineStr) return

      if (lineStr.startsWith("## ")) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          title: lineStr.replace("## ", "").trim(),
          items: []
        }
      } else if (currentSection) {
        currentSection.items.push(lineStr)
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }

    if (sections.length === 0) {
      return <p className="text-sm leading-relaxed">{text}</p>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {sections.map((sec, idx) => {
          const isExamTips = sec.title.toLowerCase().includes("tips")
          const isQuestions = sec.title.toLowerCase().includes("question")
          const isOverview = sec.title.toLowerCase().includes("overview")

          return (
            <div
              key={idx}
              className={`border rounded-xl p-4.5 transition-all relative overflow-hidden md:col-span-${
                isOverview || isQuestions ? "2" : "1"
              } ${
                isLight 
                  ? isExamTips 
                    ? "bg-amber-50/70 border-amber-200" 
                    : "bg-slate-50 border-slate-200"
                  : isExamTips
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-[#161C30]/50 border-white/5"
              }`}
            >
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                isLight ? "text-slate-800" : "text-indigo-300"
              }`}>
                {isExamTips ? "⚡ " : isQuestions ? "❓ " : "📘 "}
                {sec.title}
              </h4>
              
              <div className="space-y-2 text-xs leading-relaxed">
                {sec.items.map((item, itemIdx) => {
                  if (item.startsWith("•") || item.startsWith("-")) {
                    const content = item.replace(/^[•-]\s*/, "")
                    return (
                      <div key={itemIdx} className="flex gap-2 text-white/70 pl-2">
                        <span className="text-indigo-400 select-none">•</span>
                        <span>{parseInlineBold(content)}</span>
                      </div>
                    )
                  }
                  
                  if (/^\d+\./.test(item)) {
                    const content = item.replace(/^\d+\.\s*/, "")
                    const num = item.match(/^\d+\./)[0]
                    return (
                      <div key={itemIdx} className="flex gap-2 text-white/70 pl-2">
                        <span className="text-violet-400 font-bold font-mono shrink-0">{num}</span>
                        <span>{parseInlineBold(content)}</span>
                      </div>
                    )
                  }

                  return <p key={itemIdx} className="text-white/70">{parseInlineBold(item)}</p>
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const parseInlineBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div className={`w-full font-dm transition-colors ${
      isLight ? "bg-slate-50 text-slate-900" : "bg-[#0A0F1E] text-white"
    }`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-outfit font-extrabold ${
            isLight ? "text-[#8B5CF6]" : "bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          }`}>
            Verified Revision Summaries
          </h1>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
            Professor-approved summaries aligned with the MLSU Udaipur MCA curriculum.
          </p>
        </div>
      </div>

      {/* Subject Filter Badge Bar */}
      <div className={`flex flex-wrap gap-2.5 mb-8 border-b pb-4 ${isLight ? "border-slate-200" : "border-white/5"}`}>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubject(sub.id)}
            className={`px-4.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              selectedSubject === sub.id
                ? isLight
                  ? "bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-md shadow-violet-600/10"
                  : "bg-[#8B5CF6] border-[#7C3AED] text-white shadow-md shadow-violet-600/10"
                : isLight
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-white/3 border-white/5 text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {sub.name} ({sub.code})
          </button>
        ))}
      </div>

      {/* Summaries list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-24 rounded-2xl border animate-pulse ${
                isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"
              }`}
            />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 text-center border rounded-3xl ${
          isLight ? "bg-white border-slate-100/80 shadow-md shadow-slate-100/50" : "bg-[#121829]/20 border-white/5"
        }`}>
          <DocumentSearchIllustration isLight={isLight} />
          <h3 className={`font-bold text-xl ${isLight ? "text-slate-800" : "text-white/70"}`}>No Summaries Available</h3>
          <p className={`text-xs mt-2.5 max-w-sm px-6 leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>
            There are currently no professor-approved revision summaries for this subject. Try checking another subject.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {summaries.map((item) => {
            const isExpanded = expandedId === item.id
            const hasVoted = votedMap[item.id]

            return (
              <div
                key={item.id}
                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  isLight
                    ? "bg-white border-slate-200 hover:shadow-md"
                    : isExpanded
                      ? "bg-[#121829]/80 border-indigo-500/50 shadow-lg"
                      : "bg-[#121829]/50 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Header card trigger */}
                <div
                  onClick={() => handleToggleExpand(item.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                          {item.unit}
                        </span>
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> VERIFIED
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mt-1.5 truncate max-w-[280px] sm:max-w-md">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* View/Read stats badge */}
                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.avg_read_time_seconds > 0
                          ? `${Math.round(item.avg_read_time_seconds)}s read`
                          : "New"}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white/55" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/55" />
                    )}
                  </div>
                </div>

                {/* Collapsible details body */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-[#0e1324]/40 relative">
                    
                    {/* Top Download revision PDF action */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/3 border border-white/5 rounded-xl p-3.5 mb-5">
                      <div>
                        <span className="text-xs font-semibold block">Download Printable Revision Note</span>
                        <span className="text-[10px] text-white/40 block mt-0.5">
                          Violet revision header theme with verified professor details.
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadPdf(item.id, item.title)}
                        disabled={downloadingId === item.id}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 hover:shadow-lg shrink-0 disabled:opacity-50"
                      >
                        {downloadingId === item.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" /> Download Revision PDF
                          </>
                        )}
                      </button>
                    </div>

                    {/* Formatted revision details */}
                    {renderSummaryDetails(item.summary_text)}

                    {/* Professor approval verification badge */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 text-white/50">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Approved by <strong>Professor {item.approver_name}</strong> on{" "}
                          {item.approved_at ? new Date(item.approved_at).toLocaleDateString() : "Date"}
                        </span>
                      </div>

                      {/* Vote Helpful Session */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/40 font-medium">Was this summary helpful?</span>
                        {hasVoted ? (
                          <span className="text-indigo-400 font-semibold flex items-center gap-1 text-[11px]">
                            {hasVoted === "up" ? "👍 Voted Helpful" : "👎 Voted Not Helpful"}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(item.id, true)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white/80 hover:text-emerald-400 transition-all flex items-center gap-1.5 text-[11px]"
                            >
                              <ThumbsUp className="w-3 h-3" /> Yes ({item.helpful_count})
                            </button>
                            <button
                              onClick={() => handleVote(item.id, false)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 text-white/80 hover:text-red-400 transition-all flex items-center gap-1.5 text-[11px]"
                            >
                              <ThumbsDown className="w-3 h-3" /> No ({item.not_helpful_count})
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
