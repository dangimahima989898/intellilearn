import { useState, useEffect } from 'react'
import { FileText, Download, Eye, SearchX, Sparkles, X } from 'lucide-react'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentNotesPage() {
  const [notes, setNotes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [summarizingId, setSummarizingId] = useState(null)
  const [activeSummaryNote, setActiveSummaryNote] = useState(null)

  const fetchData = async () => {
    try {
      const [notesData, subjectsData] = await Promise.all([
        studentService.getNotes(),
        studentService.getSubjects()
      ])
      setNotes(notesData)
      setSubjects(subjectsData)
    } catch (error) {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredNotes = selectedSubjectFilter === 'all' 
    ? notes 
    : notes.filter(n => n.subject_id === selectedSubjectFilter)

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
      // Refresh to update download count
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
      
      // Update local notes state
      setNotes(prev => prev.map(note => note.id === id ? { ...note, summary: data.summary } : note))
      
      // Find updated note and set it as active summary for display
      const currentNote = notes.find(n => n.id === id)
      if (currentNote) {
        setActiveSummaryNote({ ...currentNote, summary: data.summary })
      } else {
        // Fallback fetch if not found immediately
        fetchData()
      }
    } catch (error) {
      toast.error('Failed to generate summary.')
    } finally {
      setSummarizingId(null)
    }
  }

  // Parse and render basic markdown layout safely in React
  const renderFormattedSummary = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('##')) {
        return (
          <h4 key={idx} className="text-base font-bold text-white mt-4 mb-2 first:mt-0 font-outfit border-b border-navy-700 pb-1">
            {trimmed.replace(/^##\s*/, '')}
          </h4>
        )
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <li key={idx} className="text-navy-300 text-sm list-disc list-inside ml-2 mb-1.5 leading-relaxed">
            {trimmed.replace(/^[-*]\s*/, '')}
          </li>
        )
      }
      const matchOrdered = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (matchOrdered) {
        return (
          <div key={idx} className="text-navy-300 text-sm ml-2 mb-2 leading-relaxed flex items-start gap-2">
            <span className="text-brand font-bold shrink-0">{matchOrdered[1]}.</span>
            <span>{matchOrdered[2]}</span>
          </div>
        )
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />
      }
      return (
        <p key={idx} className="text-navy-300 text-sm leading-relaxed mb-2">
          {trimmed}
        </p>
      )
    })
  }

  const getBadgeColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'pdf') return 'bg-red-500/10 text-red-500 border-red-500/20'
    if (t === 'docx' || t === 'doc') return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    if (t.includes('ppt')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    return 'bg-navy-700 text-white border-navy-600'
  }

  if (loading) return <div className="p-8 text-center text-navy-400">Loading study materials...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">My Notes</h1>
        <p className="text-navy-400 text-sm">Access lecture slides, assignments, and study materials.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedSubjectFilter('all')}
          className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSubjectFilter === 'all' ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
        >
          All Subjects
        </button>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectFilter(sub.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSubjectFilter === sub.id ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="card bg-navy-800/50 border border-navy-700 border-dashed rounded-2xl p-12 text-center">
          <SearchX className="w-10 h-10 text-navy-500 mx-auto mb-3" />
          <p className="text-navy-400 text-sm">No notes available for this subject yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <div key={note.id} className="card bg-navy-800 border border-navy-700 rounded-2xl p-5 hover:border-navy-500 transition-colors group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl border ${getBadgeColor(note.file_type)}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-navy-900 text-navy-400 border border-navy-700">
                  {(note.file_size_kb / 1024).toFixed(2)} MB
                </span>
              </div>
              
              <div className="flex-1 min-h-[80px]">
                <h3 className="font-outfit font-bold text-white text-lg leading-tight mb-2 line-clamp-2">{note.title}</h3>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-900 text-brand border border-brand/20 mb-2">
                  {note.subject_name}
                </span>
                <p className="text-navy-400 text-xs mt-1">Uploaded {new Date(note.created_at).toLocaleDateString()}</p>
              </div>

              <div className="pt-4 mt-2 border-t border-navy-700 flex gap-2">
                <button 
                  onClick={() => handleDownload(note.id, `${note.title}.${note.file_type.toLowerCase()}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand/10 hover:bg-brand hover:text-white text-brand transition-colors text-sm font-semibold border border-brand/20 hover:border-brand"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                {note.summary ? (
                  <button 
                    onClick={() => setActiveSummaryNote(note)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand/10 hover:bg-brand hover:text-white text-brand transition-colors text-sm font-semibold border border-brand/20 hover:border-brand"
                    title="View AI Summary"
                  >
                    <Eye className="w-4 h-4" /> View Summary
                  </button>
                ) : (
                  <button 
                    disabled={summarizingId === note.id}
                    onClick={() => handleGenerateSummary(note.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-emerald-500/20 hover:border-emerald-650 transition-colors text-sm font-semibold disabled:opacity-50"
                    title="Generate AI Summary"
                  >
                    {summarizingId === note.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> AI Summary
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW SUMMARY MODAL ── */}
      {activeSummaryNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-800 border border-navy-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-navy-700 bg-navy-900/50">
              <div className="flex items-center gap-2 text-brand">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-outfit font-bold text-white text-lg line-clamp-1">AI Note Summary</h3>
              </div>
              <button 
                onClick={() => setActiveSummaryNote(null)}
                className="p-1 rounded-lg hover:bg-navy-800 text-navy-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
              <div>
                <h4 className="text-white font-bold text-base leading-tight mb-1">{activeSummaryNote.title}</h4>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-900 text-brand border border-brand/20">
                  {activeSummaryNote.subject_name}
                </span>
              </div>
              <div className="bg-navy-900/40 border border-navy-750 p-4 rounded-2xl space-y-2">
                {renderFormattedSummary(activeSummaryNote.summary)}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-navy-900/30 border-t border-navy-750 flex justify-end">
              <button 
                onClick={() => setActiveSummaryNote(null)}
                className="px-5 py-2 rounded-xl bg-brand text-white hover:opacity-90 transition-opacity text-sm font-bold"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
