import { useState, useEffect } from 'react'
import { CalendarDays, Clock, CalendarPlus, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentEventsPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
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

  const getTypeStyle = (type) => {
    const t = type.toLowerCase()
    if (isLight) {
      if (t === 'exam') return { border: 'border-l-red-500', card: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700 border-red-200' }
      if (t === 'assignment') return { border: 'border-l-blue-500', card: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-200' }
      if (t === 'competition') return { border: 'border-l-yellow-500', card: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
      return { border: 'border-l-purple-500', card: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700 border-purple-200' }
    }
    if (t === 'exam') return { border: 'border-l-red-500', card: 'bg-white/5 border-white/10', badge: 'bg-red-500/15 text-red-400 border-red-500/25' }
    if (t === 'assignment') return { border: 'border-l-blue-500', card: 'bg-white/5 border-white/10', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25' }
    if (t === 'competition') return { border: 'border-l-yellow-500', card: 'bg-white/5 border-white/10', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' }
    return { border: 'border-l-purple-500', card: 'bg-white/5 border-white/10', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25' }
  }

  const addToCalendar = (event) => {
    const startDate = new Date(event.event_date).toISOString().replace(/-|:|\.\d\d\d/g, "")
    const endDateObj = new Date(event.event_date)
    endDateObj.setHours(endDateObj.getHours() + 2)
    const endDate = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, "")
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}`
    window.open(url, '_blank')
  }

  const getCount = (type) => events.filter(e => e.event_type.toLowerCase() === type.toLowerCase()).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className={`text-sm font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Loading academic events...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-outfit font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {user?.course_code ? `${user.course_code} Semester ${user.current_semester} — Upcoming Events` : "Events & Exams"}
        </h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>Stay on top of deadlines and academic activities.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Exam', 'Assignment', 'Competition'].map(type => {
          const isSelected = filter === type
          const count = type === 'All' ? events.length : getCount(type)
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                isSelected 
                  ? isLight 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-blue-500/20 border-blue-500/35 text-white' 
                  : isLight 
                    ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:text-white'
              }`}
            >
              {type}
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                isSelected 
                  ? isLight ? 'bg-blue-200 text-blue-700' : 'bg-blue-500/30 text-white'
                  : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-white/30'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Events stack */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className={`border border-dashed rounded-2xl p-16 text-center max-w-md mx-auto shadow-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10 bg-white/3'
          }`}>
            <CalendarDays className={`w-12 h-12 mx-auto mb-4 ${isLight ? 'text-slate-300' : 'text-white/20'}`} />
            <h3 className={`font-bold text-lg ${isLight ? 'text-slate-700' : 'text-white'}`}>No events scheduled</h3>
            <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              No upcoming events or tests are scheduled for {user?.course_code || 'MCA'} Semester {user?.current_semester || 1}.
            </p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const isPast = event.days_until < 0
            const style = getTypeStyle(event.event_type)
            return (
              <div 
                key={event.id} 
                className={`border rounded-2xl p-5 border-l-4 ${style.border} ${style.card} flex flex-col md:flex-row gap-5 items-start md:items-center relative shadow-sm hover:shadow-md transition-all`}
              >
                {/* Date square */}
                <div className={`flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl shrink-0 border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                    {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                  </span>
                  <span className={`text-2xl font-outfit font-extrabold leading-none mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {new Date(event.event_date).getDate()}
                  </span>
                </div>
                
                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${style.badge}`}>
                      {event.event_type}
                    </span>
                    {isPast ? (
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        isLight ? 'bg-red-50 text-red-500 border-red-200' : 'bg-red-500/15 text-red-400 border-red-500/25'
                      }`}>Past Event</span>
                    ) : event.days_until === 0 ? (
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border animate-pulse ${
                        isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      }`}>Today</span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-white/50 border-white/10'
                      }`}>In {event.days_until} days</span>
                    )}
                  </div>
                  <h3 className={`text-lg font-outfit font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>{event.title}</h3>
                  {event.description && (
                    <p className={`text-sm mt-1 line-clamp-2 leading-relaxed ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Actions & Timings */}
                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 shrink-0">
                  <div className={`flex items-center gap-2 text-xs font-semibold border px-3.5 py-2 rounded-xl w-fit md:w-auto ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/60'
                  }`}>
                    <Clock className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                    {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {!isPast && (
                    <button 
                      onClick={() => addToCalendar(event)}
                      className={`flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isLight 
                          ? 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300'
                          : 'bg-white/5 hover:bg-white/8 text-white border-white/10'
                      }`}
                    >
                      <CalendarPlus className={`w-4 h-4 ${isLight ? 'text-blue-500' : 'text-white/40'}`} /> Add to Calendar
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
