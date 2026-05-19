import { useState, useEffect } from 'react'
import { BookOpen, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen'
  })

  const presetColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444']

  const fetchSubjects = async () => {
    try {
      const data = await adminService.getSubjects()
      setSubjects(data)
    } catch (error) {
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject)
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        color: subject.color || '#3B82F6',
        icon: subject.icon || 'BookOpen'
      })
    } else {
      setEditingSubject(null)
      setFormData({ name: '', code: '', description: '', color: '#3B82F6', icon: 'BookOpen' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSubject) {
        await adminService.updateSubject(editingSubject.id, formData)
        toast.success('Subject updated successfully')
      } else {
        await adminService.createSubject(formData)
        toast.success('Subject created successfully')
      }
      setIsModalOpen(false)
      fetchSubjects()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save subject')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await adminService.deleteSubject(id)
        toast.success('Subject deleted successfully')
        fetchSubjects()
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to delete subject')
      }
    }
  }

  if (loading) return <div className="p-8 text-center text-navy-400 animate-pulse">Loading subjects...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Subjects</h1>
          <p className="text-navy-400 text-sm">Manage curriculum subjects and course codes.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand/20"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card bg-navy-800/50 border border-navy-700 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-navy-700/50 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-navy-400" />
          </div>
          <h3 className="text-xl font-outfit font-semibold text-white mb-2">No subjects yet</h3>
          <p className="text-navy-400 text-sm max-w-sm mb-6">Start building your curriculum by adding the first subject.</p>
          <button onClick={() => openModal()} className="text-brand font-semibold hover:underline">Add a Subject</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <div key={subject.id} className="card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden hover:border-navy-500 transition-colors group relative">
              <div 
                className="h-2 w-full" 
                style={{ backgroundColor: subject.color }} 
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-xl bg-navy-900 border border-navy-700"
                      style={{ color: subject.color }}
                    >
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-900 text-navy-400 border border-navy-700 mb-1 inline-block">
                        {subject.code}
                      </span>
                      <h3 className="font-outfit font-bold text-lg text-white leading-tight">{subject.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(subject)} className="p-1.5 text-navy-400 hover:text-white bg-navy-700/50 rounded hover:bg-navy-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(subject.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-400/10 rounded hover:bg-red-400/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-navy-300 text-sm line-clamp-2 mb-6 min-h-[40px]">
                  {subject.description || 'No description provided.'}
                </p>
                
                <div className="flex gap-4 pt-4 border-t border-navy-700/50">
                  <div className="flex flex-col">
                    <span className="text-xs text-navy-500 font-semibold uppercase">Notes</span>
                    <span className="text-white font-bold">{subject.notes_count}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-navy-500 font-semibold uppercase">Questions</span>
                    <span className="text-white font-bold">{subject.questions_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-700 flex justify-between items-center bg-navy-900/50">
              <h2 className="text-xl font-outfit font-bold text-white">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Subject Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    placeholder="e.g. Data Structures"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Subject Code</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    placeholder="e.g. MCA101"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-none h-24"
                    placeholder="Brief description of the course..."
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-2">Theme Color</label>
                  <div className="flex gap-3">
                    {presetColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({...formData, color: c})}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl font-medium transition-colors shadow-lg shadow-brand/20"
                >
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
