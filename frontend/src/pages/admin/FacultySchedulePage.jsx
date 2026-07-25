import { useState, useEffect } from 'react'
import { Calendar, Clock, BookOpen, MapPin } from 'lucide-react'
import api from '../../services/api'
import PageWrapper from '../../components/PageWrapper'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_COLORS = {
  Monday: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  Tuesday: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  Wednesday: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  Thursday: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  Friday: 'from-green-500/20 to-green-600/10 border-green-500/30',
  Saturday: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
}

export default function FacultySchedulePage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await api.get('/timetable')
        // filter slots for this faculty
        const mine = res.data.filter(s => s.faculty_id === user?.user_id || s.faculty_id === user?.id)
        setSlots(mine)
      } catch {
        toast.error('Failed to load schedule')
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [user])

  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = slots.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {})

  const hasAnySlots = slots.length > 0

  return (
    <PageWrapper title="My Schedule">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Teaching Schedule</h1>
          <p className="text-white/50 text-sm">Your weekly class schedule as assigned by the HOD. Read-only view.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map(d => <div key={d} className="h-36 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />)}
          </div>
        ) : !hasAnySlots ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-14 text-center">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Schedule Assigned</h3>
            <p className="text-white/50 text-sm">The HOD has not assigned any timetable slots to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAYS.map(day => {
              const daySlots = slotsByDay[day]
              if (!daySlots || daySlots.length === 0) return null
              return (
                <div key={day} className={`bg-gradient-to-b ${DAY_COLORS[day]} border rounded-2xl p-5 flex flex-col gap-3`}>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">{day}</h3>
                  {daySlots.map(slot => (
                    <div key={slot.id} className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-white/60 shrink-0" />
                          <span className="font-bold text-white text-sm">{slot.subject_code || slot.subject_name || 'Subject'}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-white/50">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</span>
                        {slot.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{slot.room}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
