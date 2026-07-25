import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Distinct colors for up to 8 faculty
const FACULTY_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
]

export default function LeaveCalendarPanel({ leaves, month, year, onMonthChange }) {
  const [hoveredDate, setHoveredDate] = useState(null)

  // Build a map: facultyName → color index
  const facultyColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    leaves.filter(l => l.status === 'approved').forEach(l => {
      if (!(l.faculty_name in map)) {
        map[l.faculty_name] = FACULTY_COLORS[idx % FACULTY_COLORS.length]
        idx++
      }
    })
    return map
  }, [leaves])

  // Build: dateStr → list of approved leaves active on that date
  const dateLeaveMap = useMemo(() => {
    const map = {}
    leaves.filter(l => l.status === 'approved').forEach(l => {
      let cur = new Date(l.start_date)
      const end = new Date(l.end_date)
      while (cur <= end) {
        const key = cur.toISOString().split('T')[0]
        if (!map[key]) map[key] = []
        map[key].push(l)
        cur.setDate(cur.getDate() + 1)
      }
    })
    return map
  }, [leaves])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [month, year])

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const handlePrev = () => onMonthChange((month - 1 + 12) % 12)
  const handleNext = () => onMonthChange((month + 1) % 12)

  const getDateStr = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Faculty on leave today
  const todayLeaves = dateLeaveMap[todayStr] || []

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-xl transition text-white/60 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            {MONTHS[month]} {year}
          </h3>
          <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-xl transition text-white/60 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-white/30 py-1">{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />

            const dateStr = getDateStr(day)
            const dayLeaves = dateLeaveMap[dateStr] || []
            const isToday = dateStr === todayStr
            const hasMany = dayLeaves.length >= 3

            return (
              <div
                key={day}
                className={`relative rounded-lg p-1 text-center cursor-pointer transition group ${isToday ? 'bg-violet-600/30 border border-violet-500/50' : hasMany ? 'bg-red-500/15 border border-red-500/20' : 'hover:bg-white/5'}`}
                onMouseEnter={() => dayLeaves.length > 0 && setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-violet-300' : dayLeaves.length > 0 ? 'text-white' : 'text-white/50'}`}>
                  {day}
                </span>
                {/* Colored leave dots */}
                {dayLeaves.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                    {dayLeaves.slice(0, 3).map((l, li) => (
                      <span key={li} className={`w-1.5 h-1.5 rounded-full ${facultyColorMap[l.faculty_name] || 'bg-gray-500'}`} />
                    ))}
                    {dayLeaves.length > 3 && <span className="text-[8px] text-white/30">+{dayLeaves.length - 3}</span>}
                  </div>
                )}

                {/* Tooltip */}
                {hoveredDate === dateStr && dayLeaves.length > 0 && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1E293B] border border-white/20 rounded-xl p-3 shadow-2xl text-left">
                    <p className="text-[10px] font-bold text-white/50 mb-2 uppercase tracking-wider">
                      {day} {MONTHS[month]}
                    </p>
                    {dayLeaves.map((l, li) => (
                      <div key={li} className="flex items-center gap-2 mb-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${facultyColorMap[l.faculty_name] || 'bg-gray-500'}`} />
                        <div>
                          <p className="text-[11px] text-white font-medium leading-tight">{l.faculty_name}</p>
                          <p className="text-[10px] text-white/40">{l.leave_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        {Object.keys(facultyColorMap).length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Faculty Legend</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(facultyColorMap).map(([name, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                  <span className="text-xs text-white/60 truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Absences */}
      {todayLeaves.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">On Leave Today</p>
          <div className="flex flex-col gap-2">
            {todayLeaves.map((l, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 bg-white/5 rounded-xl">
                <span className={`w-2 h-2 rounded-full ${facultyColorMap[l.faculty_name] || 'bg-gray-500'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{l.faculty_name}</p>
                  <p className="text-[11px] text-white/40">{l.department} · {l.leave_type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning if 3+ absent same day */}
      {(() => {
        const criticalDays = Object.entries(dateLeaveMap).filter(([, ls]) => ls.length >= 3)
        if (criticalDays.length === 0) return null
        return (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-400 mb-2">⚠️ High Absence Days</p>
            {criticalDays.slice(0, 3).map(([date, ls]) => (
              <p key={date} className="text-xs text-red-300/70 mb-1">
                {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {ls.length} faculty absent
              </p>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
