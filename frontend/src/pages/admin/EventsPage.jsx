import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, X, Clock } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'Exam',
    event_date: '',
    reminder_lead_days: 1
  })

  const eventTypes = ['Exam', 'Assignment', 'Competition', 'Seminar', 'Other']

  const fetchEvents = async () => {
    try {
      const data = await adminService.getEvents()
      setEvents(data)
    } catch (error) {
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const filteredEvents = filter === 'All' 
    ? events 
    : events.filter(e => e.event_type.toLowerCase() === filter.toLowerCase())

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Ensure date is properly formatted
    if (!formData.event_date) {
      toast.error('Please select a date and time')
      return
    }

    // Convert local datetime-local string to standard ISO
    const payload = {
      ...formData,
      event_date: new Date(formData.event_date).toISOString()
    }

    try {
      await adminService.createEvent(payload)
      toast.success('Event created successfully. Notifications sent!')
      setIsModalOpen(false)
      setFormData({ title: '', description: '', event_type: 'Exam', event_date: '', reminder_lead_days: 1 })
      fetchEvents()
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this event?')) {
      try {
        await adminService.deleteEvent(id)
        toast.success('Event deleted')
        fetchEvents()
      } catch (error) {
        toast.error('Failed to delete event')
      }
    }
  }

  const getTypeColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'exam') return 'border-l-red-500 bg-red-500/10 text-red-500'
    if (t === 'assignment') return 'border-l-blue-500 bg-blue-500/10 text-blue-500'
    if (t === 'competition') return 'border-l-yellow-500 bg-yellow-500/10 text-yellow-500'
    return 'border-l-purple-500 bg-purple-500/10 text-purple-500'
  }

  if (loading) return <div className="p-8 text-center text-navy-400">Loading events...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Events & Exams</h1>
          <p className="text-navy-400 text-sm">Manage academic calendar and push notifications.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand/20"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Exam', 'Assignment', 'Competition'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${filter === type ? 'bg-navy-700 border-navy-600 text-white' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="card bg-navy-800/50 border border-navy-700 border-dashed rounded-2xl p-12 text-center">
            <CalendarDays className="w-10 h-10 text-navy-500 mx-auto mb-3" />
            <p className="text-navy-400 text-sm">No events found for this filter.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const isPast = event.days_until < 0
            const typeStyle = getTypeColor(event.event_type)
            
            return (
              <div key={event.id} className={`card bg-navy-800 border border-navy-700 rounded-xl p-5 border-l-4 ${typeStyle.split(' ')[0]} flex flex-col md:flex-row gap-5 items-start md:items-center relative group`}>
                <div className="flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl bg-navy-900 border border-navy-700 shrink-0">
                  <span className="text-xs text-brand font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-2xl font-outfit font-bold text-white leading-none">{new Date(event.event_date).getDate()}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${typeStyle.split(' ').slice(1).join(' ')} border-opacity-20`}>
                      {event.event_type}
                    </span>
                    {isPast ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                        Overdue
                      </span>
                    ) : event.days_until === 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                        Today
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-700 text-navy-300 border border-navy-600">
                        In {event.days_until} days
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-outfit font-bold text-white truncate">{event.title}</h3>
                  {event.description && <p className="text-navy-400 text-sm mt-1 line-clamp-2">{event.description}</p>}
                </div>

                <div className="flex items-center gap-4 text-sm text-navy-400 whitespace-nowrap bg-navy-900/50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-navy-500" />
                  {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="absolute top-4 right-4 md:relative md:top-0 md:right-0 p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors bg-navy-900 md:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-700 flex justify-between items-center bg-navy-900/50">
              <h2 className="text-xl font-outfit font-bold text-white">Create New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Event Title</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  placeholder="e.g. Mid-Term DBMS Exam"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
                  >
                    {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Date & Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-navy-400 text-xs font-semibold uppercase mb-1.5">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-none h-20"
                  placeholder="Syllabus, rules, or details..."
                />
              </div>

              <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Push Notification</p>
                  <p className="text-xs text-navy-300">All students will be notified immediately upon creation.</p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
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
                  Create & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
