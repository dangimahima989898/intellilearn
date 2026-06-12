import { useState, useEffect } from 'react'
import { BookOpen, Database, Monitor, Network, Coffee, Code, RotateCcw, Trash2, AlertCircle, Calendar, ArrowLeft, X, FileText } from 'lucide-react'
import adminService from '../../services/adminService'
import { getQuestions } from '../../services/questionService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'

export default function ArchivePage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsNotes, setDetailsNotes] = useState([])
  const [detailsQuestions, setDetailsQuestions] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

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

  useEffect(() => {
    fetchArchivedSubjects()
  }, [])

  const handleRestore = async (subjectId) => {
    try {
      await adminService.restoreSubject(subjectId)
      toast.success('Subject restored successfully')
      fetchArchivedSubjects()
    } catch (error) {
      console.error('Failed to restore subject:', error)
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
      console.error('Failed to permanently delete subject:', error)
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
      const [notes, questions] = await Promise.all([
        adminService.getNotes(subject.id, null, null, true),
        getQuestions({ subject_id: subject.id, include_archived: true, size: 50 })
      ])
      setDetailsNotes(notes || [])
      setDetailsQuestions(questions || [])
    } catch (err) {
      console.error('Failed to load archived subject details:', err)
      toast.error('Failed to load subject detail items')
    } finally {
      setDetailsLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-500" />
            Archive / Trash
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Subjects soft-deleted will stay here for 15 days before permanent removal.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Archive is empty"
          description="There are no archived subjects in the trash bin right now."
        />
      ) : (
        /* Archived Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {subjects.map(subject => {
            const daysLeft = subject.remaining_days
            const progressPercent = (daysLeft / 15) * 100
            
            return (
              <div 
                key={subject.id} 
                onClick={() => openDetailsModal(subject)}
                className="bg-[#0F172A]/70 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 flex flex-col justify-between cursor-pointer" 
                style={{ borderLeftColor: subject.color || '#EF4444', borderLeftWidth: '4px' }}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject.color || '#EF4444'}33`, color: subject.color || '#EF4444' }}>
                      {renderIcon(subject.icon, "w-6 h-6")}
                    </div>
                    <span 
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-white/5 text-white/70"
                    >
                      {subject.code}
                    </span>
                  </div>

                  <h3 className="font-outfit font-semibold text-xl text-white mt-3 truncate">{subject.name}</h3>
                  
                  {/* Associated Contents */}
                  <div className="mt-4 space-y-2 bg-white/5 p-3.5 rounded-xl border border-white/5 text-xs text-white/70">
                    <h4 className="font-semibold text-white/90 border-b border-white/10 pb-1.5 mb-2 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-violet-400" />
                      Associated Content to Delete:
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-white/80">
                      <div className="bg-white/[0.03] py-2 px-1 rounded-lg border border-white/5">
                        <div className="text-sm font-bold text-violet-400">{subject.notes_count || 0}</div>
                        <div className="text-[10px] text-white/40">Notes</div>
                      </div>
                      <div className="bg-white/[0.03] py-2 px-1 rounded-lg border border-white/5">
                        <div className="text-sm font-bold text-fuchsia-400">{subject.questions_count || 0}</div>
                        <div className="text-[10px] text-white/40">Questions</div>
                      </div>
                      <div className="bg-white/[0.03] py-2 px-1 rounded-lg border border-white/5">
                        <div className="text-sm font-bold text-emerald-400">{subject.chunks_count || 0}</div>
                        <div className="text-[10px] text-white/40">AI Chunks</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                      <span className="flex items-center gap-1.5 text-white/55">
                        <Calendar className="w-3.5 h-3.5" /> Deleted Date:
                      </span>
                      <span className="font-medium text-white/90">
                        {formatDate(subject.archived_at)}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-white/55">Auto-delete in:</span>
                        <span className={`font-bold ${daysLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                        </span>
                      </div>
                      {/* Progress bar countdown */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${daysLeft <= 3 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-5 pt-4 border-t border-white/10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestore(subject.id); }} 
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-500/20 font-medium text-xs transition-all border border-transparent hover:border-emerald-500/25 cursor-pointer bg-white/5 active:scale-[0.98]"
                    >
                      <RotateCcw className="w-4 h-4" /> Restore
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDeleteModal(subject); }} 
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 font-medium text-xs transition-all border border-transparent hover:border-red-500/25 cursor-pointer bg-white/5 active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Permanently
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Permanent Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Subject Permanently?</h3>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete <span className="text-white font-semibold">{selectedSubject?.name}</span>?
              <br /><br />
              <span className="text-red-300 font-semibold bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl block text-xs text-left space-y-1.5">
                <span className="block font-bold text-red-400">⚠️ Danger: This action is permanent and cannot be undone.</span>
                <span className="block">🗑️ The following data will be immediately and completely destroyed:</span>
                <span className="block pl-4">• {selectedSubject?.notes_count || 0} Notes (and physical files on disk)</span>
                <span className="block pl-4">• {selectedSubject?.questions_count || 0} MCQ Questions</span>
                <span className="block pl-4">• {selectedSubject?.chunks_count || 0} RAG Knowledge Chunks</span>
                <span className="block pl-4">• Timetable slots, Doubt discussions, and Daily challenges</span>
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePermanent}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Subject Archive Details Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start shrink-0" style={{ borderTop: `4px solid ${selectedSubject?.color || '#EF4444'}` }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-white/5 text-white/70">
                    {selectedSubject?.code}
                  </span>
                  <span className="text-amber-400 text-xs font-semibold">
                    (Archived — {selectedSubject?.remaining_days} days left)
                  </span>
                </div>
                <h2 className="text-2xl font-outfit font-bold text-white mt-1.5">{selectedSubject?.name}</h2>
                <p className="text-white/40 text-xs mt-1">{selectedSubject?.description || 'No description provided.'}</p>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)} 
                className="text-white/50 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-3">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Loading details...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Notes List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white/95 flex items-center gap-2 pb-1.5 border-b border-white/10">
                      <FileText className="w-4 h-4 text-violet-400" />
                      Archived Notes ({detailsNotes.length})
                    </h3>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {detailsNotes.length === 0 ? (
                        <p className="text-xs text-white/30 italic py-4">No notes uploaded for this subject.</p>
                      ) : (
                        detailsNotes.map(note => (
                          <div key={note.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate" title={note.title}>{note.title}</p>
                              <span className="text-[10px] text-white/40">{(note.file_size_kb / 1024).toFixed(2)} MB · {note.file_type.toUpperCase()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white/95 flex items-center gap-2 pb-1.5 border-b border-white/10">
                      <AlertCircle className="w-4 h-4 text-fuchsia-400" />
                      Archived Questions ({detailsQuestions.length})
                    </h3>
                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                      {detailsQuestions.length === 0 ? (
                        <p className="text-xs text-white/30 italic py-4">No practice questions generated for this subject.</p>
                      ) : (
                        detailsQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                            <p className="text-xs font-semibold text-white/90 leading-relaxed">
                              {idx + 1}. {q.question_text}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-white/50 pl-3">
                              <span className={q.correct_answer === 'a' ? 'text-emerald-400 font-bold' : ''}>A: {q.option_a}</span>
                              <span className={q.correct_answer === 'b' ? 'text-emerald-400 font-bold' : ''}>B: {q.option_b}</span>
                              <span className={q.correct_answer === 'c' ? 'text-emerald-400 font-bold' : ''}>C: {q.option_c}</span>
                              <span className={q.correct_answer === 'd' ? 'text-emerald-400 font-bold' : ''}>D: {q.option_d}</span>
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
            <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsDetailsModalOpen(false)} 
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
