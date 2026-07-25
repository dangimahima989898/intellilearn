import React, { useState, useEffect } from "react"
import { X, Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import api from "../../services/api"

export default function HeatmapDrillDown({
  isOpen,
  onClose,
  subjectId,
  subjectCode,
  subjectName,
  unit,
}) {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Tracking nudge states: studentId -> 'sending' | 'sent' | 'failed'
  const [nudgeStates, setNudgeStates] = useState({})

  useEffect(() => {
    if (isOpen && subjectId && unit) {
      fetchDrilldownData()
    }
  }, [isOpen, subjectId, unit])

  const fetchDrilldownData = async () => {
    setIsLoading(true)
    setError(null)
    setNudgeStates({})
    try {
      const response = await api.get(
        `/admin/dashboard/heatmap/drilldown?subject_id=${subjectId}&unit=${encodeURIComponent(unit)}`
      )
      setStudents(response.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || "Failed to load student performance details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendNudge = async (studentId, studentName) => {
    setNudgeStates(prev => ({ ...prev, [studentId]: 'sending' }))
    try {
      await api.post(`/admin/dashboard/send-nudge/${studentId}`, {
        custom_message: `Hi ${studentName}, let's work together to boost your understanding of ${subjectCode} ${unit}! Click here to practice questions.`,
      })
      setNudgeStates(prev => ({ ...prev, [studentId]: 'sent' }))
      setTimeout(() => {
        setNudgeStates(prev => {
          const updated = { ...prev }
          delete updated[studentId]
          return updated
        })
      }, 4000)
    } catch (err) {
      console.error(err)
      setNudgeStates(prev => ({ ...prev, [studentId]: 'failed' }))
    }
  }

  const handleBulkNudge = async () => {
    const weakStudents = students.filter(s => s.accuracy < 70)
    if (weakStudents.length === 0) return
    
    for (const student of weakStudents) {
      handleSendNudge(student.student_id, student.name)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Student Performance Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Subject: <span className="text-blue-400 font-semibold">{subjectCode} {subjectName}</span> · Unit: <span className="text-white font-semibold">{unit}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-slate-400 text-sm font-semibold">Retrieving cohort results...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Failed to Load Details</h4>
                <p className="text-xs opacity-80 mt-1">{error}</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-white/5 border-dashed">
              <CheckCircle className="w-8 h-8 text-emerald-500/70 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">No Student Attempts Recorded</p>
              <p className="text-slate-400 text-xs mt-1">No student has attempted quizzes for this unit yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold bg-slate-950/40 px-4 py-2.5 rounded-xl border border-white/5">
                <span>Total students graded: <b className="text-white">{students.length}</b></span>
                {students.filter(s => s.accuracy < 70).length > 0 && (
                  <button
                    onClick={handleBulkNudge}
                    className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Bulk Nudge Weak Students (&lt;70%)
                  </button>
                )}
              </div>

              <div className="overflow-hidden border border-white/5 rounded-xl">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-center">Accuracy</th>
                      <th className="py-3 px-4 text-center">Attempts</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Outreach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {students.map((student) => {
                      const nudgeStatus = nudgeStates[student.student_id]
                      
                      return (
                        <tr key={student.student_id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm">{student.name}</div>
                            <div className="text-xs text-slate-400 font-medium">{student.email}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded font-extrabold text-xs inline-block ${
                              student.accuracy >= 75 ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                              student.accuracy >= 65 ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30" :
                              student.accuracy >= 50 ? "bg-orange-500/15 text-orange-300 border border-orange-500/30" :
                              "bg-red-500/15 text-red-300 border border-red-500/30"
                            }`}>
                              {student.accuracy.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300 font-semibold">
                            {student.attempts_count}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 font-medium">
                            {student.last_attempt_date}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {nudgeStatus === 'sent' ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold">
                                Nudged!
                              </span>
                            ) : nudgeStatus === 'failed' ? (
                              <button
                                onClick={() => handleSendNudge(student.student_id, student.name)}
                                className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg font-bold hover:bg-red-500/20 transition-all cursor-pointer"
                              >
                                Failed (Retry)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendNudge(student.student_id, student.name)}
                                disabled={nudgeStatus === 'sending'}
                                className={`inline-flex items-center justify-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 hover:text-white transition-all cursor-pointer ${
                                  nudgeStatus === 'sending' ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Send Push Reminder"
                              >
                                {nudgeStatus === 'sending' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 text-sm font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
