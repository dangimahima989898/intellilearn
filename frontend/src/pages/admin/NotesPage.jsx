import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Trash2, Upload, X, Loader2 } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'

export default function NotesPage() {
  const [actualNotes, setActualNotes] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Upload modal state
  const [uploadData, setUploadData] = useState({ title: '', subject_id: '' })
  const [modalCourseId, setModalCourseId] = useState('')
  const [modalSemester, setModalSemester] = useState('')
  const [modalSubjects, setModalSubjects] = useState([])
  const [modalSubjectsLoading, setModalSubjectsLoading] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchData = async (courseId = null, semester = null) => {
    try {
      setLoading(true)
      const notesData = await adminService.getNotes(null, courseId || null, semester || null)
      setActualNotes(notesData || [])
    } catch (error) {
      console.error("Failed to load notes:", error)
      toast.error('Failed to load notes data')
      setActualNotes([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch all subjects for the listing filter (optional, if we want to show subject names or filters)
  const [allSubjects, setAllSubjects] = useState([])
  useEffect(() => {
    const loadAllSubjects = async () => {
      try {
        const subs = await adminService.getSubjects()
        setAllSubjects(subs || [])
      } catch (err) {
        console.error("Failed to load all subjects:", err)
      }
    }
    loadAllSubjects()
  }, [])

  useEffect(() => {
    fetchData(filterCourseId, filterSemester)
  }, [filterCourseId, filterSemester])

  // Fetch subjects in modal dynamically when course/semester changes
  useEffect(() => {
    const fetchModalSubjects = async () => {
      if (!modalCourseId) {
        setModalSubjects([])
        return
      }
      setModalSubjectsLoading(true)
      try {
        const data = await adminService.getSubjects(modalCourseId, modalSemester || null)
        setModalSubjects(data || [])
      } catch (err) {
        console.error("Failed to load subjects for upload modal:", err)
        setModalSubjects([])
      } finally {
        setModalSubjectsLoading(false)
      }
    }
    fetchModalSubjects()
  }, [modalCourseId, modalSemester])

  const relevantSubjects = allSubjects.filter(sub => {
    const matchCourse = !filterCourseId || sub.course_id === filterCourseId
    const matchSem = !filterSemester || sub.semester_number === filterSemester
    return matchCourse && matchSem
  })

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
    if (!uploadData.subject_id) {
      toast.error("Please select a subject")
      return
    }

    setUploading(true)
    setUploadProgress(0)
    
    // Animate upload progress smoothly
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 12, 95))
    }, 150)

    const formData = new FormData()
    formData.append('title', uploadData.title)
    formData.append('subject_id', uploadData.subject_id)
    formData.append('file', selectedFile)
    if (modalCourseId) {
      formData.append('course_id', modalCourseId)
    }
    if (modalSemester) {
      formData.append('semester_number', modalSemester)
    }

    try {
      await adminService.uploadNote(formData)
      setUploadProgress(100)
      
      setTimeout(() => {
        toast.success('Note uploaded successfully')
        setIsModalOpen(false)
        setUploadData({ title: '', subject_id: '' })
        setModalCourseId('')
        setModalSemester('')
        setSelectedFile(null)
        fetchData(filterCourseId, filterSemester)
      }, 400)

    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload note')
    } finally {
      clearInterval(interval)
      setTimeout(() => setUploading(false), 400)
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
        fetchData(filterCourseId, filterSemester)
      } catch (error) {
        toast.error('Failed to delete note')
      }
    }
  }

  const getBadgeStyle = (type) => {
    const t = type.toLowerCase()
    if (t.includes('pdf')) return { bg: 'bg-red-500/10', color: 'text-red-400', border: 'border-red-500/20' }
    if (t.includes('doc')) return { bg: 'bg-blue-500/10', color: 'text-blue-400', border: 'border-blue-500/20' }
    if (t.includes('ppt')) return { bg: 'bg-orange-500/10', color: 'text-orange-400', border: 'border-orange-500/20' }
    return { bg: 'bg-white/5', color: 'text-white/70', border: 'border-white/10' }
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Notes & Materials</h1>
          <p className="text-white/50 text-sm mt-1">Manage course study materials</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] cursor-pointer"
        >
          <Upload className="w-5 h-5" />
          Upload Note
        </button>
      </div>

      {/* Dynamic Course & Semester Filters */}
      <div className="mb-6">
        <CourseSemesterSelector
          initialCourseId={filterCourseId}
          initialSemester={filterSemester}
          onSelect={(selection) => {
            setFilterCourseId(selection.courseId || "")
            setFilterSemester(selection.semesterNumber || "")
            setSelectedSubjectFilter('all') // Reset subject tab filter
          }}
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">
            <div className="w-20 h-10 bg-white/5 rounded-full" />
            <div className="w-28 h-10 bg-white/5 rounded-full" />
          </div>
          <div className="h-96 bg-white/5 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Subject Filter Tabs (horizontal scroll on mobile) */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0">
            <button
              onClick={() => setSelectedSubjectFilter('all')}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                selectedSubjectFilter === 'all' 
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                  : 'text-white/50 hover:text-white bg-white/5 border-transparent'
              }`}
            >
              All Subjects
            </button>
            {relevantSubjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                  selectedSubjectFilter === sub.id 
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                    : 'text-white/50 hover:text-white bg-white/5 border-transparent'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>

          {/* Notes Table (glass card) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-white/5 text-white/40 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold rounded-tl-2xl">File</th>
                    <th className="p-4 font-semibold">Title</th>
                    <th className="p-4 font-semibold">Subject</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Size</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Downloads</th>
                    <th className="p-4 font-semibold text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredNotes.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8">
                        <EmptyState title="No notes found" description="Upload a study note for this subject." icon={FileText} />
                      </td>
                    </tr>
                  ) : (
                    filteredNotes.map((note) => {
                      const style = getBadgeStyle(note.file_type)
                      return (
                        <tr key={note.id} className="hover:bg-white/3 transition-colors group">
                          {/* File Icon Column */}
                          <td className="p-4 w-16">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bg}`}>
                              <FileText className={`w-5 h-5 ${style.color}`} />
                            </div>
                          </td>
                          {/* Title */}
                          <td className="p-4">
                            <p className="text-white font-medium text-sm truncate max-w-[200px]" title={note.title}>{note.title}</p>
                          </td>
                          {/* Subject */}
                          <td className="p-4 text-white/70 text-sm truncate max-w-[150px]">{note.subject_name}</td>
                          {/* Type Badge */}
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${style.border} ${style.bg} ${style.color}`}>
                              {note.file_type}
                            </span>
                          </td>
                          {/* Size */}
                          <td className="p-4 text-white/50 text-sm">
                            {(note.file_size_kb / 1024).toFixed(2)} MB
                          </td>
                          {/* Date */}
                          <td className="p-4 text-white/50 text-sm">
                            {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          {/* Downloads */}
                          <td className="p-4 text-white/50 text-sm">{note.download_count || 0}</td>
                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleDownload(note.id, `${note.title}.${note.file_type.toLowerCase()}`)}
                                className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(note.id)}
                                className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Upload Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            
            {/* Upload progress bar */}
            {uploading && (
              <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200 animate-pulse" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white">Upload Note</h2>
              <button disabled={uploading} onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <CourseSemesterSelector
                required
                initialCourseId={modalCourseId}
                initialSemester={modalSemester}
                onSelect={(selection) => {
                  setModalCourseId(selection.courseId || "")
                  setModalSemester(selection.semesterNumber || "")
                }}
              />

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Document Title</label>
                <input
                  required
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                  disabled={uploading}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all disabled:opacity-50"
                  placeholder="e.g. Chapter 1: Introduction"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5 flex items-center justify-between">
                  <span>Subject</span>
                  {modalSubjectsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />}
                </label>
                <select
                  required
                  value={uploadData.subject_id}
                  onChange={(e) => setUploadData({...uploadData, subject_id: e.target.value})}
                  disabled={uploading || modalSubjectsLoading || !modalCourseId}
                  className="w-full bg-[#0A0F1E] border border-white/15 disabled:opacity-40 disabled:border-white/5 rounded-xl px-4 py-3 text-white disabled:text-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    {!modalCourseId ? "Select Course & Semester First..." : modalSubjectsLoading ? "Loading subjects..." : modalSubjects.length === 0 ? "No subjects found for this semester" : "Select a subject..."}
                  </option>
                  {modalSubjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-[#0f172a] text-white">{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">File (.pdf, .docx, .ppt, .pptx)</label>
                <div 
                  className={`border border-white/20 border-dashed rounded-xl p-8 text-center transition-colors ${
                    uploading ? 'opacity-50 cursor-not-allowed border-white/10' : 
                    selectedFile ? 'border-violet-500 bg-violet-500/5 cursor-pointer' : 
                    'hover:border-violet-500 cursor-pointer'
                  }`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.ppt,.pptx"
                    disabled={uploading}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 text-violet-400 mx-auto" />
                      <p className="text-white text-sm font-medium truncate px-4">{selectedFile.name}</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-white/50 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className={`text-[10px] font-bold uppercase rounded-sm px-1.5 ${getBadgeStyle(selectedFile.name.split('.').pop()).color} ${getBadgeStyle(selectedFile.name.split('.').pop()).bg}`}>
                          {selectedFile.name.split('.').pop()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-white/30 mx-auto" />
                      <p className="text-white/40 text-sm">Drag and drop your file here</p>
                      <p className="text-xs text-white/30">or <span className="text-blue-400 font-semibold">Browse files</span></p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-all shadow-lg cursor-pointer ${
                    uploading ? 'bg-violet-600/50' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-500/25'
                  }`}
                >
                  {uploading ? (
                    'Uploading...'
                  ) : 'Upload Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
