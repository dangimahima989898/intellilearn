import React, { useState, useEffect, useMemo } from 'react'
import { X, AlertTriangle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import courseService from '../../services/courseService'
import adminService from '../../services/adminService'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function ScheduleClassModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editSlot = null,
  allSlots = []
}) {
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [facultyList, setFacultyList] = useState([])
  
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [courseId, setCourseId] = useState('')
  const [semesterNumber, setSemesterNumber] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [section, setSection] = useState('')
  const [room, setRoom] = useState('')
  const [classType, setClassType] = useState('Lecture') // Lecture, Lab, Tutorial
  const [repeatType, setRepeatType] = useState('Weekly') // Weekly, One-time
  const [date, setDate] = useState('')
  const [overrideJustification, setOverrideJustification] = useState('')
  const [overrideChecked, setOverrideChecked] = useState(false)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Load courses & faculty list on mount
  useEffect(() => {
    const loadInitData = async () => {
      setCoursesLoading(true)
      try {
        const [cDataRes, fRes] = await Promise.allSettled([
          courseService.getCourses(),
          api.get('/api/v1/hod/faculty/all')
        ])
        setCourses(cDataRes.status === 'fulfilled' ? (cDataRes.value || []) : [])
        setFacultyList(fRes.status === 'fulfilled' ? (fRes.value.data || []) : [])
        
        if (cDataRes.status === 'rejected') console.warn('Modal courses load failed:', cDataRes.reason?.message)
        if (fRes.status === 'rejected') console.warn('Modal faculty load failed:', fRes.reason?.message)
      } catch (err) {
        console.error('Failed to load modal dependencies:', err)
      } finally {
        setCoursesLoading(false)
      }
    }
    if (isOpen) {
      loadInitData()
    }
  }, [isOpen])

  // Sync edit values
  useEffect(() => {
    if (editSlot && editSlot.id) {
      setCourseId(editSlot.course_id || '')
      setSemesterNumber(editSlot.semester_number || '')
      setSection(editSlot.section || '')
      setSubjectId(editSlot.subject_id || '')
      setFacultyId(editSlot.faculty_id || '')
      setDayOfWeek(editSlot.day_of_week || 'Monday')
      setStartTime(editSlot.start_time || '09:00')
      setEndTime(editSlot.end_time || '10:00')
      setRoom(editSlot.room || '')
      setClassType(editSlot.is_lab ? 'Lab' : 'Lecture')
      setRepeatType(editSlot.date ? 'One-time' : 'Weekly')
      setDate(editSlot.date || '')
      setOverrideChecked(false)
      setOverrideJustification('')
    } else {
      // Defaults/New slot clicked in grid
      setCourseId(editSlot?.course_id || '')
      setSemesterNumber(editSlot?.semester_number || '')
      setSection(editSlot?.section || '')
      setSubjectId('')
      setFacultyId('')
      setDayOfWeek(editSlot?.day_of_week || 'Monday')
      setStartTime(editSlot?.start_time || '09:00')
      setEndTime(editSlot?.end_time || '10:00')
      setRoom('')
      setClassType('Lecture')
      setRepeatType('Weekly')
      setDate('')
      setOverrideChecked(false)
      setOverrideJustification('')
    }
  }, [editSlot, isOpen])

  // Fetch subjects dynamically when course and semester change
  useEffect(() => {
    const loadSubjects = async () => {
      if (!courseId) {
        setSubjects([])
        return
      }
      setSubjectsLoading(true)
      try {
        const data = await adminService.getSubjects(courseId, semesterNumber || null)
        const list = data || []
        setSubjects(list)
        // Reset selected subject if it's no longer valid for this course/semester
        if (subjectId && !list.some(s => s.id === subjectId)) {
          setSubjectId('')
          setFacultyId('')
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err)
        setSubjects([])
      } finally {
        setSubjectsLoading(false)
      }
    }
    if (isOpen) {
      loadSubjects()
    }
  }, [courseId, semesterNumber, isOpen, subjectId])

  // Auto set end time to start time + 1 hour when start time changes
  const handleStartTimeChange = (val) => {
    setStartTime(val)
    const [h, m] = val.split(':').map(Number)
    const endH = (h + 1) % 24
    const endHStr = String(endH).padStart(2, '0')
    const endMStr = String(m).padStart(2, '0')
    setEndTime(`${endHStr}:${endMStr}`)
  }

  // Pre-fill primary faculty when subject changes
  const handleSubjectChange = (subjId) => {
    setSubjectId(subjId)
    // Find faculty assigned to this subject
    const matchedFac = facultyList.find(f => f.subjects?.some(s => s.subject_id === subjId))
    if (matchedFac) {
      setFacultyId(matchedFac.id)
    } else {
      setFacultyId('')
    }
  }

  const handleDateChange = (dateVal) => {
    setDate(dateVal)
    if (dateVal) {
      const parts = dateVal.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        const localDate = new Date(year, month, day)
        const dayIndex = localDate.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const matchedDay = daysOfWeek[dayIndex]
        if (matchedDay === 'Sunday') {
          toast.error('Sunday is not a working day. Please select a weekday (Monday - Saturday).')
          setDate('')
        } else {
          setDayOfWeek(matchedDay)
        }
      }
    }
  }

  const selectedCourse = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId])

  // Time conversion helper
  const timeToMins = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // Check overlap helper
  const isOverlapping = (s1Start, s1End, s2Start, s2End) => {
    const start1 = timeToMins(s1Start)
    const end1 = timeToMins(s1End)
    const start2 = timeToMins(s2Start)
    const end2 = timeToMins(s2End)
    return start1 < end2 && end1 > start2
  }

  // Real-time conflict engine
  const conflicts = useMemo(() => {
    if (!isOpen || !dayOfWeek || !startTime || !endTime) return []
    const results = []

    // Room-type validation: warn if Lab class is in a non-lab room
    if (classType === 'Lab' && room && room.trim()) {
      const roomLower = room.trim().toLowerCase()
      const isLabRoom = roomLower.includes('lab') || roomLower.includes('workshop') || roomLower.includes('computer')
      if (!isLabRoom) {
        results.push({
          type: 'room-type',
          message: `⚠️ Room Type Warning: "${room}" does not appear to be a lab/workshop room. Lab classes are typically held in designated lab facilities.`
        })
      }
    }

    // Ensure we don't compare against the slot we are editing
    const checkSlots = allSlots.filter(s => !editSlot || !editSlot.id || s.id !== editSlot.id)

    const currentDateVal = repeatType === 'One-time' ? date : null

    checkSlots.forEach(s => {
      if (s.day_of_week !== dayOfWeek) return
      if (!isOverlapping(s.start_time, s.end_time, startTime, endTime)) return

      // Date overlap check: weekly slots overlap with everything,
      // and one-time slots only overlap if they have the exact same date
      const dateOverlap = !currentDateVal || !s.date || currentDateVal === s.date
      if (!dateOverlap) return

      // Conflict 1: Faculty booked
      if (facultyId && s.faculty_id === facultyId) {
        const facName = facultyList.find(f => f.id === facultyId)?.name || 'This faculty'
        results.push({
          type: 'faculty',
          message: `👨‍🏫 Faculty Conflict: ${facName} is already teaching "${s.subject_name}" at this time (${s.start_time} - ${s.end_time}) in Room ${s.room || 'N/A'}.`
        })
      }

      // Conflict 2: Room booked
      if (room && s.room && s.room.trim().toLowerCase() === room.trim().toLowerCase()) {
        results.push({
          type: 'room',
          message: `🏫 Room Conflict: Room "${room}" is already booked for "${s.subject_name}" (${s.start_time} - ${s.end_time}).`
        })
      }

      // Conflict 3: Semester clash (students have another class)
      if (courseId && s.course_id === courseId && semesterNumber && s.semester_number === Number(semesterNumber)) {
        const currentSubj = subjects.find(sub => sub.id === subjectId)
        const currentSubjType = currentSubj?.subject_type || currentSubj?.icon || 'Theory'
        const existingSubjType = s.subject_type || 'Theory'

        if (currentSubjType !== 'Elective' && existingSubjType !== 'Elective') {
          // Only conflict if they are in the same section, or at least one is "all sections" (falsy)
          if (!section || !s.section || section === s.section) {
            results.push({
              type: 'semester',
              message: `📚 Cohort Overlap: Semester ${semesterNumber}${section ? ` Section ${section}` : ''} students already have "${s.subject_name}" scheduled at this time. (Note: If these are parallel electives, please change their Subject Type to 'Elective' in the Subjects Page to allow parallel scheduling).`
            })
          }
        }
      }
    })

    return results
  }, [isOpen, courseId, semesterNumber, subjectId, facultyId, dayOfWeek, startTime, endTime, room, classType, allSlots, editSlot, facultyList, repeatType, date, subjects])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent double-click race condition
    if (submitting) return
    
    if (timeToMins(startTime) >= timeToMins(endTime)) {
      toast.error('End time must be strictly after start time')
      return
    }

    if (repeatType === 'One-time' && !date) {
      toast.error('Date is required for one-time slots')
      return
    }

    // Only hard conflicts (not room-type warnings) require override
    const hardConflicts = conflicts.filter(c => c.type !== 'room-type')
    if (hardConflicts.length > 0 && !overrideChecked) {
      toast.error('Please resolve conflicts or check Override with justification')
      return
    }

    if (hardConflicts.length > 0 && overrideChecked && !overrideJustification.trim()) {
      toast.error('Please enter a justification to override conflicts')
      return
    }

    setSubmitting(true)
    try {
      const isLab = classType === 'Lab'
      const payload = {
        subject_id: subjectId,
        faculty_id: facultyId || null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room || null,
        course_id: courseId,
        semester_number: parseInt(semesterNumber),
        is_lab: isLab,
        status: (editSlot && editSlot.id) ? editSlot.status : 'draft',
        date: (repeatType === 'One-time' && date) ? date : null
      }

      let res
      if (editSlot && editSlot.id) {
        res = await adminService.updateTimetableSlot(editSlot.id, payload)
        toast.success('Timetable slot updated successfully')
      } else {
        res = await adminService.createTimetableSlot(payload)
        toast.success('Timetable slot created successfully')
      }
      
      onSave(res)
      onClose()
    } catch (err) {
      console.error('Submit error:', err)
      const detail = err.response?.data?.detail
      let errorMsg = 'Failed to save timetable slot'
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map(d => {
          if (d.msg === 'Input should be None') {
            const field = d.loc && d.loc[d.loc.length - 1];
            return `Field '${field}' must be empty or null.`;
          }
          return d.msg || JSON.stringify(d);
        }).join(', ')
      } else if (detail && typeof detail === 'object') {
        errorMsg = JSON.stringify(detail)
      }
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 text-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {editSlot && editSlot.id ? 'Edit Timetable Slot' : 'Schedule Class Slot'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Define subject, timing, faculty, and room.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {/* Course & Semester Selection */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">
                Course / Department *
              </label>
              {coursesLoading ? (
                <div className="h-10 flex items-center gap-1.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </div>
              ) : (
                <select
                  required
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value)
                    setSemesterNumber('')
                    setSubjectId('')
                    setFacultyId('')
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
                >
                  <option value="" disabled>Select course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">
                Semester *
              </label>
              <select
                required
                disabled={!courseId}
                value={semesterNumber}
                onChange={(e) => {
                  setSemesterNumber(e.target.value)
                  setSubjectId('')
                  setFacultyId('')
                }}
                className="w-full bg-white disabled:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
              >
                <option value="" disabled>Select semester...</option>
                {selectedCourse &&
                  Array.from({ length: selectedCourse.total_semesters }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                  ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Section</label>
              <select
                value={section}
                onChange={e => setSection(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
              >
                <option value="">All Sections</option>
                {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Subject Dropdown */}
          <div>
            <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">
              Subject *
            </label>
            <select
              required
              disabled={!semesterNumber || subjectsLoading}
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
            >
              <option value="" disabled>
                {subjectsLoading ? 'Loading subjects...' : 'Select a subject...'}
              </option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>

          {/* Faculty Dropdown */}
          <div>
            <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5 flex justify-between">
              <span>Assigned Instructor</span>
              <span className="text-[9px] text-[#7C3AED]">Recommended by assignments</span>
            </label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
            >
              <option value="">-- Choose Instructor --</option>
              {facultyList.map(f => {
                const isPreferred = f.subjects?.some(s => s.subject_id === subjectId)
                return (
                  <option key={f.id} value={f.id}>
                    {f.name} {isPreferred ? '★' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Schedule Settings: Day & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Day *</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition cursor-pointer"
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Start Time *</label>
              <input
                required
                type="time"
                step="1800" // 30-min intervals hint
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition"
              />
            </div>
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">End Time *</label>
              <input
                required
                type="time"
                step="1800"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition"
              />
            </div>
          </div>

          {/* Room / Location */}
          <div>
            <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Room / Lab Number</label>
            <input
              type="text"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="e.g. Lab 402, Lecture Hall A"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] transition"
            />
          </div>

          {/* Class Type & Repeat Type (Radio buttons) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Class Type</label>
              <div className="flex gap-3 mt-1">
                {['Lecture', 'Lab', 'Tutorial'].map(type => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="classType"
                      value={type}
                      checked={classType === type}
                      onChange={() => setClassType(type)}
                      className="text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                    <span>{type === 'Lecture' ? '📚 Lecture' : type === 'Lab' ? '🧪 Lab' : '📖 Tutorial'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Occurrence</label>
              <div className="flex gap-3 mt-1">
                {['Weekly', 'One-time'].map(rep => (
                  <label key={rep} className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="repeatType"
                      value={rep}
                      checked={repeatType === rep}
                      onChange={() => setRepeatType(rep)}
                      className="text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                    <span>{rep}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {repeatType === 'One-time' && (
            <div>
              <label className="block text-slate-500 uppercase text-[10px] font-black mb-1.5">Date *</label>
              <input
                required
                type="date"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-[#7C3AED] transition font-semibold"
              />
            </div>
          )}

          {/* REAL TIME CONFLICTS BOX */}
          {conflicts.length > 0 ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-extrabold">Schedule Conflicts Detected ({conflicts.length})</span>
              </div>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {conflicts.map((c, idx) => (
                  <p key={idx} className="text-[10px] font-bold text-rose-600 leading-relaxed pl-2 border-l-2 border-rose-300">
                    {c.message}
                  </p>
                ))}
              </div>

              {/* Override Checkbox */}
              <div className="pt-2 border-t border-rose-200/50 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-rose-700">
                  <input 
                    type="checkbox" 
                    checked={overrideChecked} 
                    onChange={e => setOverrideChecked(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                  />
                  <span className="font-extrabold">Force schedule (Request Override)</span>
                </label>
                
                {overrideChecked && (
                  <input
                    required
                    type="text"
                    value={overrideJustification}
                    onChange={e => setOverrideJustification(e.target.value)}
                    placeholder="Enter justification for override (required)..."
                    className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-[10px] text-rose-800 placeholder-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                )}
              </div>
            </div>
          ) : (
            subjectId && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold">Time slot available. No conflicts detected.</span>
              </div>
            )
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer shadow-lg shadow-violet-500/10"
            >
              {submitting ? 'Saving...' : (editSlot && editSlot.id) ? 'Update Slot' : 'Save Slot'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
