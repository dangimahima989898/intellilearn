import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import {
  BookOpen,
  Upload,
  Plus,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Edit2
} from "lucide-react"
import toast from "react-hot-toast"
import api from "../../services/api"
import PageWrapper from "../../components/PageWrapper"

export default function FacultyTopicsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectIdFromUrl = searchParams.get("subjectId") || ""

  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectIdFromUrl)
  const [topics, setTopics] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [savingTopics, setSavingTopics] = useState(false)
  const [extractingSyllabus, setExtractingSyllabus] = useState(false)
  const [newTopicText, setNewTopicText] = useState("")
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editingText, setEditingText] = useState("")

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchTopics(selectedSubjectId)
      // Update URL query param silently
      setSearchParams({ subjectId: selectedSubjectId }, { replace: true })
    } else {
      setTopics([])
    }
  }, [selectedSubjectId])

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true)
      const res = await api.get("/subjects")
      setSubjects(res.data)
      // If there's an active list and none selected, auto-select first one
      if (res.data.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(res.data[0].id)
      }
    } catch (err) {
      toast.error("Failed to load subjects")
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchTopics = async (subjId) => {
    try {
      setLoadingTopics(true)
      const res = await api.get(`/subjects/${subjId}/topics`)
      setTopics(res.data || [])
    } catch (err) {
      toast.error("Failed to load topics for this subject")
    } finally {
      setLoadingTopics(false)
    }
  }

  const handleAddTopic = () => {
    const trimmed = newTopicText.trim()
    if (!trimmed) return
    if (topics.includes(trimmed)) {
      toast.error("Topic already exists in list")
      return
    }
    setTopics([...topics, trimmed])
    setNewTopicText("")
  }

  const handleRemoveTopic = (indexToRemove) => {
    setTopics(topics.filter((_, idx) => idx !== indexToRemove))
  }

  const handleStartEdit = (index) => {
    setEditingIndex(index)
    setEditingText(topics[index])
  }

  const handleSaveEdit = (index) => {
    const trimmed = editingText.trim()
    if (!trimmed) return
    const updated = [...topics]
    updated[index] = trimmed
    setTopics(updated)
    setEditingIndex(-1)
  }

  const handleSaveToDatabase = async () => {
    if (!selectedSubjectId) return
    try {
      setSavingTopics(true)
      const res = await api.post(`/subjects/${selectedSubjectId}/topics`, {
        topics: topics
      })
      setTopics(res.data)
      toast.success("Topics saved successfully!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save topics")
    } finally {
      setSavingTopics(false)
    }
  }

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedSubjectId) return

    if (file.type !== "application/pdf") {
      toast.error("Only PDF syllabus files are supported")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      setExtractingSyllabus(true)
      const res = await api.post(`/subjects/${selectedSubjectId}/topics/upload-syllabus`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
      setTopics(res.data)
      toast.success("Syllabus uploaded and topics extracted successfully!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to extract syllabus topics")
    } finally {
      setExtractingSyllabus(false)
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)

  return (
    <PageWrapper title="Manage Subject Topics">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-6">
        
        {/* Subject Selection Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Select Subject
          </h2>
          {loadingSubjects ? (
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="" disabled>-- Select Subject --</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedSubjectId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left sidebar: Manual tools & Upload */}
            <div className="md:col-span-1 flex flex-col gap-6">
              
              {/* Add Topic Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-white/70">
                  Quick Add Topic
                </h3>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Enter topic name..."
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                    className="bg-[#0A0F1E] border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTopic}
                    className="il-btn il-btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add to List
                  </button>
                </div>
              </div>

              {/* Upload Syllabus PDF Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 text-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-white/70">
                  AI Syllabus Parser
                </h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  Upload syllabus PDF to extract curriculum topics automatically using AI.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <button
                  onClick={handleFileUploadClick}
                  disabled={extractingSyllabus}
                  className="il-btn il-btn-secondary py-3 text-xs font-semibold flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-white/40"
                >
                  {extractingSyllabus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      Parsing AI...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-blue-400" />
                      Upload Syllabus PDF
                    </>
                  )}
                </button>
              </div>

              {/* Save changes button */}
              <button
                onClick={handleSaveToDatabase}
                disabled={savingTopics || loadingTopics}
                className="il-btn il-btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
              >
                {savingTopics ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Topic List
                  </>
                )}
              </button>
            </div>

            {/* Right container: List of Topics */}
            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Topics List
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">
                    {selectedSubject ? `${selectedSubject.code} Syllabus Topics` : ""}
                  </p>
                </div>
                <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-bold">
                  {topics.length} {topics.length === 1 ? "Topic" : "Topics"}
                </span>
              </div>

              {loadingTopics ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-white/50 text-xs">Loading syllabus topics...</p>
                </div>
              ) : topics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-xl my-4">
                  <FileText className="w-12 h-12 text-white/10 mb-3" />
                  <h4 className="text-sm font-bold text-white/80 mb-1">No Topics Defined</h4>
                  <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                    No topics exist for this subject. Please add topics manually or upload a syllabus PDF.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 flex flex-col gap-2">
                  {topics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-4 py-3 transition group"
                    >
                      {editingIndex === index ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(index)}
                            className="flex-1 bg-[#0A0F1E] border border-blue-500 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(index)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg text-xs transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(-1)}
                            className="bg-white/10 hover:bg-white/25 text-white/60 p-1.5 rounded-lg text-xs transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-white/30 text-xs font-mono">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-white text-xs font-medium">
                              {topic}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(index)}
                              className="text-white/40 hover:text-white p-1.5 rounded-lg transition"
                              title="Edit Topic"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveTopic(index)}
                              className="text-red-400/70 hover:text-red-400 p-1.5 rounded-lg transition"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </PageWrapper>
  )
}
