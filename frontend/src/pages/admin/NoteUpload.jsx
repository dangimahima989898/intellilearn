import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
  RefreshCw,
  FolderOpen,
  Hash,
  X,
  FileDown
} from "lucide-react"
import toast from "react-hot-toast"
import courseService from "../../services/courseService"
import adminService from "../../services/adminService"
import summaryService from "../../services/summaryService"

export default function NoteUpload() {
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("Unit 1")
  const [semestersList, setSemestersList] = useState([])
  
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [queue, setQueue] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch initial data on mount
  useEffect(() => {
    fetchCourses()
    fetchAllSubjects()
    fetchActiveQueue()
    
    // Poll queue status every 5 seconds
    const interval = setInterval(() => {
      fetchActiveQueue()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCourses = async () => {
    try {
      const data = await courseService.getCourses()
      setCourses(data)
    } catch (err) {
      toast.error("Failed to load courses")
    }
  }

  const fetchAllSubjects = async () => {
    try {
      const data = await adminService.getSubjects()
      setSubjects(data)
    } catch (err) {
      toast.error("Failed to load subjects")
    }
  }

  const fetchActiveQueue = async () => {
    try {
      const data = await summaryService.getDraftSummaries()
      setQueue(data)
    } catch (err) {
      console.error("Failed to fetch processing queue", err)
    }
  }

  const handleSubjectChange = (e) => {
    const subjId = e.target.value
    setSelectedSubject(subjId)
    
    if (subjId) {
      const sub = subjects.find(s => s.id === subjId)
      if (sub) {
        setSelectedCourse(sub.course_id || "")
        setSelectedSemester(sub.semester_number || "")
        if (sub.semester_number) {
          setSemestersList([sub.semester_number])
        } else {
          setSemestersList([])
        }
      } else {
        setSelectedCourse("")
        setSelectedSemester("")
        setSemestersList([])
      }
    } else {
      setSelectedCourse("")
      setSelectedSemester("")
      setSemestersList([])
    }
  }

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === "application/pdf"
      )
      if (droppedFiles.length === 0) {
        toast.error("Only PDF files are supported.")
        return
      }
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === "application/pdf"
      )
      if (selectedFiles.length === 0) {
        toast.error("Only PDF files are supported.")
        return
      }
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSubject) {
      toast.error("Please select a subject")
      return
    }
    if (files.length === 0) {
      toast.error("Please select at least one PDF file")
      return
    }

    setUploading(true)
    const toastId = toast.loading("Uploading and queueing notes summary generation...")

    try {
      const formData = new FormData()
      formData.append("subject_id", selectedSubject)
      formData.append("unit", selectedUnit)
      files.forEach(file => {
        formData.append("files", file)
      })

      await summaryService.uploadSummaryNote(formData)
      
      toast.success("Notes uploaded successfully and queued for extraction & AI summarization!", { id: toastId })
      setFiles([])
      fetchActiveQueue()
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to upload files"
      toast.error(detail, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const triggerRegenerate = async (noteId) => {
    const toastId = toast.loading("Queueing re-generation...")
    try {
      await summaryService.regenerateSummary(noteId)
      toast.success("Re-generation started!", { id: toastId })
      fetchActiveQueue()
    } catch (err) {
      toast.error("Failed to trigger re-generation", { id: toastId })
    }
  }

  return (
    <div className="w-full font-dm text-slate-800 dark:text-white relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-5">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-outfit font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="text-violet-600 dark:text-violet-400">✦</span> Smart Notes Summarizer
            </h1>
            <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
              Upload PDF study materials to generate syllabus-aligned, exam-ready summaries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Syllabus Mapping Section */}
          <div className="lg:col-span-6 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm dark:shadow-xl backdrop-blur-xl h-fit">
            <h3 className="text-sm font-outfit font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
              <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Syllabus Mapping
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject Selection */}
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-white/50 font-bold block mb-1.5 tracking-wider uppercase">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={handleSubjectChange}
                    className="w-full bg-slate-50 dark:bg-[#121829]/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))}
                  </select>
                </div>

                {/* Unit Selection */}
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-white/50 font-bold block mb-1.5 tracking-wider uppercase">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#121829]/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  >
                    {["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"].map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Selection (Locked) */}
                <div>
                  <label className="text-[10px] text-slate-550 dark:text-white/55 font-bold block mb-1.5 tracking-wider uppercase">
                    Course (Auto-selected)
                  </label>
                  <select
                    value={selectedCourse}
                    className="w-full bg-slate-100 dark:bg-[#121829]/30 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-500 dark:text-white/50 text-sm focus:outline-none cursor-not-allowed"
                    disabled
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Selection (Locked) */}
                <div>
                  <label className="text-[10px] text-slate-550 dark:text-white/55 font-bold block mb-1.5 tracking-wider uppercase">
                    Semester (Auto-selected)
                  </label>
                  <select
                    value={selectedSemester}
                    className="w-full bg-slate-100 dark:bg-[#121829]/30 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-500 dark:text-white/50 text-sm focus:outline-none cursor-not-allowed"
                    disabled
                    required
                  >
                    <option value="">Select Semester</option>
                    {semestersList.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <label className="text-[10px] text-slate-500 dark:text-white/50 font-bold block mb-1.5 tracking-wider uppercase">
                  PDF Documents <span className="text-red-500">*</span>
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group bg-violet-500/[0.02] hover:bg-violet-500/[0.04] ${
                    isDragActive
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-violet-200 dark:border-white/10 hover:border-violet-400"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center mx-auto mb-3 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-850 dark:text-white/90">
                    Drag & Drop PDF Here
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-1">
                    or click to browse
                  </p>
                  <p className="text-[10px] text-slate-450 dark:text-white/30 mt-2">
                    PDF &bull; Max 10 MB
                  </p>
                </div>
              </div>

              {/* Selected Files Preview */}
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between border border-slate-100 dark:border-white/5 p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-white/90 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div className="w-16 bg-slate-200 dark:bg-white/10 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500">100%</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={uploading || files.length === 0}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-600/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating AI Summary...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Generate AI Summary
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Uploaded Notes Queue Section */}
          <div className="lg:col-span-6 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col h-[680px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-5 shrink-0">
              <h3 className="text-sm font-outfit font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Uploaded Notes Queue
              </h3>
              <button
                onClick={fetchActiveQueue}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-colors text-slate-600 dark:text-white/80"
                title="Refresh Queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {queue.length === 0 ? (
                <div className="border border-dashed border-violet-100 dark:border-white/5 rounded-2xl bg-violet-50/[0.05] dark:bg-[#121829]/20 p-8 text-center flex flex-col items-center justify-center h-full my-auto">
                  <div className="w-14 h-14 bg-violet-150/20 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-4">
                    <FileDown className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white/85">No notes uploaded yet.</span>
                  <span className="text-xs text-slate-400 dark:text-white/40 mt-1 max-w-xs mx-auto">
                    Upload your first PDF to generate AI-powered summaries.
                  </span>
                </div>
              ) : (
                queue.map((item) => {
                  const isExtracting = item.status === "EXTRACTING"
                  const isSummarizing = item.status === "SUMMARIZING"
                  const isFailed = item.status === "FAILED"
                  const isRejected = item.status === "REJECTED"
                  const isDraft = item.status === "DRAFT"

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50/50 dark:bg-[#121829]/30 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 rounded-xl p-4 transition-all duration-300 flex justify-between items-start gap-4 shadow-sm hover:shadow"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-[300px]" title={item.title}>
                            {item.title}
                          </h4>
                          
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-slate-400 dark:text-white/40 font-medium">
                            <span>{item.course_name || "B.Tech Mechanical"}</span>
                            <span>&bull;</span>
                            <span className="text-slate-550 dark:text-white/50">{item.subject_name}</span>
                            <span>&bull;</span>
                            <span>{item.unit}</span>
                          </div>

                          <div className="text-[10px] text-slate-400 dark:text-white/40 mt-1">
                            {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; {(item.file_size_mb || 2.45)} MB
                          </div>
                          
                          {isRejected && item.rejection_comment && (
                            <div className="mt-2 text-[10px] bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 dark:border-red-500/20 text-red-650 dark:text-red-300 p-2 rounded-lg">
                              <span className="font-bold block mb-0.5">Professor Feedback:</span>
                              {item.rejection_comment}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Review Button */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0">
                        {isExtracting && (
                          <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-650 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Processing
                          </span>
                        )}
                        {isSummarizing && (
                          <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-650 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Processing
                          </span>
                        )}
                        {isDraft && (
                          <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-650 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            Awaiting Review
                          </span>
                        )}
                        {isFailed && (
                          <span className="bg-rose-50 dark:bg-rose-500/10 text-rose-650 dark:text-rose-450 border border-rose-100 dark:border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
                            Failed
                          </span>
                        )}
                        {isRejected && (
                          <span className="bg-orange-50 dark:bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-orange-500" />
                            Rejected
                          </span>
                        )}

                        <div className="flex gap-1.5 mt-1">
                          {(isDraft || isRejected) && (
                            <Link
                              to="/admin/notes/review"
                              className="border border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-600/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Review Summary
                            </Link>
                          )}
                          {(isFailed || isRejected) && (
                            <button
                              onClick={() => triggerRegenerate(item.note_id)}
                              className="border border-rose-500 hover:bg-rose-500/10 text-rose-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Regenerate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

