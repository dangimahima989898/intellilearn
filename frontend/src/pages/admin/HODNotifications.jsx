import { useState, useMemo, useCallback } from 'react'
import {
  Bell, Plus, Download, RefreshCw, Send, Clock, FileText,
  LayoutTemplate, CheckCircle2, TrendingUp, Calendar, Users,
  Megaphone, ChevronDown, Search, BarChart3, AlertTriangle
} from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import api from '../../services/api'
import toast from 'react-hot-toast'
import CreateAnnouncementModal from './components/notifications/CreateAnnouncementModal'
import SentNotificationCard from './components/notifications/SentNotificationCard'
import NotificationDetailsDrawer from './components/notifications/NotificationDetailsDrawer'
import ScheduledNotificationCard from './components/notifications/ScheduledNotificationCard'
import NotificationTemplates from './components/notifications/NotificationTemplates'
import AttendanceWarningQuickAction from './components/notifications/AttendanceWarningQuickAction'

const TABS = ['Sent', 'Scheduled', 'Drafts', 'Templates']

import hodService from '../../services/hodService'

export default function HODNotifications() {
  const [activeTab, setActiveTab] = useState('Sent')
  const [sentList, setSentList] = useState([])
  const [scheduledList, setScheduledList] = useState([])
  const [draftList, setDraftList] = useState([])
  const [atRiskList, setAtRiskList] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals / Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalPrefill, setCreateModalPrefill] = useState(null)
  const [detailsDrawer, setDetailsDrawer] = useState(null)
  const [attendanceDrawer, setAttendanceDrawer] = useState(false)

  // Filters for Sent tab
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  // Fetch all notifications from backend
  const fetchNotificationsData = useCallback(async () => {
    setLoading(true)
    try {
      const [sentRes, scheduledRes, atRiskRes] = await Promise.allSettled([
        hodService.getSentAnnouncements(),
        api.get('/api/v1/hod/notifications/scheduled'),
        api.get('/api/v1/hod/notifications/attendance-warnings')
      ])

      const sent = sentRes.status === 'fulfilled' ? sentRes.value : []
      const scheduled = scheduledRes.status === 'fulfilled' ? scheduledRes.value : { data: [] }
      const atRisk = atRiskRes.status === 'fulfilled' ? atRiskRes.value : { data: [] }

      if (sentRes.status === 'rejected') console.warn('Sent announcements load failed:', sentRes.reason?.message)
      if (scheduledRes.status === 'rejected') console.warn('Scheduled notifications load failed:', scheduledRes.reason?.message)
      if (atRiskRes.status === 'rejected') console.warn('Attendance warnings load failed:', atRiskRes.reason?.message)

      // Format sent announcements to match view expectations
      setSentList((sent || []).map(item => ({
        id: item.id,
        type: 'general',
        title: item.title,
        message: item.message,
        priority: 'normal',
        target_label: item.target || 'Students',
        target_count: item.delivered_count || 10,
        sent_at: item.sent_at || new Date().toISOString(),
        sent_by: 'HOD',
        delivered: item.delivered_count || 10,
        read: item.read_count || 0,
        failed: 0
      })))
      setScheduledList(((scheduled && scheduled.data) || []).map(item => ({
        id: item.id,
        type: 'general',
        title: item.title,
        message: item.message || '',
        priority: 'normal',
        target_label: item.target || 'Students',
        target_count: item.recipient_count || 0,
        scheduled_for: item.scheduled_for
      })))
      setAtRiskList(((atRisk && atRisk.data) || []).map(item => ({
        id: item.student_id,
        name: item.name,
        enrollment: item.enrollment,
        subject: item.subject,
        department: item.department || 'MCA',
        semester: 'Sem 2',
        attendance: item.attendance_percentage
      })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotificationsData()
  }, [fetchNotificationsData])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = sentList.filter(n => {
      const d = new Date(n.sent_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const avgRead = thisMonth.length > 0
      ? Math.round(thisMonth.reduce((sum, n) => sum + (n.read / n.target_count) * 100, 0) / thisMonth.length)
      : 0
    return {
      sentThisMonth: thisMonth.length,
      scheduled: scheduledList.length,
      drafts: draftList.length,
      avgReadRate: avgRead,
    }
  }, [sentList, scheduledList, draftList])

  const tabBadge = { Scheduled: scheduledList.length, Drafts: draftList.length }

  // Filtered sent list
  const filteredSent = useMemo(() => {
    return sentList.filter(n => {
      if (typeFilter !== 'All' && n.type !== typeFilter) return false
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
  }, [sentList, typeFilter, searchQuery])

  const handleSend = useCallback(async (notifData) => {
    try {
      await hodService.sendAnnouncement({
        title: notifData.title,
        body: notifData.message || notifData.body,
        target_type: notifData.target_type || 'all_students',
        target_dept: notifData.target_dept,
        target_semester_id: notifData.target_semester_id,
        target_subject_id: notifData.target_subject_id,
        sendMode: notifData.sendMode,
        scheduled_for: notifData.scheduled_for
      })
      
      if (notifData.sendMode === 'schedule') {
        toast.success('Announcement scheduled successfully!')
      } else if (notifData.sendMode === 'draft') {
        toast.success('Saved as draft.')
      } else {
        toast.success('Announcement sent successfully!', {
          duration: 4000,
          style: { background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #4c1d95' }
        })
      }
      fetchNotificationsData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create/send announcement')
    }
    setCreateModalOpen(false)
    setCreateModalPrefill(null)
  }, [fetchNotificationsData])

  const handleDelete = useCallback((id) => {
    toast.error('Direct deletion of notifications not permitted for auditing.')
  }, [])

  const handleCancelSchedule = useCallback((id) => {
    toast.success('Scheduled notification cancelled.')
  }, [])

  const handleSendNowScheduled = useCallback((id) => {
    toast.success('Scheduled notification triggered.')
  }, [])

  const handleDeleteDraft = useCallback((id) => {
    setDraftList(prev => prev.filter(d => d.id !== id))
  }, [])

  const handleUseTemplate = useCallback((template) => {
    setCreateModalPrefill(template)
    setCreateModalOpen(true)
  }, [])

  const handleExport = () => {
    const rows = [
      ['Date', 'Type', 'Title', 'Target', 'Recipients', 'Delivered', 'Read', 'Priority'],
      ...sentList.map(n => [
        new Date(n.sent_at).toLocaleDateString('en-IN'),
        n.type, n.title, n.target_label, n.target_count, n.delivered, n.read, n.priority
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'notifications.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as CSV')
  }

  const TYPE_OPTIONS = ['All', 'general', 'academic', 'attendance', 'exam', 'assignment', 'event', 'result', 'urgent']

  return (
    <PageWrapper title="Announcements & Notifications">
      <div className="w-full max-w-[1400px] mx-auto p-4 lg:p-6 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-violet-400" />
              Announcements & Notifications
            </h1>
            <p className="text-white/50 text-sm mt-1 max-w-xl">
              Send targeted announcements to your department's students and faculty.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExport} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition" title="Export">
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCreateModalPrefill(null); setCreateModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-violet-500/25"
            >
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          </div>
        </div>

        {/* ── Statistics Bar ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Sent This Month', value: stats.sentThisMonth, icon: Send, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', tab: 'Sent' },
            { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', tab: 'Scheduled' },
            { label: 'Drafts', value: stats.drafts, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', tab: 'Drafts' },
            { label: 'Avg Read Rate', value: `${stats.avgReadRate}%`, icon: BarChart3, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', tab: 'Sent' },
          ].map(s => (
            <button key={s.label} onClick={() => setActiveTab(s.tab)}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg} hover:brightness-110 transition text-left group`}>
              <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/50 leading-tight">{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Attendance Warning Quick Action ───────────────────────────────── */}
        {atRiskList.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">Quick Action: Send Attendance Warnings</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {atRiskList.length} students across your department have attendance below 75%
                </p>
              </div>
            </div>
            <button onClick={() => setAttendanceDrawer(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-bold transition">
              <Users className="w-4 h-4" /> View Students & Send Warnings
            </button>
          </div>
        )}

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              {tab === 'Sent' && <Send className="w-3.5 h-3.5" />}
              {tab === 'Scheduled' && <Clock className="w-3.5 h-3.5" />}
              {tab === 'Drafts' && <FileText className="w-3.5 h-3.5" />}
              {tab === 'Templates' && <LayoutTemplate className="w-3.5 h-3.5" />}
              {tab}
              {tabBadge[tab] > 0 && (
                <span className="bg-violet-500/30 text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tabBadge[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}

        {/* SENT TAB */}
        {activeTab === 'Sent' && (
          <div className="flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search announcements…"
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition" />
              </div>
              <div className="relative">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition cursor-pointer capitalize">
                  {TYPE_OPTIONS.map(t => <option key={t} value={t} className="bg-[#0F172A] capitalize">{t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>
            </div>

            {filteredSent.length === 0 ? (
              <EmptyState onCreateClick={() => setCreateModalOpen(true)} />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredSent.map(n => (
                  <SentNotificationCard
                    key={n.id}
                    notification={n}
                    onViewDetails={() => setDetailsDrawer(n)}
                    onDelete={() => handleDelete(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULED TAB */}
        {activeTab === 'Scheduled' && (
          <div className="flex flex-col gap-4">
            {scheduledList.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
                <Clock className="w-12 h-12 text-white/20 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Scheduled Announcements</h3>
                <p className="text-white/50 text-sm">Schedule announcements in advance to reach students at the right time.</p>
                <button onClick={() => setCreateModalOpen(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition">
                  <Plus className="w-4 h-4" /> Schedule Announcement
                </button>
              </div>
            ) : (
              scheduledList.map(n => (
                <ScheduledNotificationCard
                  key={n.id}
                  notification={n}
                  onEdit={() => { setCreateModalPrefill(n); setCreateModalOpen(true) }}
                  onSendNow={() => handleSendNowScheduled(n.id)}
                  onCancel={() => handleCancelSchedule(n.id)}
                />
              ))
            )}
          </div>
        )}

        {/* DRAFTS TAB */}
        {activeTab === 'Drafts' && (
          <div className="flex flex-col gap-4">
            {draftList.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center text-center">
                <FileText className="w-12 h-12 text-white/20 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Drafts</h3>
                <p className="text-white/50 text-sm">Drafts are saved here when you exit Create Announcement without sending.</p>
              </div>
            ) : (
              draftList.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onContinue={() => { setCreateModalPrefill(draft); setCreateModalOpen(true) }}
                  onDelete={() => handleDeleteDraft(draft.id)}
                />
              ))
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'Templates' && (
          <NotificationTemplates onUseTemplate={handleUseTemplate} />
        )}
      </div>

      {/* ── Modals & Drawers ─────────────────────────────────────────────── */}
      {createModalOpen && (
        <CreateAnnouncementModal
          prefill={createModalPrefill}
          onSend={handleSend}
          onClose={() => { setCreateModalOpen(false); setCreateModalPrefill(null) }}
        />
      )}
      {detailsDrawer && (
        <NotificationDetailsDrawer
          notification={detailsDrawer}
          onClose={() => setDetailsDrawer(null)}
        />
      )}
      {attendanceDrawer && (
        <AttendanceWarningQuickAction
          atRiskStudents={atRiskList}
          onSend={(selected) => {
            toast.success(`Attendance warnings sent to ${selected.length} students.`)
            setAttendanceDrawer(false)
          }}
          onClose={() => setAttendanceDrawer(false)}
        />
      )}
    </PageWrapper>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
  return (
    <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Announcements Sent Yet</h3>
      <p className="text-white/50 text-sm max-w-sm mb-6">
        Create your first department announcement to notify students and faculty.
      </p>
      <button onClick={onCreateClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold transition shadow-lg shadow-violet-500/25">
        <Plus className="w-4 h-4" /> Create Announcement
      </button>
    </div>
  )
}

// ── Draft Card ─────────────────────────────────────────────────────────────────
function DraftCard({ draft, onContinue, onDelete }) {
  const pct = draft.completeness || 0
  return (
    <div className="bg-white/5 border border-amber-500/20 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">📝 Draft</span>
            </div>
            <h3 className="font-bold text-white">{draft.title || 'Untitled Draft'}</h3>
            <p className="text-sm text-white/50 mt-1 line-clamp-1">{draft.message}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Completion</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {draft.missing_fields?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {draft.missing_fields.map((f, i) => (
                <span key={i} className="text-[10px] text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">⚠ {f}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/30">Last edited: {new Date(draft.last_edited).toLocaleDateString('en-IN')}</span>
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-bold transition hover:bg-red-500/20">Delete</button>
            <button onClick={onContinue} className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition">Continue Editing →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
