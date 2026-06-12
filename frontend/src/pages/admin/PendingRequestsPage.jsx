import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  MessageSquare,
  ArrowRight,
  ShieldAlert
} from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"

const API_BASE_URL = "http://localhost:8000/api"

export default function PendingRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog / Warning state for Mismatches
  const [mismatchReq, setMismatchReq] = useState(null)
  const [showConfirmWarning, setShowConfirmWarning] = useState(false)
  
  // Rejection Dialog state
  const [rejectReq, setRejectReq] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/access-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRequests(response.data)
    } catch (err) {
      toast.error("Failed to load access requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchRequests()
  }, [token])

  // Handle Approve trigger (either first time or override confirm)
  const handleApprove = async (request, override = false) => {
    setActionLoading(true)
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/access-requests/${request.id}/approve`,
        { override },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.warning) {
        // Not pre-enrolled! Trigger override alert
        setMismatchReq(request)
        setShowConfirmWarning(true)
        toast.error("Warning: Student is not in administrative enrollment directory.")
      } else {
        toast.success(response.data.message || "Request approved and credentials sent!")
        setShowConfirmWarning(false)
        setMismatchReq(null)
        fetchRequests()
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to approve request."
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Reject trigger
  const handleReject = async () => {
    if (!rejectReq) return
    setActionLoading(true)
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/access-requests/${rejectReq.id}/reject`,
        { rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(response.data.message || "Request successfully rejected.")
      setShowRejectModal(false)
      setRejectReq(null)
      setRejectionReason("")
      fetchRequests()
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to reject request."
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-dm text-white p-8 relative overflow-hidden">
      {/* Aurora Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="aurora-orb w-96 h-96 bg-indigo-500/10 top-10 left-10" />
        <div className="aurora-orb w-80 h-80 bg-violet-500/10 bottom-20 right-5" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-outfit font-bold">Access Verification Requests</h1>
            <p className="text-white/40 text-sm mt-0.5">Verify and authorise student onboarding requests manually</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/70">
            Pending requests: <span className="font-bold text-blue-400">{requests.length}</span>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-3" />
            <span>Retrieving access requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center shadow-xl backdrop-blur-xl">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Inbox is clear!</h3>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              There are currently no student onboarding requests awaiting manual administrative review.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-white/70 font-semibold">
                    <th className="p-4">Student Details</th>
                    <th className="p-4">Academic Details</th>
                    <th className="p-4">Reason / Notes</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block">{req.full_name}</span>
                        <span className="text-white/50 text-xs block mt-0.5">{req.email}</span>
                        <span className="text-[10px] text-white/30 font-mono block mt-1">Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-block">
                          Sem {req.semester} • {req.branch}
                        </span>
                        <span className="text-white/50 text-xs block mt-1.5 font-mono">
                          Enrollment: <strong className="text-white/80">{req.enrollment_number}</strong> (Sec {req.section})
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-white/70 text-xs line-clamp-2" title={req.reason}>
                          {req.reason || <em className="text-white/30">No reason specified</em>}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            Verify & Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectReq(req)
                              setShowRejectModal(true)
                            }}
                            disabled={actionLoading}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OVERRIDE WARNING MODAL */}
        {showConfirmWarning && mismatchReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#1E293B] border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-outfit font-bold text-white mb-2">Enrollment Match Mismatch</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Student <strong className="text-blue-500 font-semibold">{mismatchReq.full_name}</strong> is requesting credentials for <strong className="text-blue-500 font-semibold">Semester {mismatchReq.semester}</strong>, but their enrollment number <strong className="text-blue-500 font-semibold">{mismatchReq.enrollment_number}</strong> is not registered in the pre-authorized Enrolled Students database.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmWarning(false)
                    setMismatchReq(null)
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel Approval
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(mismatchReq, true)}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Approve Anyway"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION MODAL */}
        {showRejectModal && rejectReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#1E293B] border border-white/15 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-outfit font-bold text-white mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" /> Reject Access Request
              </h3>
              <p className="text-white/70 text-xs mb-4">
                Rejecting access request for <strong className="text-violet-500 font-semibold">{rejectReq.full_name}</strong>. Enter a reason below which will be emailed to the student.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-white/8 border border-white/15 rounded-xl p-3 text-white placeholder-white/25 focus:outline-none focus:border-red-500 transition-all text-xs resize-none mb-6"
                placeholder="Details provided do not match our roster list."
                required
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReq(null)
                    setRejectionReason("")
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
