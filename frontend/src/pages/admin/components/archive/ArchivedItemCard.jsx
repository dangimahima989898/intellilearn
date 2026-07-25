import { useState } from 'react'
import { RotateCcw, Trash2, Calendar, FileText, Megaphone, BookOpen, AlertTriangle } from 'lucide-react'
import { getDaysColor, formatArchiveDate, DEPT_CONFIG } from './archiveData'

const TYPE_CONFIG = {
  subject:      { icon: BookOpen,   label: 'Subject',      badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  note:         { icon: FileText,   label: 'Note',         badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  announcement: { icon: Megaphone,  label: 'Announcement', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
}

export default function ArchivedItemCard({ item, selected, onToggleSelect, onRestore, onDelete }) {
  const daysLeft = item.remaining_days ?? item.remaining_days ?? 15
  const progressPct = Math.min((daysLeft / 15) * 100, 100)
  const daysCfg = getDaysColor(daysLeft)
  const isUrgent = daysLeft <= 3
  const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.subject
  const deptCfg = DEPT_CONFIG[item.department]
  const TypeIcon = typeCfg.icon

  // For subjects: use name / code; for notes: name; for announcements: name
  const title = item.name || item.subject_name || '—'
  const subtitle = item.type === 'subject'
    ? `${item.code ? item.code + ' · ' : ''}${item.faculty_name || ''}`
    : item.type === 'note'
    ? `${item.subject} · ${item.file_type} · ${((item.size_kb || 0) / 1024).toFixed(1)} MB`
    : item.target || ''

  return (
    <div className={`relative bg-white/5 border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${selected ? 'border-violet-500/40 ring-1 ring-violet-500/30' : 'border-white/10 hover:border-white/20'}`}>
      {/* Urgent accent */}
      <div className={`h-0.5 w-full ${isUrgent ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-violet-600/40 to-blue-600/20'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Checkbox */}
            <div onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id) }}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all ${selected ? 'border-violet-500 bg-violet-500' : 'border-white/30 bg-transparent hover:border-violet-400'}`}>
              {selected && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-current"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
            </div>

            {/* Dept badge */}
            {deptCfg && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${deptCfg.bg} ${deptCfg.border} ${deptCfg.text}`}>
                {item.department}
              </span>
            )}
            {/* Semester */}
            {item.semester && (
              <span className="text-[10px] font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {item.semester}
              </span>
            )}
            {/* Type */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.badge}`}>
              {typeCfg.label}
            </span>
          </div>

          {/* Urgent badge */}
          {isUrgent && (
            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border animate-pulse ${daysCfg.badge}`}>
              <AlertTriangle className="w-2.5 h-2.5" />
              Deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10`}>
            <TypeIcon className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
            {item.students_count != null && <p className="text-xs text-white/40 mt-0.5">{item.students_count} students enrolled</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Archived {formatArchiveDate(item.archived_at)} by {item.archived_by || 'HOD'}
            {item.archived_by_role && <span className="text-white/30">({item.archived_by_role})</span>}
          </div>
          {item.reason && (
            <p className="italic text-white/30">Reason: {item.reason}</p>
          )}
        </div>

        {/* Countdown bar */}
        <div className="flex flex-col gap-1.5 px-3 py-3 bg-white/[0.03] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40 flex items-center gap-1">⏳ {daysLeft} of 15 days remaining</span>
            <span className={`text-xs font-bold ${daysCfg.text}`}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all ${daysCfg.bar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(item) }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Restore
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item) }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
          </button>
        </div>
      </div>
    </div>
  )
}
