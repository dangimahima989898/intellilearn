import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Calendar, CalendarDays, Plus, Download, AlertTriangle, ChevronLeft,
  ChevronRight, Loader2, Info, Zap, X, Search, Settings,
  Users, BookOpen, AlertCircle, CheckSquare, CalendarIcon
} from 'lucide-react'
import adminService from '../../services/adminService'
import courseService from '../../services/courseService'
import api from '../../services/api'
import TimetableGrid from './TimetableGrid'
import ScheduleClassModal from './ScheduleClassModal'
import EventsAndExams from './EventsAndExams'
import AcademicCalendar from './AcademicCalendar'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'

export default function HODScheduleManager() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const [activeTab, setActiveTab] = useState('timetable')
  const [viewType, setViewType] = useState('weekly')

  // Filtering state
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [searchFaculty, setSearchFaculty] = useState('')
  const [searchSubject, setSearchSubject] = useState('')

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)

  // Working days
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  const [pendingWorkingDays, setPendingWorkingDays] = useState(null) // buffered changes for modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  // Slots & Events
  const [slots, setSlots] = useState([])
  const [events, setEvents] = useState([])
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Generate Timetable Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [generateDept, setGenerateDept] = useState('')
  const [generateSemester, setGenerateSemester] = useState('')
  const [generateSection, setGenerateSection] = useState('')
  const [generateYear, setGenerateYear] = useState('2025-2026')
  const [generateType, setGenerateType] = useState('Automatic') // Automatic | Manual
  const [generateDayOption, setGenerateDayOption] = useState('All')
  const [selectedGenerateDay, setSelectedGenerateDay] = useState('Monday')

  // Calendar Drawer
  const [calendarDrawerOpen, setCalendarDrawerOpen] = useState(false)

  // Modals
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)

  const hasDraftSlots = useMemo(() => slots.some(s => s.status === 'draft'), [slots])

  const getStartOfWeekDate = (offsetWeeks) => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const startOfWeek = new Date(d.setDate(diff))
    startOfWeek.setDate(startOfWeek.getDate() + offsetWeeks * 7)
    const yyyy = startOfWeek.getFullYear()
    const mm = String(startOfWeek.getMonth() + 1).padStart(2, '0')
    const dd = String(startOfWeek.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const handleAutoGenerateClick = () => {
    setGenerateDept(selectedCourseId)
    setGenerateSemester(selectedSemester)
    setGenerateSection(selectedSection)
    setGenerateDayOption('All')
    setSelectedGenerateDay('Monday')
    setGenerateModalOpen(true)
  }

  const handleConfirmAutoGenerate = async () => {
    if (!generateDept || !generateSemester) {
      toast.error('Please select Department and Semester')
      return
    }

    // Manual mode: close generate modal and open schedule class modal for manual slot creation
    if (generateType === 'Manual') {
      setGenerateModalOpen(false)
      setEditingSlot({
        course_id: generateDept,
        semester_number: generateSemester,
        section: generateSection || '',
        day_of_week: generateDayOption === 'Specific' ? selectedGenerateDay : 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        is_lab: false
      })
      setClassModalOpen(true)
      toast.success('Manual mode: Add slots one at a time using the Schedule Class form')
      return
    }

    setGenerateModalOpen(false)
    setGenerating(true)
    try {
      const payload = {
        course_id: generateDept,
        semester_number: parseInt(generateSemester),
      }
      if (generateSection) payload.section = generateSection
      if (generateDayOption === 'Specific') payload.day_of_week = selectedGenerateDay
      const response = await api.post('/timetable/auto-generate', payload)
      toast.success(response.data.message || 'Timetable generated successfully!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate timetable')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedCourseId || !selectedSemester) return
    setPublishing(true)
    try {
      const response = await api.post('/timetable/publish', {
        course_id: selectedCourseId,
        semester_number: parseInt(selectedSemester)
      })
      toast.success(response.data.message || 'Timetable published successfully!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish timetable')
    } finally {
      setPublishing(false)
    }
  }

  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true)
      try {
        const cData = await courseService.getCourses()
        setCourses(cData || [])
        if (cData && cData.length > 0) {
          setSelectedCourseId(cData[0].id)
          setSelectedSemester('1')
          setGenerateDept(cData[0].id)
        }
      } catch (err) {
        toast.error('Failed to load courses')
      } finally {
        setCoursesLoading(false)
      }
    }
    fetchCourses()
    const storedWorkingDays = localStorage.getItem('hod_working_days')
    if (storedWorkingDays) {
      try { setWorkingDays(JSON.parse(storedWorkingDays)) } catch {}
    }
  }, [])

  const fetchData = async () => {
    if (!selectedCourseId) return
    setLoading(true)
    try {
      const courseObj = courses.find(c => c.id === selectedCourseId)
      const deptCode = courseObj ? courseObj.code : 'All'
      const startWeekDate = getStartOfWeekDate(currentWeekOffset)

      const [slotsRes, eventsRes, facultyRes] = await Promise.allSettled([
        api.get('/api/v1/hod/schedule/timetable', { params: { department: deptCode, semester: selectedSemester, start_week_date: startWeekDate, academic_year: academicYear } }),
        adminService.getEvents(null, selectedCourseId || null, selectedSemester || null),
        api.get('/api/v1/hod/faculty/all')
      ])

      const slotsData = slotsRes.status === 'fulfilled' ? (slotsRes.value.data || []) : []
      const eventsData = eventsRes.status === 'fulfilled' ? (eventsRes.value || []) : []
      const facultyData = facultyRes.status === 'fulfilled' ? (facultyRes.value.data || []) : []

      const mappedSlots = slotsData.map(s => ({ ...s, day_of_week: s.day || s.day_of_week }))
      setSlots(mappedSlots)
      setEvents(eventsData)
      setFacultyList(facultyData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedCourseId, selectedSemester, currentWeekOffset, academicYear])

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId])

  const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const isOverlapping = (s1s, s1e, s2s, s2e) => timeToMins(s1s) < timeToMins(s2e) && timeToMins(s1e) > timeToMins(s2s)

  const allConflicts = useMemo(() => {
    const list = []; const processed = new Set()
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i]; const s2 = slots[j]
        if (s1.day_of_week !== s2.day_of_week) continue
        if (!isOverlapping(s1.start_time, s1.end_time, s2.start_time, s2.end_time)) continue
        const key = [s1.id, s2.id].sort().join('-')
        if (processed.has(key)) continue
        processed.add(key)
        if (s1.faculty_id && s2.faculty_id && s1.faculty_id === s2.faculty_id) {
          list.push({ type: 'faculty', message: `👨‍🏫 ${s1.faculty_name || 'Faculty'} double-booked: "${s1.subject_name}" & "${s2.subject_name}" on ${s1.day_of_week} ${s1.start_time}–${s1.end_time}` })
        }
        if (s1.room && s2.room && s1.room.trim().toLowerCase() === s2.room.trim().toLowerCase()) {
          list.push({ type: 'room', message: `🏫 Room "${s1.room}" double-booked: "${s1.subject_name}" & "${s2.subject_name}" on ${s1.day_of_week}` })
        }
        if (s1.course_id === s2.course_id && s1.semester_number === s2.semester_number) {
          list.push({ type: 'semester', message: `📚 Sem ${s1.semester_number} students have two simultaneous classes on ${s1.day_of_week}: "${s1.subject_name}" & "${s2.subject_name}"` })
        }
      }
    }
    return list
  }, [slots])

  const handleToggleWorkingDay = (day) => {
    const current = pendingWorkingDays || workingDays
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    setPendingWorkingDays(updated)
  }

  const handleSaveWorkingDays = () => {
    const toSave = pendingWorkingDays || workingDays
    if (toSave.length === 0) {
      toast.error('At least one working day must be selected')
      return
    }
    setWorkingDays(toSave)
    localStorage.setItem('hod_working_days', JSON.stringify(toSave))
    setPendingWorkingDays(null)
    setSettingsModalOpen(false)
    toast.success('Working days configuration saved')
  }

  const handleCloseWorkingDaysModal = () => {
    setPendingWorkingDays(null) // discard unsaved changes
    setSettingsModalOpen(false)
  }

  const handleEditSlot = (slot) => {
    if (!slot.id) {
      setEditingSlot({ course_id: selectedCourseId, semester_number: selectedSemester, day_of_week: slot.day_of_week, start_time: slot.start_time || '09:00', end_time: slot.end_time || '10:00', is_lab: false })
    } else {
      setEditingSlot(slot)
    }
    setClassModalOpen(true)
  }

  const handleDeleteSlot = async (id) => {
    if (window.confirm('Delete this timetable slot?')) {
      try {
        await adminService.deleteTimetableSlot(id)
        toast.success('Slot deleted')
        fetchData()
      } catch {
        toast.error('Failed to delete slot')
      }
    }
  }

  const handleExportPDF = () => {
    const filteredSlots = slots.filter(s =>
      (!searchFaculty || s.faculty_name?.toLowerCase().includes(searchFaculty.toLowerCase())) &&
      (!searchSubject || s.subject_name?.toLowerCase().includes(searchSubject.toLowerCase())) &&
      (!selectedSection || !s.section || s.section === selectedSection)
    )

    if (filteredSlots.length === 0) {
      toast.error('No timetable data to export. Please ensure the schedule has entries.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Title
    const courseObj = courses.find(c => c.id === selectedCourseId)
    const title = `Timetable — ${courseObj?.name || 'Department'} | Semester ${selectedSemester || '—'} | ${academicYear}`
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(title, pageWidth / 2, 15, { align: 'center' })

    // Table headers
    const activeDays = workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const colWidth = (pageWidth - 40) / (activeDays.length + 1)
    let y = 25

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(243, 244, 246)
    doc.rect(15, y - 4, pageWidth - 30, 8, 'F')
    doc.text('Time', 17, y)
    activeDays.forEach((day, i) => {
      doc.text(day, 17 + colWidth * (i + 1), y)
    })
    y += 10

    // Group slots by time
    const timeSlotSet = [...new Set(filteredSlots.map(s => `${s.start_time}-${s.end_time}`))].sort()
    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)

    timeSlotSet.forEach(timeKey => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage()
        y = 15
      }
      const [start, end] = timeKey.split('-')
      doc.setFont(undefined, 'bold')
      doc.text(`${start}–${end}`, 17, y)
      doc.setFont(undefined, 'normal')

      activeDays.forEach((day, i) => {
        const daySlots = filteredSlots.filter(s => s.day_of_week === day && s.start_time === start && s.end_time === end)
        if (daySlots.length > 0) {
          const slot = daySlots[0]
          const cellX = 17 + colWidth * (i + 1)
          const text = `${slot.subject_name || '—'}${slot.faculty_name ? '\n' + slot.faculty_name : ''}${slot.room ? '\n' + slot.room : ''}`
          doc.text(text, cellX, y, { maxWidth: colWidth - 4 })
        }
      })
      y += 14
    })

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Generated: ${new Date().toLocaleString()} | IntelliLearn Schedule Manager`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' })

    doc.save(`Timetable_${courseObj?.code || 'Schedule'}_Sem${selectedSemester || ''}_${academicYear}.pdf`)
    toast.success('PDF exported successfully')
  }

  const upcomingHolidays = useMemo(() => events.filter(e => e.event_type?.toLowerCase().includes('holiday')), [events])
  const upcomingExams = useMemo(() => events.filter(e => e.event_type?.toLowerCase().includes('exam') || e.event_type?.toLowerCase().includes('test')), [events])
  const otherEvents = useMemo(() => events.filter(e => !e.event_type?.toLowerCase().includes('holiday') && !e.event_type?.toLowerCase().includes('exam') && !e.event_type?.toLowerCase().includes('test')), [events])

  const currentWeekLabel = currentWeekOffset === 0 ? 'Current Week' : `Week ${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset}`

  return (
    <>
      {/* Full-bleed layout that escapes AdminLayout's 24px padding */}
      <style>{`
        /* Override main container for this page only */
        #admin-content > main:has(.hod-schedule-root) {
          padding: 0 !important;
          overflow: clip !important;
        }
        .hod-schedule-root {
          position: fixed;
          top: 56px;
          left: var(--sidebar-w, 256px);
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          background: #F9FAFB;
          overflow: clip;
          font-family: 'DM Sans', sans-serif;
          z-index: 1;
        }
        .toolbar-label {
          font-size: 11px;
          font-weight: 700;
          color: #4B5563;
          margin-bottom: 4px;
        }
        .toolbar-select, .toolbar-input {
          height: 38px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 0 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1F2937;
          background: #FFFFFF;
          cursor: pointer;
          outline: none;
          transition: all 0.15s;
          box-sizing: border-box;
          position: relative;
          z-index: 10;
        }
        .toolbar-select:focus, .toolbar-input:focus {
          border-color: #7C3AED;
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
        }
        .toolbar-select option {
          background: #ffffff !important;
          color: #1F2937 !important;
        }
        @media (max-width: 1023px) {
          .hod-schedule-root { left: 0; }
        }
        @media print {
          .hod-schedule-root { position: static; height: auto; overflow: visible; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="hod-schedule-root no-scroll-page">

        {/* ── PAGE HEADER ── */}
        <div className="no-print" style={{
          flexShrink: 0,
          background: '#ffffff',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          height: 72
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Schedule Manager
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 500, marginTop: 4 }}>
              Manage department timetable
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Primary Action Buttons - Purple */}
            <button
              onClick={() => handleEditSlot({})}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(124, 58, 237, 0.15)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
              onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
            >
              <Plus size={16} /> Schedule Class
            </button>

            <button
              onClick={handleAutoGenerateClick}
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: generating ? 0.6 : 1, transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(124, 58, 237, 0.15)' }}
              onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#6D28D9' }}
              onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
            >
              {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Zap size={16} /> Generate Timetable</>}
            </button>

            {hasDraftSlots && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                onMouseLeave={e => e.currentTarget.style.background = '#059669'}
              >
                {publishing ? <><Loader2 size={16} className="animate-spin" /> Publishing...</> : <>Publish Drafts</>}
              </button>
            )}

            {/* Secondary Buttons - Light gray */}
            <button
              onClick={handleExportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#D1D5DB' }}
            >
              <Download size={16} /> Export PDF
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#D1D5DB' }}
              title="Configure Working Days"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ── STICKY FILTER TOOLBAR ── */}
        <div className="no-print" style={{
          flexShrink: 0,
          background: '#ffffff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Row 1: Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 24px',
            borderBottom: '1px solid #F3F4F6'
          }}>
            {/* Department */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 200, flex: 1 }}>
              <span className="toolbar-label">Department</span>
              {coursesLoading ? (
                <div style={{ height: 38, display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} /> Loading Departments...
                </div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={e => { setSelectedCourseId(e.target.value); setSelectedSemester('1') }}
                  className="toolbar-select"
                >
                  <option value="" disabled>Select Department</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              )}
            </div>

            {/* Semester */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 120 }}>
              <span className="toolbar-label">Semester</span>
              <select
                disabled={!selectedCourseId}
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                className="toolbar-select"
                style={{ opacity: selectedCourseId ? 1 : 0.6 }}
              >
                <option value="" disabled>Select Semester</option>
                {selectedCourse && Array.from({ length: selectedCourse.total_semesters }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 100 }}>
              <span className="toolbar-label">Section</span>
              <select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="toolbar-select"
              >
                <option value="">All</option>
                {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            {/* Academic Year */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
              <span className="toolbar-label">Academic Year</span>
              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="toolbar-select"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
          </div>

          {/* Row 2: Secondary controls, search and view options */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Weekly / Daily Toggle */}
              {activeTab === 'timetable' && (
                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 2 }}>
                  {['weekly', 'daily'].map(vt => (
                    <button
                      key={vt}
                      onClick={() => setViewType(vt)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: viewType === vt ? '#FFFFFF' : 'transparent',
                        color: viewType === vt ? '#1F2937' : '#6B7280',
                        boxShadow: viewType === vt ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      {vt}
                    </button>
                  ))}
                </div>
              )}

              {/* Current Week navigation */}
              {activeTab === 'timetable' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D1D5DB', borderRadius: 8, padding: '4px 6px', background: '#FFFFFF' }}>
                  <button
                    onClick={() => setCurrentWeekOffset(p => p - 1)}
                    style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifySelf: 'center', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: '#4B5563', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', padding: '0 8px', minWidth: 90, textAlign: 'center' }}>
                    {currentWeekLabel}
                  </span>
                  <button
                    onClick={() => setCurrentWeekOffset(p => p + 1)}
                    style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifySelf: 'center', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, color: '#4B5563', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Faculty Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D1D5DB', borderRadius: 8, padding: '0 12px', background: '#FFFFFF', height: 38, width: 200 }}>
                <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={searchFaculty}
                  onChange={e => setSearchFaculty(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 500, color: '#1F2937', width: '100%' }}
                />
              </div>

              {/* Subject Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D1D5DB', borderRadius: 8, padding: '0 12px', background: '#FFFFFF', height: 38, width: 200 }}>
                <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search subject..."
                  value={searchSubject}
                  onChange={e => setSearchSubject(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 500, color: '#1F2937', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Tab toggles */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'timetable', label: 'Timetable Grid', Icon: Calendar },
                  { id: 'events', label: 'Events & Exams', Icon: CalendarDays }
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                      border: `1px solid ${activeTab === id ? '#C4B5FD' : 'transparent'}`,
                      background: activeTab === id ? '#EDE9FE' : 'transparent',
                      color: activeTab === id ? '#7C3AED' : '#4B5563',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Calendar Icon for slide drawer */}
              <button
                onClick={() => setCalendarDrawerOpen(true)}
                style={{
                  width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #D1D5DB', borderRadius: 8, background: '#FFFFFF', color: '#7C3AED', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F5F3FF'; e.currentTarget.style.borderColor = '#C4B5FD' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                title="Open Calendar Drawer"
              >
                <CalendarIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONFLICT BANNER (slim) ── */}
        {activeTab === 'timetable' && allConflicts.length > 0 && (
          <div className="no-print" style={{
            flexShrink: 0,
            background: '#FFF1F2',
            borderBottom: '1px solid #FECDD3',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <AlertTriangle size={16} style={{ color: '#E11D48', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9F1239' }}>
              {allConflicts.length} scheduling conflict{allConflicts.length > 1 ? 's' : ''} detected.
            </span>
            <button
              onClick={() => setConflictModalOpen(true)}
              style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: '#E11D48', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Resolve conflicts
            </button>
          </div>
        )}

        {/* ── MAIN SCROLLABLE TIMETABLE AREA ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Loader2 size={36} style={{ color: '#7C3AED' }} className="animate-spin" />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Syncing Timetable Database...</p>
            </div>
          ) : (
            <>
              {activeTab === 'timetable' ? (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <TimetableGrid
                    slots={slots.filter(s =>
                      (!searchFaculty || s.faculty_name?.toLowerCase().includes(searchFaculty.toLowerCase())) &&
                      (!searchSubject || s.subject_name?.toLowerCase().includes(searchSubject.toLowerCase())) &&
                      (!selectedSection || !s.section || s.section === selectedSection)
                    )}
                    facultyList={facultyList}
                    viewType={viewType}
                    workingDays={workingDays}
                    onEditSlot={handleEditSlot}
                    onDeleteSlot={handleDeleteSlot}
                    onRefresh={fetchData}
                    selectedCourseId={selectedCourseId}
                    selectedSemesterNumber={selectedSemester}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  <EventsAndExams
                    filterCourseId={selectedCourseId}
                    filterSemester={selectedSemester}
                    onUpdate={fetchData}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CALENDAR RIGHT DRAWER ── */}
      {calendarDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setCalendarDrawerOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 340,
              background: '#ffffff', borderLeft: '1px solid #EDE9FE',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
              animation: 'slideInRight 0.2s ease-out'
            }}
          >
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#1E1B4B' }}>Academic Calendar</span>
              <button onClick={() => setCalendarDrawerOpen(false)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {/* Mini Calendar */}
              <AcademicCalendar events={events} onDateSelect={(date) => toast.success(`Selected: ${date.toDateString()}`)} />

              {/* Academic Holidays */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Academic Holidays
                </h4>
                {upcomingHolidays.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No holidays scheduled</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcomingHolidays.map(hol => (
                      <div key={hol.id} style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9F1239' }}>{hol.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#BE123C' }}>📅 {new Date(hol.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Exams */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Upcoming Exams
                </h4>
                {upcomingExams.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No exams scheduled</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcomingExams.map(ex => (
                      <div key={ex.id} style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 8, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#C2410C' }}>{ex.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EA580C' }}>📅 {new Date(ex.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Events */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Events & Announcements
                </h4>
                {otherEvents.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No upcoming events</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {otherEvents.map(ev => (
                      <div key={ev.id} style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>{ev.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6B7280' }}>📅 {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKING DAYS SETTINGS MODAL ── */}
      {settingsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>Working Days</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>Toggle active weekdays for the grid</p>
              </div>
              <button onClick={handleCloseWorkingDaysModal} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {days.map(day => {
                const displayDays = pendingWorkingDays || workingDays
                const isActive = displayDays.includes(day)
                return (
                  <label key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: `1px solid ${isActive ? '#C4B5FD' : '#E5E7EB'}`, background: isActive ? '#F5F3FF' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 13, fontWeight: 750, color: isActive ? '#7C3AED' : '#374151' }}>{day}</span>
                    <input type="checkbox" checked={isActive} onChange={() => handleToggleWorkingDay(day)} style={{ width: 16, height: 16, accentColor: '#7C3AED', cursor: 'pointer' }} />
                  </label>
                )
              })}
            </div>
            {(pendingWorkingDays || workingDays).length === 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#BE123C' }}>⚠️ At least one working day must be selected.</p>
              </div>
            )}
            <button onClick={handleSaveWorkingDays} style={{ marginTop: 16, width: '100%', padding: '12px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* ── CONFLICTS LIST MODAL ── */}
      {conflictModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#9F1239', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} /> Scheduling Conflicts
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>{allConflicts.length} overlap{allConflicts.length !== 1 ? 's' : ''} detected</p>
              </div>
              <button onClick={() => setConflictModalOpen(false)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allConflicts.map((conf, idx) => (
                <div key={idx} style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FECDD3', color: '#9F1239', borderRadius: 4, padding: '2px 6px', marginBottom: 4 }}>
                    {conf.type} conflict
                  </span>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#BE123C', lineHeight: 1.5 }}>{conf.message}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setConflictModalOpen(false)} style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── GENERATE TIMETABLE MODAL ── */}
      {generateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} style={{ color: '#7C3AED' }} /> Generate Timetable
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>Configure generation parameters</p>
              </div>
              <button onClick={() => setGenerateModalOpen(false)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Department */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Department *</label>
                <select value={generateDept} onChange={e => setGenerateDept(e.target.value)}
                  style={{ width: '100%', height: 36, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                  <option value="" disabled>Select department...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Semester */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Semester *</label>
                  <select value={generateSemester} onChange={e => setGenerateSemester(e.target.value)}
                    style={{ width: '100%', height: 36, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="" disabled>Select...</option>
                    {(() => {
                      const genCourse = courses.find(c => c.id === generateDept)
                      return genCourse ? Array.from({ length: genCourse.total_semesters }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>Sem {i + 1}</option>
                      )) : null
                    })()}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Section</label>
                  <select value={generateSection} onChange={e => setGenerateSection(e.target.value)}
                    style={{ width: '100%', height: 36, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="">All Sections</option>
                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Academic Year */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Academic Year</label>
                <input type="text" value={generateYear} onChange={e => setGenerateYear(e.target.value)} placeholder="2025-2026"
                  style={{ width: '100%', height: 36, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Generate Type */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Generation Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Automatic', 'Manual'].map(type => (
                    <label key={type} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: `1px solid ${generateType === type ? '#C4B5FD' : '#E5E7EB'}`, background: generateType === type ? '#F5F3FF' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="radio" name="generateType" value={type} checked={generateType === type} onChange={() => setGenerateType(type)} style={{ accentColor: '#7C3AED' }} />
                      <div>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: generateType === type ? '#7C3AED' : '#374151' }}>{type}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{type === 'Automatic' ? 'AI-optimized' : 'Manual slots'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Day Scope */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Day Scope</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ v: 'All', l: 'All Days (Mon–Fri)' }, { v: 'Specific', l: 'Specific Day' }].map(({ v, l }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      <input type="radio" name="generateDayOption" value={v} checked={generateDayOption === v} onChange={() => setGenerateDayOption(v)} style={{ accentColor: '#7C3AED' }} />
                      {l}
                    </label>
                  ))}
                </div>
                {generateDayOption === 'Specific' && (
                  <select value={selectedGenerateDay} onChange={e => setSelectedGenerateDay(e.target.value)}
                    style={{ marginTop: 8, width: '100%', height: 34, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #F3F4F6' }}>
                <button onClick={() => setGenerateModalOpen(false)}
                  style={{ flex: 1, padding: '10px 0', background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleConfirmAutoGenerate}
                  style={{ flex: 1, padding: '10px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
                >
                  Generate Slots
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE CLASS MODAL ── */}
      <ScheduleClassModal
        isOpen={classModalOpen}
        onClose={() => { setClassModalOpen(false); setEditingSlot(null) }}
        onSave={() => fetchData()}
        editSlot={editingSlot}
        allSlots={slots}
      />

      {/* Print header */}
      <div className="hidden print:block" style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Official Class Timetable</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
          Department: {selectedCourse?.name || 'All'} | Semester {selectedSemester || 'N/A'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>Generated via IntelliLearn Schedule Manager</p>
      </div>
    </>
  )
}
