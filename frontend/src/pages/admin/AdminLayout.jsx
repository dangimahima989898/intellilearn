import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  CalendarDays,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  UserCheck,
  MessageCircle,
  Sparkles,
  Trash2
} from 'lucide-react'
import NotificationBell from '../../components/NotificationBell'
import AdminChatbotWidget from '../../components/AdminChatbotWidget'
import api from '../../services/api'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch pending access requests count for sidebar badge
  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const fetchPendingRequestsCount = async () => {
      try {
        const response = await api.get('/api/admin/access-requests?status=pending')
        setPendingCount(response.data.length)
      } catch (err) {
        console.warn("Failed to fetch pending requests count", err)
      }
    }

    fetchPendingRequestsCount()
    const interval = setInterval(fetchPendingRequestsCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Close mobile sidebar drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin', exact: true },
    { name: 'Subjects', icon: BookOpen, path: '/admin/subjects' },
    { name: 'Notes & Materials', icon: FileText, path: '/admin/notes' },
    { name: 'Timetable', icon: Calendar, path: '/admin/timetable' },
    { name: 'Events & Exams', icon: CalendarDays, path: '/admin/events' },
    { name: 'Students', icon: Users, path: '/admin/students' },
    { name: 'Doubt Board', icon: MessageCircle, path: '/admin/doubts' },
    { name: 'Access Requests', icon: UserCheck, path: '/admin/requests' },
    { name: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { name: 'Archive / Trash', icon: Trash2, path: '/admin/archive' },
  ]


  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Dashboard'
    if (location.pathname.startsWith('/admin/doubts')) return 'Doubt Board'
    const item = navItems.find((nav) => !nav.exact && location.pathname.startsWith(nav.path))
    if (item) return item.name
    return 'Admin Panel'
  }

  // Strip honorary titles (Dr, Prof, Mr, Mrs, Ms) from display name
  const stripTitle = (name) => {
    if (!name) return ''
    return name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').trim()
  }

  const getInitials = (name) => {
    const clean = stripTitle(name)
    if (!clean) return 'AD'
    return clean.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A]">
      {/* Logo section */}
      <div className="p-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo icon — always-visible gradient circle */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-outfit font-extrabold text-white leading-tight tracking-tight">IntelliLearn</span>
            <span className="text-[10px] text-white/40 font-medium">MLSU · Udaipur</span>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-[#8B5CF6]/15 text-[#8B5CF6] text-[10px] px-2.5 py-1 rounded-full font-bold border border-[#8B5CF6]/20">
          <Sparkles className="w-3 h-3" />
          Admin Panel
        </div>
      </div>

      {/* Nav section */}
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/25 font-semibold'
                  : 'text-white/50 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.name === 'Access Requests' && pendingCount > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm shadow-blue-500/30">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}

        {/* Divider line before logout */}
        <div className="mt-auto border-t border-white/10 pt-4" />
      </nav>

      {/* Bottom Profile section */}
      <div className="p-4 border-t border-white/10 shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#8B5CF6]/30 rounded-full flex items-center justify-center text-[#8B5CF6] font-bold text-sm shrink-0">
          {getInitials(user?.name)}
        </div>
        <div className="flex flex-col min-w-0 pr-1 flex-1">
          <span className="text-white text-sm font-medium truncate">
            {stripTitle(user?.name) || 'Admin'}
          </span>
          <span className="text-white/40 text-xs truncate">
            {user?.email || 'admin@mlsu.ac.in'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/40 hover:text-red-400 transition-colors p-2 rounded-lg"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0A0F1E] overflow-hidden font-dm">
      
      {/* Desktop Sidebar (fixed left, w-64) */}
      <aside className="hidden lg:block w-64 h-screen border-r border-white/10 shrink-0 fixed top-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Main Content Wrapper (shifted left on desktop to accommodate fixed sidebar) */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        
        {/* TopBar (h-16, fixed top-right, background backdrop blur) */}
        <header className="h-16 bg-[#0F172A]/80 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setIsOpen(true)}
              className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-white font-outfit font-semibold text-lg">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Separator */}
            <div className="w-px h-6 bg-white/10" />

            {/* Admin name + badge */}
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline text-white/80 text-sm font-medium">
                {stripTitle(user?.name) || 'Admin'}
              </span>
              {user?.role && String(user?.role).toLowerCase() !== String(stripTitle(user?.name)).toLowerCase() && (
                <span className="bg-[#EEEDFE] text-[#3C3489] text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize border border-[#3C3489]/20">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* MOBILE SIDEBAR DRAWER (Translate slide animation) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <aside className={`relative w-64 max-w-xs h-full bg-[#0F172A] border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Floating Admin AI Chatbot Widget */}
      <AdminChatbotWidget />

    </div>
  )
}
