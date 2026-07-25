import { useState, useMemo } from 'react'
import { Flag, CheckCircle2, XCircle, ChevronDown, ChevronUp, AlertTriangle, BookOpen, User } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmIncorrectModal from './ConfirmIncorrectModal'
import DismissCorrectModal from './DismissCorrectModal'

const STATUS_FILTERS = ['Awaiting Review', 'Confirmed Incorrect', 'Verified Correct']
const STATUS_MAP = { 'Awaiting Review': 'pending', 'Confirmed Incorrect': 'approved', 'Verified Correct': 'dismissed' }

const DEPT_BADGE = {
  BCA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MCA: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'BSc CS': 'bg-green-500/20 text-green-300 border-green-500/30',
  'MSc IT': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function FlaggedAnswersTab({ items, loading, deptFilter, searchQuery, onAction }) {
  const [statusFilter, setStatusFilter] = useState('Awaiting Review')
  const [confirmModal, setConfirmModal] = useState(null)
  const [dismissModal, setDismissModal] = useState(null)

  const filtered = useMemo(() => {
    const target = STATUS_MAP[statusFilter]
    return items.filter(f => {
      if (f.status !== target) return false
      if (deptFilter !== 'All' && f.department !== deptFilter) return false
      if (searchQuery && !f.question.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !f.student_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [items, statusFilter, deptFilter, searchQuery])

  const handleConfirm = (item, correctAnswer, notifyStudent) => {
    onAction(item.id, 'approved', correctAnswer)
    setConfirmModal(null)
    if (notifyStudent) {
      toast.success(`Student ${item.student_name} notified. AI flag confirmed as incorrect.`)
    }
  }

  const handleDismiss = (item, note, notifyStudent) => {
    onAction(item.id, 'dismissed', note)
    setDismissModal(null)
    if (notifyStudent) {
      toast.success(`Flag dismissed. ${note ? 'Student notified.' : ''}`)
    }
  }

  if (loading) return <LoadingSkeletons />

  return (
    <div className="flex flex-col gap-4">
      {/* Status Filter Pill Row */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1.5 overflow-x-auto w-fit">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${statusFilter === f ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(item => (
            <FlaggedAnswerCard
              key={item.id}
              item={item}
              onConfirm={() => setConfirmModal(item)}
              onDismiss={() => setDismissModal(item)}
            />
          ))}
        </div>
      )}

      {confirmModal && (
        <ConfirmIncorrectModal
          item={confirmModal}
          onConfirm={(correctAnswer, notifyStudent) => handleConfirm(confirmModal, correctAnswer, notifyStudent)}
          onClose={() => setConfirmModal(null)}
        />
      )}
      {dismissModal && (
        <DismissCorrectModal
          item={dismissModal}
          onDismiss={(note, notifyStudent) => handleDismiss(dismissModal, note, notifyStudent)}
          onClose={() => setDismissModal(null)}
        />
      )}
    </div>
  )
}

function FlaggedAnswerCard({ item, onConfirm, onDismiss }) {
  const [expanded, setExpanded] = useState(true)
  const deptBadge = DEPT_BADGE[item.department] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-500/20 rounded-2xl overflow-hidden transition group">
      {/* Top accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

      <div className="p-5 flex flex-col gap-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
              <Flag className="w-3 h-3" /> Flagged Answer
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${deptBadge}`}>{item.department}</span>
            <span className="text-xs text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{item.subject}</span>
            <span className="text-xs text-white/40">{item.semester}</span>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-white/40 hover:text-white transition p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {item.student_name} ({item.enrollment})</span>
          <span>Flagged: {formatDateTime(item.flagged_at)}</span>
          {item.escalated_by_faculty && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Escalated by Faculty
            </span>
          )}
        </div>

        {/* Faculty escalation note */}
        {item.escalated_by_faculty && item.faculty_escalation_note && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
            <strong>Faculty Note:</strong> {item.faculty_escalation_note}
          </div>
        )}

        {expanded && (
          <>
            {/* Three Info Sections */}
            <div className="flex flex-col gap-2">
              {/* Student's Question */}
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Student's Question</p>
                <p className="text-sm text-white/80 leading-relaxed">{item.question}</p>
              </div>

              {/* AI's Answer (red tint — flagged) */}
              <div className="p-3 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
                <p className="text-[11px] font-bold text-red-400/70 uppercase tracking-wider mb-1.5">AI's Answer <span className="text-red-500/50 normal-case font-normal">(flagged as incorrect)</span></p>
                <p className="text-sm text-white/80 leading-relaxed">{item.ai_answer}</p>
              </div>

              {/* Student's Flag Reason (amber tint) */}
              <div className="p-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl">
                <p className="text-[11px] font-bold text-amber-400/70 uppercase tracking-wider mb-1.5">Student's Reason for Flagging</p>
                <p className="text-sm text-white/80 leading-relaxed italic">"{item.flag_reason}"</p>
              </div>
            </div>

            {/* Syllabus Unit */}
            {item.syllabus_unit && (
              <div className="flex items-center gap-2 text-xs text-violet-400/80">
                <BookOpen className="w-3.5 h-3.5" />
                Related Syllabus: {item.syllabus_unit}
              </div>
            )}

            {/* Action Buttons */}
            {item.status === 'pending' && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button onClick={onDismiss}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-bold transition">
                  <XCircle className="w-4 h-4" /> Dismiss — AI was Correct
                </button>
                <button onClick={onConfirm}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-sm font-bold transition shadow-lg shadow-red-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Confirm — AI was Incorrect
                </button>
              </div>
            )}
            {item.status !== 'pending' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${item.status === 'approved' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {item.status === 'approved' ? <><CheckCircle2 className="w-4 h-4" /> Confirmed Incorrect — Correction saved</> : <><XCircle className="w-4 h-4" /> Verified Correct — Flag dismissed</>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ statusFilter }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Nothing to Review</h3>
      <p className="text-white/50 text-sm max-w-sm">
        {statusFilter === 'Awaiting Review'
          ? 'No AI answers have been flagged by students yet. When students mark an AI response as incorrect, it will appear here for your review.'
          : `No items in "${statusFilter}" status matching your filters.`}
      </p>
    </div>
  )
}

function LoadingSkeletons() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}
