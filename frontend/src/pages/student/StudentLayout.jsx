import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { requestNotificationPermission, onForegroundMessage } from '../../config/firebase'
import NotificationBell from '../../components/NotificationBell'
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Zap,
  Target,
  Trophy,
  MessageCircle,
  TrendingUp,
  Calendar,
  CalendarDays,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  GraduationCap
} from 'lucide-react'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isAiTutorVisited, setIsAiTutorVisited] = useState(
    localStorage.getItem('aiTutorVisited') === 'true'
  )
  const [badgeCounts, setBadgeCounts] = useState({
    doubts: 0,
    notifications: 0
  })

  const fetchBadgeCounts = async () => {
    if (!user) return
    try {
      const fetchDoubts = async () => {
        const r = await api.get('/doubts?is_resolved=false')
        return r.data.length
      }
      const fetchNotifications = async () => {
        const r = await api.get('/notifications/mine')
        return r.data.unread_count || 0
      }
      const [doubts, notifications] = await Promise.all([
        fetchDoubts().catch(() => 0),
        fetchNotifications().catch(() => 0),
      ])
      setBadgeCounts({ doubts, notifications })
    } catch (err) {
      console.warn("Failed to fetch student badge counts", err)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    if (!user) return
    fetchBadgeCounts()
    const iv = setInterval(fetchBadgeCounts, 15000)
    return () => clearInterval(iv)
  }, [user, location.pathname])

  // Real-time WebSocket and local event listener
  useEffect(() => {
    if (!user) return
    const handleUpdate = () => {
      fetchBadgeCounts()
    }
    window.addEventListener('ws-message', handleUpdate)
    window.addEventListener('badge-update', handleUpdate)
    return () => {
      window.removeEventListener('ws-message', handleUpdate)
      window.removeEventListener('badge-update', handleUpdate)
    }
  }, [user])

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await requestNotificationPermission();
      if (token) {
        try {
          await api.put('/auth/update-fcm-token', { fcm_token: token });
        } catch(e) {
          console.warn("Failed to update FCM token", e);
        }
      }
    };
    setupNotifications();

    const unsubscribe = onForegroundMessage((payload) => {
      toast.success(`${payload.notification.title}\n${payload.notification.body}`, {
        duration: 5000,
        position: 'top-right',
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Set AI Tutor visited when user visits /student/chatbot
  useEffect(() => {
    if (location.pathname === '/student/chatbot') {
      localStorage.setItem('aiTutorVisited', 'true')
      setIsAiTutorVisited(true)
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Home', path: '/student', icon: LayoutDashboard, exact: true },
    { name: 'Notes & Summaries', path: '/student/notes', icon: BookOpen },
    { name: 'Practice Hub', path: '/student/practice', icon: Zap },
    { name: 'AI Tutor', path: '/student/chatbot', icon: Bot, badge: !isAiTutorVisited },
    { name: 'Doubt Board', path: '/student/doubts', icon: MessageCircle, badge: badgeCounts.doubts },
    { name: 'Schedule', path: '/student/schedule', icon: Calendar },
    { name: 'My Progress', path: '/student/progress', icon: TrendingUp },
  ]

  const getPageTitle = () => {
    const item = navItems.find((nav) => nav.path === location.pathname)
    if (item) return item.name
    if (location.pathname === '/student') return 'Home'
    return 'Student Hub'
  }

  const getInitials = (name) => {
    if (!name) return 'ST'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // ── SIDEBAR ───────────────────────────────────────────────
  const sidebarContent = (
    <div className={`flex flex-col h-full ${isLight ? 'bg-white' : 'bg-[#0F172A]'}`}>
      {/* Logo Section */}
      <div className={`p-6 shrink-0 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-[0_2px_8px_rgba(124,58,237,0.4)] shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className={`text-xl font-outfit font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>IntelliLearn</span>
        </div>
        <div className={`mt-2 inline-block text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full font-bold border ${
          isLight 
            ? 'bg-brand/10 text-brand border-brand/20' 
            : 'bg-brand/15 text-brand-light border-brand/25'
        }`}>
          Student Portal
        </div>
      </div>

      {/* Course Info Widget */}
      {user?.course_code && (
        <div className={`border rounded-xl p-3 mx-4 mt-4 mb-2 shrink-0 animate-fade-in ${
          isLight 
            ? 'bg-brand/5 border-brand/10' 
            : 'bg-brand/10 border-brand/15'
        }`}>
          <div className={`text-xs font-bold ${isLight ? 'text-brand' : 'text-brand-light'}`}>🎓 {user.course_code} — Sem {user.current_semester}</div>
          <div className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Enrollment: {user.enrollment_no || 'N/A'}</div>
          <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Section: {user.section || 'A'}</div>
        </div>
      )}

      {/* Nav Section */}
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer border relative ${
                isActive
                  ? isLight
                    ? 'bg-brand/10 text-brand border-brand/15 font-semibold animate-pulse-subtle'
                    : 'bg-brand/15 text-brand-light border-brand/25 font-semibold animate-pulse-subtle'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium border-transparent'
                    : 'text-white/50 hover:text-white hover:bg-white/5 font-medium border-transparent'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-brand rounded-r" />
              )}
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge !== false && (typeof item.badge === 'boolean' || item.badge > 0) && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse ${
                  isLight ? 'bg-teal-100 text-teal-700' : 'bg-teal-500/20 text-teal-300'
                }`}>
                  {typeof item.badge === 'boolean' ? 'New' : item.badge}
                </span>
              )}
            </NavLink>
          )
        })}

        {/* Bottom space divider */}
        <div className={`mt-auto border-t pt-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
      </nav>

      {/* Bottom Profile section */}
      <div className={`p-4 border-t shrink-0 flex items-center gap-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
          isLight ? 'bg-brand/10 text-brand' : 'bg-brand/20 text-brand-light'
        }`}>
          {getInitials(user?.name)}
        </div>
        <div className="flex flex-col min-w-0 pr-1 flex-1">
          <span className={`text-sm font-semibold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {user?.name || 'Student'}
          </span>
          <span className={`text-[10px] truncate ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
            {user?.email || 'you@example.com'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className={`transition-colors p-2 rounded-lg cursor-pointer ${
            isLight ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-white/40 hover:text-red-400 hover:bg-white/5'
          }`}
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const streakValue = user?.streak_count || 0

  return (
    <div id="student-root" className={`flex h-screen overflow-hidden font-dm ${isLight ? 'light-theme bg-slate-100' : 'bg-[#0A0F1E]'}`}>
      
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block w-64 h-screen border-r shrink-0 fixed top-0 left-0 z-30 ${
        isLight ? 'border-slate-200' : 'border-white/10'
      }`}>
        {sidebarContent}
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        
        {/* Top Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 z-20 shrink-0 backdrop-blur-sm ${
          isLight 
            ? 'bg-white/90 border-slate-200' 
            : 'bg-[#0F172A]/80 border-white/10'
        }`}>
          <div className="flex items-center gap-4">
            {/* Hamburger mobile toggle */}
            <button
              onClick={() => setIsOpen(true)}
              className={`lg:hidden p-1 rounded-lg transition-colors ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className={`font-outfit font-semibold text-lg ${isLight ? 'text-slate-800' : 'text-white'}`}>{getPageTitle()}</h1>
          </div>

          {/* Center: Streak widget */}
          <div className="flex-1 flex justify-center max-w-xs md:max-w-md">
            {streakValue > 0 ? (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold text-xs tracking-wide shrink-0 animate-bounce-subtle ${
                isLight 
                  ? 'bg-amber-50 text-amber-700 border-amber-300' 
                  : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
              }`}>
                <span className="animate-pulse">🔥</span>
                <span>{streakValue} Day Streak</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium text-xs shrink-0 ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white/40'
              }`}>
                <span>🔥 Start your streak!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell />

            <div className={`hidden md:block w-px h-5 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

            {/* Name label & Sem badge */}
            <div className="hidden md:flex items-center gap-2.5">
              <span className={`text-sm font-semibold truncate max-w-[100px] ${isLight ? 'text-slate-700' : 'text-white/70'}`}>
                {user?.name?.split(' ')[0] || 'Student'}
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${
                isLight 
                  ? 'bg-brand/10 text-brand border-brand/20' 
                  : 'bg-brand/15 text-brand-light border-brand/25'
              }`}>
                Student
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <aside className={`relative w-64 max-w-xs h-full border-r shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <button
              onClick={() => setIsOpen(false)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
                isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </div>
  )
}

function GraduationCapIcon(props) {
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
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}
