import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Send, Bot, Sparkles, Loader2, ChevronDown, User,
  RotateCcw, MessageSquare, Zap
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

const QUICK_PROMPTS = [
  { label: '📚 Add a subject', text: 'How do I add a new subject?' },
  { label: '👥 Bulk students', text: 'How to bulk upload students?' },
  { label: '🗓️ Timetable slot', text: 'How do I create a timetable slot?' },
  { label: '⬆️ Advance semester', text: 'What is the Advance Semester feature?' },
]

/* ── simple markdown formatter ─────────────────────────── */
function formatMarkdown(raw) {
  if (!raw) return ''
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.12);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.82em">$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/^• /gm, '&bull; ')
    .replace(/^- /gm, '&bull; ')
}

/* ── time label ─────────────────────────────────────────── */
const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function AdminChatbotWidget() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hi! I'm your **IntelliLearn Admin AI**.\n\nI can help you navigate the panel — adding subjects, managing students, timetable slots, events, and more.\n\nWhat do you need help with?",
      time: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 250)
  }, [isOpen])

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim()
    if (!trimmed || isLoading) return

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, time: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages
        .slice(-12)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      const { data } = await api.post('/chatbot/admin-chat', {
        message: trimmed,
        conversation_history: history,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response || 'Sorry, I could not generate a response. Please try again.',
          time: new Date(),
        },
      ])
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      let msg = 'Unable to connect. Please make sure the backend server is running.'
      if (status === 403) msg = 'Access denied. Admin role required for AI assistant.'
      else if (status === 429) msg = 'Too many requests. Please wait a moment and try again.'
      else if (detail) msg = detail

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: msg, time: new Date(), isError: true },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleClear = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: 'Chat cleared! How can I help you manage the IntelliLearn admin panel?',
      time: new Date(),
    }])
  }

  /* ── THEME TOKENS ─────────────────────────────────────── */
  const t = {
    panel:       dark ? '#0F172A'                          : '#FFFFFF',
    panelBorder: dark ? 'rgba(255,255,255,0.10)'          : 'rgba(99,102,241,0.18)',
    panelShadow: dark ? '0 24px 60px rgba(0,0,0,0.7)'    : '0 20px 60px rgba(99,102,241,0.18)',
    header:      dark ? 'rgba(139,92,246,0.12)'           : 'rgba(109,64,246,0.06)',
    headerBorder:dark ? 'rgba(255,255,255,0.08)'          : 'rgba(99,102,241,0.12)',
    msgArea:     dark ? 'transparent'                     : 'transparent',
    // bubbles
    botBg:       dark ? 'rgba(255,255,255,0.07)'          : '#F4F3FF',
    botBorder:   dark ? 'rgba(255,255,255,0.09)'          : 'rgba(99,102,241,0.15)',
    botText:     dark ? 'rgba(255,255,255,0.90)'          : '#1E1B4B',
    userBg:      '#6C4FF6',
    userText:    '#FFFFFF',
    errBg:       dark ? 'rgba(239,68,68,0.12)'            : '#FEF2F2',
    errBorder:   dark ? 'rgba(239,68,68,0.25)'            : '#FECACA',
    errText:     dark ? '#FCA5A5'                         : '#B91C1C',
    // meta text & dots
    meta:        dark ? 'rgba(255,255,255,0.28)'          : 'rgba(99,102,241,0.45)',
    // input area
    inputWrap:   dark ? 'rgba(255,255,255,0.05)'          : '#F8F7FF',
    inputBorder: dark ? 'rgba(255,255,255,0.10)'          : 'rgba(99,102,241,0.20)',
    inputText:   dark ? '#FFFFFF'                         : '#1E1B4B',
    inputPH:     dark ? 'rgba(255,255,255,0.28)'          : 'rgba(99,102,241,0.40)',
    inputFooter: dark ? 'rgba(255,255,255,0.12)'          : 'rgba(99,102,241,0.25)',
    // quick prompts
    chipBg:      dark ? 'rgba(255,255,255,0.05)'          : '#FFFFFF',
    chipBorder:  dark ? 'rgba(255,255,255,0.10)'          : 'rgba(99,102,241,0.20)',
    chipText:    dark ? 'rgba(255,255,255,0.55)'          : '#6C4FF6',
    chipHoverBg: dark ? 'rgba(99,102,241,0.15)'          : 'rgba(99,102,241,0.08)',
    // typing dots
    dot:         dark ? 'rgba(255,255,255,0.35)'          : 'rgba(99,102,241,0.45)',
    // title
    titleText:   dark ? '#FFFFFF'                         : '#1E1B4B',
    subText:     dark ? 'rgba(255,255,255,0.40)'          : 'rgba(99,102,241,0.60)',
    // header btn
    hBtn:        dark ? 'rgba(255,255,255,0.06)'          : 'rgba(99,102,241,0.08)',
    hBtnHov:     dark ? 'rgba(255,255,255,0.12)'          : 'rgba(99,102,241,0.15)',
    hBtnIcon:    dark ? 'rgba(255,255,255,0.45)'          : 'rgba(99,102,241,0.65)',
    // live badge
    liveBg:      dark ? 'rgba(16,185,129,0.15)'           : '#DCFCE7',
    liveText:    dark ? '#34D399'                         : '#15803D',
    liveDot:     dark ? '#34D399'                         : '#16A34A',
    // divider
    divider:     dark ? 'rgba(255,255,255,0.06)'          : 'rgba(99,102,241,0.08)',
    // avatar
    botAvatar:   'linear-gradient(135deg,#7C3AED,#4F46E5)',
    userAvatar:  'linear-gradient(135deg,#0EA5E9,#6366F1)',
    // FAB tooltip
    tipBg:       dark ? '#1E1B4B'                         : '#FFFFFF',
    tipBorder:   dark ? 'rgba(255,255,255,0.10)'          : 'rgba(99,102,241,0.20)',
    tipText:     dark ? '#FFFFFF'                         : '#1E1B4B',
  }

  const showQuickPrompts = messages.length <= 2 && !isLoading

  return (
    <>
      {/* ── INJECT SCOPED CSS ──────────────────────────────── */}
      <style>{`
        .acw-panel {
          transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1),
                      transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .acw-msgs::-webkit-scrollbar { width: 4px; }
        .acw-msgs::-webkit-scrollbar-track { background: transparent; }
        .acw-msgs::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 99px; }
        .acw-msg { animation: acwSlideUp 0.22s ease both; }
        @keyframes acwSlideUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .acw-dot-bounce {
          animation: acwDot 1.3s ease-in-out infinite;
        }
        @keyframes acwDot {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40% { transform:translateY(-5px); opacity:1; }
        }
        .acw-chip:hover { background:${t.chipHoverBg} !important; border-color: #6C4FF6 !important; color:#6C4FF6 !important; }
        .acw-hbtn:hover { background: ${t.hBtnHov} !important; }
        .acw-fab-ring { animation: acwPing 2s cubic-bezier(0,0,0.2,1) infinite; }
        @keyframes acwPing { 75%,100% { transform:scale(1.5); opacity:0; } }
        .acw-textarea { caret-color: #6C4FF6; }
        .acw-textarea::placeholder { color: ${t.inputPH}; }
        .acw-send:hover:not(:disabled) { background: linear-gradient(135deg,#5B3EE0,#3730A3) !important; transform: scale(1.07); }
        .acw-send:disabled { opacity:0.35 !important; cursor:not-allowed; }
      `}</style>

      {/* ── CHAT PANEL ────────────────────────────────────── */}
      <div
        className="acw-panel fixed bottom-24 right-5 z-50"
        style={{
          width: 'min(390px, calc(100vw - 24px))',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.panelBorder}`,
            borderRadius: 20,
            boxShadow: t.panelShadow,
            display: 'flex',
            flexDirection: 'column',
            height: 530,
            overflow: 'hidden',
          }}
        >
          {/* ── HEADER ──────────────────────────────────── */}
          <div style={{
            background: t.header,
            borderBottom: `1px solid ${t.headerBorder}`,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                flexShrink: 0,
              }}>
                <Bot size={17} color="#fff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: t.titleText }}>
                    Admin AI
                  </span>
                  {/* Live badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: t.liveBg, color: t.liveText,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                    padding: '2px 7px', borderRadius: 99,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.liveDot, display: 'inline-block', animation: 'acwPing 1.8s infinite' }} />
                    LIVE
                  </span>
                </div>
                <p style={{ fontSize: 10, color: t.subText, margin: 0, fontWeight: 500 }}>
                  IntelliLearn Assistant
                </p>
              </div>
            </div>

            {/* Header buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={handleClear}
                title="Clear chat"
                className="acw-hbtn"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none',
                  background: t.hBtn, color: t.hBtnIcon,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimise"
                className="acw-hbtn"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none',
                  background: t.hBtn, color: t.hBtnIcon,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <ChevronDown size={15} />
              </button>
            </div>
          </div>

          {/* ── MESSAGES ────────────────────────────────── */}
          <div
            className="acw-msgs"
            style={{
              flex: 1, overflowY: 'auto', padding: '16px 14px 8px',
              display: 'flex', flexDirection: 'column', gap: 14,
              background: t.msgArea,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="acw-msg"
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'assistant' ? t.botAvatar : t.userAvatar,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: msg.role === 'assistant'
                    ? '0 2px 8px rgba(124,58,237,0.30)'
                    : '0 2px 8px rgba(14,165,233,0.25)',
                }}>
                  {msg.role === 'assistant'
                    ? <Bot size={13} color="#fff" />
                    : <User size={13} color="#fff" />
                  }
                </div>

                {/* Bubble + timestamp */}
                <div style={{
                  maxWidth: '76%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 3,
                }}>
                  <div
                    style={{
                      padding: '9px 13px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: 13, lineHeight: 1.65,
                      background: msg.isError ? t.errBg : msg.role === 'user' ? t.userBg : t.botBg,
                      color: msg.isError ? t.errText : msg.role === 'user' ? t.userText : t.botText,
                      border: msg.role !== 'user'
                        ? `1px solid ${msg.isError ? t.errBorder : t.botBorder}`
                        : 'none',
                      boxShadow: msg.role === 'user'
                        ? '0 3px 14px rgba(108,79,246,0.30)'
                        : msg.isError ? 'none' : `0 1px 4px ${dark ? 'rgba(0,0,0,0.25)' : 'rgba(99,102,241,0.08)'}`,
                      wordBreak: 'break-word',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  <span style={{ fontSize: 10, color: t.meta, paddingInline: 3 }}>
                    {fmt(msg.time)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="acw-msg" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: t.botAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.30)',
                }}>
                  <Bot size={13} color="#fff" />
                </div>
                <div style={{
                  background: t.botBg, border: `1px solid ${t.botBorder}`,
                  borderRadius: '16px 16px 16px 4px', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {[0, 150, 300].map((delay, i) => (
                    <span key={i} className="acw-dot-bounce" style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: t.dot, display: 'inline-block',
                      animationDelay: `${delay}ms`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── QUICK PROMPTS ────────────────────────────── */}
          {showQuickPrompts && (
            <div style={{
              padding: '4px 14px 8px',
              borderTop: `1px solid ${t.divider}`,
              display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0,
            }}>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  className="acw-chip"
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 10px',
                    borderRadius: 99, border: `1px solid ${t.chipBorder}`,
                    background: t.chipBg, color: t.chipText,
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* ── INPUT ───────────────────────────────────── */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: `1px solid ${t.divider}`,
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: t.inputWrap,
              border: `1.5px solid ${t.inputBorder}`,
              borderRadius: 14, padding: '8px 8px 8px 12px',
              transition: 'border-color 0.18s',
            }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#6C4FF6'}
              onBlur={(e) => e.currentTarget.style.borderColor = t.inputBorder}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask about the admin panel…"
                disabled={isLoading}
                className="acw-textarea"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: t.inputText, fontSize: 13, lineHeight: 1.5, resize: 'none',
                  fontFamily: "'DM Sans',sans-serif",
                  maxHeight: 80, overflowY: 'auto',
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="acw-send"
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none', flexShrink: 0,
                  background: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                  transition: 'all 0.18s',
                }}
              >
                {isLoading
                  ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={14} color="#fff" />
                }
              </button>
            </div>
            <p style={{
              textAlign: 'center', fontSize: 9.5, color: t.inputFooter,
              marginTop: 6, fontWeight: 500, letterSpacing: '0.03em',
            }}>
              Powered by IntelliLearn AI · MLSU
            </p>
          </div>
        </div>
      </div>

      {/* ── FAB BUTTON ────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        title="IntelliLearn Admin AI"
        style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 51,
          width: 54, height: 54, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isOpen
            ? '0 4px 20px rgba(124,58,237,0.40)'
            : '0 8px 32px rgba(124,58,237,0.50)',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          transform: isOpen ? 'scale(0.90)' : 'scale(1)',
        }}
        onMouseOver={(e) => { if (!isOpen) e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseOut={(e) => { if (!isOpen) e.currentTarget.style.transform = 'scale(1)' }}
      >
        {/* Ping ring — only when closed */}
        {!isOpen && (
          <span className="acw-fab-ring" style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            border: '2px solid rgba(124,58,237,0.5)',
          }} />
        )}
        {isOpen
          ? <X size={22} color="#fff" />
          : <Sparkles size={20} color="#fff" />
        }
      </button>

      {/* spinner keyframe for send-loading */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
