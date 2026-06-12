import { useState, useEffect } from 'react'
import { Bell, Send, Trash2, X, Filter, Info, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'
import CourseSemesterSelector from '../../components/CourseSemesterSelector'
import api from '../../services/api'

export default function NotificationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    course_id: '',
    semester_number: ''
  })

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.get('/notifications/mine')
      
      const formatted = response.data.notifications.map(notif => {
        let type = 'info'
        let message = notif.body
        try {
          const parsed = JSON.parse(notif.body)
          type = parsed.type || 'info'
          message = parsed.message || notif.body
        } catch (e) {
          // Fallback parsing for legacy text formats
          const lowerTitle = notif.title.toLowerCase()
          const lowerBody = notif.body.toLowerCase()
          if (lowerTitle.includes('maintenance') || lowerBody.includes('maintenance') || lowerBody.includes('down')) {
            type = 'warning'
          } else if (lowerTitle.includes('update') || lowerBody.includes('success')) {
            type = 'success'
          }
        }

        return {
          id: notif.id,
          title: notif.title,
          message: message,
          type: type,
          date: getTimeAgo(notif.sent_at)
        }
      })
      setNotifications(formatted)
    } catch (err) {
      console.error("Failed to load notifications", err)
      toast.error("Failed to load notifications history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
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
      toast.success("Notification sent successfully!")
      setIsModalOpen(false)
      setFormData({ title: '', message: '', type: 'info', course_id: '', semester_number: '' })
      fetchNotifications()
    } catch (err) {
      console.error("Failed to send notification", err)
      const msg = err.response?.data?.detail || "Failed to send notification"
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success("Notification deleted successfully")
    } catch (err) {
      console.error("Failed to delete notification", err)
      toast.error("Failed to delete notification")
    }
  }

  const getTypeStyle = (type) => {
    switch(type) {
      case 'warning': return { bg: 'bg-orange-500/10', color: 'text-orange-400', border: 'border-orange-500/20', icon: AlertTriangle }
      case 'success': return { bg: 'bg-emerald-500/10', color: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle }
      default: return { bg: 'bg-blue-500/10', color: 'text-blue-400', border: 'border-blue-500/20', icon: Info }
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
    <PageWrapper>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-white/50 text-sm mt-1">Manage global announcements</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          Send Notification
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-3" />
            <span>Loading notifications history...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-12 text-center text-white/30">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No active notifications</p>
          </div>
        ) : (
          notifications.map(notif => {
            const style = getTypeStyle(notif.type)
            return (
              <div key={notif.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:bg-white/[0.07] transition-all group relative">
                <div className={`p-3 rounded-xl ${style.bg} ${style.color}`}>
                  <style.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg">{notif.title}</h3>
                    <span className="text-[10px] text-white/30 font-medium">{notif.date}</span>
                  </div>
                  <p className="text-white/60 text-sm">{notif.message}</p>
                </div>
                <div className="absolute top-5 right-5 lg:relative lg:top-0 lg:right-0">
                  <button 
                    onClick={() => handleDelete(notif.id)}
                    className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-outfit font-bold text-white">Send Announcement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      className={`py-2.5 rounded-xl border-2 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer ${
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
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 font-medium resize-none h-32"
                  placeholder="Type your message to all students..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen ? setIsOpen(false) : setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
