import { useState, useEffect } from "react"
import {
  BarChart2,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Loader2,
  BookOpen
} from "lucide-react"
import toast from "react-hot-toast"
import summaryService from "../../services/summaryService"

export default function AdminNotesAnalytics() {
  const [stats, setStats] = useState({
    total_uploaded: 0,
    total_approved: 0,
    total_pending: 0,
    total_rejected: 0,
    items: []
  })
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [regeneratingIds, setRegeneratingIds] = useState({}) // { [noteId]: boolean }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const data = await summaryService.getAdminNotesAnalytics()
      setStats(data)
    } catch (err) {
      toast.error("Failed to load notes summarizer analytics")
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async (noteId) => {
    setRegeneratingIds(prev => ({ ...prev, [noteId]: true }))
    const toastId = toast.loading("Re-queuing summary for AI generation...")
    try {
      await summaryService.regenerateSummary(noteId)
      toast.success("Summary queued for generation. OCR and AI summarizer restarted!", { id: toastId })
      // Reload stats after 1.5 seconds to reflect status changes
      setTimeout(fetchAnalytics, 1500)
    } catch (err) {
      toast.error("Failed to trigger summary regeneration", { id: toastId })
    } finally {
      setRegeneratingIds(prev => ({ ...prev, [noteId]: false }))
    }
  }

  const filteredItems = stats.items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.unit.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full font-dm text-white p-2 relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-3xl font-outfit font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Notes Summarizer Analytics
            </h1>
            <p className="text-xs text-white/40 mt-1">
              Monitor notes engagement, student reading durations, and helpfulness metrics.
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* STATS CARDS */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl border border-white/5 bg-white/2 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Uploaded */}
            <div className="bg-[#121829]/70 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/40 block">TOTAL NOTES</span>
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
              </div>
              <span className="text-3xl font-bold font-outfit mt-2 block">{stats.total_uploaded}</span>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500/20" />
            </div>

            {/* Total Approved */}
            <div className="bg-[#121829]/70 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/40 block">APPROVED SUMMARIES</span>
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
              <span className="text-3xl font-bold font-outfit mt-2 block text-emerald-400">{stats.total_approved}</span>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500/20" />
            </div>

            {/* Total Pending */}
            <div className="bg-[#121829]/70 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/40 block">PENDING REVIEWS</span>
                <Clock className="w-5 h-5 text-blue-400 shrink-0" />
              </div>
              <span className="text-3xl font-bold font-outfit mt-2 block text-blue-400">{stats.total_pending}</span>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-blue-500/20" />
            </div>

            {/* Total Rejected */}
            <div className="bg-[#121829]/70 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-xl relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/40 block">REJECTED SUMMARIES</span>
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              </div>
              <span className="text-3xl font-bold font-outfit mt-2 block text-red-400">{stats.total_rejected}</span>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-red-500/20" />
            </div>
          </div>
        )}

        {/* ANALYTICS TABLE BOARD */}
        <div className="bg-[#121829]/80 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col min-h-[400px]">
          {/* Table Header / Search */}
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" /> Summary Performance Rankings
            </h3>
            
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, subjects, units..."
                className="w-full bg-[#0A0F1E] border border-white/10 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-white/20"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                <span className="text-xs">Loading analytics rows...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 text-white/30 text-xs">
                No note performance data matches your query.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3 text-white/70 font-semibold uppercase tracking-wider">
                    <th className="p-4">Title / Context</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total Views</th>
                    <th className="p-4">Avg Read Duration</th>
                    <th className="p-4 text-center">Student Ratings</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row) => {
                    const totalVotes = row.helpful_count + row.not_helpful_count
                    const hasLowHelpfulness = totalVotes >= 3 && row.helpfulness_percentage < 70
                    const isRegenerating = regeneratingIds[row.note_id]

                    return (
                      <tr
                        key={row.note_id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          hasLowHelpfulness
                            ? "bg-red-500/5 text-red-200 border-red-500/20 hover:bg-red-500/10"
                            : "text-white/80"
                        }`}
                      >
                        {/* Title Context */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {hasLowHelpfulness && (
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" title="Low Helpfulness Rating (<70%)" />
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold block truncate max-w-[240px] md:max-w-xs text-white" title={row.title}>
                                {row.title}
                              </span>
                              <span className="text-[10px] text-white/45 flex items-center gap-1 mt-0.5">
                                <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                                {row.subject_name} · {row.unit}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            row.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                              : row.status === "REJECTED"
                                ? "bg-red-500/15 text-red-400 border-red-500/20"
                                : "bg-blue-500/15 text-blue-400 border-blue-500/20"
                          }`}>
                            {row.status}
                          </span>
                        </td>

                        {/* Views */}
                        <td className="p-4 font-mono font-medium">{row.views_count} views</td>

                        {/* Avg Duration */}
                        <td className="p-4 font-mono">
                          {row.avg_read_time_seconds > 0 
                            ? `${row.avg_read_time_seconds.toFixed(0)} seconds`
                            : "N/A"}
                        </td>

                        {/* Helpful Rating */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-bold font-mono text-xs ${
                              hasLowHelpfulness ? "text-red-400" : totalVotes > 0 ? "text-indigo-300" : "text-white/40"
                            }`}>
                              {totalVotes > 0 ? `${row.helpfulness_percentage.toFixed(0)}%` : "No votes"}
                            </span>
                            
                            {totalVotes > 0 && (
                              <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                                <span className="flex items-center gap-0.5 text-emerald-400"><ThumbsUp className="w-2.5 h-2.5" /> {row.helpful_count}</span>
                                <span className="flex items-center gap-0.5 text-red-400"><ThumbsDown className="w-2.5 h-2.5" /> {row.not_helpful_count}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {hasLowHelpfulness && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-semibold animate-pulse uppercase">
                                Low Rating
                              </span>
                            )}
                            <button
                              onClick={() => handleRegenerate(row.note_id)}
                              disabled={isRegenerating}
                              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 hover:text-white px-2.5 py-1.5 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Re-generate Summary"
                            >
                              {isRegenerating ? (
                                <Loader2 className="w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3" />
                              )}
                              Re-generate
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
