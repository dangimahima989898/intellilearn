import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
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
  Bell,
  GraduationCap
} from 'lucide-react'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await requestNotificationPermission();
      if (token) {
        try {
          await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/update-fcm-token`, 
            { fcm_token: token }, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Home', path: '/student', icon: LayoutDashboard },
    { name: 'My Notes', path: '/student/notes', icon: BookOpen },
    { name: 'AI Tutor', path: '/student/chatbot', icon: Bot },
    { name: 'Question Gen', path: '/student/questions', icon: Zap },
    { name: 'Adaptive Quiz', path: '/student/quiz', icon: Target },
    { name: 'Daily Challenge', path: '/student/challenge', icon: Trophy },
    { name: 'Doubt Board', path: '/student/doubts', icon: MessageCircle },
    { name: 'My Progress', path: '/student/progress', icon: TrendingUp },
    { name: 'Timetable', path: '/student/timetable', icon: Calendar },
    { name: 'Events', path: '/student/events', icon: CalendarDays },
  ]

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-navy-950 border-r border-navy-800 text-white w-64 shrink-0">
      <div className="p-6 border-b border-navy-800 flex items-center gap-3">
        <div className="bg-brand/10 p-2 rounded-lg border border-brand/20">
          <GraduationCap className="w-6 h-6 text-brand" />
        </div>
        <div>
          <span className="font-outfit font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400 block">
            IntelliLearn
          </span>
          <span className="text-[10px] text-brand font-semibold uppercase tracking-widest">Student Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/student'}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-navy-800 bg-navy-950/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand border border-brand/30">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-navy-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900 font-dm">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative w-64 flex-1 h-full animate-slide-in">
            <button 
              className="absolute top-4 right-[-48px] p-2 bg-navy-800 text-white rounded-full border border-navy-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 lg:px-8 lg:py-4 border-b border-navy-800 bg-navy-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-navy-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-white font-semibold font-outfit">IntelliLearn</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="text-lg">🔥</span>
              <span className="text-orange-500 font-bold text-sm">{user?.streak_count || 0} Day Streak</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
