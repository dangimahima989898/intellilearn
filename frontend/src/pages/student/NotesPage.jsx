import { useState, useEffect } from 'react'
import { FileText, Download, Eye, SearchX, Sparkles, X, Presentation } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import SubjectBadge from '../../components/SubjectBadge'

export default function StudentNotesPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [notes, setNotes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [summarizingId, setSummarizingId] = useState(null)
  const [activeSummaryNote, setActiveSummaryNote] = useState(null)

  const fetchData = async () => {
    try {
      const [notesData, subjectsData] = await Promise.all([
        studentService.getNotes(),
        studentService.getSubjects()
      ])
      setNotes(notesData || [])
      setSubjects(subjectsData || [])
    } catch (error) {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredNotes = notes

  const handleDownload = async (id, filename) => {
    try {
      const blob = await studentService.downloadNote(id)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      fetchData()
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const handleGenerateSummary = async (id) => {
    setSummarizingId(id)
    try {
      const data = await studentService.summarizeNote(id)
      toast.success('Summary generated successfully! 🤖')
      setNotes(prev => prev.map(note => note.id === id ? { ...note, summary: data.summary } : note))
      const currentNote = notes.find(n => n.id === id)
      if (currentNote) {
        setActiveSummaryNote({ ...currentNote, summary: data.summary })
      } else {
        fetchData()
      }
    } catch (error) {
      toast.error('Failed to generate summary.')
    } finally {
      setSummarizingId(null)
    }
  }

  const renderFormattedSummary = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('##')) {
        return (
          <h2 key={idx} className={`font-outfit font-semibold text-lg mb-2 mt-4 first:mt-0 pb-1 border-b ${
            isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/5'
          }`}>
            {trimmed.replace(/^##\s*/, '')}
          </h2>
        )
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <div key={idx} className={`text-sm flex items-start gap-2 mb-2 ml-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
            <span>{trimmed.replace(/^[-*]\s*/, '')}</span>
          </div>
        )
      }
      const matchOrdered = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (matchOrdered) {
        return (
          <div key={idx} className={`text-sm flex items-start gap-2 mb-2 ml-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
            <span className="text-blue-500 font-bold shrink-0">{matchOrdered[1]}.</span>
            <span>{matchOrdered[2]}</span>
          </div>
        )
      }
      if (trimmed === '') return <div key={idx} className="h-2" />
      return (
        <p key={idx} className={`text-sm leading-relaxed mb-3 ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
          {trimmed}
        </p>
      )
    })
  }

  const getFileIconColors = (type) => {
    const t = type.toLowerCase()
    if (t.includes('pdf')) return { bg: isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-500 border-red-500/20', icon: FileText }
    if (t.includes('doc')) return { bg: isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: FileText }
    if (t.includes('ppt')) return { bg: isLight ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Presentation }
    return { bg: isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-white/50 border-white/10', icon: FileText }
  }

  const getSubjectColor = (id) => {
    const sub = subjects.find(s => s.id === id)
    return sub?.color || '#3B82F6'
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-outfit font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {user?.course_code ? `${user.course_code} Semester ${user.current_semester} — Study Materials` : "My Notes"}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
              isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
              Showing notes for {user?.course_code || 'MCA'} Sem {user?.current_semester || 4} · {filteredNotes.length} files
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className={`h-56 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`} />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center max-w-md mx-auto shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
        }`}>
          <SearchX className={`w-12 h-12 mx-auto mb-4 ${isLight ? 'text-slate-300' : 'text-white/20'}`} />
          <h3 className={`font-bold text-lg ${isLight ? 'text-slate-700' : 'text-white'}`}>No notes found</h3>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No study materials uploaded for this filter yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map(note => {
            const fileStyle = getFileIconColors(note.file_type)
            const FileIcon = fileStyle.icon

            return (
              <div 
                key={note.id} 
                className={`border rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${
                  isLight 
                    ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md shadow-sm' 
                    : 'bg-white/5 border-white/10 hover:border-blue-500/30'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${fileStyle.bg}`}>
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-white/50 border-white/5'
                    }`}>
                      {(note.file_size_kb / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <h3 className={`font-bold text-md font-outfit line-clamp-2 min-h-[44px] ${isLight ? 'text-slate-800' : 'text-white'}`} title={note.title}>
                    {note.title}
                  </h3>
                  
                  <div className="mt-2">
                    <SubjectBadge name={note.subject_name} />
                  </div>
                </div>

                <div>
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold uppercase ${
                    isLight ? 'border-slate-100 text-slate-400' : 'border-white/10 text-white/40'
                  }`}>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    <span>↓ {note.download_count || 0}</span>
                  </div>

                  <div className="flex gap-2 mt-4 pt-2">
                    <button 
                      onClick={() => setActiveSummaryNote(note)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isLight 
                          ? 'border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700'
                          : 'border-teal-500/25 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Summary
                    </button>
                    <button 
                      onClick={() => handleDownload(note.id, `${note.title}.${note.file_type.toLowerCase()}`)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isLight 
                          ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                          : 'border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── VIEW SUMMARY MODAL ── */}
      {activeSummaryNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 relative ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0F172A] border-white/10'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <div className="min-w-0">
                <h3 className={`font-outfit font-extrabold text-lg truncate pr-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeSummaryNote.title}</h3>
                <div className="mt-1">
                  <SubjectBadge name={activeSummaryNote.subject_name} />
                </div>
              </div>
              <button 
                onClick={() => setActiveSummaryNote(null)}
                className={`transition-colors cursor-pointer shrink-0 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/50 hover:text-white'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Summary content */}
            <div className="overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin">
              {activeSummaryNote.summary ? (
                <div className={`border p-5 rounded-2xl ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/3 border-white/5'}`}>
                  {renderFormattedSummary(activeSummaryNote.summary)}
                </div>
              ) : summarizingId === activeSummaryNote.id ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className={`text-sm font-semibold animate-pulse ${isLight ? 'text-slate-500' : 'text-white/60'}`}>🤖 AI is reading your notes...</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
                  <h4 className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Generate Note Summary</h4>
                  <p className={`text-xs mt-1 px-8 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Let the AI scan this document to build a summary for quick revision.</p>
                  
                  <button
                    onClick={() => handleGenerateSummary(activeSummaryNote.id)}
                    className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> Generate AI Summary
                  </button>
                </div>
              )}
            </div>

            <div className={`flex justify-end pt-6 mt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <button
                onClick={() => setActiveSummaryNote(null)}
                className={`px-5 py-2.5 border font-bold rounded-xl text-xs transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
