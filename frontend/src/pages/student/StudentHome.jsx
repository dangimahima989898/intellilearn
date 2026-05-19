import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Bot, Zap, Target, Flame, Calendar, BookOpen, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [timetable, setTimetable] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttData, evtData] = await Promise.all([
          studentService.getTimetable(),
          studentService.getEvents()
        ])
        
        // Filter timetable for today
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const todayName = days[new Date().getDay()]
        setTimetable(ttData.filter(s => s.day_of_week === todayName).sort((a,b) => a.start_time.localeCompare(b.start_time)))
        
        // Filter future events and take top 3
        setEvents(evtData.filter(e => e.days_until >= 0).sort((a,b) => a.days_until - b.days_until).slice(0, 3))
      } catch (error) {
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const quickActions = [
    { title: "Start Daily Challenge", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", path: "/student/challenge" },
    { title: "Ask AI Tutor", icon: Bot, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", path: "/student/chatbot" },
    { title: "Generate Questions", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", path: "/student/questions" },
    { title: "Take Adaptive Quiz", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", path: "/student/quiz" },
  ]

  if (loading) return <div className="p-8 text-center text-navy-400">Loading dashboard...</div>

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 card bg-gradient-to-br from-navy-800 to-navy-900 border border-navy-700 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-3xl font-outfit font-bold text-white mb-2">
              {getGreeting()}, {user?.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-navy-300">Ready to conquer your MCA journey today?</p>
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-navy-950/50 border border-navy-700">
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-500">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-navy-400 font-semibold uppercase">Current Streak</p>
                <p className="text-white font-bold">{user?.streak_count || 0} Days 🔥 Keep it up!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-outfit font-bold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className={`card bg-navy-800 border ${action.border} hover:border-opacity-100 rounded-xl p-5 shadow-lg hover:-translate-y-1 transition-all group flex flex-col items-center text-center`}
          >
            <div className={`p-4 rounded-xl ${action.bg} mb-4 group-hover:scale-110 transition-transform`}>
              <action.icon className={`w-8 h-8 ${action.color}`} />
            </div>
            <h3 className="font-semibold text-white font-outfit">{action.title}</h3>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Today's Timetable */}
        <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-outfit font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              Today's Classes
            </h2>
            <button onClick={() => navigate('/student/timetable')} className="text-xs text-brand hover:underline font-medium">View Full</button>
          </div>
          
          <div className="space-y-3">
            {timetable.length === 0 ? (
              <div className="text-center p-6 bg-navy-900/50 rounded-xl border border-navy-700 border-dashed">
                <p className="text-navy-400 text-sm">No classes scheduled for today! 🎉</p>
              </div>
            ) : (
              timetable.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-4 bg-navy-900/50 rounded-xl border border-navy-700 border-l-4" style={{ borderLeftColor: slot.subject_color }}>
                  <div>
                    <h4 className="text-white font-bold font-outfit">{slot.subject_name}</h4>
                    {slot.room && <p className="text-xs text-navy-400 mt-1">Room: {slot.room}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-navy-300 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      {slot.start_time} - {slot.end_time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-outfit font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand" />
              Upcoming Events
            </h2>
            <button onClick={() => navigate('/student/events')} className="text-xs text-brand hover:underline font-medium">View All</button>
          </div>
          
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center p-6 bg-navy-900/50 rounded-xl border border-navy-700 border-dashed">
                <p className="text-navy-400 text-sm">No upcoming events!</p>
              </div>
            ) : (
              events.map(event => (
                <div key={event.id} className="flex gap-4 p-4 rounded-xl bg-navy-900/50 border border-navy-700">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-brand/10 border border-brand/20 shrink-0">
                    <span className="text-xs text-brand font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-outfit font-bold text-white leading-tight">{new Date(event.event_date).getDate()}</span>
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold leading-tight mb-1">{event.title}</h4>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-800 text-navy-400 border border-navy-700 mb-1">
                      {event.event_type}
                    </span>
                    <p className="text-xs text-brand font-medium">
                      {event.days_until === 0 ? 'Today' : event.days_until === 1 ? 'Tomorrow' : `In ${event.days_until} days`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
