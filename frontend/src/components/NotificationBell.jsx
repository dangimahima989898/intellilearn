import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, X, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const parseBody = (body) => {
    try {
      const parsed = JSON.parse(body)
      return parsed.message || body
    } catch (e) {
      return body
    }
  }

  const parseType = (body) => {
    try {
      const parsed = JSON.parse(body)
      return parsed.type || 'info'
    } catch (e) {
      return 'info'
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/mine');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.warn("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const diff = (new Date() - date) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getTypeAccent = (type) => {
    switch(type) {
      case 'warning': return 'border-l-orange-400';
      case 'success': return 'border-l-emerald-400';
      default: return 'border-l-blue-400';
    }
  }

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all duration-200 ${
          isLight 
            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' 
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 text-[9px] font-bold text-white flex items-center justify-center px-0.5 animate-pulse ${
            isLight ? 'border-white' : 'border-[#0F172A]'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          data-notif-panel 
          className={`absolute right-0 mt-2 w-[340px] max-h-[420px] rounded-2xl z-50 flex flex-col overflow-hidden animate-fade-in ${
            isLight 
              ? 'bg-white border border-slate-200 shadow-xl shadow-slate-200/50' 
              : 'bg-[#1E293B] border border-white/15 shadow-2xl shadow-black/50'
          }`}
        >
          
          {/* Header */}
          <div className={`px-4 py-3 flex justify-between items-center flex-shrink-0 ${
            isLight 
              ? 'border-b border-slate-100 bg-slate-50/80' 
              : 'border-b border-white/10 bg-white/5'
          }`}>
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-violet-400'}`} />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className={`text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                    isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`transition-colors p-1 ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/40 hover:text-white'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <BellOff className={`w-8 h-8 mx-auto mb-3 ${isLight ? 'text-slate-300' : 'text-white/20'}`} />
                <p className={`text-sm font-medium ${isLight ? 'text-slate-500' : 'text-white/40'}`}>No notifications yet</p>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-white/25'}`}>You'll see updates here</p>
              </div>
            ) : (
              <ul className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
                {notifications.map(notif => {
                  const type = parseType(notif.body)
                  const message = parseBody(notif.body)
                  return (
                    <li 
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                      className={`px-4 py-3.5 cursor-pointer transition-all border-l-4 ${
                        isLight 
                          ? !notif.is_read 
                            ? `${getTypeAccent(type)} bg-blue-50/40 hover:bg-blue-50/70` 
                            : 'border-l-transparent hover:bg-slate-50'
                          : !notif.is_read 
                            ? `${getTypeAccent(type)} bg-white/[0.04] hover:bg-white/5` 
                            : 'border-l-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className={`text-sm leading-snug flex-1 ${
                          isLight 
                            ? !notif.is_read ? 'text-slate-900 font-semibold' : 'text-slate-600'
                            : !notif.is_read ? 'text-white font-semibold' : 'text-white/70'
                        }`}>
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.is_read && (
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isLight ? 'bg-blue-600' : 'bg-blue-400'}`} />
                          )}
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${
                        isLight 
                          ? !notif.is_read ? 'text-slate-600' : 'text-slate-500'
                          : !notif.is_read ? 'text-white/70' : 'text-white/45'
                      }`}>
                        {message}
                      </p>
                      <div className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${
                        isLight ? 'text-slate-400' : 'text-white/35'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(notif.sent_at)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`px-4 py-2.5 flex-shrink-0 ${
              isLight 
                ? 'border-t border-slate-100 bg-slate-50/50' 
                : 'border-t border-white/10 bg-white/3'
            }`}>
              <button
                onClick={() => { setIsOpen(false); navigate('/admin/notifications'); }}
                className={`text-[11px] font-semibold transition-colors ${
                  isLight ? 'text-violet-600 hover:text-violet-700' : 'text-violet-400 hover:text-violet-300'
                }`}
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

}
