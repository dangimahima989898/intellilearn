import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentTimetablePage() {
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

  if (loading) return <div className="p-8 text-center text-navy-400">Loading timetable...</div>

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">Class Timetable</h1>
        <p className="text-navy-400 text-sm">Your weekly schedule and room assignments.</p>
      </div>

      <div className="card bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 p-6 custom-scrollbar" ref={containerRef}>
          <div className="min-w-[1000px] h-full flex flex-col">
            <div className="grid grid-cols-6 gap-4 flex-1">
              {days.map(day => (
                <div key={day} className="flex flex-col gap-4">
                  <div className={`py-3 text-center rounded-xl font-outfit font-bold uppercase tracking-wider text-sm shadow-md border ${
                    day === todayName 
                    ? 'bg-brand text-white border-brand shadow-brand/20' 
                    : 'bg-navy-900 border-navy-700 text-white'
                  }`}>
                    {day}
                  </div>
                  
                  <div className={`flex flex-col gap-3 flex-1 bg-navy-900/30 rounded-xl p-2 border border-dashed relative ${
                    day === todayName ? 'border-brand/50 bg-brand/5' : 'border-navy-800/50'
                  }`}>
                    {/* If it's today, we could show a current time line indicator here in a more advanced implementation */}
                    
                    {slots.filter(s => s.day_of_week === day)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(slot => (
                        <div 
                          key={slot.id} 
                          className="relative p-4 rounded-xl border border-navy-600/50 shadow-md hover:-translate-y-1 transition-transform"
                          style={{ backgroundColor: `${slot.subject_color}20`, borderLeft: `4px solid ${slot.subject_color}` }}
                        >
                          <h4 className="font-outfit font-bold text-white text-sm mb-2 leading-tight">
                            {slot.subject_name}
                          </h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: slot.subject_color }}>
                              <Clock className="w-3.5 h-3.5" />
                              {slot.start_time} - {slot.end_time}
                            </div>
                            {slot.room && (
                              <div className="flex items-center gap-2 text-xs text-navy-300">
                                <MapPin className="w-3.5 h-3.5" />
                                {slot.room}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                    {slots.filter(s => s.day_of_week === day).length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-navy-600 text-xs font-medium uppercase tracking-widest">Free</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
