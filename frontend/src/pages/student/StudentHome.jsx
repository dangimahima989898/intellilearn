import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Bot, Zap, Target, Calendar, Clock, Flame, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Dot } from 'recharts'

export default function StudentHome() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
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
        
        // Filter future events and take top 4
        setEvents(evtData.filter(e => e.days_until >= 0).sort((a,b) => a.days_until - b.days_until).slice(0, 4))
      } catch (error) {
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const streakValue = user?.streak_count || 12

  // Mock quiz performance scores for the line chart (last 5 scores)
  const performanceData = [
    { subject: 'DSA', score: 85 },
    { subject: 'DBMS', score: 62 },
    { subject: 'OS', score: 90 },
    { subject: 'CN', score: 45 },
    { subject: 'Java', score: 78 }
  ]

  const getPerformanceDotColor = (score) => {
    if (score >= 80) return '#10B981'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const CustomPerformanceDot = (props) => {
    const { cx, cy, payload } = props
    return (
      <svg x={cx - 5} y={cy - 5} width={10} height={10} viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="5" fill={getPerformanceDotColor(payload.score)} className="glow-dot" />
      </svg>
    )
  }

  const quickActions = [
    { 
      title: "Daily Challenge", 
      subtitle: "New challenge waiting!", 
      icon: Trophy, 
      color: "text-amber-400", 
      bg: isLight ? "bg-amber-50" : "bg-amber-500/20",
      border: isLight ? "hover:border-amber-400/60" : "hover:border-amber-500/40",
      accent: "#F59E0B",
      path: "/student/challenge" 
    },
    { 
      title: "AI Tutor", 
      subtitle: "24/7 available", 
      icon: Bot, 
      color: "text-blue-500", 
      bg: isLight ? "bg-blue-50" : "bg-blue-500/20",
      border: isLight ? "hover:border-blue-400/60" : "hover:border-blue-500/40",
      accent: "#3B82F6",
      path: "/student/chatbot" 
    },
    { 
      title: "Generate Questions", 
      subtitle: "Practice any topic", 
      icon: Zap, 
      color: "text-violet-500", 
      bg: isLight ? "bg-violet-50" : "bg-violet-500/20",
      border: isLight ? "hover:border-violet-400/60" : "hover:border-violet-500/40",
      accent: "#8B5CF6",
      path: "/student/questions" 
    },
    { 
      title: "Adaptive Quiz", 
      subtitle: "Auto-difficulty", 
      icon: Target, 
      color: "text-emerald-500", 
      bg: isLight ? "bg-emerald-50" : "bg-emerald-500/20",
      border: isLight ? "hover:border-emerald-400/60" : "hover:border-emerald-500/40",
      accent: "#10B981",
      path: "/student/quiz" 
    },
  ]

  const stats = [
    { label: "Quizzes Taken", value: "24" },
    { label: "Avg Score", value: "78%" },
    { label: "Doubts Asked", value: "6" },
    { label: "Days Active", value: "32" }
  ]

  const getEventMarkerColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'exam') return 'bg-red-500'
    if (t === 'assignment') return 'bg-orange-500'
    if (t === 'hackathon') return 'bg-green-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className={`h-40 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className={`h-28 border rounded-xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 h-80 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`} />
          <div className={`h-80 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`} />
        </div>
      </div>
    )
  }

  return (
    <PageWrapper>
      {/* Greeting Banner */}
      <div className={`border rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        isLight 
          ? 'bg-gradient-to-br from-blue-50 via-white to-violet-50 border-slate-200/80' 
          : 'bg-white/5 border-white/10'
      }`}>
        {/* Background glow aurora orb */}
        <div className={`absolute right-0 top-0 w-96 h-96 blur-3xl rounded-full pointer-events-none ${
          isLight ? 'bg-blue-400/8' : 'bg-blue-500/10'
        }`} />
        
        <div className="relative z-10">
          <h1 className={`text-3xl font-outfit font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Mahima'}! 👋
          </h1>
          {user?.course_code && (
            <p className={`text-sm font-semibold mt-1.5 tracking-wide ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
              🎓 {user.course_name} · Semester {user.current_semester} · Section {user.section || 'A'} · Enrollment: {user.enrollment_no || 'N/A'}
            </p>
          )}
          <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Ready to conquer today's challenges?</p>
        </div>

        {/* Animated large streak display */}
        <div className={`relative z-10 flex items-center gap-4 border p-4 rounded-2xl max-w-xs shrink-0 select-none shadow-lg ${
          isLight 
            ? 'bg-amber-50 border-amber-200 shadow-amber-500/10' 
            : 'bg-white/5 border-white/10 shadow-orange-500/5'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl font-bold animate-bounce-subtle shrink-0 ${
            isLight ? 'bg-amber-100' : 'bg-orange-500/20'
          }`}>
            🔥
          </div>
          <div>
            <h4 className={`font-extrabold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>{streakValue} Day Streak</h4>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-amber-600' : 'text-white/40'}`}>Keep going!</p>
          </div>
        </div>
      </div>

      {/* Quick Actions grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {quickActions.map((action, idx) => (
          <div
            key={idx}
            onClick={() => navigate(action.path)}
            className={`border rounded-2xl p-5 cursor-pointer shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group ${action.border} ${
              isLight 
                ? 'bg-white border-slate-200/80 hover:shadow-slate-200' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${action.bg}`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <h3 className={`font-bold font-outfit text-md mt-4 ${isLight ? 'text-slate-800' : 'text-white'}`}>{action.title}</h3>
              <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{action.subtitle}</p>
            </div>
            
            <div className="flex justify-end mt-4">
              <span 
                className="text-lg font-bold group-hover:translate-x-1 transition-transform" 
                style={{ color: action.accent }}
              >
                →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Schedule and Performance */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Schedule */}
          <div className={`border rounded-2xl p-6 shadow-xl ${
            isLight ? 'bg-white border-slate-200/80' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-outfit font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <Calendar className={`w-5 h-5 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
                Today's Schedule
              </h2>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div className="space-y-3">
              {timetable.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-center select-none ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/3 border-white/10'
                }`}>
                  <span className="text-3xl mb-2">🌴</span>
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No classes today. Time to relax!</p>
                </div>
              ) : (
                timetable.map(slot => (
                  <div 
                    key={slot.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border border-l-4 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/3 border-white/10'
                    }`}
                    style={{ borderLeftColor: slot.subject_color || '#3B82F6' }}
                  >
                    <div>
                      <h4 className={`font-bold text-sm font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>{slot.subject_name}</h4>
                      {slot.room && (
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1.5 font-medium border ${
                          isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-white/50 border-white/5'
                        }`}>
                          Room: {slot.room}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                      <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                      {slot.start_time} - {slot.end_time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Performance */}
          <div className={`border rounded-2xl p-6 shadow-xl ${
            isLight ? 'bg-white border-slate-200/80' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-outfit font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Recent Performance</h2>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Last 5 Quizzes</span>
            </div>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="subject" 
                    stroke={isLight ? '#94a3b8' : '#ffffff30'} 
                    fontSize={10} 
                    tickLine={false} 
                    tick={{ fill: isLight ? '#64748b' : 'rgba(255,255,255,0.4)' }}
                  />
                  <YAxis 
                    stroke={isLight ? '#94a3b8' : '#ffffff30'} 
                    domain={[0, 100]} 
                    fontSize={10} 
                    tickLine={false}
                    tick={{ fill: isLight ? '#64748b' : 'rgba(255,255,255,0.4)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isLight ? '#ffffff' : '#0F172A', 
                      borderColor: isLight ? '#e2e8f0' : '#ffffff15', 
                      borderRadius: '12px',
                      boxShadow: isLight ? '0 4px 24px rgba(0,0,0,0.08)' : 'none'
                    }}
                    labelStyle={{ color: isLight ? '#1e293b' : '#ffffff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3B82F6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={<CustomPerformanceDot />}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Side: Events and Stats */}
        <div className="space-y-6">
          
          {/* Upcoming Events */}
          <div className={`border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200/80' : 'bg-white/5 border-white/10'
          }`}>
            <div>
              <h2 className={`text-lg font-outfit font-bold mb-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>Upcoming Events</h2>
              
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className={`text-center p-6 border border-dashed rounded-xl ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/3 border-white/10'
                  }`}>
                    <p className={`text-xs font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No upcoming events scheduled.</p>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getEventMarkerColor(event.event_type)}`} />
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-bold truncate leading-tight pr-2 ${isLight ? 'text-slate-700' : 'text-white'}`}>{event.title}</h4>
                        <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                          {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`border-t mt-6 pt-4 text-center ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <button 
                onClick={() => navigate('/student/events')}
                className={`text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                  isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                View all events →
              </button>
            </div>
          </div>

          {/* Your Stats */}
          <div className={`border rounded-2xl p-6 shadow-xl ${
            isLight ? 'bg-white border-slate-200/80' : 'bg-white/5 border-white/10'
          }`}>
            <h2 className={`text-lg font-outfit font-bold mb-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>Your Stats</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className={`border rounded-xl p-4 text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/3 border-white/10'
                }`}>
                  <h3 className={`text-2xl font-outfit font-bold leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>{stat.value}</h3>
                  <p className={`text-[10px] mt-1.5 font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageWrapper>
  )
}
