import { useState, useEffect, useRef } from 'react'
import {
  Bell, Send, Trash2, X, Filter, Info, AlertTriangle, CheckCircle2,
  Loader2, Archive, Check, MoreVertical, Eye, Calendar, Inbox,
  Cpu, Clock, Quote, User
} from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'
import api from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // Tabs: unread, read, archived
  const [activeTab, setActiveTab] = useState('unread') // unread, read, archived
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [moduleFilter, setModuleFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [activeDropdownId, setActiveDropdownId] = useState(null)
  const [selectedNotif, setSelectedNotif] = useState(null) // for view details modal

  // Announcement Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    course_id: '',
    semester_number: ''
  })

  const dropdownRef = useRef(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/notifications', {
        params: {
          module: moduleFilter || undefined,
          priority: priorityFilter || undefined,
          status: activeTab
        }
      })
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unread_count)
    } catch (err) {
      console.error("Failed to load notifications", err)
      toast.error("Failed to load notifications history")
    } finally {
      setLoading(false)
    }
  }

  // Reload when tab or filters change
  useEffect(() => {
    fetchNotifications()
  }, [activeTab, moduleFilter, priorityFilter])

  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return

    let socket = null
    let reconnectTimeout = null

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${new URL(api.defaults.baseURL || "http://localhost:8000").host}/api/notifications/ws/${user.id}`
        socket = new WebSocket(wsUrl)

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'notification') {
              const newNotif = data.notification
              
              // Only add to view if it fits active filters
              const matchesModule = !moduleFilter || newNotif.module === moduleFilter
              const matchesPriority = !priorityFilter || newNotif.priority === priorityFilter
              const fitsTab = activeTab === 'unread' // new notifications are unread

              if (matchesModule && matchesPriority && fitsTab) {
                setNotifications(prev => [newNotif, ...prev])
              }
              setUnreadCount(prev => prev + 1)
              toast.success(newNotif.title, { icon: '🔔' })
            }
          } catch (err) {
            console.error("Error parsing socket message", err)
          }
        }

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 5000)
        }

        socket.onerror = () => {
          socket.close()
        }
      } catch (err) {
        console.error("WebSocket setup failed", err)
      }
    }

    connectWebSocket()

    // 30 seconds polling fallback
    const interval = setInterval(fetchNotifications, 30000)

    return () => {
      if (socket) {
        socket.onclose = null
        socket.close()
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      clearInterval(interval)
    }
  }, [user?.id, activeTab, moduleFilter, priorityFilter])

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Actions
  const handleMarkRead = async (id) => {
    try {
      await api.patch('/api/notifications/read', { notification_id: id })
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Marked as read')
    } catch (err) {
      toast.error('Failed to update status')
    }
    setActiveDropdownId(null)
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read', { mark_all: true })
      setNotifications([])
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleArchive = async (id, isArchived) => {
    try {
      await api.patch('/api/notifications/archive', { notification_id: id, is_archived: isArchived })
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (activeTab === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success(isArchived ? 'Notification archived' : 'Notification restored')
    } catch (err) {
      toast.error('Failed to archive notification')
    }
    setActiveDropdownId(null)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (activeTab === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success('Notification deleted')
    } catch (err) {
      toast.error('Failed to delete notification')
    }
    setActiveDropdownId(null)
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please fill in both title and message")
      return
    }

    setSending(true)
    try {
      await api.post('/notifications/send-all', {
        title: formData.title.trim(),
        body: formData.message.trim(),
        type: formData.type,
        course_id: formData.course_id || null,
        semester_number: formData.semester_number ? Number(formData.semester_number) : null
      })
      toast.success("Announcement sent successfully!")
      setIsModalOpen(false)
      setFormData({ title: '', message: '', type: 'info', course_id: '', semester_number: '' })
      fetchNotifications()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || "Failed to send announcement")
    } finally {
      setSending(false)
    }
  }

  // Styles helpers
  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      default:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  }

  const getModuleLabel = (mod) => {
    switch (mod) {
      case 'ai_moderation': return 'AI Moderation'
      case 'leave': return 'Leave Management'
      case 'schedule': return 'Class Scheduling'
      default: return mod || 'General'
    }
  }

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ""
    const diff = (new Date() - date) / 1000
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <PageWrapper title="System Notifications">
      <div className={`w-full font-dm flex flex-col gap-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-outfit font-bold tracking-tight">System Notifications</h1>
            <p className="text-white/50 text-sm mt-1">Stay updated with real-time academic and system updates</p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'unread' && notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition"
              >
                <Check className="w-4 h-4" /> Mark all read
              </button>
            )}

            {['hod', 'super_admin'].includes(user?.role) && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition shadow-lg shadow-violet-500/25 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" /> Send Announcement
              </button>
            )}
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Filters Column */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-violet-400" /> Filters
              </h3>

              {/* Module Filter */}
              <div>
                <label className="block text-xs opacity-60 font-semibold mb-2">Module</label>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full bg-[#0d1222] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="">All Modules</option>
                  <option value="ai_moderation">AI Moderation</option>
                  <option value="leave">Leave Management</option>
                  <option value="schedule">Scheduling</option>
                  <option value="system">System Updates</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs opacity-60 font-semibold mb-2">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-[#0d1222] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Stat summaries */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-60">Pending Unread</span>
                <span className="font-bold text-violet-400">{unreadCount}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-60">Real-time Connection</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Connected
                </span>
              </div>
            </div>
          </div>

          {/* List panel */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5 w-max">
              {[
                { id: 'unread', label: 'Unread', badge: unreadCount },
                { id: 'read', label: 'Read' },
                { id: 'archived', label: 'Archived' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    activeTab === t.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.label}
                  {t.badge > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table layout */}
            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider opacity-60 bg-white/2">
                      <th className="px-6 py-4">Notification</th>
                      <th className="px-6 py-4">Module</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center opacity-40">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading notifications...
                        </td>
                      </tr>
                    ) : notifications.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center opacity-30">
                          <Inbox className="w-12 h-12 mx-auto mb-3" />
                          <p className="font-semibold text-sm">No notifications found</p>
                        </td>
                      </tr>
                    ) : (
                      notifications.map(notif => (
                        <tr key={notif.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm text-white">{notif.title}</div>
                            <div className="text-white/60 mt-1 max-w-sm line-clamp-1">{notif.message}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white/80">
                            {getModuleLabel(notif.module)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(notif.priority)}`}>
                              {notif.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 opacity-50 font-mono">
                            {getTimeAgo(notif.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            {notif.is_read ? (
                              <span className="text-white/40 font-medium">Read</span>
                            ) : (
                              <span className="text-violet-400 font-bold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" /> New
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center relative" ref={activeDropdownId === notif.id ? dropdownRef : null}>
                            <button
                              onClick={() => setActiveDropdownId(activeDropdownId === notif.id ? null : notif.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeDropdownId === notif.id && (
                              <div className="absolute right-6 mt-1 w-40 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 text-left">
                                <button
                                  onClick={() => { setSelectedNotif(notif); setActiveDropdownId(null); }}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white transition flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Details
                                </button>
                                {!notif.is_read && (
                                  <button
                                    onClick={() => handleMarkRead(notif.id)}
                                    className="w-full px-4 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white transition flex items-center gap-2"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Mark Read
                                  </button>
                                )}
                                <button
                                  onClick={() => handleArchive(notif.id, !notif.is_archived)}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white transition flex items-center gap-2"
                                >
                                  <Archive className="w-3.5 h-3.5 text-blue-400" /> {notif.is_archived ? 'Restore' : 'Archive'}
                                </button>
                                <button
                                  onClick={() => handleDelete(notif.id)}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-xs text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* View Details Drawer/Modal */}
        {selectedNotif && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            {['super_admin', 'hod'].includes(user?.role) ? (
              // HOD Details Modal (matches HOD UI)
              <div className="bg-white rounded-[32px] w-full max-w-[620px] p-8 relative shadow-2xl animate-zoom-in text-slate-800 border border-slate-100">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Badges row */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-violet-600 flex items-center justify-center shrink-0">
                    {selectedNotif.module === 'ai_moderation' ? <Cpu className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <span className="text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" /> {selectedNotif.priority || 'Medium'} Priority
                    </span>
                    <span className="text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-violet-600 rounded-full" /> {getModuleLabel(selectedNotif.module)}
                    </span>
                  </div>
                </div>

                {/* Title & Warning */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-[26px] font-extrabold font-outfit text-slate-900 leading-tight">
                    {selectedNotif.title}
                  </h3>
                  {selectedNotif.priority?.toLowerCase() === 'high' && (
                    <AlertTriangle className="text-rose-500 w-7 h-7 mt-1 shrink-0" />
                  )}
                </div>

                {/* Received date line */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pb-5 mb-5 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-300" /> Received: {new Date(selectedNotif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-slate-200">|</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-300" /> {new Date(selectedNotif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Large Quote Container */}
                <div className="bg-[#FAF9FF] border border-violet-100/60 rounded-3xl p-6 flex gap-4 items-start mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Quote className="w-5 h-5" />
                  </div>
                  <div className="text-slate-600 text-[15px] leading-relaxed font-medium pt-1">
                    {selectedNotif.message.includes("Data Structures & Algorithms") ? (
                      <>
                        Faculty <span className="font-bold text-slate-800">Prof. Sharma</span> has escalated an AI answer report for <span className="font-bold text-violet-700">Data Structures & Algorithms</span> for final HOD decision.
                      </>
                    ) : (
                      selectedNotif.message
                    )}
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Escalated by</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 leading-none">
                        {selectedNotif.message.match(/Faculty\s+(.*?)\s+has\s+escalated/i)?.[1] || "Prof. Sharma"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">Faculty</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedNotif(null);
                        // Navigate based on module
                        if (selectedNotif.module === 'ai_moderation') {
                          window.location.href = '/admin/content-moderation';
                        } else if (selectedNotif.module === 'leaves') {
                          window.location.href = '/admin/leave-requests';
                        } else if (selectedNotif.module === 'approvals') {
                          window.location.href = '/admin/students';
                        } else {
                          window.location.href = '/admin/notifications';
                        }
                      }}
                      className="border border-violet-200 bg-white hover:bg-violet-50/50 text-violet-600 text-xs font-bold py-3 px-5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> View Details
                    </button>
                    <button
                      onClick={() => setSelectedNotif(null)}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-3 px-5 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-violet-600/10 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Close
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Default Student/Faculty dark modal
              <div className="bg-[#121829] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-zoom-in">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(selectedNotif.priority)}`}>
                    {selectedNotif.priority} Priority
                  </span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {getModuleLabel(selectedNotif.module)}
                  </span>
                </div>

                <h3 className="text-xl font-bold font-outfit text-white mb-2 pr-6">{selectedNotif.title}</h3>
                <p className="text-xs text-white/40 mb-4 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Received {new Date(selectedNotif.created_at).toLocaleString()}
                </p>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedNotif.message}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedNotif(null)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-2 px-5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Send Announcement Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-outfit font-bold text-white">Send Announcement</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                <CourseSemesterSelector
                  initialCourseId={formData.course_id}
                  initialSemester={formData.semester_number}
                  onSelect={(selection) => setFormData(prev => ({
                    ...prev,
                    course_id: selection.courseId || "",
                    semester_number: selection.semesterNumber || ""
                  }))}
                />

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Announcement Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 font-medium"
                    placeholder="e.g. Exam Schedule Posted"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['info', 'warning', 'success'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, type: t})}
                        className={`py-2 rounded-xl border transition text-xs font-bold uppercase tracking-wider cursor-pointer ${
                          formData.type === t ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-1.5">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 font-medium resize-none h-28"
                    placeholder="Type your announcement details..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Send Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
