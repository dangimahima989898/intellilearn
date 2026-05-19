import { useState, useEffect } from 'react'
import { FileText, Download, Eye, SearchX } from 'lucide-react'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentNotesPage() {
  const [notes, setNotes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')

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
                <button 
                  onClick={() => toast('AI Summary Generation coming in Step 8!', { icon: '🤖' })}
                  className="p-2 rounded-xl bg-navy-900 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors border border-navy-700"
                  title="View AI Summary"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
