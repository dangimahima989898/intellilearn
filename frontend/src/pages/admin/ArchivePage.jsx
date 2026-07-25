import { useState, useEffect } from 'react'
import { BookOpen, Database, Monitor, Network, Coffee, Code, RotateCcw, Trash2, AlertCircle, Calendar, X, FileText } from 'lucide-react'
import adminService from '../../services/adminService'
import { getQuestions } from '../../services/questionService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import { useTheme } from '../../context/ThemeContext'

export default function ArchivePage() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsNotes, setDetailsNotes] = useState([])
  const [detailsQuestions, setDetailsQuestions] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  // ── theme tokens ─────────────────────────────────────────────────────────────
  const T = {
    pageBg:       isLight ? '#f8fafc'                : '#0a0f1e',
    modalBg:      isLight ? '#ffffff'                : '#0a1023',
    modalBorder:  isLight ? 'rgba(0,0,0,0.1)'        : 'rgba(255,255,255,0.12)',
    cardBg:       isLight ? '#ffffff'                : 'rgba(255,255,255,0.06)',
    cardBorder:   isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.15)',
    cardHoverBg:  isLight ? '#f1f5f9'                : 'rgba(255,255,255,0.09)',
    divider:      isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.1)',
    text:         isLight ? '#0f172a'                : '#ffffff',
    textSub:      isLight ? '#64748b'                : 'rgba(255,255,255,0.45)',
    textMuted:    isLight ? '#94a3b8'                : 'rgba(255,255,255,0.3)',
    statBg:       isLight ? '#f1f5f9'                : 'rgba(255,255,255,0.05)',
    statBorder:   isLight ? 'rgba(0,0,0,0.07)'       : 'rgba(255,255,255,0.1)',
    itemBg:       isLight ? '#f8fafc'                : 'rgba(255,255,255,0.05)',
    itemBorder:   isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.1)',
    emptyBorder:  isLight ? 'rgba(0,0,0,0.12)'       : 'rgba(255,255,255,0.15)',
    footerBg:     isLight ? '#f8fafc'                : 'rgba(255,255,255,0.03)',
    shadow:       isLight ? '0 4px 24px rgba(0,0,0,0.10)' : '0 4px 24px rgba(0,0,0,0.4)',
    codeBg:       isLight ? 'rgba(0,0,0,0.06)'       : 'rgba(255,255,255,0.08)',
    codeText:     isLight ? '#475569'                : 'rgba(255,255,255,0.6)',
    closeBtnColor: isLight ? '#94a3b8'               : 'rgba(255,255,255,0.4)',
    violetLabel:  isLight ? '#7c3aed'                : '#a78bfa',
    fuchsiaLabel: isLight ? '#a21caf'                : '#e879f9',
    emeraldLabel: isLight ? '#059669'                : '#34d399',
    correctColor: isLight ? '#059669'                : '#34d399',
    wrongColor:   isLight ? '#64748b'                : 'rgba(255,255,255,0.45)',
  }

  const presetIcons = [
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Database', icon: Database },
    { name: 'Monitor', icon: Monitor },
    { name: 'Network', icon: Network },
    { name: 'Coffee', icon: Coffee },
    { name: 'Code', icon: Code },
  ]

  const fetchArchivedSubjects = async () => {
    try {
      setLoading(true)
      const data = await adminService.getArchivedSubjects()
      setSubjects(data || [])
    } catch (err) {
      console.error('Failed to fetch archived subjects:', err)
      toast.error('Failed to load archived subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArchivedSubjects() }, [])

  const handleRestore = async (subjectId) => {
    try {
      await adminService.restoreSubject(subjectId)
      toast.success('Subject restored successfully')
      fetchArchivedSubjects()
    } catch (error) {
      toast.error('Failed to restore subject')
    }
  }

  const openDeleteModal = (subject) => {
    setSelectedSubject(subject)
    setIsDeleteModalOpen(true)
  }

  const handleDeletePermanent = async () => {
    if (isDeleting) return
    try {
      setIsDeleting(true)
      await adminService.deleteSubjectPermanent(selectedSubject.id)
      toast.success('Subject permanently deleted')
      setIsDeleteModalOpen(false)
      fetchArchivedSubjects()
    } catch (error) {
      toast.error('Failed to delete subject permanently')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDetailsModal = async (subject) => {
    setSelectedSubject(subject)
    setIsDetailsModalOpen(true)
    setDetailsLoading(true)
    setDetailsNotes([])
    setDetailsQuestions([])
    try {
      const [notesRes, questionsRes] = await Promise.allSettled([
        adminService.getNotes(subject.id, null, null, true),
        getQuestions({ subject_id: subject.id, include_archived: true, size: 50 })
      ])
      setDetailsNotes(notesRes.status === 'fulfilled' ? (notesRes.value || []) : [])
      setDetailsQuestions(questionsRes.status === 'fulfilled' ? (questionsRes.value || []) : [])
      
      if (notesRes.status === 'rejected') console.warn('Archived notes load failed:', notesRes.reason?.message)
      if (questionsRes.status === 'rejected') console.warn('Archived questions load failed:', questionsRes.reason?.message)
    } catch (err) {
      console.error(err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const renderIcon = (iconName, className) => {
    const IconCmp = presetIcons.find(p => p.name === iconName)?.icon || BookOpen
    return <IconCmp className={className} />
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold tracking-tight flex items-center gap-3" style={{ color: T.text }}>
            <Trash2 className="w-8 h-8 text-red-500" />
            Archive / Trash
          </h1>
          <p className="text-sm mt-1" style={{ color: T.textSub }}>
            Subjects soft-deleted will stay here for 15 days before permanent removal.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-2xl" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Archive is empty"
          description="There are no archived subjects in the trash bin right now."
        />
      ) : (
        /* ── Archived Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {subjects.map(subject => {
            const daysLeft = subject.remaining_days
            const progressPercent = (daysLeft / 15) * 100
            const isUrgent = daysLeft <= 3

            return (
              <div
                key={subject.id}
                onClick={() => openDetailsModal(subject)}
                className="rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300"
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.cardBorder}`,
                  boxShadow: T.shadow,
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardHoverBg}
                onMouseLeave={e => e.currentTarget.style.background = T.cardBg}
              >
                {/* Colored top bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: subject.color || '#EF4444' }} />

                <div className="p-6 flex flex-col gap-4 flex-1">
                  {/* Header row */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${subject.color || '#EF4444'}20`, color: subject.color || '#EF4444' }}
                      >
                        {renderIcon(subject.icon, "w-6 h-6")}
                      </div>
                      <div>
                        <h3 className="font-outfit font-bold text-lg leading-tight truncate max-w-[160px]" style={{ color: T.text }}>{subject.name}</h3>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: T.textMuted }}>{subject.code}</span>
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide animate-pulse"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Notes',     value: subject.notes_count || 0,     color: T.violetLabel,  bg: isLight ? 'rgba(124,58,237,0.08)'  : 'rgba(167,139,250,0.1)',  border: isLight ? 'rgba(124,58,237,0.15)' : 'rgba(167,139,250,0.2)' },
                      { label: 'Questions', value: subject.questions_count || 0, color: T.fuchsiaLabel, bg: isLight ? 'rgba(162,28,175,0.08)'  : 'rgba(232,121,249,0.1)', border: isLight ? 'rgba(162,28,175,0.15)' : 'rgba(232,121,249,0.2)' },
                      { label: 'AI Chunks', value: subject.chunks_count || 0,    color: T.emeraldLabel, bg: isLight ? 'rgba(5,150,105,0.08)'   : 'rgba(52,211,153,0.1)',  border: isLight ? 'rgba(5,150,105,0.15)'  : 'rgba(52,211,153,0.2)'  },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[10px] font-semibold mt-0.5" style={{ color: T.textSub }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Countdown section */}
                  <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: T.statBg, border: `1px solid ${T.statBorder}` }}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: T.textSub }}>
                        <Calendar className="w-3.5 h-3.5" />
                        Deleted: {formatDate(subject.archived_at)}
                      </span>
                      <span className="font-bold text-sm" style={{ color: isUrgent ? '#ef4444' : '#f59e0b' }}>
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          background: isUrgent
                            ? 'linear-gradient(90deg, #dc2626, #f87171)'
                            : 'linear-gradient(90deg, #d97706, #fbbf24)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(subject.id); }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.97]"
                      style={{ color: T.emeraldLabel, background: isLight ? 'rgba(5,150,105,0.08)' : 'rgba(52,211,153,0.1)', border: `1px solid ${isLight ? 'rgba(5,150,105,0.2)' : 'rgba(52,211,153,0.25)'}` }}
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openDeleteModal(subject); }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.97]"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete Permanent Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl" style={{ background: T.modalBg, border: `1px solid ${T.modalBorder}` }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: T.text }}>Delete Subject Permanently?</h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: T.textSub }}>
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold" style={{ color: T.text }}>{selectedSubject?.name}</span>?
              <br /><br />
              <span className="block text-xs text-left px-3.5 py-2.5 rounded-xl space-y-1" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="block font-bold">⚠️ This action is permanent and cannot be undone.</span>
                <span className="block">🗑️ Data to be destroyed:</span>
                <span className="block pl-4">• {selectedSubject?.notes_count || 0} Notes</span>
                <span className="block pl-4">• {selectedSubject?.questions_count || 0} MCQ Questions</span>
                <span className="block pl-4">• {selectedSubject?.chunks_count || 0} RAG Knowledge Chunks</span>
                <span className="block pl-4">• Timetable, Doubts &amp; Daily challenges</span>
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{ color: T.textSub, background: T.statBg, border: `1px solid ${T.statBorder}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePermanent}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#ef4444', color: '#ffffff', border: 'none' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subject Archive Details Modal ── */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            style={{ background: T.modalBg, border: `1px solid ${T.modalBorder}`, boxShadow: T.shadow }}
          >
            {/* Colored top accent bar */}
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: selectedSubject?.color || '#EF4444' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex justify-between items-start shrink-0" style={{ borderBottom: `1px solid ${T.divider}` }}>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${selectedSubject?.color || '#EF4444'}20`, color: selectedSubject?.color || '#EF4444' }}
                >
                  {renderIcon(selectedSubject?.icon, "w-6 h-6")}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest" style={{ background: T.codeBg, color: T.codeText }}>
                      {selectedSubject?.code}
                    </span>
                    <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                      Archived · {selectedSubject?.remaining_days} days left
                    </span>
                  </div>
                  <h2 className="text-xl font-outfit font-bold mt-1 leading-tight" style={{ color: T.text }}>
                    {selectedSubject?.name}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: T.textSub }}>
                    {selectedSubject?.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 rounded-lg cursor-pointer transition-all shrink-0"
                style={{ color: T.closeBtnColor }}
                onMouseEnter={e => { e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.closeBtnColor; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 shrink-0" style={{ borderBottom: `1px solid ${T.divider}` }}>
              {[
                { label: 'Notes',     value: selectedSubject?.notes_count || 0,     color: T.violetLabel  },
                { label: 'Questions', value: selectedSubject?.questions_count || 0, color: T.fuchsiaLabel },
                { label: 'AI Chunks', value: selectedSubject?.chunks_count || 0,    color: T.emeraldLabel },
              ].map((s, i) => (
                <div key={s.label} className="py-3 text-center" style={{ borderRight: i < 2 ? `1px solid ${T.divider}` : undefined }}>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: T.textSub }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: T.modalBg }}>
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 rounded-full animate-spin"
                    style={{ border: `4px solid ${isLight ? 'rgba(124,58,237,0.2)' : 'rgba(139,92,246,0.25)'}`, borderTopColor: '#8b5cf6' }} />
                  <span className="text-sm font-medium" style={{ color: T.textSub }}>Loading details...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Notes column */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: isLight ? 'rgba(124,58,237,0.1)' : 'rgba(139,92,246,0.2)' }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: T.violetLabel }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: T.text }}>
                        Notes{' '}
                        <span className="font-normal text-xs" style={{ color: T.textSub }}>({detailsNotes.length})</span>
                      </span>
                    </div>
                    <div className="space-y-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {detailsNotes.length === 0 ? (
                        <div className="py-6 text-center rounded-xl" style={{ border: `1px dashed ${T.emptyBorder}` }}>
                          <p className="text-xs italic" style={{ color: T.textMuted }}>No notes uploaded for this subject.</p>
                        </div>
                      ) : (
                        detailsNotes.map(note => (
                          <div key={note.id} className="p-3 rounded-xl flex items-center gap-3"
                            style={{ background: T.itemBg, border: `1px solid ${T.itemBorder}` }}>
                            <FileText className="w-4 h-4 shrink-0" style={{ color: T.violetLabel }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{note.title}</p>
                              <span className="text-[10px]" style={{ color: T.textMuted }}>
                                {(note.file_size_kb / 1024).toFixed(2)} MB · {note.file_type?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Questions column */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: isLight ? 'rgba(162,28,175,0.1)' : 'rgba(232,121,249,0.2)' }}>
                        <AlertCircle className="w-3.5 h-3.5" style={{ color: T.fuchsiaLabel }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: T.text }}>
                        Questions{' '}
                        <span className="font-normal text-xs" style={{ color: T.textSub }}>({detailsQuestions.length})</span>
                      </span>
                    </div>
                    <div className="space-y-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {detailsQuestions.length === 0 ? (
                        <div className="py-6 text-center rounded-xl" style={{ border: `1px dashed ${T.emptyBorder}` }}>
                          <p className="text-xs italic" style={{ color: T.textMuted }}>No questions generated for this subject.</p>
                        </div>
                      ) : (
                        detailsQuestions.map((q, idx) => (
                          <div key={q.id} className="p-3 rounded-xl space-y-2"
                            style={{ background: T.itemBg, border: `1px solid ${T.itemBorder}` }}>
                            <p className="text-xs font-semibold leading-relaxed" style={{ color: T.text }}>
                              {idx + 1}. {q.question_text}
                            </p>
                            <div className="grid grid-cols-2 gap-1 pl-2">
                              {['a','b','c','d'].map(opt => (
                                <span key={opt} className="text-[10px]" style={{
                                  color: q.correct_answer === opt ? T.correctColor : T.wrongColor,
                                  fontWeight: q.correct_answer === opt ? 700 : 400
                                }}>
                                  {opt.toUpperCase()}: {q[`option_${opt}`]}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3 shrink-0"
              style={{ borderTop: `1px solid ${T.divider}`, background: T.footerBg }}>
              <button
                onClick={() => { setIsDetailsModalOpen(false); handleRestore(selectedSubject.id); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{ color: T.emeraldLabel, background: isLight ? 'rgba(5,150,105,0.08)' : 'rgba(52,211,153,0.1)', border: `1px solid ${isLight ? 'rgba(5,150,105,0.2)' : 'rgba(52,211,153,0.3)'}` }}
              >
                <RotateCcw className="w-4 h-4" /> Restore Subject
              </button>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ color: T.textSub, border: `1px solid ${T.divider}`, background: 'transparent' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
