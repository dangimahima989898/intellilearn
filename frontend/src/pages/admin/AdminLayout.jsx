import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  CalendarDays,
  Users,
  Bell,
  Menu,
  X,
  LogOut,
  GraduationCap
} from 'lucide-react'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Notes & Materials', path: '/admin/notes', icon: FileText },
    { name: 'Timetable', path: '/admin/timetable', icon: Calendar },
    { name: 'Events & Exams', path: '/admin/events', icon: CalendarDays },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
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
          <span className="text-[10px] text-brand font-semibold uppercase tracking-widest">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin'}
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
          <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center font-bold text-brand border border-navy-700">
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

      {/* Mobile Sidebar (Slide-in) */}
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
        {/* Mobile Top Bar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-navy-800 bg-navy-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand" />
            <span className="font-outfit font-bold text-lg text-white">IntelliLearn Admin</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="text-navy-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
