import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, X, Clock, AlertCircle, CheckCircle, FileText, Layout, Award, Users, Code } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSemester, setFilterSemester] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'Exam',
    event_date: '',
    reminder_lead_days: 1,
    course_id: '',
    semester_number: ''
  })

  const eventTypes = [
    { name: 'Exam', icon: FileText, color: 'bg-red-500', text: 'text-red-400' },
    { name: 'Assignment', icon: Layout, color: 'bg-orange-500', text: 'text-orange-400' },
    { name: 'Hackathon', icon: Code, color: 'bg-green-500', text: 'text-green-400' },
    { name: 'Competition', icon: Award, color: 'bg-blue-500', text: 'text-blue-400' },
  ]

  const fetchEvents = async (type = null, courseId = null, semester = null) => {
    try {
      setLoading(true)
      const data = await adminService.getEvents(type || null, courseId || null, semester || null)
      setEvents(data || [])
    } catch (error) {
      console.error("Failed to fetch events:", error)
      toast.error('Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(filter === 'All' ? null : filter, filterCourseId, filterSemester)
  }, [filter, filterCourseId, filterSemester])

  const filteredEvents = filter === 'All' 
    ? events 
    : events.filter(e => e.event_type.toLowerCase() === filter.toLowerCase())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.event_date) {
      toast.error('Please select a date and time')
      return
    }

    const payload = {
      ...formData,
      event_date: new Date(formData.event_date).toISOString(),
      course_id: formData.course_id || null,
      semester_number: formData.semester_number ? parseInt(formData.semester_number) : null
    }

    try {
      await adminService.createEvent(payload)
      toast.success('Event created successfully. Notifications sent!')
      setIsModalOpen(false)
      setFormData({ title: '', description: '', event_type: 'Exam', event_date: '', reminder_lead_days: 1, course_id: '', semester_number: '' })
      fetchEvents(filter === 'All' ? null : filter, filterCourseId, filterSemester)
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this event?')) {
      try {
        await adminService.deleteEvent(id)
        toast.success('Event deleted')
        fetchEvents(filter === 'All' ? null : filter, filterCourseId, filterSemester)
      } catch (error) {
        toast.error('Failed to delete event')
      }
    }
  }

  const getDaysChip = (days_until) => {
    if (days_until < 0) return { label: 'Overdue', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
    if (days_until === 0) return { label: 'Today', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
    if (days_until <= 3) return { label: `In ${days_until} days`, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' }
    if (days_until <= 7) return { label: `In ${days_until} days`, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
    return { label: `In ${days_until} days`, color: 'bg-green-500/10 text-green-400 border-green-500/20' }
  }

  const getTypeStyle = (type) => {
    const t = type.toLowerCase()
    if (t === 'exam') return 'bg-red-500'
    if (t === 'assignment') return 'bg-orange-500'
    if (t === 'hackathon') return 'bg-green-500'
    if (t === 'competition') return 'bg-blue-500'
    return 'bg-violet-500'
  }

  const formatLargeDate = (dateStr) => {
    const d = new Date(dateStr)
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      day: d.getDate(),
      year: d.getFullYear(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Events & Exams</h1>
          <p className="text-white/50 text-sm mt-1">Manage academic calendar</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Event
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

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0">
        <button
          onClick={() => setFilter('All')}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
            filter === 'All' 
              ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]' 
              : 'text-white/50 hover:text-white bg-white/5 border-transparent'
          }`}
        >
          All
        </button>
        {[
          { key: 'Exam', label: 'Exams', icon: '📝' },
          { key: 'Assignment', label: 'Assignments', icon: '📋' },
          { key: 'Hackathon', label: 'Hackathons', icon: '💻' },
          { key: 'Competition', label: 'Competitions', icon: '🏆' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
              filter === item.key 
                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]' 
                : 'text-white/50 hover:text-white bg-white/5 border-transparent'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-white/5 border border-white/10 rounded-2xl" />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState 
          icon={CalendarDays} 
          title="No events found" 
          description="Keep your students updated by adding important dates." 
          actionLabel="Add Event"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        /* Events List */
        <div className="flex flex-col gap-4">
          {filteredEvents.map(event => {
            const dateInfo = formatLargeDate(event.event_date)
            const chip = getDaysChip(event.days_until)
            const typeColor = getTypeStyle(event.event_type)

            return (
              <div 
                key={event.id} 
                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/[0.07] transition-all relative overflow-hidden group"
              >
                {/* Left accent bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${typeColor} rounded-full`} />
                
                {/* Date block */}
                <div className="min-w-[64px] text-center bg-white/5 rounded-xl p-2 border border-white/10 shrink-0">
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">{dateInfo.month}</p>
                  <p className="text-3xl font-outfit font-bold text-white leading-none my-1">{dateInfo.day}</p>
                  <p className="text-[10px] text-white/30 font-medium">{dateInfo.year}</p>
                </div>

                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/70 border border-white/10">
                      {event.event_type}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${chip.color}`}>
                      {chip.label}
                    </span>
                  </div>
                  <h3 className={`text-xl font-outfit font-bold text-white truncate ${event.days_until < 0 ? 'line-through opacity-40' : ''}`}>
                    {event.title}
                  </h3>
                  <p className="text-white/50 text-sm mt-1 line-clamp-2">
                    {event.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {dateInfo.time}
                    </div>
                  </div>
                </div>

                {/* Actions (Delete only) */}
                <div className="absolute top-5 right-5">
                  <button 
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-white/20 hover:text-red-450 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer group-hover:text-red-400"
                    title="Delete Event"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white">Create New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <CourseSemesterSelector
                initialCourseId={formData.course_id}
                initialSemester={formData.semester_number}
                onSelect={(selection) => setFormData(prev => ({
                  ...prev,
                  course_id: selection.courseId || "",
                  semester_number: selection.semesterNumber || ""
                }))}
              />

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Event Title</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  placeholder="e.g. Mid-Term DBMS Exam"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-3">Event Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {eventTypes.map(type => {
                    const isSelected = formData.event_type === type.name
                    return (
                      <button
                        key={type.name}
                        type="button"
                        onClick={() => setFormData({...formData, event_type: type.name})}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 cursor-pointer ${
                          isSelected ? `${type.color}/20 text-white shadow-lg` : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                        style={isSelected ? { borderColor: `${type.color.replace('bg-', '')}`, backgroundColor: `${type.color.replace('bg-', '')}33` } : {}}
                      >
                        <type.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{type.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Event Date & Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Lead Days for Reminder (1-7)</label>
                  <div className="flex items-center bg-white/8 border border-white/15 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, reminder_lead_days: Math.max(1, p.reminder_lead_days - 1)}))}
                      className="px-4 py-2.5 text-white/50 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formData.reminder_lead_days}
                      onChange={(e) => setFormData({...formData, reminder_lead_days: Math.max(1, Math.min(7, parseInt(e.target.value) || 1))})}
                      className="w-full bg-transparent text-center text-white focus:outline-none font-semibold h-full py-2.5"
                    />
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, reminder_lead_days: Math.min(7, p.reminder_lead_days + 1)}))}
                      className="px-4 py-2.5 text-white/50 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none h-24"
                  placeholder="Additional details for students..."
                />
              </div>

              <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-violet-300 font-medium">
                  This event will be shared with all students instantly, and a notification will be pushed to their devices.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-xl shadow-violet-500/25 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Create & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

function CodeIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
