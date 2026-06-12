import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentTimetablePage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef(null)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

  const fetchData = async () => {
    try {
      const data = await studentService.getTimetable()
      setSlots(data)
    } catch (error) {
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className={`text-sm font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Loading weekly timetable...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-outfit font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {user?.course_code ? `${user.course_code} Semester ${user.current_semester} — Weekly Timetable` : "Class Timetable"}
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>Your weekly schedule and room assignments.</p>
        </div>
        {user?.section && (
          <span className={`text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${
            isLight 
              ? 'bg-blue-50 text-blue-600 border-blue-200' 
              : 'bg-blue-500/20 text-blue-300 border-blue-500/35'
          }`}>
            Section {user.section}
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <div className={`flex-1 border rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xl max-w-lg mx-auto my-12 ${
          isLight ? 'bg-white border-slate-200' : 'border-white/10 bg-white/5'
        }`}>
          <span className="text-4xl mb-4">📅</span>
          <h3 className={`font-bold text-lg ${isLight ? 'text-slate-800' : 'text-white'}`}>No Timetable Configured</h3>
          <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            No weekly schedule slot has been set for {user?.course_code || 'MCA'} Semester {user?.current_semester || 1} yet. Please contact your administrative coordinator.
          </p>
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0 backdrop-blur-xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
        }`}>
          <div className="overflow-x-auto overflow-y-auto flex-1 p-6 custom-scrollbar" ref={containerRef}>
            <div className="min-w-[1000px] h-full flex flex-col">
              <div className="grid grid-cols-6 gap-4 flex-1">
                {days.map(day => (
                  <div key={day} className="flex flex-col gap-4">
                    <div className={`py-3 text-center rounded-xl font-outfit font-extrabold uppercase tracking-wider text-xs shadow-md border transition-all ${
                      day === todayName 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : isLight 
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-white/5 border-white/10 text-white/80'
                    }`}>
                      {day}
                    </div>
                    
                    <div className={`flex flex-col gap-3 flex-1 rounded-xl p-2.5 border border-dashed transition-colors ${
                      day === todayName 
                        ? 'border-blue-500/35 bg-blue-500/5' 
                        : isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-white/3'
                    }`}>
                      {slots.filter(s => s.day_of_week === day)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                        .map(slot => (
                          <div 
                            key={slot.id} 
                            className={`relative p-4 rounded-xl border shadow-lg hover:-translate-y-0.5 transition-transform ${
                              isLight ? 'bg-white border-slate-200' : 'border-white/10 bg-[#0f172a]/40'
                            }`}
                            style={{ borderLeft: `4px solid ${slot.subject_color || '#3B82F6'}` }}
                          >
                            <h4 className={`font-outfit font-extrabold text-sm mb-2 leading-snug ${isLight ? 'text-slate-800' : 'text-white'}`}>
                              {slot.subject_name}
                            </h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: slot.subject_color || '#3B82F6' }}>
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {slot.start_time} - {slot.end_time}
                              </div>
                              {slot.room && (
                                <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  Room: {slot.room}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                      {slots.filter(s => s.day_of_week === day).length === 0 && (
                        <div className="flex-1 flex items-center justify-center select-none py-10">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isLight ? 'text-slate-300' : 'text-white/20'}`}>Free</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
