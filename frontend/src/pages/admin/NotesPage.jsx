import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Trash2, Upload, X, Filter } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

export default function NotesPage() {
  const [notes, setNotes] = [useState([]), useState([])][0]
  const [actualNotes, setActualNotes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [uploadData, setUploadData] = useState({ title: '', subject_id: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchData = async () => {
    try {
      const [notesData, subjectsData] = await Promise.all([
        adminService.getNotes(),
        adminService.getSubjects()
      ])
      setActualNotes(notesData)
      setSubjects(subjectsData)
    } catch (error) {
      toast.error('Failed to load notes data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredNotes = selectedSubjectFilter === 'all' 
    ? actualNotes 
    : actualNotes.filter(n => n.subject_id === selectedSubjectFilter)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx', 'ppt', 'pptx'].includes(ext)) {
      toast.error('Invalid file type. Only PDF, DOCX, PPT, PPTX allowed.')
      e.target.value = ''
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit.')
      e.target.value = ''
      return
    }
    
    setSelectedFile(file)
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Please select a file")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('title', uploadData.title)
    formData.append('subject_id', uploadData.subject_id)
    formData.append('file', selectedFile)

    try {
      await adminService.uploadNote(formData)
      toast.success('Note uploaded successfully')
      setIsModalOpen(false)
      setUploadData({ title: '', subject_id: '' })
      setSelectedFile(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload note')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (id, filename) => {
    try {
      const blob = await adminService.downloadNote(id)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await adminService.deleteNote(id)
        toast.success('Note deleted')
        fetchData()
      } catch (error) {
        toast.error('Failed to delete note')
      }
    }
  }

  const getBadgeColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'pdf') return 'bg-red-500/10 text-red-500 border-red-500/20'
    if (t === 'docx' || t === 'doc') return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    if (t.includes('ppt')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    return 'bg-navy-700 text-white'
  }

  if (loading) return <div className="p-8 text-center text-navy-400">Loading notes...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Notes & Materials</h1>
          <p className="text-navy-400 text-sm">Manage course documents and lecture slides.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand/20"
        >
          <Upload className="w-4 h-4" />
          Upload Note
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedSubjectFilter('all')}
          className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSubjectFilter === 'all' ? 'bg-navy-700 border-navy-600 text-white' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
        >
          All Subjects
        </button>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectFilter(sub.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSubjectFilter === sub.id ? 'bg-navy-700 border-navy-600 text-white' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      <div className="card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-navy-900/50 text-navy-400 text-xs uppercase tracking-wider border-b border-navy-700">
                <th className="p-4 font-semibold">Title & Details</th>
                <th className="p-4 font-semibold">Subject</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Size</th>
                <th className="p-4 font-semibold">Stats</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-navy-500">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No notes found for this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-navy-700/20 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-medium text-sm">{note.title}</p>
                      <p className="text-navy-400 text-xs mt-1">Uploaded by {note.uploaded_by_name} • {new Date(note.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4 text-navy-300 text-sm">{note.subject_name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${getBadgeColor(note.file_type)}`}>
                        {note.file_type}
                      </span>
                    </td>
                    <td className="p-4 text-navy-400 text-sm">{(note.file_size_kb / 1024).toFixed(2)} MB</td>
                    <td className="p-4 text-navy-400 text-sm">{note.download_count} DLs</td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => handleDownload(note.id, `${note.title}.${note.file_type.toLowerCase()}`)}
                        className="p-2 text-brand bg-brand/10 hover:bg-brand/20 rounded-lg transition-colors inline-block"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors inline-block"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-700 flex justify-between items-center bg-navy-900/50">
              <h2 className="text-xl font-outfit font-bold text-white">Upload New Note</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Document Title</label>
                <input
                  required
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  placeholder="e.g. Chapter 1: Introduction"
                />
              </div>

              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Subject</label>
                <select
                  required
                  value={uploadData.subject_id}
                  onChange={(e) => setUploadData({...uploadData, subject_id: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
                >
                  <option value="" disabled>Select a subject...</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">File (.pdf, .docx, .pptx)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${selectedFile ? 'border-brand bg-brand/5' : 'border-navy-600 hover:border-brand hover:bg-navy-700/30'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.ppt,.pptx"
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <FileText className="w-8 h-8 text-brand mx-auto" />
                      <p className="text-white text-sm font-medium truncate px-4">{selectedFile.name}</p>
                      <p className="text-navy-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-navy-400 mx-auto" />
                      <p className="text-navy-300 text-sm">Click to browse files</p>
                      <p className="text-navy-500 text-xs">Max 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl font-medium transition-colors shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Upload Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
