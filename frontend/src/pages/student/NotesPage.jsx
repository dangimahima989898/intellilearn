import { useState, useEffect } from 'react'
import {
  FileText, Download, Sparkles, X, Presentation,
  BookOpen, ArrowLeft, BookMarked, Clock, ChevronRight, File
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'
import SubjectBadge from '../../components/SubjectBadge'

const SUBJECT_COLORS = [
  { bg: '#EEF2FF', accent: '#6366F1', text: '#4338CA', ring: '#C7D2FE' },
  { bg: '#F0FDF4', accent: '#22C55E', text: '#15803D', ring: '#BBF7D0' },
  { bg: '#FFF7ED', accent: '#F97316', text: '#C2410C', ring: '#FED7AA' },
  { bg: '#FDF4FF', accent: '#A855F7', text: '#7E22CE', ring: '#E9D5FF' },
  { bg: '#ECFDF5', accent: '#14B8A6', text: '#0F766E', ring: '#99F6E4' },
  { bg: '#FFF1F2', accent: '#F43F5E', text: '#BE123C', ring: '#FECDD3' },
  { bg: '#EFF6FF', accent: '#3B82F6', text: '#1D4ED8', ring: '#BFDBFE' },
  { bg: '#FEFCE8', accent: '#EAB308', text: '#A16207', ring: '#FEF08A' },
]

function getColor(index) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length]
}

// Pretty initials from subject name
function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export default function StudentNotesPage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [notes, setNotes] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notesLoading, setNotesLoading] = useState(false)
  const [summarizingId, setSummarizingId] = useState(null)
  const [activeSummaryNote, setActiveSummaryNote] = useState(null)

  useEffect(() => {
    studentService.getSubjects()
      .then(d => setSubjects(d || []))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject)
    setNotes([])
    setNotesLoading(true)
    try {
      const data = await studentService.getNotes(subject.id)
      setNotes(data || [])
    } catch { toast.error('Failed to load notes') }
    finally { setNotesLoading(false) }
  }

  const handleBack = () => { setSelectedSubject(null); setNotes([]) }

  const handleDownload = async (id, filename) => {
    try {
      const blob = await studentService.downloadNote(id)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
    } catch { toast.error('Download failed') }
  }

  const handleGenerateSummary = async (id) => {
    setSummarizingId(id)
    try {
      const data = await studentService.summarizeNote(id)
      toast.success('Summary generated! 🤖')
      setNotes(prev => prev.map(n => n.id === id ? { ...n, summary: data.summary } : n))
      const cur = notes.find(n => n.id === id)
      if (cur) setActiveSummaryNote({ ...cur, summary: data.summary })
    } catch { toast.error('Failed to generate summary.') }
    finally { setSummarizingId(null) }
  }

  const renderSummary = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      const t = line.trim()
      if (t.startsWith('##')) return <h2 key={i} className="font-bold text-base mb-2 mt-4 first:mt-0 pb-1 border-b border-slate-200 text-slate-800">{t.replace(/^##\s*/, '')}</h2>
      if (t.startsWith('-') || t.startsWith('*')) return <div key={i} className="flex items-start gap-2 mb-1.5 ml-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" /><span>{t.replace(/^[-*]\s*/, '')}</span></div>
      const m = t.match(/^(\d+)\.\s*(.*)/)
      if (m) return <div key={i} className="flex items-start gap-2 mb-1.5 ml-2 text-sm text-slate-600"><span className="text-indigo-600 font-bold shrink-0">{m[1]}.</span><span>{m[2]}</span></div>
      if (t === '') return <div key={i} className="h-1.5" />
      return <p key={i} className="text-sm text-slate-600 leading-relaxed mb-2">{t}</p>
    })
  }

  const getFileInfo = (type) => {
    const t = (type || '').toLowerCase()
    if (t.includes('pdf')) return { label: 'PDF', color: 'text-red-600 bg-red-50 border-red-200', icon: FileText }
    if (t.includes('doc')) return { label: 'DOC', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: FileText }
    if (t.includes('ppt')) return { label: 'PPT', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Presentation }
    return { label: 'FILE', color: 'text-slate-500 bg-slate-100 border-slate-200', icon: File }
  }

  // ── SUBJECTS PAGE ──────────────────────────────────────────────────────────
  if (!selectedSubject) {
    return (
      <PageWrapper>
        <style>{`
          @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          .sc-anim { animation: fadeUp .3s ease both; }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Subjects</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {user?.branch || 'Your Course'} · Semester {user?.current_semester || 1}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-indigo-700">{subjects.length} Subjects</span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>

        ) : subjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-xs mx-auto shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No subjects yet</p>
            <p className="text-xs text-slate-400 mt-1">Subjects for your semester haven't been added yet.</p>
          </div>

        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub, idx) => {
              const c = getColor(idx)
              const initials = getInitials(sub.name)
              const noteCount = sub.notes_count ?? sub.note_count ?? 0

              return (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub)}
                  className="sc-anim text-left rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400"
                  style={{ animationDelay: `${idx * 55}ms` }}
                >
                  {/* Top section with subject color */}
                  <div className="px-5 pt-5 pb-4" style={{ backgroundColor: c.bg }}>
                    <div className="flex items-start justify-between">
                      {/* Big initial circle */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm ring-4"
                        style={{ backgroundColor: c.accent, color: '#fff', ringColor: c.ring }}
                      >
                        {initials}
                      </div>
                      {/* Arrow */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${c.accent}20` }}>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: c.accent }} />
                      </div>
                    </div>

                    {/* Code badge */}
                    <div className="mt-3">
                      <span
                        className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${c.accent}20`, color: c.text }}
                      >
                        {sub.code}
                      </span>
                    </div>
                  </div>

                  {/* Bottom info section */}
                  <div className="px-5 py-4 bg-white">
                    <h3 className="font-bold text-sm text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors mb-3">
                      {sub.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Sem {sub.semester_number}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: noteCount > 0 ? `${c.accent}15` : '#F1F5F9', color: noteCount > 0 ? c.text : '#94A3B8' }}
                      >
                        {noteCount} {noteCount === 1 ? 'Note' : 'Notes'}
                      </span>
                      {sub.credit_hours && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          {sub.credit_hours} Cr
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageWrapper>
    )
  }

  // ── NOTES PAGE ─────────────────────────────────────────────────────────────
  const subjectIdx = subjects.findIndex(s => s.id === selectedSubject.id)
  const c = getColor(subjectIdx)
  const initials = getInitials(selectedSubject.name)

  return (
    <PageWrapper>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .nc-anim { animation: fadeUp .3s ease both; }
      `}</style>

      {/* Subject header card */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-8" style={{ backgroundColor: c.bg }}>
        <div className="px-6 py-5 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Initials */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-md shrink-0"
            style={{ backgroundColor: c.accent }}
          >
            {initials}
          </div>

          {/* Text */}
          <div className="min-w-0">
            <span
              className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${c.accent}25`, color: c.text }}
            >
              {selectedSubject.code}
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 mt-0.5 leading-tight truncate">{selectedSubject.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500 font-semibold">Sem {selectedSubject.semester_number}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] font-semibold" style={{ color: c.text }}>{notes.length} files loaded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center max-w-xs mx-auto shadow-sm">
          <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No notes uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Your faculty hasn't uploaded materials for this subject yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note, idx) => {
            const fi = getFileInfo(note.file_type)
            const FileIcon = fi.icon
            return (
              <div
                key={note.id}
                className="nc-anim bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                style={{ animationDelay: `${idx * 45}ms` }}
              >
                {/* Coloured accent left bar inside top strip */}
                <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />

                <div className="p-4 flex flex-col flex-1">
                  {/* File type + size row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${fi.color}`}>
                      <FileIcon className="w-3 h-3" />
                      {fi.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(note.file_size_kb / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-800 leading-snug line-clamp-2 flex-1 mb-3" title={note.title}>
                    {note.title}
                  </h3>

                  {/* Subject badge */}
                  <div className="mb-3">
                    <SubjectBadge name={note.subject_name} />
                  </div>

                  {/* Date + downloads */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-3 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                    <span>↓ {note.download_count || 0}</span>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveSummaryNote(note)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors"
                      style={{ backgroundColor: `${c.accent}12`, borderColor: `${c.accent}30`, color: c.text }}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Summary
                    </button>
                    <button
                      onClick={() => handleDownload(note.id, `${note.title}.${note.file_type.toLowerCase()}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Modal */}
      {activeSummaryNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-5">
                <div className="min-w-0 pr-4">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">{activeSummaryNote.title}</h3>
                  <div className="mt-1"><SubjectBadge name={activeSummaryNote.subject_name} /></div>
                </div>
                <button onClick={() => setActiveSummaryNote(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                {activeSummaryNote.summary ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    {renderSummary(activeSummaryNote.summary)}
                  </div>
                ) : summarizingId === activeSummaryNote.id ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: `${c.accent}40`, borderTopColor: 'transparent', borderRightColor: c.accent }} />
                    <p className="text-sm text-slate-500 font-semibold animate-pulse">🤖 AI is reading your notes…</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${c.accent}15` }}>
                      <Sparkles className="w-7 h-7" style={{ color: c.accent }} />
                    </div>
                    <h4 className="font-bold text-slate-800">Generate AI Summary</h4>
                    <p className="text-xs text-slate-400 mt-1">AI will scan this document for a quick-revision summary.</p>
                    <button
                      onClick={() => handleGenerateSummary(activeSummaryNote.id)}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                      style={{ backgroundColor: c.accent }}
                    >
                      <Sparkles className="w-4 h-4" /> Generate Summary
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
                <button onClick={() => setActiveSummaryNote(null)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
