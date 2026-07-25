import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Clock, MapPin, AlertCircle, Edit, Trash2, UserPlus, X, User,
  RefreshCw, XCircle, ChevronRight, Plus
} from 'lucide-react'
import api from '../../services/api'
import adminService from '../../services/adminService'
import toast from 'react-hot-toast'

// ── Color map for class types ─────────────────────────────────────────────────
const CLASS_COLORS = {
  Lab:       { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', dot: '#3B82F6',  label: 'Lab',       headerBg: '#DBEAFE' },
  Practical: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', dot: '#22C55E',  label: 'Practical', headerBg: '#DCFCE7' },
  Tutorial:  { bg: '#FFF7ED', border: '#FDC97F', text: '#B45309', dot: '#F59E0B',  label: 'Tutorial',  headerBg: '#FFEDD5' },
  Cancelled: { bg: '#FFF1F2', border: '#FDA4AF', text: '#BE123C', dot: '#F43F5E',  label: 'Cancelled', headerBg: '#FFE4E6' },
  Lecture:   { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', dot: '#8B5CF6',  label: 'Lecture',   headerBg: '#EDE9FE' },
  default:   { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', dot: '#8B5CF6',  label: 'Class',     headerBg: '#EDE9FE' },
}

function getCardColors(slot) {
  if (slot.status === 'cancelled') return CLASS_COLORS.Cancelled
  if (slot.is_lab) return CLASS_COLORS.Lab
  const type = slot.class_type || slot.type || ''
  return CLASS_COLORS[type] || CLASS_COLORS.default
}

// ── Slot Detail Popup ──────────────────────────────────────────────────────────
function SlotDetailPopup({ slot, onClose, onEdit, onDelete, onSubstitute }) {
  const colors = getCardColors(slot)
  const duration = (() => {
    try {
      const [sh, sm] = slot.start_time.split(':').map(Number)
      const [eh, em] = slot.end_time.split(':').map(Number)
      const mins = (eh * 60 + em) - (sh * 60 + sm)
      return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`.trim()
    } catch { return '' }
  })()

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${colors.dot}, ${colors.border})` }} />
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: colors.headerBg, color: colors.text, borderRadius: 999, padding: '3px 10px', border: `1px solid ${colors.border}`, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot }} />
                {colors.label}
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{slot.subject_name}</h3>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Faculty',  value: slot.faculty_name || 'Not assigned', Icon: User },
              { label: 'Room',     value: slot.room || 'TBD',                  Icon: MapPin },
              { label: 'Time',     value: `${slot.start_time} – ${slot.end_time}`, Icon: Clock },
              { label: 'Duration', value: duration || '—',                     Icon: ChevronRight },
            ].map(({ label, value, Icon }) => (
              <div key={label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '9px 12px', border: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1F2937' }}>
                  <Icon size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} /> {value}
                </div>
              </div>
            ))}
          </div>

          {slot.faculty_on_leave && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                ⚠️ Faculty on leave {slot.substitute_faculty_id ? `— Substitute: ${slot.substitute_faculty_name}` : '— No substitute assigned'}
              </p>
            </div>
          )}

          {slot.status === 'draft' && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 12px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#92400E' }}>📝 This slot is in draft — publish to make it visible to students.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onClose(); onEdit(slot) }}
              style={{ flex: 1, padding: '10px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Edit Slot
            </button>
            {slot.faculty_on_leave && !slot.substitute_faculty_id && (
              <button onClick={() => { onClose(); onSubstitute(slot) }}
                style={{ flex: 1, padding: '10px 0', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Assign Sub
              </button>
            )}
            <button onClick={() => { onClose(); onDelete(slot.id) }}
              style={{ flex: '0 0 42px', padding: '10px 0', background: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3', borderRadius: 10, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Class Card ─────────────────────────────────────────────────────────────────
function ClassCard({ slot, onEdit, onDelete, onSubstitute, onViewDetail }) {
  const colors = getCardColors(slot)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onViewDetail(slot)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderLeft: `4px solid ${colors.dot}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.18s',
        minHeight: 95,
        boxSizing: 'border-box',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Hover action overlay */}
      {hovered && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0, borderRadius: 10,
            background: 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexWrap: 'wrap', padding: 8, zIndex: 2,
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.12s ease'
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
          {[
            { label: 'Edit',       Icon: Edit,     bg: '#EDE9FE', color: '#6D28D9', fn: () => onEdit(slot) },
            { label: 'Delete',     Icon: Trash2,   bg: '#FFF1F2', color: '#DC2626', fn: () => onDelete(slot.id) },
            { label: 'Reschedule', Icon: RefreshCw, bg: '#F0F9FF', color: '#0369A1', fn: () => onEdit(slot) },
            { label: 'Sub',        Icon: UserPlus,  bg: '#F0FDF4', color: '#15803D', fn: () => onSubstitute(slot) },
          ].map(({ label, Icon, bg, color, fn }) => (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); fn() }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', background: bg, color, border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Subject Name — 2 lines max */}
      <p style={{
        margin: '0 0 6px',
        fontSize: 14,
        fontWeight: 700,
        color: colors.text,
        lineHeight: 1.3,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {slot.subject_name}
      </p>

      {/* Faculty */}
      {slot.faculty_name && (
        <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <User size={11} style={{ flexShrink: 0, color: '#9CA3AF' }} /> {slot.faculty_name}
        </p>
      )}

      {/* Room badge + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
        {slot.room && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 5, padding: '2px 6px' }}>
            <MapPin size={9} />{slot.room}
          </span>
        )}
        {slot.start_time && slot.end_time && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.6)', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 5, padding: '2px 6px' }}>
            <Clock size={9} />{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}
          </span>
        )}
        {/* Type badge */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: colors.headerBg, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 5, padding: '2px 6px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.dot, flexShrink: 0 }} />
          {colors.label}
        </span>
        {slot.status === 'draft' && (
          <span style={{ display: 'inline-flex', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 4, padding: '2px 5px' }}>
            Draft
          </span>
        )}
        {slot.faculty_on_leave && !slot.substitute_faculty_id && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 700, background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 4, padding: '2px 5px' }}>
            <AlertCircle size={8} /> No Sub
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main TimetableGrid ─────────────────────────────────────────────────────────
export default function TimetableGrid({
  slots = [],
  facultyList = [],
  viewType = 'weekly',
  workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  onEditSlot,
  onDeleteSlot,
  onRefresh,
  selectedCourseId = '',
  selectedSemesterNumber = ''
}) {
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false)
  const [activeSubSlot, setActiveSubSlot] = useState(null)
  const [selectedSubFacultyId, setSelectedSubFacultyId] = useState('')
  const [submittingSub, setSubmittingSub] = useState(false)
  const [draggedSlot, setDraggedSlot] = useState(null)
  const [detailSlot, setDetailSlot] = useState(null)
  const [activeDailyDay, setActiveDailyDay] = useState('Monday')

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Auto-hide Saturday if no Saturday slots exist
  const hasSaturdaySlots = useMemo(() => slots.some(s => s.day_of_week === 'Saturday'), [slots])
  const activeDays = useMemo(() => {
    return allDays.filter(d => {
      if (d === 'Saturday' && !hasSaturdaySlots) return false
      return workingDays.includes(d)
    })
  }, [workingDays, hasSaturdaySlots])

  const hours = useMemo(() => {
    if (!slots || slots.length === 0)
      return ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
    let minStart = 9, maxEnd = 17
    slots.forEach(s => {
      if (s.start_time) { const h = parseInt(s.start_time, 10); if (!isNaN(h) && h < minStart) minStart = h }
      if (s.end_time)   { const h = parseInt(s.end_time, 10);   if (!isNaN(h) && h > maxEnd)   maxEnd   = h }
    })
    return Array.from({ length: maxEnd - minStart }, (_, i) => `${String(minStart + i).padStart(2, '0')}:00`)
  }, [slots])

  const timeToMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const minsToTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  const slotsByDay = useMemo(() => {
    const map = {}
    allDays.forEach(d => { map[d] = slots.filter(s => s.day_of_week === d) })
    return map
  }, [slots])

  const openSubstituteModal = (slot) => {
    setActiveSubSlot(slot)
    setSelectedSubFacultyId(slot.substitute_faculty_id || '')
    setSubstituteModalOpen(true)
  }

  const saveSubstitute = async () => {
    if (!activeSubSlot) return
    setSubmittingSub(true)
    try {
      await adminService.updateTimetableSlot(activeSubSlot.id, { substitute_faculty_id: selectedSubFacultyId || null })
      toast.success('Substitute faculty updated')
      setSubstituteModalOpen(false)
      onRefresh()
    } catch {
      toast.error('Failed to update substitute faculty')
    } finally {
      setSubmittingSub(false)
    }
  }

  const handleDragStart = (e, slot) => {
    setDraggedSlot(slot)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const handleDrop = async (e, day, hour) => {
    e.preventDefault()
    if (!draggedSlot) return
    if (draggedSlot.day_of_week === day && draggedSlot.start_time.startsWith(hour.substring(0, 3))) { setDraggedSlot(null); return }
    const duration = timeToMins(draggedSlot.end_time) - timeToMins(draggedSlot.start_time)
    const newEnd = minsToTime(timeToMins(hour) + duration)
    if (window.confirm(`Move "${draggedSlot.subject_name}" to ${day} ${hour}–${newEnd}?`)) {
      try {
        await adminService.updateTimetableSlot(draggedSlot.id, { day_of_week: day, start_time: hour, end_time: newEnd })
        toast.success(`Moved to ${day} ${hour}`)
        onRefresh()
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to move slot')
      }
    }
    setDraggedSlot(null)
  }

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

  // ── WEEKLY VIEW ──────────────────────────────────────────────────────────────
  if (viewType === 'weekly') {
    const TIME_COL_W = 90
    const DAY_COL_W = Math.max(185, Math.floor((1200 - TIME_COL_W) / activeDays.length))

    return (
      <>
        <style>{`
          .tt-grid-wrap { scrollbar-width: thin; scrollbar-color: #C4B5FD #F5F3FF; }
          .tt-grid-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
          .tt-grid-wrap::-webkit-scrollbar-track { background: #F5F3FF; }
          .tt-grid-wrap::-webkit-scrollbar-thumb { background: #C4B5FD; border-radius: 4px; }
          .tt-cell-hover:hover { background: #F5F3FF !important; }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="tt-grid-wrap" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: TIME_COL_W + activeDays.length * DAY_COL_W }}>
              <colgroup>
                <col style={{ width: TIME_COL_W }} />
                {activeDays.map(d => <col key={d} style={{ width: DAY_COL_W }} />)}
              </colgroup>

              <thead>
                <tr>
                  {/* Corner cell */}
                  <th style={{
                    position: 'sticky', left: 0, top: 0, zIndex: 12,
                    width: TIME_COL_W, minWidth: TIME_COL_W,
                    background: '#FAFAF9', borderBottom: '2px solid #EDE9FE',
                    borderRight: '2px solid #EDE9FE',
                    padding: '0 12px', height: 64,
                    verticalAlign: 'middle',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> Time
                    </span>
                  </th>

                  {activeDays.map(day => {
                    const isToday = day === todayName
                    const count = slotsByDay[day]?.length || 0
                    return (
                      <th key={day} style={{
                        position: 'sticky', top: 0, zIndex: 10,
                        minWidth: DAY_COL_W, width: DAY_COL_W,
                        background: isToday ? '#F5F3FF' : '#fff',
                        borderBottom: `2px solid ${isToday ? '#C4B5FD' : '#EDE9FE'}`,
                        borderRight: '1px solid #F0EEFF',
                        height: 64, verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '0 8px',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                            {day.slice(0, 3)}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#7C3AED' : '#1E1B4B' }}>
                            {day}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#7C3AED' : '#9CA3AF' }}>
                              {count} Class{count !== 1 ? 'es' : ''}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: 9, fontWeight: 800, background: '#7C3AED', color: '#fff', borderRadius: 999, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                TODAY
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {hours.map((hour, rowIdx) => (
                  <tr key={hour} style={{ borderBottom: '1px solid #F0EEFF' }}>
                    {/* Time cell */}
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 5,
                      width: TIME_COL_W, minWidth: TIME_COL_W,
                      background: '#FAFAF9', borderRight: '2px solid #EDE9FE',
                      padding: '0 12px', height: 110, verticalAlign: 'top',
                      paddingTop: 12,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', display: 'block' }}>{hour}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: '#C4B5FD', marginTop: 2, display: 'block' }}>
                        {hour.slice(0, 2) >= 12 ? 'PM' : 'AM'}
                      </span>
                    </td>

                    {activeDays.map(day => {
                      const daySlots = slotsByDay[day] || []
                      const slot = daySlots.find(s => s.start_time?.startsWith(hour.substring(0, 3)))
                      const isToday = day === todayName

                      return (
                        <td
                          key={day}
                          className={!slot ? 'tt-cell-hover' : ''}
                          onDragOver={handleDragOver}
                          onDrop={e => handleDrop(e, day, hour)}
                          style={{
                            borderRight: '1px solid #F0EEFF',
                            height: 110,
                            verticalAlign: 'top',
                            padding: 8,
                            minWidth: DAY_COL_W,
                            width: DAY_COL_W,
                            background: isToday ? 'rgba(245,243,255,0.3)' : 'transparent',
                            position: 'relative',
                            transition: 'background 0.12s',
                          }}
                        >
                          {slot ? (
                            <div draggable onDragStart={e => handleDragStart(e, slot)} style={{ height: '100%' }}>
                              <ClassCard
                                slot={slot}
                                onEdit={onEditSlot}
                                onDelete={onDeleteSlot}
                                onSubstitute={openSubstituteModal}
                                onViewDetail={setDetailSlot}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => onEditSlot({ day_of_week: day, start_time: hour })}
                              style={{
                                opacity: 0, width: '100%', height: '100%',
                                border: '1.5px dashed #DDD6FE', borderRadius: 10,
                                background: 'none', cursor: 'pointer', color: '#7C3AED',
                                fontSize: 11, fontWeight: 700, transition: 'opacity 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                            >
                              <Plus size={13} /> Schedule
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {detailSlot && (
          <SlotDetailPopup
            slot={detailSlot}
            onClose={() => setDetailSlot(null)}
            onEdit={onEditSlot}
            onDelete={onDeleteSlot}
            onSubstitute={openSubstituteModal}
          />
        )}
        <SubstituteModal
          open={substituteModalOpen}
          slot={activeSubSlot}
          facultyList={facultyList}
          selectedId={selectedSubFacultyId}
          onSelect={setSelectedSubFacultyId}
          onSave={saveSubstitute}
          onClose={() => setSubstituteModalOpen(false)}
          submitting={submittingSub}
        />
      </>
    )
  }

  // ── DAILY VIEW ──────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Day selector */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: '12px 20px', borderBottom: '1px solid #EDE9FE', background: '#fff', overflowX: 'auto' }}>
          {activeDays.map(day => {
            const count = slotsByDay[day]?.length || 0
            const isActive = activeDailyDay === day
            const isToday = day === todayName
            return (
              <button key={day} onClick={() => setActiveDailyDay(day)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '10px 16px', borderRadius: 12,
                  border: `1.5px solid ${isActive ? '#7C3AED' : '#E5E7EB'}`,
                  background: isActive ? '#7C3AED' : isToday ? '#F5F3FF' : '#fff',
                  color: isActive ? '#fff' : '#374151',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75 }}>{day.slice(0, 3)}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{day}</span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: isActive ? 'rgba(255,255,255,0.2)' : '#EDE9FE', color: isActive ? '#fff' : '#7C3AED', borderRadius: 999, padding: '0 6px' }}>
                    {count}
                  </span>
                )}
                {isToday && <span style={{ fontSize: 8, fontWeight: 800, background: isActive ? 'rgba(255,255,255,0.25)' : '#7C3AED', color: isActive ? '#fff' : '#fff', borderRadius: 999, padding: '1px 5px', textTransform: 'uppercase' }}>Today</span>}
              </button>
            )
          })}
        </div>

        {/* Day schedule */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!slotsByDay[activeDailyDay] || slotsByDay[activeDailyDay].length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, border: '2px dashed #DDD6FE', borderRadius: 16, gap: 12 }}>
              <Clock size={32} style={{ color: '#C4B5FD' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#6B7280' }}>No classes scheduled for {activeDailyDay}</p>
              <button onClick={() => onEditSlot({ day_of_week: activeDailyDay, start_time: '09:00' })}
                style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', border: '1px solid #DDD6FE', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                + Schedule a class
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slotsByDay[activeDailyDay]
                ?.sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))
                .map(slot => {
                  const colors = getCardColors(slot)
                  return (
                    <div key={slot.id} style={{ background: '#fff', border: `1.5px solid ${colors.border}`, borderLeft: `4px solid ${colors.dot}`, borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: colors.headerBg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '2px 9px' }}>
                            <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />{slot.start_time} – {slot.end_time}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: colors.headerBg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '2px 9px' }}>
                            {colors.label}
                          </span>
                          {slot.room && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 999, padding: '2px 9px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={9} />{slot.room}
                            </span>
                          )}
                          {slot.status === 'draft' && (
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 4, padding: '2px 6px' }}>Draft</span>
                          )}
                        </div>
                        <h4 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 800, color: '#111827' }}>{slot.subject_name}</h4>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>
                          <User size={11} style={{ display: 'inline', marginRight: 4 }} />{slot.faculty_name || 'Not assigned'}
                        </p>
                        {slot.faculty_on_leave && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3', borderRadius: 4, padding: '2px 6px' }}>On Leave</span>
                            {slot.substitute_faculty_id
                              ? <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 4, padding: '2px 6px' }}>Sub: {slot.substitute_faculty_name}</span>
                              : <button onClick={() => openSubstituteModal(slot)} style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>+ Assign Substitute</button>
                            }
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => onEditSlot(slot)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDE9FE', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#7C3AED' }}>
                          <Edit size={15} />
                        </button>
                        <button onClick={() => onDeleteSlot(slot.id)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF1F2', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#E11D48' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {detailSlot && (
        <SlotDetailPopup
          slot={detailSlot}
          onClose={() => setDetailSlot(null)}
          onEdit={onEditSlot}
          onDelete={onDeleteSlot}
          onSubstitute={openSubstituteModal}
        />
      )}
      <SubstituteModal
        open={substituteModalOpen}
        slot={activeSubSlot}
        facultyList={facultyList}
        selectedId={selectedSubFacultyId}
        onSelect={setSelectedSubFacultyId}
        onSave={saveSubstitute}
        onClose={() => setSubstituteModalOpen(false)}
        submitting={submittingSub}
      />
    </>
  )
}

// ── Substitute Modal ───────────────────────────────────────────────────────────
function SubstituteModal({ open, slot, facultyList, selectedId, onSelect, onSave, onClose, submitting }) {
  if (!open || !slot) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 390, padding: 26, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>Assign Substitute</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF' }}>Temporary replacement for this slot</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Original Slot</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{slot.subject_name}</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B7280' }}>Faculty on leave: {slot.faculty_name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>📅 {slot.day_of_week} | ⏰ {slot.start_time}–{slot.end_time} | 🏫 {slot.room || 'N/A'}</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Select Substitute Faculty</label>
          <select value={selectedId} onChange={e => onSelect(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 13, fontWeight: 600, color: '#374151', background: '#F9FAFB', outline: 'none' }}>
            <option value="">— No Substitute (Vacant) —</option>
            {facultyList.filter(f => f.id !== slot.faculty_id).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={submitting}
            style={{ flex: 1, padding: '11px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Saving...' : 'Assign Instructor'}
          </button>
        </div>
      </div>
    </div>
  )
}
