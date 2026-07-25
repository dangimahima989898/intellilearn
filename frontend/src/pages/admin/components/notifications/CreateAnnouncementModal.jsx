import { useState, useEffect } from 'react'
import {
  X, ChevronRight, ChevronLeft, Send, Clock, FileText,
  Megaphone, BookOpen, AlertTriangle, FileQuestion,
  ClipboardList, Trophy, BarChart2, Zap, Paperclip,
  CheckCircle2, Loader2, Users, User, Building2, Calendar
} from 'lucide-react'
import api from '../../../../services/api'
import toast from 'react-hot-toast'

// ── Constants ────────────────────────────────────────────────────────────────
export const NOTIF_TYPES = [
  { value: 'general', label: 'General Announcement', emoji: '📢', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'academic', label: 'Academic Notice', emoji: '📚', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'attendance', label: 'Attendance Warning', emoji: '⚠️', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'exam', label: 'Exam Notice', emoji: '📝', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'assignment', label: 'Assignment Reminder', emoji: '🎯', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'event', label: 'Event Invitation', emoji: '🏆', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'result', label: 'Result Announcement', emoji: '📋', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'urgent', label: 'Urgent Notice', emoji: '⚡', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
]

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal', description: 'Regular notification', color: 'border-white/20 text-white/60', indicatorColor: 'bg-white/40' },
  { value: 'high', label: 'High Priority', description: 'Orange badge, stays at top', color: 'border-orange-500/40 text-orange-300', indicatorColor: 'bg-orange-400' },
  { value: 'urgent', label: 'Urgent', description: 'Red banner, cannot dismiss easily', color: 'border-red-500/50 text-red-300', indicatorColor: 'bg-red-500 animate-pulse' },
]

const DEPT_OPTIONS = ['BCA', 'MCA', 'BSc CS', 'MSc IT']
const SEM_OPTIONS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6']


const TARGET_TYPES = [
  { id: 'all_students', label: 'All Department Students', count: null, icon: Users },
  { id: 'specific_dept', label: 'Specific Department(s)', count: null, icon: Building2 },
  { id: 'specific_sem', label: 'Specific Semester', count: null, icon: Calendar },
  { id: 'specific_subject', label: 'Specific Subject Students', count: null, icon: BookOpen },
  { id: 'all_faculty', label: 'All Department Faculty', count: null, icon: User },
  { id: 'specific_faculty', label: 'Specific Faculty Member', count: null, icon: User },
]

const STEPS = ['Notification Content', 'Target Audience', 'Schedule & Send']

export default function CreateAnnouncementModal({ prefill, onSend, onClose }) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [notifType, setNotifType] = useState(prefill?.type || 'general')
  const [title, setTitle] = useState(prefill?.title || '')
  const [message, setMessage] = useState(prefill?.message || '')
  const [priority, setPriority] = useState(prefill?.priority || 'normal')
  const [hasAttachment, setHasAttachment] = useState(false)

  // Step 2
  const [targetType, setTargetType] = useState('all_students')
  const [selectedDepts, setSelectedDepts] = useState([])
  const [selectedSem, setSelectedSem] = useState('')
  const [selectedSemDept, setSelectedSemDept] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('')

  // Step 3
  const [sendMode, setSendMode] = useState('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // API-fetched dropdown data
  const [subjects, setSubjects] = useState([])
  const [facultyList, setFacultyList] = useState([])
  const [summaryCounts, setSummaryCounts] = useState(null)
  const [dropdownLoading, setDropdownLoading] = useState(true)

  // Fetch subjects, faculty, and summary counts on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      setDropdownLoading(true)
      try {
        const [subjectsRes, facultyRes, countsRes] = await Promise.allSettled([
          api.get('/subjects'),
          api.get('/api/v1/hod/faculty/all'),
          api.get('/api/v1/hod/students/summary-counts'),
        ])

        if (subjectsRes.status === 'fulfilled') {
          setSubjects(subjectsRes.value.data || [])
        } else {
          toast.error('Failed to load subjects.')
        }

        if (facultyRes.status === 'fulfilled') {
          setFacultyList(facultyRes.value.data || [])
        } else {
          toast.error('Failed to load faculty list.')
        }

        if (countsRes.status === 'fulfilled') {
          setSummaryCounts(countsRes.value.data || null)
        } else {
          toast.error('Failed to load recipient counts.')
        }
      } catch (error) {
        toast.error('Failed to load dropdown data.')
      } finally {
        setDropdownLoading(false)
      }
    }

    fetchDropdownData()
  }, [])

  // Derive dropdown options from fetched data
  const subjectOptions = subjects.map(s => `${s.name} — ${s.course_code || s.code} Sem ${s.semester_number || s.semester}`)
  const facultyOptions = facultyList.map(f => f.name)

  // Dynamic recipient count using fetched summaryCounts
  function getRecipientCount(target, depts, sem, subject, faculty) {
    if (!summaryCounts) return { students: 0, faculty: 0 }

    switch (target) {
      case 'all_students':
        return { students: summaryCounts.total_students || 0, faculty: 0 }
      case 'specific_dept': {
        const total = depts.reduce((sum, d) => sum + (summaryCounts.by_department?.[d] || 0), 0)
        return { students: total, faculty: 0 }
      }
      case 'specific_sem': {
        const key = sem || ''
        return { students: summaryCounts.by_semester?.[key] || 0, faculty: 0 }
      }
      case 'specific_subject':
        // Use total students as approximation when subject-level counts are not provided
        return { students: summaryCounts.by_subject?.[subject] || summaryCounts.total_students || 0, faculty: 0 }
      case 'all_faculty':
        return { students: 0, faculty: summaryCounts.total_faculty || 0 }
      case 'specific_faculty':
        return { students: 0, faculty: faculty ? 1 : 0 }
      default:
        return { students: 0, faculty: 0 }
    }
  }

  const recipients = getRecipientCount(targetType, selectedDepts, selectedSem, selectedSubject, selectedFaculty)
  const totalRecipients = recipients.students + recipients.faculty
  const typeConfig = NOTIF_TYPES.find(t => t.value === notifType)

  const canGoNext = () => {
    if (step === 0) return title.trim().length > 0 && message.trim().length > 0
    if (step === 1) return totalRecipients > 0
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitting(false)

    const targetLabel = targetType === 'all_students' ? 'All Department Students'
      : targetType === 'all_faculty' ? 'All Department Faculty'
      : targetType === 'specific_dept' ? selectedDepts.join(', ')
      : targetType === 'specific_sem' ? `${selectedSemDept} ${selectedSem}`
      : targetType === 'specific_subject' ? selectedSubject
      : selectedFaculty

    onSend({
      type: notifType,
      title,
      message,
      priority,
      target_label: targetLabel,
      target_count: totalRecipients,
      student_count: recipients.students,
      faculty_count: recipients.faculty,
      sendMode,
      scheduled_for: sendMode === 'schedule' ? `${scheduledDate}T${scheduledTime}:00Z` : null,
      target_type: targetType,
      target_dept: targetType === 'specific_dept' ? selectedDepts[0] : (targetType === 'specific_sem' ? selectedSemDept : null),
      target_semester_id: targetType === 'specific_sem' ? selectedSem : null,
      target_subject_id: targetType === 'specific_subject' ? selectedSubject : null,
      target_faculty: targetType === 'specific_faculty' ? selectedFaculty : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#0A0F1E] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
          <h2 className="text-lg font-bold text-white">Create Announcement</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  i < step ? 'bg-violet-600 text-white' : i === step ? 'bg-violet-600 text-white ring-2 ring-violet-400/30' : 'bg-white/10 text-white/40'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-white' : 'text-white/40'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-3 ${i < step ? 'bg-violet-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step 1: Content ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              {/* Type Selector */}
              <div>
                <label className="text-sm font-semibold text-white/70 block mb-2">Notification Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {NOTIF_TYPES.map(t => (
                    <button key={t.value} onClick={() => setNotifType(t.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${notifType === t.value ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <span className="text-lg block mb-1">{t.emoji}</span>
                      <span className="text-[11px] font-semibold text-white/80 leading-tight block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-white/70">Announcement Title <span className="text-red-400">*</span></label>
                  <span className={`text-xs ${title.length > 90 ? 'text-red-400' : 'text-white/30'}`}>{title.length}/100</span>
                </div>
                <input
                  value={title}
                  onChange={e => e.target.value.length <= 100 && setTitle(e.target.value)}
                  placeholder="e.g. Department Meeting on June 20"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl text-white placeholder-white/30 focus:outline-none text-sm transition"
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-white/70">Message <span className="text-red-400">*</span></label>
                  <span className={`text-xs ${message.length > 450 ? 'text-red-400' : 'text-white/30'}`}>{message.length}/500</span>
                </div>
                <textarea
                  value={message}
                  onChange={e => e.target.value.length <= 500 && setMessage(e.target.value)}
                  placeholder="Write your announcement message here…"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl text-white placeholder-white/30 focus:outline-none text-sm resize-none transition"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-semibold text-white/70 block mb-2">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} onClick={() => setPriority(p.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${priority === p.value ? `${p.color} bg-white/5` : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <div className={`w-2 h-2 rounded-full mb-1.5 ${p.indicatorColor}`} />
                      <p className="text-xs font-bold text-white">{p.label}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{p.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Attachment */}
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 transition">
                <input type="checkbox" checked={hasAttachment} onChange={e => setHasAttachment(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                <Paperclip className="w-4 h-4 text-white/50" />
                <div>
                  <p className="text-sm text-white/80 font-medium">Attach a file (optional)</p>
                  <p className="text-xs text-white/40">PDF or image, max 10 MB</p>
                </div>
              </label>
            </div>
          )}

          {/* ── Step 2: Target Audience ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                {TARGET_TYPES.map(t => {
                  // Compute dynamic count for display
                  let displayCount = null
                  if (summaryCounts) {
                    if (t.id === 'all_students') displayCount = summaryCounts.total_students
                    else if (t.id === 'all_faculty') displayCount = summaryCounts.total_faculty
                  }

                  return (
                    <button key={t.id} onClick={() => setTargetType(t.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${targetType === t.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${targetType === t.id ? 'border-violet-500' : 'border-white/30'}`}>
                        {targetType === t.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                      </div>
                      <t.icon className="w-4 h-4 text-white/50 shrink-0" />
                      <span className="text-sm text-white font-medium flex-1">{t.label}</span>
                      {displayCount != null && <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{displayCount} recipients</span>}
                    </button>
                  )
                })}
              </div>

              {/* Context selectors */}
              {targetType === 'specific_dept' && (
                <div>
                  <label className="text-sm font-semibold text-white/70 block mb-2">Select Department(s)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEPT_OPTIONS.map(d => (
                      <label key={d} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDepts.includes(d) ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                        <input type="checkbox" checked={selectedDepts.includes(d)}
                          onChange={e => setSelectedDepts(prev => e.target.checked ? [...prev, d] : prev.filter(x => x !== d))}
                          className="w-4 h-4 accent-violet-500" />
                        <span className="text-sm text-white">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {targetType === 'specific_sem' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-white/70 block mb-1.5">Department</label>
                    <select value={selectedSemDept} onChange={e => setSelectedSemDept(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm">
                      <option value="" className="bg-[#0F172A]">Select Dept</option>
                      {DEPT_OPTIONS.map(d => <option key={d} value={d} className="bg-[#0F172A]">{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white/70 block mb-1.5">Semester</label>
                    <select value={selectedSem} onChange={e => setSelectedSem(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm">
                      <option value="" className="bg-[#0F172A]">Select Sem</option>
                      {SEM_OPTIONS.map(s => <option key={s} value={s} className="bg-[#0F172A]">{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {targetType === 'specific_subject' && (
                <div>
                  <label className="text-sm font-semibold text-white/70 block mb-1.5">Subject</label>
                  <div className="relative">
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                      disabled={dropdownLoading}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm">
                      <option value="" className="bg-[#0F172A]">{dropdownLoading ? 'Loading subjects…' : 'Select Subject'}</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0F172A]">
                          {s.name} — {s.course_code || s.code} Sem {s.semester_number || s.semester}
                        </option>
                      ))}
                    </select>
                    {dropdownLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {targetType === 'specific_faculty' && (
                <div>
                  <label className="text-sm font-semibold text-white/70 block mb-1.5">Faculty Member</label>
                  <div className="relative">
                    <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)}
                      disabled={dropdownLoading}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm">
                      <option value="" className="bg-[#0F172A]">{dropdownLoading ? 'Loading faculty…' : 'Select Faculty'}</option>
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id} className="bg-[#0F172A]">
                          {f.name}
                        </option>
                      ))}
                    </select>
                    {dropdownLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Live recipient count */}
              <div className={`p-4 rounded-xl border ${totalRecipients > 0 ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/5 border-white/10'}`}>
                <p className="text-sm font-semibold text-white">
                  {totalRecipients > 0
                    ? <>This announcement will reach <strong className="text-violet-300">{recipients.students > 0 ? `${recipients.students} students` : ''}{recipients.students > 0 && recipients.faculty > 0 ? ' and ' : ''}{recipients.faculty > 0 ? `${recipients.faculty} faculty` : ''}</strong> ({totalRecipients} total)</>
                    : 'Select a target audience to see recipient count'
                  }
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule & Send ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* Send options */}
              <div>
                <label className="text-sm font-semibold text-white/70 block mb-2">Send Options</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'now', label: 'Send Now', desc: 'Deliver immediately to all recipients', icon: Send },
                    { id: 'schedule', label: 'Schedule for Later', desc: 'Pick a date and time to send', icon: Clock },
                    { id: 'draft', label: 'Save as Draft', desc: 'Save without sending — edit and send later', icon: FileText },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setSendMode(opt.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${sendMode === opt.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sendMode === opt.id ? 'border-violet-500' : 'border-white/30'}`}>
                        {sendMode === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                      </div>
                      <opt.icon className="w-4 h-4 text-white/50 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="text-xs text-white/40">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {sendMode === 'schedule' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-white/70 block mb-1.5">Date</label>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl text-white focus:outline-none text-sm transition" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white/70 block mb-1.5">Time</label>
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl text-white focus:outline-none text-sm transition" />
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <label className="text-sm font-semibold text-white/70 block mb-2">Preview</label>
                <NotificationPreviewCard
                  typeConfig={typeConfig}
                  title={title}
                  message={message}
                  priority={priority}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
              Cancel
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-bold transition">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-violet-500/20">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {sendMode === 'schedule' ? 'Scheduling…' : sendMode === 'draft' ? 'Saving…' : 'Sending…'}</>
                  : sendMode === 'schedule' ? <><Clock className="w-4 h-4" /> Schedule</> 
                  : sendMode === 'draft' ? <><FileText className="w-4 h-4" /> Save Draft</>
                  : <><Send className="w-4 h-4" /> Send Now</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationPreviewCard({ typeConfig, title, message, priority }) {
  const priorityBorder = priority === 'urgent' ? 'border-red-500/60' : priority === 'high' ? 'border-orange-500/50' : 'border-white/20'
  const priorityBar = priority === 'urgent' ? 'bg-red-500 animate-pulse' : priority === 'high' ? 'bg-orange-500' : 'bg-white/20'

  return (
    <div className={`bg-[#1E293B] border ${priorityBorder} rounded-2xl overflow-hidden`}>
      <div className={`h-1 w-full ${priorityBar}`} />
      <div className="p-4 flex gap-3">
        <div className="text-2xl shrink-0">{typeConfig?.emoji || '📢'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {typeConfig && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeConfig.color}`}>{typeConfig.label}</span>
            )}
            {priority !== 'normal' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priority === 'urgent' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'}`}>
                {priority.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-white font-semibold text-sm">{title || 'Announcement Title'}</p>
          <p className="text-white/60 text-xs mt-1 line-clamp-3">{message || 'Your announcement message will appear here.'}</p>
          <p className="text-white/30 text-[10px] mt-2">IntelliLearn • HOD Notification</p>
        </div>
      </div>
    </div>
  )
}
