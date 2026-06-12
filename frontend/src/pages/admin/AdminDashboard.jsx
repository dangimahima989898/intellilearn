import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, FileText, CalendarDays, BookOpen, ArrowRight, Download, Clock, GraduationCap, Layers, ArrowUpRight } from 'lucide-react'
import adminService from '../../services/adminService'
import courseService from '../../services/courseService'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    students: 0,
    notes: 0,
    events: 0,
    subjects: 0
  })
  
  const [courses, setCourses] = useState([])
  const [courseStats, setCourseStats] = useState({})
  const [recentNotes, setRecentNotes] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [subjects, notes, events, activeCourses, totalStudentsCount] = await Promise.all([
          adminService.getSubjects(),
          adminService.getNotes(),
          adminService.getEvents(),
          courseService.getCourses(),
          courseService.getStudentCount()
        ])
        
        setStats({
          students: totalStudentsCount?.count || 0,
          notes: notes.length,
          events: events.filter(e => e.days_until >= 0).length,
          subjects: subjects.length
        })
        
        setCourses(activeCourses)
        
        // Fetch student counts for each course
        const counts = {}
        await Promise.all(activeCourses.map(async (c) => {
          try {
            const data = await courseService.getStudentCount(c.id)
            counts[c.id] = data.count
          } catch (err) {
            console.error(`Failed to fetch student count for course ${c.code}:`, err)
            counts[c.id] = 0
          }
        }))
        setCourseStats(counts)
        
        setRecentNotes(notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
        setUpcomingEvents(events.filter(e => e.days_until >= 0).sort((a, b) => a.days_until - b.days_until).slice(0, 3))
      } catch (error) {
        console.error("Dashboard error:", error)
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <PageWrapper>
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white/5 border border-white/10 rounded-2xl" />
            <div className="h-80 bg-white/5 border border-white/10 rounded-2xl" />
          </div>
        </div>
      </PageWrapper>
    )
  }

  const statCards = [
    { label: "Total Students", value: stats.students, icon: Users, color: "text-blue-400", bg: "bg-blue-500/20", blurColor: "bg-blue-500", trend: "↑ 12%" },
    { label: "Total Notes", value: stats.notes, icon: FileText, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/20", blurColor: "bg-[#8B5CF6]", trend: "↑ 8%" },
    { label: "Upcoming Events", value: stats.events, icon: CalendarDays, color: "text-orange-400", bg: "bg-orange-500/20", blurColor: "bg-orange-500", trend: "↓ 2%" },
    { label: "Total Subjects", value: stats.subjects, icon: BookOpen, color: "text-teal-400", bg: "bg-teal-500/20", blurColor: "bg-teal-500", trend: "Active" },
  ]

  const getEventBorderColor = (type) => {
    const t = type.toLowerCase()
    if (t === 'exam') return 'border-l-red-500'
    if (t === 'assignment') return 'border-l-orange-500'
    if (t === 'hackathon') return 'border-l-green-500'
    return 'border-l-violet-500'
  }

  const getFileIconColors = (fileType) => {
    const type = fileType?.toLowerCase() || ''
    if (type.includes('pdf')) return { text: 'text-red-400', bg: 'bg-red-500/20' }
    if (type.includes('docx') || type.includes('doc')) return { text: 'text-blue-400', bg: 'bg-blue-500/20' }
    if (type.includes('ppt')) return { text: 'text-orange-400', bg: 'bg-orange-500/20' }
    return { text: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/20' }
  }

  const getDaysChip = (days_until) => {
    if (days_until === 0) return { label: 'Today', class: 'bg-red-500/20 text-red-400' }
    if (days_until <= 3) return { label: `In ${days_until} days`, class: 'bg-orange-500/20 text-orange-400' }
    if (days_until <= 7) return { label: `In ${days_until} days`, class: 'bg-yellow-500/20 text-yellow-400' }
    return { label: `In ${days_until} days`, class: 'bg-green-500/20 text-green-400' }
  }

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Welcome back, {user?.name || 'Administrator'}! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all duration-300">
            {/* Decorative bottom blur orb matching icon color */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${stat.blurColor} transition-opacity duration-300 group-hover:opacity-20`} />
            
            <div className="flex justify-between items-center relative z-10">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.trend.includes('↑') ? 'bg-emerald-500/10 text-emerald-400' : 
                stat.trend.includes('↓') ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/50'
              }`}>
                {stat.trend}
              </span>
            </div>
            
            <div className="mt-4 relative z-10">
              <h3 className="text-3xl font-outfit font-bold text-white">{stat.value}</h3>
              <p className="text-white/50 text-sm mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Course Overview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-outfit font-semibold text-white mb-4">Course & Semester Overview</h2>
        {courses.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/40 text-sm">
            No active courses found. Register courses in database.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses.map((course) => {
              const courseThemes = {
                MCA: {
                  color: "text-indigo-400",
                  bg: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20",
                  glow: "bg-indigo-500",
                  gradient: "from-indigo-600/10 to-violet-600/5"
                },
                BCA: {
                  color: "text-sky-400",
                  bg: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
                  glow: "bg-sky-500",
                  gradient: "from-sky-600/10 to-blue-600/5"
                },
                "BSc CS": {
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
                  glow: "bg-emerald-500",
                  gradient: "from-emerald-600/10 to-teal-600/5"
                },
                "MSc CS": {
                  color: "text-rose-400",
                  bg: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
                  glow: "bg-rose-500",
                  gradient: "from-rose-600/10 to-pink-600/5"
                }
              }
              const theme = courseThemes[course.code] || {
                color: "text-violet-400",
                bg: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
                glow: "bg-violet-500",
                gradient: "from-violet-600/10 to-fuchsia-600/5"
              }
              const studentCount = courseStats[course.id] || 0

              return (
                <Link
                  key={course.id}
                  to={`/admin/students?course_id=${course.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:bg-white/[0.08] hover:border-white/15 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Decorative background gradient and glow */}
                  <div className={`absolute -right-4 -bottom-4 w-28 h-28 rounded-full blur-3xl opacity-15 ${theme.glow} transition-opacity duration-300 group-hover:opacity-25`} />
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.bg}`}>
                        {course.code}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    
                    <h3 className="text-base font-semibold text-white mt-3 truncate group-hover:text-white transition-colors">
                      {course.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-white/50">
                      <Layers className="w-3.5 h-3.5 text-white/30" />
                      <span>{course.total_semesters} Semesters</span>
                    </div>
                  </div>

                  <div className="mt-5 relative z-10 flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-white/70">
                        {studentCount} Students
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40 group-hover:text-white/70 font-bold tracking-wider uppercase transition-colors">
                      View Cohort
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Recent Notes */}
        <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h2 className="text-lg font-outfit font-semibold text-white">Recently Uploaded</h2>
            <Link to="/admin/notes" className="text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 p-4">
            {recentNotes.length === 0 ? (
              <EmptyState title="No notes uploaded yet" description="Upload note files inside materials tab." icon={FileText} />
            ) : (
              <div className="flex flex-col gap-3">
                {recentNotes.map((note) => {
                  const colors = getFileIconColors(note.file_type)
                  return (
                    <div key={note.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all duration-200">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                          <FileText className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white text-sm font-medium truncate pr-2">{note.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6]">
                              {note.subject_name}
                            </span>
                            <span className="text-[10px] text-white/40 font-medium">
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-white/40 text-xs">
                        <Download className="w-3.5 h-3.5" />
                        <span>{note.download_count || 0}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h2 className="text-lg font-outfit font-semibold text-white">This Week</h2>
            <Link to="/admin/events" className="text-[#8B5CF6] hover:text-[#7C3AED] text-sm font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex-1 p-5 flex flex-col gap-4">
            {upcomingEvents.length === 0 ? (
              <EmptyState title="No upcoming events" description="Your weekly schedule is clear." icon={CalendarDays} />
            ) : (
              upcomingEvents.map(event => {
                const chip = getDaysChip(event.days_until)
                return (
                  <div 
                    key={event.id} 
                    className={`bg-white/3 border border-white/10 border-l-4 rounded-xl p-4 flex gap-4 items-center hover:bg-white/5 transition-all ${getEventBorderColor(event.event_type)}`}
                  >
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                        {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-xl font-outfit font-bold text-white mt-0.5">
                        {new Date(event.event_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-semibold truncate">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                          {event.event_type}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${chip.class}`}>
                          {chip.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </PageWrapper>
  )
}
