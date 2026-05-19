import { useState, useEffect } from 'react'
import { Users, FileText, CalendarDays, BookOpen, Clock } from 'lucide-react'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    notes: 0,
    events: 0,
    subjects: 0
  })
  
  const [recentNotes, setRecentNotes] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [subjects, notes, events] = await Promise.all([
          adminService.getSubjects(),
          adminService.getNotes(),
          adminService.getEvents()
        ])
        
        // Compute stats
        setStats({
          students: 0, // Will be fetched when we implement the students endpoint
          notes: notes.length,
          events: events.filter(e => e.days_until >= 0).length,
          subjects: subjects.length
        })
        
        // Sort and slice for recent/upcoming views
        setRecentNotes(notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
        setUpcomingEvents(events.filter(e => e.days_until >= 0).sort((a, b) => a.days_until - b.days_until).slice(0, 3))
      } catch (error) {
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-navy-700 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: "Total Students", value: stats.students, icon: Users, color: "border-l-blue-500", iconColor: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Subjects", value: stats.subjects, icon: BookOpen, color: "border-l-purple-500", iconColor: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Total Notes", value: stats.notes, icon: FileText, color: "border-l-emerald-500", iconColor: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Upcoming Events", value: stats.events, icon: CalendarDays, color: "border-l-orange-500", iconColor: "text-orange-500", bg: "bg-orange-500/10" },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-navy-400">Overview of platform statistics and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`card bg-navy-800 border-y border-r border-navy-700 rounded-xl p-6 border-l-4 ${stat.color} shadow-lg hover:-translate-y-1 transition-transform`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-3xl font-outfit font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notes */}
        <div className="lg:col-span-2 card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-navy-700 flex justify-between items-center bg-navy-800/50">
            <h2 className="text-lg font-outfit font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              Recently Uploaded Notes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-900/50 text-navy-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Subject</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/50">
                {recentNotes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-navy-500">No notes uploaded yet.</td>
                  </tr>
                ) : (
                  recentNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-navy-700/20 transition-colors">
                      <td className="p-4 text-white text-sm font-medium">{note.title}</td>
                      <td className="p-4 text-navy-300 text-sm">{note.subject_name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-navy-700 text-navy-300 border border-navy-600">
                          {note.file_type}
                        </span>
                      </td>
                      <td className="p-4 text-navy-400 text-xs">{note.file_size_kb} KB</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card bg-navy-800 border border-navy-700 rounded-2xl shadow-xl flex flex-col">
          <div className="p-6 border-b border-navy-700 flex justify-between items-center bg-navy-800/50">
            <h2 className="text-lg font-outfit font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand" />
              Upcoming Events
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            {upcomingEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-navy-700/50 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-navy-500" />
                </div>
                <p className="text-navy-500 text-sm">No upcoming events scheduled.</p>
              </div>
            ) : (
              upcomingEvents.map(event => (
                <div key={event.id} className="flex gap-4 p-4 rounded-xl bg-navy-900/50 border border-navy-700 hover:border-navy-600 transition-colors">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-brand/10 border border-brand/20 shrink-0">
                    <span className="text-xs text-brand font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-outfit font-bold text-white leading-tight">{new Date(event.event_date).getDate()}</span>
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold leading-tight mb-1">{event.title}</h4>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-800 text-navy-400 border border-navy-700">
                      {event.event_type}
                    </span>
                    <p className="text-xs text-brand font-medium mt-1">
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
