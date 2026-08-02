import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, X, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react'
import adminService from '../../services/adminService'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import EmptyState from '../../components/EmptyState'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'

export default function TimetablePage() {
  const [slots, setSlots] = useState([])
  const [subjects, setSubjects] = useState([]) // For looking up all subject names/colors
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeMobileDay, setActiveMobileDay] = useState('Monday')
  
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSemester, setFilterSemester] = useState('')

  // Modal selector state
  const [modalCourseId, setModalCourseId] = useState('')
  const [modalSemester, setModalSemester] = useState('')
  const [modalSubjects, setModalSubjects] = useState([])
  const [modalSubjectsLoading, setModalSubjectsLoading] = useState(false)

  const [formData, setFormData] = useState({
    subject_id: '',
    faculty_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    course_id: '',
    semester_number: ''
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Hours array from 8:00 AM to 6:00 PM (intervals of 30 mins)
  const timeIntervals = []
  for (let hour = 8; hour <= 18; hour++) {
    timeIntervals.push(`${hour < 10 ? '0' + hour : hour}:00`)
    if (hour < 18) {
      timeIntervals.push(`${hour < 10 ? '0' + hour : hour}:30`)
    }
  }

  const fetchData = async (courseId = null, semester = null) => {
    try {
      setLoading(true)
      const [slotsRes, subjectsRes, facultyRes] = await Promise.allSettled([
        adminService.getTimetable(courseId || null, semester || null),
        adminService.getSubjects(),
        api.get('/api/v1/hod/faculty/all')
      ])
      setSlots(slotsRes.status === 'fulfilled' ? (slotsRes.value || []) : [])
      setSubjects(subjectsRes.status === 'fulfilled' ? (subjectsRes.value || []) : [])
      setFacultyList(facultyRes.status === 'fulfilled' ? (facultyRes.value.data || []) : [])

      if (slotsRes.status === 'rejected') console.warn('Timetable slots load failed:', slotsRes.reason?.message)
      if (subjectsRes.status === 'rejected') console.warn('Timetable subjects load failed:', subjectsRes.reason?.message)
      if (facultyRes.status === 'rejected') console.warn('Timetable faculty load failed:', facultyRes.reason?.message)
    } catch (error) {
      console.error("Timetable fetch error:", error)
      setSlots([])
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(filterCourseId, filterSemester)
  }, [filterCourseId, filterSemester])

  // Fetch subjects for slot creator dynamically
  useEffect(() => {
    const fetchModalSubjects = async () => {
      if (!modalCourseId) {
        setModalSubjects([])
        return
      }
      setModalSubjectsLoading(true)
      try {
        const data = await adminService.getSubjects(modalCourseId, modalSemester || null)
        setModalSubjects(data || [])
      } catch (err) {
        console.error("Failed to load subjects for slot creator modal:", err)
        setModalSubjects([])
      } finally {
        setModalSubjectsLoading(false)
      }
    }
    fetchModalSubjects()
  }, [modalCourseId, modalSemester])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time')
      return
    }

    if (!modalCourseId || !modalSemester) {
      toast.error("Please select a Course and Semester")
      return
    }

    try {
      const payload = {
        ...formData,
        course_id: modalCourseId,
        semester_number: parseInt(modalSemester)
      }
      await adminService.createTimetableSlot(payload)
      toast.success('Slot added to timetable')
      setIsModalOpen(false)
      setFormData({ 
        subject_id: '',
        faculty_id: '',
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        room: '',
        course_id: '',
        semester_number: ''
      })
      setModalCourseId('')
      setModalSemester('')
      fetchData(filterCourseId, filterSemester)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create timetable slot')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this slot from timetable?')) {
      try {
        await adminService.deleteTimetableSlot(id)
        toast.success('Slot removed')
        fetchData(filterCourseId, filterSemester)
      } catch (error) {
        toast.error('Failed to delete slot')
      }
    }
  }

  const getSubjectColor = (id) => {
    const sub = subjects.find(s => s.id === id)
    return sub?.color || '#8B5CF6'
  }

  const getSubjectName = (id) => {
    const sub = subjects.find(s => s.id === id)
    return sub?.name || 'Unknown Subject'
  }

  // Parses 'HH:MM' into total minutes since 8:00 AM
  const getMinutesOffset = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    return (h - 8) * 60 + m
  }

  const renderSlotBlock = (slot) => {
    const subjectColor = slot.subject_color || getSubjectColor(slot.subject_id)
    const startMins = getMinutesOffset(slot.start_time)
    const endMins = getMinutesOffset(slot.end_time)
    const duration = endMins - startMins

    // Map 60 minutes to 64px height (h-16 = 64px)
    const topOffset = (startMins / 60) * 64
    const heightOffset = (duration / 60) * 64

    const hasLeaveConflict = slot.faculty_on_leave
    const borderStyle = hasLeaveConflict 
      ? { border: '2px solid #EF4444', borderLeft: '4px solid #EF4444' } 
      : { borderLeftColor: subjectColor }

    const bgStyle = hasLeaveConflict 
      ? 'rgba(239, 68, 68, 0.15)' 
      : `${subjectColor}20`

    return (
      <div 
        key={slot.id}
        className="absolute inset-x-1 rounded-xl p-2.5 overflow-hidden group hover:opacity-100 opacity-90 transition-opacity border-l-4 shadow-lg"
        style={{
          top: `${topOffset}px`,
          height: `${heightOffset}px`,
          backgroundColor: bgStyle,
          ...borderStyle
        }}
      >
        <button 
          onClick={() => handleDelete(slot.id)}
          className="absolute top-2 right-2 p-1 bg-black/40 text-white/50 hover:text-red-400 rounded hover:bg-black/60 transition-colors z-10 lg:opacity-0 group-hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
        
        <p className="font-semibold text-white text-[11px] sm:text-xs truncate leading-tight pr-4">
          {slot.subject_name || getSubjectName(slot.subject_id)}
        </p>
        {slot.faculty_name && (
          <div className="text-[10px] text-white/50 truncate font-semibold mt-0.5">
            👤 {slot.faculty_name}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] text-white/60 truncate font-medium">
          <Clock className="w-3 h-3 shrink-0 text-white/40" />
          {slot.start_time} - {slot.end_time}
        </div>
        {slot.room && (
          <div className="flex items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] text-white/60 truncate font-medium">
            <MapPin className="w-3 h-3 shrink-0 text-white/40" />
            {slot.room}
          </div>
        )}
        {hasLeaveConflict && (
          <div className="flex items-center gap-1 mt-1 text-[9px] text-red-400 font-extrabold uppercase animate-pulse">
            <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
            Faculty on Leave
          </div>
        )}
      </div>
    )
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Timetable</h1>
          <p className="text-white/50 text-sm mt-1">Weekly class schedule</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Slot
        </button>
      </div>

      {/* Dynamic Course & Semester Filters */}
      <div className="mb-6">
        <CourseSemesterSelector
          initialCourseId={filterCourseId}
          initialSemester={filterSemester}
          onSelect={(selection) => {
            setFilterCourseId(selection.courseId || "")
            setFilterSemester(selection.semesterNumber || "")
          }}
        />
      </div>

      {/* Days Selector (Mobile Only) */}
      <div className="flex gap-2 overflow-x-auto pb-4 lg:hidden scrollbar-hide shrink-0">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setActiveMobileDay(day)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              activeMobileDay === day
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'text-white/50 hover:text-white bg-white/5 border-transparent'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-white/5 border border-white/10 rounded-2xl" />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl relative">
          
          {/* Desktop full grid layout (hidden on mobile) */}
          <div className="hidden lg:block">
            {/* Table headers */}
            <div className="grid grid-cols-7 gap-4 mb-3 border-b border-white/10 pb-3">
              <div className="text-white/30 text-xs font-semibold text-center uppercase tracking-wider">Time</div>
              {days.map(day => (
                <div key={day} className="text-white/70 text-sm font-semibold text-center uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid structure container */}
            <div className="relative" style={{ height: '640px' }}>
              
              {/* Backgrid grids (every 30 min = h-16 cell border-b) */}
              <div className="absolute inset-0 grid grid-cols-7 gap-4 pointer-events-none">
                <div className="col-span-1 border-r border-white/5 relative">
                  {timeIntervals.map((time, idx) => (
                    <div key={idx} className="h-8 border-b border-transparent relative">
                      {idx % 2 === 0 && (
                        <span className="absolute -top-2.5 right-2 text-white/30 text-[10px] font-bold">
                          {time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {days.map(day => (
                  <div key={day} className="col-span-1 border-r border-white/5 relative">
                    {timeIntervals.map((_, idx) => (
                      <div key={idx} className="h-8 border-b border-white/5" />
                    ))}
                  </div>
                ))}
              </div>

              {/* Placed timetable cells */}
              <div className="absolute inset-0 grid grid-cols-7 gap-4">
                <div className="col-span-1" /> {/* empty spacer for axis */}
                {days.map((day) => {
                  const daySlots = slots.filter(s => s.day_of_week === day)
                  return (
                    <div key={day} className="col-span-1 relative h-full">
                      {daySlots.map(slot => renderSlotBlock(slot))}
                    </div>
                  )
                })}
              </div>

            </div>
          </div>

          {/* Mobile Single Day grid layout (hidden on desktop) */}
          <div className="block lg:hidden">
            <div className="border-b border-white/10 pb-3 mb-4 text-center">
              <h3 className="text-white font-bold text-md uppercase tracking-wider">{activeMobileDay} Schedule</h3>
            </div>
            
            <div className="relative" style={{ height: '640px' }}>
              
              {/* Mobile Backgrid (Time column + 1 Day column) */}
              <div className="absolute inset-0 grid grid-cols-4 gap-4 pointer-events-none">
                <div className="col-span-1 border-r border-white/5 relative">
                  {timeIntervals.map((time, idx) => (
                    <div key={idx} className="h-8 border-b border-transparent relative">
                      {idx % 2 === 0 && (
                        <span className="absolute -top-2.5 right-2 text-white/30 text-[10px] font-bold">
                          {time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="col-span-3 relative">
                  {timeIntervals.map((_, idx) => (
                    <div key={idx} className="h-8 border-b border-white/5" />
                  ))}
                </div>
              </div>

              {/* Mobile Placed Timetable cells */}
              <div className="absolute inset-0 grid grid-cols-4 gap-4">
                <div className="col-span-1" />
                <div className="col-span-3 relative h-full">
                  {slots
                    .filter(s => s.day_of_week === activeMobileDay)
                    .map(slot => renderSlotBlock(slot))}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Add Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white">Add Timetable Slot</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <CourseSemesterSelector
                required
                initialCourseId={modalCourseId}
                initialSemester={modalSemester}
                onSelect={(selection) => {
                  setModalCourseId(selection.courseId || "")
                  setModalSemester(selection.semesterNumber || "")
                }}
              />

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5 flex items-center justify-between">
                  <span>Subject</span>
                  {modalSubjectsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />}
                </label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value, faculty_id: ''})}
                  disabled={modalSubjectsLoading || !modalCourseId}
                  className="w-full bg-[#0A0F1E] border border-white/15 disabled:opacity-40 disabled:border-white/5 rounded-xl px-4 py-3 text-white disabled:text-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    {!modalCourseId ? "Select Course & Semester First..." : modalSubjectsLoading ? "Loading subjects..." : modalSubjects.length === 0 ? "No subjects found for this semester" : "Select a subject..."}
                  </option>
                  {modalSubjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-[#0f172a] text-white">{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Assigned Faculty</label>
                <select
                  required
                  value={formData.faculty_id}
                  onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                  disabled={!formData.subject_id}
                  className="w-full bg-[#0A0F1E] border border-white/15 disabled:opacity-40 disabled:border-white/5 rounded-xl px-4 py-3 text-white disabled:text-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    {!formData.subject_id ? "Select Subject First..." : facultyList.filter(fac => fac.subjects?.some(s => s.subject_id === formData.subject_id)).length === 0 ? "No faculty assigned to this subject" : "Select a faculty..."}
                  </option>
                  {facultyList
                    .filter(fac => fac.subjects?.some(s => s.subject_id === formData.subject_id))
                    .map(fac => (
                      <option key={fac.id} value={fac.id} className="bg-[#0f172a] text-white">
                        {fac.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Day of Week</label>
                <select
                  required
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full bg-[#0A0F1E] border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none"
                >
                  {days.map(d => (
                    <option key={d} value={d} className="bg-navy-900">{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Start Time</label>
                  <input
                    required
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">End Time</label>
                  <input
                    required
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Room / Location</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  placeholder="e.g. Lab 402"
                />
              </div>

              {/* Slot Preview */}
              {formData.subject_id && (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-300 font-medium">
                    This slot will appear as <strong className="text-white">{getSubjectName(formData.subject_id)}</strong> on <strong className="text-white">{formData.day_of_week}</strong> from <strong className="text-white">{formData.start_time}</strong> to <strong className="text-white">{formData.end_time}</strong>.
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
