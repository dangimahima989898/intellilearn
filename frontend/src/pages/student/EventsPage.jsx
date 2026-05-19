import { useState, useEffect } from 'react'
import { CalendarDays, Clock, CalendarPlus } from 'lucide-react'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  const fetchEvents = async () => {
    try {
      const data = await studentService.getEvents()
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

  const getTypeColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'exam') return 'border-l-red-500 bg-red-500/10 text-red-500'
    if (t === 'assignment') return 'border-l-blue-500 bg-blue-500/10 text-blue-500'
    if (t === 'competition') return 'border-l-yellow-500 bg-yellow-500/10 text-yellow-500'
    return 'border-l-purple-500 bg-purple-500/10 text-purple-500'
  }

  const addToCalendar = (event) => {
    // Generate Google Calendar Add URL
    const startDate = new Date(event.event_date).toISOString().replace(/-|:|\.\d\d\d/g, "")
    // Assuming 2 hour duration for mock
    const endDateObj = new Date(event.event_date)
    endDateObj.setHours(endDateObj.getHours() + 2)
    const endDate = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, "")
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}`
    window.open(url, '_blank')
  }

  // Count badges
  const getCount = (type) => events.filter(e => e.event_type.toLowerCase() === type.toLowerCase()).length

  if (loading) return <div className="p-8 text-center text-navy-400">Loading events...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">Events & Exams</h1>
        <p className="text-navy-400 text-sm">Stay on top of deadlines and academic activities.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Exam', 'Assignment', 'Competition'].map(type => {
          const isSelected = filter === type
          const count = type === 'All' ? events.length : getCount(type)
          
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${isSelected ? 'bg-navy-700 border-navy-600 text-white' : 'bg-navy-900 border-navy-800 text-navy-400 hover:bg-navy-800'}`}
            >
              {type}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isSelected ? 'bg-navy-600 text-white' : 'bg-navy-800 text-navy-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="card bg-navy-800/50 border border-navy-700 border-dashed rounded-2xl p-12 text-center">
            <CalendarDays className="w-10 h-10 text-navy-500 mx-auto mb-3" />
            <p className="text-navy-400 text-sm">No events scheduled.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const isPast = event.days_until < 0
            const typeStyle = getTypeColor(event.event_type)
            
            return (
              <div key={event.id} className={`card bg-navy-800 border border-navy-700 rounded-xl p-5 border-l-4 ${typeStyle.split(' ')[0]} flex flex-col md:flex-row gap-5 items-start md:items-center relative`}>
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
                        Past Event
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

                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex items-center gap-2 text-sm text-navy-300 bg-navy-900/50 px-3 py-1.5 rounded-lg w-fit md:w-auto">
                    <Clock className="w-4 h-4 text-navy-500" />
                    {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {!isPast && (
                    <button 
                      onClick={() => addToCalendar(event)}
                      className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-xs font-semibold transition-colors border border-navy-600"
                    >
                      <CalendarPlus className="w-4 h-4" /> Add to Calendar
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
