import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  GraduationCap, LayoutDashboard, BookOpen, Calendar, Users, Bell,
  LogOut, Menu, X, Sun, Moon, UserCheck, Sparkles, Archive, BarChart3,
  FolderOpen, ClipboardList, Send, Clock, Shield, Building, ChevronDown,
  BookMarked, PanelLeftClose, PanelLeftOpen, FileText, MessageSquare
} from 'lucide-react'
import NotificationBell from '../../components/NotificationBell'
import api from '../../services/api'

// ─── Nav group definitions ──────────────────────────────────────────────────
function buildNavGroups(role, badgeCounts = {}) {
  const pendingCount = badgeCounts.students || 0
  const leaveCount = badgeCounts.leaves || 0
  const doubtsCount = badgeCounts.doubts || 0
  const aiCount = badgeCounts.aiReports || 0
  const notificationCount = badgeCounts.notifications || 0

  if (role === 'faculty') {
    return [
      {
        id: 'main', label: 'Overview', icon: LayoutDashboard,
        items: [{ name: 'Faculty Dashboard', icon: LayoutDashboard, path: '/admin', exact: true }]
      },
      {
        id: 'my-work', label: 'Teaching', icon: BookOpen,
        items: [
          { name: 'My Subjects', icon: BookOpen, path: '/admin/my-subjects' },
          { name: 'My Schedule', icon: Calendar, path: '/admin/my-schedule' },
          { name: 'Notes & Materials', icon: FileText, path: '/admin/notes' },
          { name: 'Doubt Board', icon: MessageSquare, path: '/admin/doubts', badge: doubtsCount },
          { name: 'AI Answer Review', icon: Shield, path: '/admin/ai-answer-review', badge: aiCount },
          { name: 'Quiz Analytics', icon: BarChart3, path: '/admin/quiz-analytics' },
          { name: 'Announcements', icon: Bell, path: '/admin/notifications', badge: notificationCount },
        ]
      },
      {
        id: 'leave', label: 'Leave', icon: Send,
        items: [
          { name: 'Apply Leave', icon: Send,  path: '/admin/apply-leave' },
          { name: 'Leave Status', icon: Clock, path: '/admin/leave-status' },
        ]
      }
    ]
  }
  return [
    {
      id: 'dashboard', label: 'Overview', icon: LayoutDashboard,
      items: [{ name: 'Dashboard', icon: LayoutDashboard, path: '/admin', exact: true }]
    },
    {
      id: 'academic', label: 'Academic Management', icon: BookMarked,
      items: [
        { name: 'Department Management', icon: Building,   path: '/admin/departments' },
        { name: 'Subject Management',    icon: FolderOpen, path: '/admin/subjects' },
        { name: 'Schedule Manager',      icon: Calendar,   path: '/admin/schedule' },
      ]
    },
    {
      id: 'people', label: 'People', icon: Users,
      items: [
        { name: 'Students',           icon: Users,         path: '/admin/students', badge: pendingCount },
        { name: 'Faculty Management', icon: UserCheck,     path: '/admin/faculty' },
        { name: 'Leave Requests',     icon: ClipboardList, path: '/admin/leave-requests', badge: leaveCount },
        { name: 'Doubt Board',        icon: MessageSquare, path: '/admin/doubts', badge: doubtsCount },
      ]
    },
    {
      id: 'system', label: 'Content & System', icon: Shield,
      items: [
        { name: 'Escalated AI Reports', icon: Shield,    path: '/admin/content-moderation', badge: aiCount },
        { name: 'System Notifications', icon: Bell,      path: '/admin/notifications', badge: notificationCount },
        { name: 'Dept. Analytics',      icon: BarChart3, path: '/admin/quiz-analytics' },
        { name: 'Archive',              icon: Archive,   path: '/admin/archive' },
      ]
    }
  ]
}

// ─── NavGroup ───────────────────────────────────────────────────────────────
function NavGroup({ group, isExpanded, onToggle, collapsed, location }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const hasActive = group.items.some(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  )

  const groupBtnStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 8,
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '8px' : '7px 10px',
    borderRadius: 10,
    background: hasActive
      ? (isLight ? 'var(--color-primary-hover)' : 'var(--color-primary-hover)')
      : 'transparent',
    color: hasActive
      ? (isLight ? 'var(--color-primary)' : 'var(--color-primary-light)')
      : (isLight ? '#4B5563' : 'rgba(255,255,255,0.45)'),
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.15s',
    textAlign: 'left',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={onToggle}
        style={groupBtnStyle}
        title={collapsed ? group.label : undefined}
        onMouseEnter={e => {
          if (!hasActive) {
            e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = isLight ? '#5A6AE8' : 'rgba(255,255,255,0.8)'
          }
        }}
        onMouseLeave={e => {
          if (!hasActive) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = isLight ? '#64748B' : 'rgba(255,255,255,0.45)'
          }
        }}
      >
        {hasActive && (
          <span style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 18, background: 'var(--color-primary)', borderRadius: '0 3px 3px 0'
          }} />
        )}
        <group.icon style={{ width: 15, height: 15, flexShrink: 0 }} />
        {!collapsed && (
          <>
            <span style={{
              flex: 1, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {group.label}
            </span>
            <ChevronDown style={{
              width: 13, height: 13, flexShrink: 0,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} />
          </>
        )}
      </button>

      {/* Expanded items */}
      {!collapsed && (
        <div style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? 400 : 0,
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 0.22s ease, opacity 0.18s ease',
        }}>
          <div style={{ paddingLeft: 10, paddingRight: 4, paddingTop: 2, paddingBottom: 4 }}>
            {group.items.map(item => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    textDecoration: 'none', marginBottom: 2,
                    fontSize: 12, fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? (isLight ? 'var(--color-primary)' : 'var(--color-primary-light)')
                      : (isLight ? '#4B5563' : 'rgba(255,255,255,0.5)'),
                    background: isActive
                      ? (isLight ? 'var(--color-primary-hover)' : 'var(--color-primary-hover)')
                      : 'transparent',
                    border: isActive
                      ? (isLight ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid rgba(124, 58, 237, 0.3)')
                      : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.color = isLight ? '#5A6AE8' : 'rgba(255,255,255,0.85)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = isLight ? '#64748B' : 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  <item.icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  {item.badge > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700,
                      padding: '1px 5px', borderRadius: 999, minWidth: 16, textAlign: 'center'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      )}

      {/* Icon-only mode items */}
      {collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 2 }}>
          {group.items.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.name}
                to={item.path}
                title={item.name}
                style={{
                  position: 'relative',
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, textDecoration: 'none',
                  color: isActive
                    ? (isLight ? 'var(--color-primary)' : 'var(--color-primary-light)')
                    : (isLight ? '#4B5563' : 'rgba(255,255,255,0.38)'),
                  background: isActive
                    ? (isLight ? 'var(--color-primary-hover)' : 'var(--color-primary-hover)')
                    : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.color = isLight ? '#5A6AE8' : 'rgba(255,255,255,0.85)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = isLight ? '#64748B' : 'rgba(255,255,255,0.38)'
                  }
                }}
              >
                <item.icon style={{ width: 15, height: 15 }} />
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#EF4444', color: '#fff', fontSize: 8, fontWeight: 700,
                    width: 14, height: 14, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar inner ──────────────────────────────────────────────────────────
function SidebarInner({ user, navGroups, collapsed, isMobile, expandedGroups, toggleGroup, location, onCollapse, handleLogout, stripTitle, getInitials }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const sidebarBg = isLight ? '#FFFFFF' : '#0F172A'
  const logoText = isLight ? '#1E293B' : '#FFFFFF'
  const logoSub = isLight ? '#64748B' : 'rgba(255,255,255,0.3)'
  const collapseBtn = isLight ? '#64748B' : 'rgba(255,255,255,0.22)'
  const collapseBtnHover = isLight ? '#5A6AE8' : 'rgba(255,255,255,0.7)'
  const borderCol = isLight ? '#D9E1FF' : 'rgba(255,255,255,0.08)'
  const portalBg = isLight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(124, 58, 237, 0.18)'
  const portalText = isLight ? 'var(--color-primary)' : 'var(--color-primary-light)'
  const portalBorder = isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.3)'

  return (
    <div style={{
      width: '100%', height: '100%',
      backgroundColor: sidebarBg,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed && !isMobile ? '14px 8px 12px' : '14px 14px 12px',
        borderBottom: `1px solid ${borderCol}`,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start'
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
          }}>
            <GraduationCap style={{ width: 17, height: 17, color: '#fff' }} />
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: logoText, fontWeight: 800, fontSize: 14, lineHeight: 1.2,
                fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                IntelliLearn
              </div>
              <div style={{ color: logoSub, fontSize: 10, fontWeight: 500, marginTop: 1 }}>
                MLSU · Udaipur
              </div>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={onCollapse}
              title={collapsed ? 'Expand' : 'Collapse'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: collapseBtn, padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 'auto', flexShrink: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = collapseBtnHover}
              onMouseLeave={e => e.currentTarget.style.color = collapseBtn}
            >
              {collapsed
                ? <PanelLeftOpen style={{ width: 15, height: 15 }} />
                : <PanelLeftClose style={{ width: 15, height: 15 }} />
              }
            </button>
          )}
        </div>

        {(!collapsed || isMobile) && (
          <div style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
            background: portalBg, color: portalText,
            fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
            border: `1px solid ${portalBorder}`,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {user?.role ? user.role.replace('_', ' ') : 'Admin'} Portal
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: collapsed && !isMobile ? '10px 6px' : '10px 8px',
        scrollbarWidth: 'none',
      }}>
        {navGroups.map(group => (
          <NavGroup
            key={group.id}
            group={group}
            isExpanded={expandedGroups.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            collapsed={collapsed && !isMobile}
            location={location}
          />
        ))}
      </nav>

      {/* Profile */}
      <div style={{
        borderTop: `1px solid ${borderCol}`,
        padding: collapsed && !isMobile ? '10px 6px' : '12px 14px',
        display: 'flex', alignItems: 'center',
        gap: collapsed && !isMobile ? 0 : 12,
        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
        flexShrink: 0,
        flexDirection: collapsed && !isMobile ? 'column' : 'row',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isLight ? 'var(--color-primary-hover)' : 'var(--color-primary-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isLight ? 'var(--color-primary)' : 'var(--color-primary-light)', fontWeight: 700, fontSize: 12,
        }}>
          {getInitials(user?.name)}
        </div>
        {(!collapsed || isMobile) && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: logoText, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stripTitle(user?.name) || 'Admin'}
            </div>
            <div style={{ color: logoSub, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'admin@mlsu.ac.in'}
            </div>
          </div>
        )}
        {(!collapsed || isMobile) && (
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: logoSub, padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = logoSub; e.currentTarget.style.background = 'none' }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── AdminLayout ────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState({
    students: 0,
    leaves: 0,
    doubts: 0,
    aiReports: 0,
    notifications: 0
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sb_collapsed') === 'true' } catch { return false }
  })

  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      const s = localStorage.getItem('sb_groups')
      if (s) return JSON.parse(s)
    } catch {}
    return ['dashboard', 'academic', 'people', 'system', 'main', 'my-work', 'leave']
  })

  const navGroups = buildNavGroups(user?.role || 'faculty', badgeCounts)

  useEffect(() => {
    try { localStorage.setItem('sb_collapsed', String(sidebarCollapsed)) } catch {}
  }, [sidebarCollapsed])

  useEffect(() => {
    try { localStorage.setItem('sb_groups', JSON.stringify(expandedGroups)) } catch {}
  }, [expandedGroups])

  useEffect(() => {
    navGroups.forEach(g => {
      const active = g.items.some(item =>
        item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
      )
      if (active) setExpandedGroups(prev => prev.includes(g.id) ? prev : [...prev, g.id])
    })
  }, [location.pathname])

  const toggleGroup = id =>
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])

  const fetchBadgeCounts = async () => {
    if (!user) return
    try {
      // 1. Pending Students (Admin/HOD only)
      const fetchStudents = async () => {
        if (['super_admin', 'hod'].includes(user.role)) {
          const r = await api.get('/api/admin/access-requests?status=pending')
          return r.data.length
        }
        return 0
      }

      // 2. Pending Leaves (HOD/Admin only)
      const fetchLeaves = async () => {
        if (['super_admin', 'hod'].includes(user.role)) {
          const r = await api.get('/api/v1/hod/leave/pending')
          return r.data.length
        }
        return 0
      }

      // 3. Unresolved Doubts
      const fetchDoubts = async () => {
        const r = await api.get('/doubts?is_resolved=false')
        return r.data.length
      }

      // 4. Flagged AI Reports (Faculty) / Flagged Answers (HOD)
      const fetchAIReports = async () => {
        if (user.role === 'faculty') {
          const r = await api.get('/api/faculty/ai-reports')
          return r.data.filter(report => report.status === 'pending').length
        } else if (['super_admin', 'hod'].includes(user.role)) {
          const r = await api.get('/api/hod/escalated-ai-reports')
          return r.data.filter(report => report.status === 'escalated' || report.status === 'pending').length
        }
        return 0
      }

      // 5. Unread Notifications
      const fetchNotifications = async () => {
        const r = await api.get('/notifications/mine')
        return r.data.unread_count || 0
      }

      const [students, leaves, doubts, aiReports, notifications] = await Promise.all([
        fetchStudents().catch(() => 0),
        fetchLeaves().catch(() => 0),
        fetchDoubts().catch(() => 0),
        fetchAIReports().catch(() => 0),
        fetchNotifications().catch(() => 0),
      ])

      setBadgeCounts({ students, leaves, doubts, aiReports, notifications })
    } catch (err) {
      console.warn("Failed to fetch badge counts", err)
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
      // Trigger instant update for any incoming real-time notifications or updates
      fetchBadgeCounts()
    }
    window.addEventListener('ws-message', handleUpdate)
    window.addEventListener('badge-update', handleUpdate)
    return () => {
      window.removeEventListener('ws-message', handleUpdate)
      window.removeEventListener('badge-update', handleUpdate)
    }
  }, [user])

  useEffect(() => { setIsMobileOpen(false) }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }
  const stripTitle = name => name ? name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').trim() : ''
  const getInitials = name => {
    const c = stripTitle(name)
    if (!c) return 'AD'
    return c.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Dashboard'
    if (location.pathname.startsWith('/admin/doubts')) return 'Doubt Board'
    for (const g of navGroups) {
      const item = g.items.find(nav => !nav.exact && location.pathname.startsWith(nav.path))
      if (item) return item.name
    }
    return 'Admin Panel'
  }

  const isLight = theme === 'light'
  const SIDEBAR_W = sidebarCollapsed ? 64 : 256
  const sharedProps = { user, navGroups, expandedGroups, toggleGroup, location, handleLogout, stripTitle, getInitials }

  return (
    <>
      {/* Global layout styles */}
      <style>{`
        #admin-root { display: flex; height: 100vh; background: ${isLight ? '#F1F5F9' : '#0A0F1E'}; overflow: clip; font-family: 'DM Sans', sans-serif; }
        #admin-sidebar { position: fixed; top: 0; left: 0; z-index: 30; height: 100vh; background: ${isLight ? '#FFFFFF' : '#0F172A'}; border-right: 1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}; overflow: hidden; transition: width 0.28s cubic-bezier(0.4,0,0.2,1); display: none; }
        #admin-content { flex: 1; display: flex; flex-direction: column; overflow: visible; transition: margin-left 0.28s cubic-bezier(0.4,0,0.2,1); }
        #admin-topbar { height: 64px; flex-shrink: 0; background: ${isLight ? '#FFFFFF' : '#0F172A'}; border-bottom: 1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 20; }
        @media (min-width: 1024px) {
          #admin-sidebar { display: flex; }
        }
        nav::-webkit-scrollbar { display: none; }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      <div id="admin-root" className={isLight ? 'light-theme' : ''} style={{ '--sidebar-w': `${SIDEBAR_W}px` }}>

        {/* Desktop Sidebar */}
        <aside id="admin-sidebar" style={{ width: SIDEBAR_W }}>
          <SidebarInner
            {...sharedProps}
            collapsed={sidebarCollapsed}
            isMobile={false}
            onCollapse={() => setSidebarCollapsed(p => !p)}
          />
        </aside>

        {/* Content */}
        <div id="admin-content" className="admin-content-area">
          <style>{`#admin-content.admin-content-area { margin-left: 0; } @media (min-width: 1024px) { #admin-content.admin-content-area { margin-left: ${SIDEBAR_W}px; } } .hamburger-btn { display: flex; } @media (min-width: 1024px) { .hamburger-btn { display: none !important; } }`}</style>

          {/* TopBar */}
          <header id="admin-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setIsMobileOpen(true)}
                className="hamburger-btn"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isLight ? '#4B5563' : 'rgba(255,255,255,0.6)', padding: 4, borderRadius: 8, alignItems: 'center'
                }}
              >
                <Menu style={{ width: 20, height: 20 }} />
              </button>
              <h1 style={{ color: isLight ? '#1E293B' : '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 16, margin: 0 }}>
                {getPageTitle()}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.1)',
                  background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)', cursor: 'pointer',
                  color: isLight ? '#4B5563' : 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {theme === 'dark' ? <Sun style={{ width: 14, height: 14 }} /> : <Moon style={{ width: 14, height: 14 }} />}
              </button>

              <NotificationBell />

              <div style={{ width: 1, height: 20, background: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: isLight ? '#1E293B' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>
                  {stripTitle(user?.name) || 'Admin'}
                </span>
                {user?.role && (
                  <span style={{
                    background: isLight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(124, 58, 237, 0.18)',
                    color: isLight ? 'var(--color-primary)' : 'var(--color-primary-light)',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.3)'}`,
                    textTransform: 'capitalize',
                    letterSpacing: '0.03em'
                  }}>
                    {user.role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Main page content */}
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'visible', padding: 24 }}>
            <Outlet />
          </main>
        </div>

        {/* Mobile Drawer */}
        {isMobileOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsMobileOpen(false)}
            />
            <aside style={{
              position: 'relative', zIndex: 10, height: '100%',
              background: isLight ? '#FFFFFF' : '#0F172A',
              borderRight: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: '6px 0 32px rgba(0,0,0,0.5)',
              width: 256,
              animation: 'slideInLeft 0.24s ease-out',
            }}>
              <button
                onClick={() => setIsMobileOpen(false)}
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  background: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)', 
                  border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, cursor: 'pointer', 
                  color: isLight ? '#4B5563' : 'rgba(255,255,255,0.5)',
                  padding: 6, display: 'flex', alignItems: 'center',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
              <SidebarInner {...sharedProps} collapsed={false} isMobile={true} onCollapse={() => {}} />
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
