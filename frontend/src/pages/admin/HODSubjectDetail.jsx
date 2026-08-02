import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, BookOpen, UserCheck, Sliders, ClipboardList, Check, 
  AlertTriangle, AlertCircle, FileText, Download, Trash2, Edit2, 
  Save, X, HelpCircle, Activity, Upload, Eye, FileCheck
} from 'lucide-react'
import api from '../../services/api'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'

export default function HODSubjectDetail() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  
  const [subject, setSubject] = useState(null)
  const [facultyList, setFacultyList] = useState([])
  const [notes, setNotes] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Faculty Edit State
  const [isEditingFaculty, setIsEditingFaculty] = useState(false)
  const [primaryFacultyId, setPrimaryFacultyId] = useState('')
  const [secondaryFacultyId, setSecondaryFacultyId] = useState('')
  
  // Units Edit State
  const [isEditingUnits, setIsEditingUnits] = useState(false)
  const [unitList, setUnitList] = useState(['', '', '', '', ''])

  // Syllabus Upload State
  const [syllabusFile, setSyllabusFile] = useState(null)
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false)

  // Fetch all details
  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [subjectRes, facultyRes, questionsRes] = await Promise.allSettled([
        api.get(`/api/v1/hod/subjects/${subjectId}/detail`),
        api.get('/api/v1/hod/faculty/all'),
        api.get('/questions', { params: { subject_id: subjectId } })
      ])
      
      if (subjectRes.status === 'rejected') {
        console.error("Failed to load subject details", subjectRes.reason)
        setError("Failed to load subject details. Check if the ID is correct.")
        return
      }

      const subj = subjectRes.value.data
      const mappedSubj = {
        ...subj,
        faculty_assignments: subj.faculty ? [{ role: 'primary', faculty_id: subj.faculty.id, faculty_name: subj.faculty.name }] : [],
        topics_list: subj.topics_list || (subj.units ? subj.units.map(u => u.topic) : [])
      }
      
      setSubject(mappedSubj)
      setFacultyList(facultyRes.status === 'fulfilled' ? (facultyRes.value.data || []) : [])
      setNotes(subj.notes || [])
      setQuestions(questionsRes.status === 'fulfilled' ? (questionsRes.value.data || []) : [])
      
      // Setup Form Initial States
      const primary = mappedSubj.faculty_assignments?.find(a => a.role === 'primary')
      const secondary = mappedSubj.faculty_assignments?.find(a => a.role === 'secondary')
      setPrimaryFacultyId(primary ? primary.faculty_id : '')
      setSecondaryFacultyId(secondary ? secondary.faculty_id : '')
      
      const topics = mappedSubj.topics_list || []
      const paddedTopics = [...topics, '', '', '', '', ''].slice(0, 5)
      setUnitList(paddedTopics)
    } catch (err) {
      console.error("Failed to load subject details", err)
      setError("Failed to load subject details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [subjectId])

  // Faculty Workloads Mapping
  const getFacultyWorkloadHours = (facId) => {
    const fac = facultyList.find(f => f.id === facId)
    if (!fac) return 0
    return (fac.subjects?.length || 0) * 4
  }

  // Update Faculty Assignments
  const handleSaveFaculty = async () => {
    try {
      // 1. Primary
      if (primaryFacultyId) {
        await api.post('/api/v1/hod/faculty/assign-subject', {
          faculty_id: primaryFacultyId,
          subject_id: subjectId,
          role: "primary"
        })
      }
      // 2. Secondary
      if (secondaryFacultyId) {
        await api.post('/api/v1/hod/faculty/assign-subject', {
          faculty_id: secondaryFacultyId,
          subject_id: subjectId,
          role: "secondary"
        })
      }
      toast.success("Faculty assignments updated successfully")
      setIsEditingFaculty(false)
      fetchAllData()
    } catch (err) {
      toast.error("Failed to update faculty assignments")
    }
  }

  // Update Units Outlines
  const handleSaveUnits = async () => {
    if (!unitList[0].trim()) {
      toast.error("Unit 1 outline is mandatory")
      return
    }
    
    try {
      const filteredUnits = unitList.filter(u => u.trim() !== '')
      await adminService.updateSubject(subjectId, {
        topics_list: filteredUnits
      })
      toast.success("Subject units updated successfully")
      setIsEditingUnits(false)
      fetchAllData()
    } catch (err) {
      toast.error("Failed to update units")
    }
  }



  // Syllabus PDF upload / replace
  const handleSyllabusUpload = async () => {
    if (!syllabusFile) return
    try {
      setUploadingSyllabus(true)
      const formData = new FormData()
      formData.append('file', syllabusFile)
      
      await api.post(`/subjects/${subjectId}/syllabus`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success("Syllabus PDF updated successfully")
      setSyllabusFile(null)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload syllabus")
    } finally {
      setUploadingSyllabus(false)
    }
  }

  // Syllabus PDF clear
  const handleClearSyllabus = async () => {
    if (!window.confirm("Are you sure you want to remove the syllabus PDF?")) return
    try {
      await api.delete(`/subjects/${subjectId}/syllabus`)
      toast.success("Syllabus PDF removed")
      fetchAllData()
    } catch (err) {
      toast.error("Failed to remove syllabus")
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (error || !subject) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-[#F8F7FF] p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Error loading details</h2>
          <p className="text-xs text-slate-400 mt-1">{error || "Subject not found."}</p>
          <button 
            onClick={() => navigate('/admin/subjects')}
            className="mt-4 px-4 py-2 bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition"
          >
            Back to Subjects
          </button>
        </div>
      </PageWrapper>
    )
  }

  const primaryFaculty = subject.faculty_assignments?.find(fa => fa.role === 'primary')
  const secondaryFaculty = subject.faculty_assignments?.find(fa => fa.role === 'secondary')

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F7FF] text-slate-800 p-4 lg:p-8 font-dm">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* Top Return & Header */}
          <div className="flex flex-col gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <button 
              onClick={() => navigate('/admin/subjects')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer self-start"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Subjects
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase text-[#7C3AED] bg-[#7C3AED]/10 px-2.5 py-0.5 rounded border border-[#7C3AED]/20">
                    {subject.code}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded">
                    Semester {subject.semester_number || 'I'}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded">
                    {subject.credit_hours || 3} Credits
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{subject.name}</h1>
                <p className="text-slate-500 text-xs mt-1">{subject.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>

          {/* TWO COLUMN CONTENT LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* 1. Syllabus Units Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#7C3AED]" />
                    <h2 className="text-sm font-bold text-slate-800">Syllabus Course Content (5 Units)</h2>
                  </div>
                  
                  {!isEditingUnits ? (
                    <button
                      onClick={() => setIsEditingUnits(true)}
                      className="flex items-center gap-1 text-[11px] font-black text-[#7C3AED] hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Units
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const orig = subject.topics_list || []
                          setUnitList([...orig, '', '', '', '', ''].slice(0, 5))
                          setIsEditingUnits(false)
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUnits}
                        className="flex items-center gap-0.5 text-[11px] font-black text-[#10B981] hover:underline cursor-pointer"
                      >
                        <Save className="w-3 h-3" /> Save Units
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {unitList.map((unitContent, idx) => {
                    const unitNum = idx + 1
                    
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start gap-3.5">
                        <span className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-black text-xs flex items-center justify-center shrink-0">
                          U{unitNum}
                        </span>

                        <div className="flex-1 min-w-0">
                          {isEditingUnits ? (
                            <input
                              type="text"
                              value={unitContent}
                              placeholder={`Enter topic outline for Unit ${unitNum} ${unitNum === 1 ? '(Required)' : '(Optional)'}`}
                              onChange={e => {
                                const newU = [...unitList]
                                newU[idx] = e.target.value
                                setUnitList(newU)
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#7C3AED]"
                            />
                          ) : (
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                              {unitContent || <span className="text-slate-400 italic">No course outline configured.</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 2. Uploaded Notes Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                    <h2 className="text-sm font-bold text-slate-800">Department Notes Archive</h2>
                  </div>
                  <span className="text-xs bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-0.5 rounded font-black">
                    {notes.length} uploaded
                  </span>
                </div>

                {notes.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-150 rounded-2xl">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">No notes uploaded yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Faculty members upload notes which HOD can audit.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {notes.map(note => (
                      <div key={note.id} className="bg-slate-50 border border-slate-100 hover:border-slate-200 transition rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{note.title}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Uploaded on {new Date(note.created_at).toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={`${api.defaults.baseURL || ''}${note.file_url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-[#7C3AED] rounded-lg transition"
                            title="Download Note"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Question Bank Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#7C3AED]" />
                    <h2 className="text-sm font-bold text-slate-800">Department Question Bank</h2>
                  </div>
                  <span className="text-xs bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-0.5 rounded font-black">
                    {questions.length} items
                  </span>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-150 rounded-2xl">
                    <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Question bank is empty</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">AI generates practice and quiz questions dynamically for students.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                          <span>Question #{idx + 1}</span>
                          <span className="uppercase text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded">{q.difficulty}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{q.question_text}</p>
                        <div className="text-[10px] text-slate-500 pl-2 border-l-2 border-slate-300">
                          <p>• {q.option_a}</p>
                          <p>• {q.option_b}</p>
                          <p>• {q.option_c}</p>
                          <p>• {q.option_d}</p>
                          <p className="text-[#10B981] font-bold mt-1">Correct: Option {q.correct_answer.toUpperCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* 1. Faculty Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4.5 h-4.5 text-[#7C3AED]" />
                    <h2 className="text-sm font-bold text-slate-800">Faculty Members</h2>
                  </div>
                  
                  {!isEditingFaculty ? (
                    <button
                      onClick={() => setIsEditingFaculty(true)}
                      className="text-[11px] font-black text-[#7C3AED] hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const p = subject.faculty_assignments?.find(a => a.role === 'primary')
                          const s = subject.faculty_assignments?.find(a => a.role === 'secondary')
                          setPrimaryFacultyId(p ? p.faculty_id : '')
                          setSecondaryFacultyId(s ? s.faculty_id : '')
                          setIsEditingFaculty(false)
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveFaculty}
                        className="text-[11px] font-black text-[#10B981] hover:underline cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditingFaculty ? (
                  <div className="flex flex-col gap-4">
                    {/* Primary */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Primary Faculty</label>
                      <select
                        value={primaryFacultyId}
                        onChange={e => setPrimaryFacultyId(e.target.value)}
                        className="bg-[#F8F7FF] border border-slate-150 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                      >
                        <option value="">-- Choose Instructor --</option>
                        {facultyList.map(f => {
                          const load = getFacultyWorkloadHours(f.id)
                          return (
                            <option key={f.id} value={f.id} disabled={load >= 16}>
                              {f.name} (Load: {load}h)
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {/* Secondary */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Secondary Faculty</label>
                      <select
                        value={secondaryFacultyId}
                        onChange={e => setSecondaryFacultyId(e.target.value)}
                        className="bg-[#F8F7FF] border border-slate-150 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                      >
                        <option value="">-- Choose Assistant --</option>
                        {facultyList.map(f => {
                          const load = getFacultyWorkloadHours(f.id)
                          return (
                            <option key={f.id} value={f.id}>
                              {f.name} (Load: {load}h)
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Primary Display */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Primary Instructor</span>
                        <span className="text-xs font-bold text-slate-800">
                          {primaryFaculty ? primaryFaculty.faculty_name : 'No Faculty Assigned'}
                        </span>
                      </div>
                      {!primaryFaculty && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                    </div>

                    {/* Secondary Display */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Secondary Instructor</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {secondaryFaculty ? secondaryFaculty.faculty_name : 'None Assigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Syllabus PDF Document */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-[#7C3AED]" />
                  <h2 className="text-sm font-bold text-slate-800">Syllabus PDF Document</h2>
                </div>

                {subject.syllabus_pdf_url ? (
                  <div className="flex flex-col gap-3">
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center">
                      <FileCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800">Syllabus Document Active</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Used as context mapping for AI learning agents.</p>
                      
                      <div className="flex gap-2 justify-center mt-4 pt-4 border-t border-slate-200/50">
                        <a 
                          href={`${api.defaults.baseURL || ''}${subject.syllabus_pdf_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-[#7C3AED] transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View PDF
                        </a>
                        <button
                          onClick={handleClearSyllabus}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer border border-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Upload dropzone */}
                    <div className="border-2 border-dashed border-slate-200 hover:border-[#7C3AED] rounded-2xl p-5 text-center cursor-pointer bg-slate-50 transition relative">
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={e => setSyllabusFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-7 h-7 text-[#7C3AED] mx-auto mb-1.5 opacity-60" />
                      <p className="text-[11px] font-bold text-slate-700">Click to upload syllabus PDF</p>
                    </div>

                    {syllabusFile && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] text-slate-400 truncate">Selected: {syllabusFile.name}</p>
                        <button
                          onClick={handleSyllabusUpload}
                          disabled={uploadingSyllabus}
                          className="w-full py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {uploadingSyllabus ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Student Performance Heatmap Grid */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4.5 h-4.5 text-[#7C3AED]" />
                  <h2 className="text-sm font-bold text-slate-800">Student Performance</h2>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-slate-400 mb-1">Unit-wise overall student assessment accuracy metrics.</p>
                  
                  {[
                    { unit: 'Unit 1: Fundamentals', acc: 84, color: 'bg-emerald-500' },
                    { unit: 'Unit 2: Advanced Concepts', acc: 71, color: 'bg-emerald-400' },
                    { unit: 'Unit 3: Implementation & Lab', acc: 48, color: 'bg-rose-500' },
                    { unit: 'Unit 4: Case Studies', acc: 92, color: 'bg-emerald-500' },
                    { unit: 'Unit 5: Project & Audit', acc: 78, color: 'bg-emerald-400' }
                  ].map((u_perf, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-700 truncate max-w-[170px]">{u_perf.unit}</span>
                        <span className={u_perf.acc < 50 ? 'text-rose-500' : 'text-slate-800'}>{u_perf.acc}%</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${u_perf.color}`} style={{ width: `${u_perf.acc}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
