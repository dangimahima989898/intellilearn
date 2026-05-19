import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, X, Clock, MapPin } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

export default function TimetablePage() {
  const [slots, setSlots] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    subject_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    room: ''
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const fetchData = async () => {
    try {
      const [slotsData, subjectsData] = await Promise.all([
        adminService.getTimetable(),
        adminService.getSubjects()
      ])
      setSlots(slotsData)
      setSubjects(subjectsData)
    } catch (error) {
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time')
      return
    }

    try {
      await adminService.createTimetableSlot(formData)
      toast.success('Slot added to timetable')
      setIsModalOpen(false)
      setFormData({ ...formData, subject_id: '', room: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to create timetable slot')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this slot from timetable?')) {
      try {
        await adminService.deleteTimetableSlot(id)
        toast.success('Slot removed')
        fetchData()
      } catch (error) {
        toast.error('Failed to delete slot')
      }
    }
  }

  if (loading) return <div className="p-8 text-center text-navy-400">Loading timetable...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Class Timetable</h1>
          <p className="text-navy-400 text-sm">Manage the weekly schedule for students.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand/20"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </button>
      </div>

      <div className="card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] p-6">
            <div className="grid grid-cols-6 gap-4">
              {days.map(day => (
                <div key={day} className="flex flex-col gap-4">
                  <div className="bg-navy-900 border border-navy-700 py-3 text-center rounded-xl font-outfit font-bold text-white uppercase tracking-wider text-sm shadow-md">
                    {day}
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[400px] bg-navy-900/30 rounded-xl p-2 border border-navy-800/50 border-dashed">
                    {slots.filter(s => s.day_of_week === day)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(slot => (
                        <div 
                          key={slot.id} 
                          className="relative p-4 rounded-xl border border-navy-600/50 shadow-md group hover:-translate-y-1 transition-all"
                          style={{ backgroundColor: `${slot.subject_color}15`, borderLeft: `4px solid ${slot.subject_color}` }}
                        >
                          <button 
                            onClick={() => handleDelete(slot.id)}
                            className="absolute top-2 right-2 p-1.5 bg-navy-900/80 text-navy-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <h4 className="font-outfit font-bold text-white text-sm mb-2 pr-6 leading-tight">
                            {slot.subject_name}
                          </h4>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: slot.subject_color }}>
                              <Clock className="w-3.5 h-3.5" />
                              {slot.start_time} - {slot.end_time}
                            </div>
                            {slot.room && (
                              <div className="flex items-center gap-2 text-xs text-navy-300">
                                <MapPin className="w-3.5 h-3.5" />
                                {slot.room}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                    {slots.filter(s => s.day_of_week === day).length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-navy-600 text-xs font-medium">Free Day</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-700 flex justify-between items-center bg-navy-900/50">
              <h2 className="text-xl font-outfit font-bold text-white">Add Timetable Slot</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
                >
                  <option value="" disabled>Select a subject...</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Day of Week</label>
                <select
                  required
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
                >
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Start Time</label>
                  <input
                    required
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>
                <div>
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">End Time</label>
                  <input
                    required
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Room / Location (Optional)</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  placeholder="e.g. Lab 402"
                />
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
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
