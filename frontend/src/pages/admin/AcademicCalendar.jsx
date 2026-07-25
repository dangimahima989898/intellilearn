import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react'

export default function AcademicCalendar({ events = [], onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Get first day of the month (0 = Sunday, ..., 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay()

  // Get total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate()

  // Get total days in previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const today = new Date()

  // Generate calendar days
  const calendarDays = []

  // Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthTotalDays - i)
    })
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    })
  }

  // Padding days for next month to complete the grid (usually 42 cells)
  const totalCells = 42
  const remainingCells = totalCells - calendarDays.length
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    })
  }

  // Helper to format date key 'YYYY-MM-DD'
  const formatDateKey = (dateObj) => {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Group events by date key
  const eventsByDate = React.useMemo(() => {
    const groups = {}
    events.forEach(event => {
      if (!event.event_date) return
      const dateStr = formatDateKey(new Date(event.event_date))
      if (!groups[dateStr]) {
        groups[dateStr] = []
      }
      groups[dateStr].push(event)
    })
    return groups
  }, [events])

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
      {/* Month Year Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="font-bold text-slate-800 text-sm">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
          <span key={idx} className="text-[10px] font-black uppercase text-slate-400">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          const dateKey = formatDateKey(cell.date)
          const dayEvents = eventsByDate[dateKey] || []
          const isToday = 
            today.getDate() === cell.date.getDate() && 
            today.getMonth() === cell.date.getMonth() && 
            today.getFullYear() === cell.date.getFullYear()

          const hasExams = dayEvents.some(e => e.event_type?.toLowerCase().includes('exam') || e.event_type?.toLowerCase() === 'test')
          const hasHolidays = dayEvents.some(e => e.event_type?.toLowerCase().includes('holiday'))
          const hasEvents = dayEvents.some(e => !e.event_type?.toLowerCase().includes('exam') && !e.event_type?.toLowerCase().includes('holiday'))
          const isSaturday = cell.date.getDay() === 6
          const isSunday = cell.date.getDay() === 0

          let textStyle = "text-slate-700"
          if (!cell.isCurrentMonth) textStyle = "text-slate-300"
          else if (isSunday) textStyle = "text-rose-400"

          let bgStyle = "hover:bg-slate-100"
          if (isToday) {
            bgStyle = "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            textStyle = "text-white"
          } else if (hasHolidays) {
            bgStyle = "bg-slate-100 text-slate-400 border border-slate-200"
          }

          return (
            <div 
              key={idx}
              className="relative"
              onMouseEnter={() => setHoveredDay(dateKey)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => cell.isCurrentMonth && onDateSelect && onDateSelect(cell.date)}
            >
              <button
                disabled={!cell.isCurrentMonth}
                className={`w-full aspect-square rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative border border-transparent ${bgStyle} ${textStyle} disabled:cursor-not-allowed`}
              >
                <span>{cell.day}</span>
                
                {/* Dot Indicators */}
                {!isToday && dayEvents.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5 justify-center">
                    {hasExams && <span className="w-1 h-1 rounded-full bg-red-500" />}
                    {hasEvents && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                    {hasHolidays && <span className="w-1 h-1 rounded-full bg-slate-400" />}
                  </div>
                )}
              </button>

              {/* Tooltip on Hover */}
              {hoveredDay === dateKey && dayEvents.length > 0 && (
                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#0F172A] text-white p-2 rounded-xl text-[10px] shadow-xl border border-white/10 pointer-events-none">
                  <div className="font-bold border-b border-white/10 pb-1 mb-1">
                    {cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map(e => (
                      <div key={e.id} className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          e.event_type?.toLowerCase().includes('exam') ? 'bg-red-400' :
                          e.event_type?.toLowerCase().includes('holiday') ? 'bg-slate-400' : 'bg-blue-400'
                        }`} />
                        <span className="truncate font-semibold">{e.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Calendar Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Exams</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Events</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Holidays</span>
        </div>
      </div>
    </div>
  )
}
