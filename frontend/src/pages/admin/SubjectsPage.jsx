import { useState, useEffect } from 'react'
import { BookOpen, Database, Monitor, Network, Coffee, Code, Plus, Edit2, Trash2, X, AlertCircle, FileText } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSemester, setFilterSemester] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#8B5CF6',
    icon: 'BookOpen',
    course_id: '',
    semester_number: ''
  })

  const presetColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16']
  const presetIcons = [
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Database', icon: Database },
    { name: 'Monitor', icon: Monitor },
    { name: 'Network', icon: Network },
    { name: 'Coffee', icon: Coffee },
    { name: 'Code', icon: Code },
  ]

  const fetchSubjects = async (courseId = null, semester = null) => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getSubjects(courseId || null, semester || null)
      setSubjects(data || [])
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
      setError(err.response?.data?.detail || 'Failed to load subjects. Check if the backend is running.')
      setSubjects([])
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects(filterCourseId, filterSemester)
  }, [filterCourseId, filterSemester])

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject)
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        color: subject.color || '#8B5CF6',
        icon: subject.icon || 'BookOpen',
        course_id: subject.course_id || '',
        semester_number: subject.semester_number || ''
      })
    } else {
      setEditingSubject(null)
      setFormData({
        name: '',
        code: '',
        description: '',
        color: '#8B5CF6',
        icon: 'BookOpen',
        course_id: filterCourseId || '',
        semester_number: filterSemester || ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.course_id || !formData.semester_number) {
      toast.error("Please select a Course and Semester")
      return
    }
    try {
      if (editingSubject) {
        await adminService.updateSubject(editingSubject.id, formData)
        toast.success('Subject updated successfully')
      } else {
        await adminService.createSubject(formData)
        toast.success('Subject created successfully')
      }
      setIsModalOpen(false)
      fetchSubjects(filterCourseId, filterSemester)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save subject')
    }
  }

  const openDeleteModal = (subject) => {
    setEditingSubject(subject)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (isDeleting) return
    try {
      setIsDeleting(true)
      await adminService.deleteSubject(editingSubject.id)
      toast.success('Subject moved to Archive. It can be restored within 15 days before being permanently deleted.', { id: 'delete_subject_success' })
      setIsDeleteModalOpen(false)
      fetchSubjects(filterCourseId, filterSemester)
    } catch (error) {
      console.error('Failed to delete subject:', error)
      toast.error('Unable to delete the subject at the moment. Please check your internet connection and try again.', { id: 'connection_error' })
    } finally {
      setIsDeleting(false)
    }
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
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Subjects</h1>
          <p className="text-white/50 text-sm mt-1">Manage your course curriculum</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Add Subject
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
          }}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
          <div className="h-48 bg-white/5 border border-white/10 rounded-2xl"></div>
        </div>
      ) : error ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-semibold text-lg">Failed to Load Subjects</h3>
          <p className="text-white/50 text-sm mt-2">{error}</p>
          <button 
            onClick={() => fetchSubjects()} 
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
          >
            Try Again
          </button>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState 
          icon={BookOpen} 
          title="No subjects found" 
          description="Start building your course curriculum by adding your first subject." 
          actionLabel="Add Subject"
          onAction={() => openModal()}
        />
      ) : (
        /* Subjects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map(subject => (
            <div 
              key={subject.id} 
              className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all flex flex-col justify-between" 
              style={{ borderLeftColor: subject.color || '#8B5CF6', borderLeftWidth: '4px' }}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject.color || '#8B5CF6'}33`, color: subject.color || '#8B5CF6' }}>
                    {renderIcon(subject.icon, "w-6 h-6")}
                  </div>
                  <span 
                    className="px-2 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${subject.color || '#8B5CF6'}20`, color: subject.color || '#8B5CF6' }}
                  >
                    {subject.code}
                  </span>
                </div>

                <h3 className="font-outfit font-semibold text-xl text-white mt-3 truncate">{subject.name}</h3>
                <p className="text-white/50 text-sm mt-1 line-clamp-2 min-h-[40px]">
                  {subject.description || 'No description provided.'}
                </p>
              </div>
              
              <div>
                {/* Stats Row */}
                <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
                  <span className="flex items-center gap-1 text-white/70 text-xs font-medium">
                    📄 {subject.notes_count || 0} Notes
                  </span>
                  <span className="flex items-center gap-1 text-white/70 text-xs font-medium">
                    ❓ {subject.questions_count || 0} Questions
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                  <button 
                    onClick={() => openModal(subject)} 
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-violet-400 hover:text-white hover:bg-violet-500/20 font-medium text-xs transition-colors border border-transparent hover:border-violet-500/25 cursor-pointer bg-white/5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button 
                    onClick={() => openDeleteModal(subject)} 
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 font-medium text-xs transition-colors border border-transparent hover:border-red-500/25 cursor-pointer bg-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <CourseSemesterSelector
                required
                initialCourseId={formData.course_id}
                initialSemester={formData.semester_number}
                onSelect={(selection) => setFormData(prev => ({
                  ...prev,
                  course_id: selection.courseId || "",
                  semester_number: selection.semesterNumber || ""
                }))}
              />
              
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Subject Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  placeholder="e.g. Data Structures"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Subject Code</label>
                <input
                  required
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all uppercase font-mono"
                  placeholder="DSA"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none h-24"
                  placeholder="Description of the curriculum..."
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Color Picker</label>
                <div className="flex gap-2 flex-wrap">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                        formData.color === c ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Icon Selector</label>
                <div className="grid grid-cols-3 gap-2">
                  {presetIcons.map(item => {
                    const isSel = formData.icon === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData({...formData, icon: item.name})}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSel ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">{item.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Archive Subject?</h3>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Are you sure you want to archive <span className="text-white font-semibold">{editingSubject?.name}</span>?
              <br /><br />
              <span className="text-violet-300 font-semibold bg-violet-500/10 border border-violet-500/20 px-3.5 py-2.5 rounded-xl block text-xs text-left space-y-1">
                <span className="block">📁 Moved to Archive / Trash for 15 days where it can be restored.</span>
                <span className="block">🙈 Hidden from students and all active areas immediately.</span>
                <span className="block">⏳ Permanently auto-deleted after 15 days with all associated contents.</span>
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
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-violet-500/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Archiving...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
