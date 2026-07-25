import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, Clock, MapPin, AlertCircle, Bell, BellOff, HelpCircle, Loader2 } from 'lucide-react'
import adminService from '../../services/adminService'
import courseService from '../../services/courseService'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function EventsAndExams({ filterCourseId = '', filterSemester = '', onUpdate }) {
  const [events, setEvents] = useState([])
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [examModalOpen, setExamModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)

  // Exam Form
  const [examCourseId, setExamCourseId] = useState('')
  const [examSemester, setExamSemester] = useState('')
  const [examSubjectId, setExamSubjectId] = useState('')
  const [examType, setExamType] = useState('Mid Sem') // Internal, Mid Sem, End Sem
  const [examDate, setExamDate] = useState('')
  const [examStart, setExamStart] = useState('10:00')
  const [examDuration, setExamDuration] = useState('2 Hours')
  const [examVenue, setExamVenue] = useState('')
  const [examNotify, setExamNotify] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(false)

  // Event Form
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDateVal, setEventDateVal] = useState('')
  const [eventScope, setEventScope] = useState('all') // all, dept, sem
  const [eventCourseId, setEventCourseId] = useState('')
  const [eventSemester, setEventSemester] = useState('')
  const [eventNotify, setEventNotify] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [eventsRes, coursesRes] = await Promise.allSettled([
        adminService.getEvents(null, filterCourseId || null, filterSemester || null),
        courseService.getCourses()
      ])
      setEvents(eventsRes.status === 'fulfilled' ? (eventsRes.value || []) : [])
      setCourses(coursesRes.status === 'fulfilled' ? (coursesRes.value || []) : [])
      
      if (eventsRes.status === 'rejected') console.warn('Events load failed:', eventsRes.reason?.message)
      if (coursesRes.status === 'rejected') console.warn('Courses load failed:', coursesRes.reason?.message)
    } catch (err) {
      console.error('Failed to load events/exams:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterCourseId, filterSemester])

  // Fetch subjects dynamically for exam form
  useEffect(() => {
    const fetchExamSubjects = async () => {
      if (!examCourseId) {
        setSubjects([])
        return
      }
      setSubjectsLoading(true)
      try {
        const data = await adminService.getSubjects(examCourseId, examSemester || null)
        setSubjects(data || [])
      } catch (err) {
        console.error('Failed to fetch subjects for exam form:', err)
        setSubjects([])
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchExamSubjects()
  }, [examCourseId, examSemester])

  const handleCreateExam = async (e) => {
    e.preventDefault()
    if (!examDate) {
      toast.error('Please select an exam date')
      return
    }

    const selectedSubject = subjects.find(s => s.id === examSubjectId)
    const selectedCourse = courses.find(c => c.id === examCourseId)
    const subjectName = selectedSubject ? selectedSubject.name : 'Exam'

    const title = `${selectedCourse?.code || ''} Sem ${examSemester} - ${subjectName} (${examType})`
    // Store venue, duration, start, notify settings inside description
    const description = JSON.stringify({
      venue: examVenue,
      duration: examDuration,
      start_time: examStart,
      exam_type: examType,
      subject_name: subjectName,
      notify: examNotify
    })

    const event_date = new Date(`${examDate}T${examStart}`)

    try {
      await adminService.createEvent({
        title,
        description,
        event_type: 'exam',
        event_date: event_date.toISOString(),
        reminder_lead_days: 1,
        course_id: examCourseId || null,
        semester_number: examSemester ? parseInt(examSemester) : null
      })
      toast.success('Exam scheduled successfully')
      setExamModalOpen(false)
      // reset
      setExamCourseId('')
      setExamSemester('')
      setExamSubjectId('')
      setExamVenue('')
      setExamDate('')
      loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      toast.error('Failed to schedule exam')
    }
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    if (!eventDateVal) {
      toast.error('Please select an event date')
      return
    }

    const description = JSON.stringify({
      details: eventDescription,
      notify: eventNotify,
      scope: eventScope
    })

    const payload = {
      title: eventTitle,
      description,
      event_type: 'other',
      event_date: new Date(eventDateVal).toISOString(),
      reminder_lead_days: 1,
      course_id: eventScope !== 'all' ? (eventCourseId || null) : null,
      semester_number: eventScope === 'sem' ? (eventSemester ? parseInt(eventSemester) : null) : null
    }

    try {
      await adminService.createEvent(payload)
      toast.success('Event scheduled successfully')
      setEventModalOpen(false)
      // reset
      setEventTitle('')
      setEventDescription('')
      setEventDateVal('')
      loadData()
      if (onUpdate) onUpdate()
    } catch (err) {
      toast.error('Failed to create event')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event/exam?')) {
      try {
        await adminService.deleteEvent(id)
        toast.success('Deleted successfully')
        loadData()
        if (onUpdate) onUpdate()
      } catch (err) {
        toast.error('Failed to delete')
      }
    }
  }

  const parseDescription = (desc) => {
    try {
      return JSON.parse(desc)
    } catch {
      return { details: desc }
    }
  }

  // Filter exams vs activities
  const exams = events.filter(e => e.event_type?.toLowerCase() === 'exam')
  const activities = events.filter(e => e.event_type?.toLowerCase() !== 'exam')

  return (
    <div className="flex flex-col gap-6 text-slate-800 font-sans">
      
      {/* Exams Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Upcoming Exams & Tests</h2>
            <p className="text-[11px] text-slate-400">Scheduled classroom assessments.</p>
          </div>
          <button 
            onClick={() => setExamModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Schedule Exam
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-150 rounded-2xl">
            <Calendar className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No exams scheduled</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click the button to schedule one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase">
                  <th className="py-2.5">Exam Title & Details</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Venue</th>
                  <th className="py-2.5">Status / Countdown</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(ex => {
                  const details = parseDescription(ex.description)
                  const dt = new Date(ex.event_date)
                  const daysLeft = ex.days_until
                  
                  let badgeColor = 'bg-slate-100 text-slate-500'
                  let badgeText = 'Completed'
                  if (daysLeft === 0) {
                    badgeColor = 'bg-red-50 text-red-600 border border-red-150'
                    badgeText = 'Today'
                  } else if (daysLeft > 0) {
                    badgeColor = 'bg-indigo-50 text-indigo-600 border border-indigo-150'
                    badgeText = `${daysLeft} days left`
                  }

                  return (
                    <tr key={ex.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-extrabold text-slate-800">{ex.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Type: {details.exam_type} | Duration: {details.duration || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>📅 {dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">⏰ {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {details.venue || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => handleDelete(ex.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Events, Hackathons & Activities</h2>
            <p className="text-[11px] text-slate-400">Department activities and announcements.</p>
          </div>
          <button 
            onClick={() => setEventModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-150 rounded-2xl">
            <Calendar className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No events scheduled</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click the button to schedule one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase">
                  <th className="py-2.5">Event Title & Info</th>
                  <th className="py-2.5">Target Audience</th>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Notify</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(act => {
                  const details = parseDescription(act.description)
                  const dt = new Date(act.event_date)
                  
                  let scopeLabel = 'All Students'
                  if (act.course_id && act.semester_number) {
                    const cCode = courses.find(c => c.id === act.course_id)?.code || 'Course'
                    scopeLabel = `${cCode} Sem ${act.semester_number}`
                  } else if (act.course_id) {
                    const cCode = courses.find(c => c.id === act.course_id)?.code || 'Course'
                    scopeLabel = `${cCode} Dept`
                  }

                  return (
                    <tr key={act.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 max-w-xs">
                        <p className="font-extrabold text-slate-800">{act.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {details.details || 'No description'}
                        </p>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-black text-[10px] uppercase">
                          {scopeLabel}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>📅 {dt.toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">⏰ {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {details.notify ? (
                          <span className="text-emerald-500 flex items-center gap-1 font-extrabold text-[10px] uppercase">
                            <Bell className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1 font-extrabold text-[10px] uppercase">
                            <BellOff className="w-3.5 h-3.5" /> Muted
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => handleDelete(act.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Exam Modal */}
      {examModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-6 relative text-slate-800 text-xs font-semibold shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Schedule Exam</h3>
                <p className="text-[10px] text-slate-400">Setup syllabus assessments.</p>
              </div>
              <button 
                onClick={() => setExamModalOpen(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              
              {/* Select Department & Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Department *</label>
                  <select 
                    required
                    value={examCourseId}
                    onChange={e => {
                      setExamCourseId(e.target.value)
                      setExamSemester('')
                      setExamSubjectId('')
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                  >
                    <option value="" disabled>Select...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Semester *</label>
                  <select 
                    required
                    disabled={!examCourseId}
                    value={examSemester}
                    onChange={e => {
                      setExamSemester(e.target.value)
                      setExamSubjectId('')
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                  >
                    <option value="" disabled>Select...</option>
                    {examCourseId && Array.from({ length: courses.find(c => c.id === examCourseId)?.total_semesters || 0 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Subject *</label>
                <select
                  required
                  disabled={!examSemester || subjectsLoading}
                  value={examSubjectId}
                  onChange={e => setExamSubjectId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                >
                  <option value="" disabled>
                    {subjectsLoading ? 'Loading subjects...' : 'Select Subject...'}
                  </option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Exam Type *</label>
                <div className="flex gap-4">
                  {['Internal', 'Mid Sem', 'End Sem'].map(type => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="examType" 
                        value={type} 
                        checked={examType === type}
                        onChange={() => setExamType(type)}
                        className="text-[#7C3AED] focus:ring-[#7C3AED]"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Exam Date *</label>
                  <input 
                    required
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Start Time *</label>
                  <input 
                    required
                    type="time"
                    value={examStart}
                    onChange={e => setExamStart(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                  />
                </div>
              </div>

              {/* Duration & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Duration *</label>
                  <select 
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                  >
                    <option value="1 Hour">1 Hour</option>
                    <option value="1.5 Hours">1.5 Hours</option>
                    <option value="2 Hours">2 Hours</option>
                    <option value="3 Hours">3 Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Venue *</label>
                  <input 
                    required
                    type="text"
                    value={examVenue}
                    onChange={e => setExamVenue(e.target.value)}
                    placeholder="e.g. Room 302"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Push Notify */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600">
                <input 
                  type="checkbox" 
                  checked={examNotify}
                  onChange={e => setExamNotify(e.target.checked)}
                  className="rounded text-[#7C3AED] focus:ring-[#7C3AED] h-4 w-4"
                />
                <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#7C3AED]" /> Push notify students
                </span>
              </label>

              {/* Submit */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExamModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl transition cursor-pointer shadow-lg shadow-violet-500/10"
                >
                  Schedule Exam
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-6 relative text-slate-800 text-xs font-semibold shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Add Event / Activity</h3>
                <p className="text-[10px] text-slate-400">Share seminars, competitions, hackathons.</p>
              </div>
              <button 
                onClick={() => setEventModalOpen(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              
              {/* Event Title */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Event Title *</label>
                <input 
                  required
                  type="text"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="e.g. Annual Code-A-Thon 2026"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 placeholder-slate-400"
                />
              </div>

              {/* Target Scope */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Target cohort *</label>
                <select 
                  value={eventScope}
                  onChange={e => setEventScope(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                >
                  <option value="all">All Students (Global)</option>
                  <option value="dept">Specific Course/Department</option>
                  <option value="sem">Specific Semester</option>
                </select>
              </div>

              {/* Conditional target selectors */}
              {eventScope !== 'all' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div>
                    <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5 font-bold">Course *</label>
                    <select
                      required
                      value={eventCourseId}
                      onChange={e => {
                        setEventCourseId(e.target.value)
                        setEventSemester('')
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                    >
                      <option value="" disabled>Select...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {eventScope === 'sem' && (
                    <div>
                      <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5 font-bold">Semester *</label>
                      <select
                        required
                        disabled={!eventCourseId}
                        value={eventSemester}
                        onChange={e => setEventSemester(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                      >
                        <option value="" disabled>Select...</option>
                        {eventCourseId && Array.from({ length: courses.find(c => c.id === eventCourseId)?.total_semesters || 0 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Event Date */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Event Date & Time *</label>
                <input 
                  required
                  type="datetime-local"
                  value={eventDateVal}
                  onChange={e => setEventDateVal(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-500 uppercase text-[9px] font-black mb-1.5">Description *</label>
                <textarea
                  required
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder="Provide event details, registration link, etc..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 placeholder-slate-400 h-20 resize-none"
                />
              </div>

              {/* Notify */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600">
                <input 
                  type="checkbox" 
                  checked={eventNotify}
                  onChange={e => setEventNotify(e.target.checked)}
                  className="rounded text-[#7C3AED] focus:ring-[#7C3AED] h-4 w-4"
                />
                <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#7C3AED]" /> Send push notification
                </span>
              </label>

              {/* Submit */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl transition cursor-pointer shadow-lg shadow-violet-500/10"
                >
                  Create Event
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

function X(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
