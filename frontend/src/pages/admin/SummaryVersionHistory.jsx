import { useState, useEffect } from "react"
import { History, Loader2, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"
import summaryService from "../../services/summaryService"

export default function SummaryVersionHistory({ summaryId, isOpen, onClose, onRestore }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && summaryId) {
      fetchVersions()
    }
  }, [isOpen, summaryId])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const data = await summaryService.getSummaryVersions(summaryId)
      setVersions(data)
    } catch (err) {
      toast.error("Failed to load version history")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="w-96 bg-[#121829] border-l border-white/10 relative z-10 flex flex-col h-full shadow-2xl animate-slide-in text-white">
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" /> Version Timeline
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xs font-semibold px-2 py-1 bg-white/5 border border-white/10 rounded-md transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-xs">Loading history...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center text-white/40 py-10 text-xs">No version history found.</div>
          ) : (
            versions.map((v, idx) => (
              <div key={v.id} className="relative flex gap-4">
                {/* Timeline Connector Line */}
                {idx < versions.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-[-24px] w-0.5 bg-white/10" />
                )}

                {/* Timeline Node */}
                <div className="w-6.5 h-6.5 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-xs shrink-0 relative z-10 font-mono text-indigo-400">
                  {v.version_number}
                </div>

                <div className="flex-1 min-w-0 bg-[#0f1424] border border-white/5 rounded-xl p-3.5 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white/95 font-outfit">Version {v.version_number}</span>
                    <span className="text-[10px] text-white/40">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-white/40 text-[10px] mb-3">
                    {v.created_by_ai ? (
                      <span className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/10 font-medium">AI Generated</span>
                    ) : (
                      <span className="bg-teal-500/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/10 font-medium">Professor Commit</span>
                    )}
                    {v.approved_by_name && (
                      <span>· Approved by {v.approved_by_name}</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onRestore(v)
                      toast.success(`Restored Version ${v.version_number} summary text to editor!`)
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-1 hover:underline"
                  >
                    Restore to Editor <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
