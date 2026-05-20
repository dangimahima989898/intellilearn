import { useState, useEffect, useRef, useCallback } from "react"
import {
  Bot, Send, Mic, MicOff, Copy, Check, Trash2,
  GitBranch, Database, Monitor, Network, Coffee, Code,
  ChevronRight, Loader2, AlertCircle, Volume2, Clock,
  Sparkles, BookOpen
} from "lucide-react"
import { sendMessage, getSubjects, getChatHistory, getProviderStatus } from "../../services/chatbotService"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

// ── Icon map for dynamic subject icons ─────────────────────────────────────
const ICON_MAP = { GitBranch, Database, Monitor, Network, Coffee, Code }

// ── Quick questions per subject ─────────────────────────────────────────────
const QUICK_QUESTIONS = {
  DSA: [
    "Explain Binary Trees with example",
    "What is Big O notation?",
    "Difference between Stack and Queue",
    "Explain Dijkstra's algorithm",
  ],
  DBMS: [
    "What is database normalization?",
    "Explain ACID properties",
    "Difference between SQL and NoSQL",
    "What is an ER diagram?",
  ],
  OS: [
    "Explain process vs thread",
    "What is deadlock and how to prevent it?",
    "Explain virtual memory",
    "What is CPU scheduling?",
  ],
  CN: [
    "Explain OSI model layers",
    "Difference between TCP and UDP",
    "How does DNS work?",
    "What is IP addressing?",
  ],
  JAVA: [
    "Explain OOP concepts in Java",
    "What are Java Streams?",
    "Explain multithreading in Java",
    "Difference between ArrayList and LinkedList",
  ],
  PYTHON: [
    "Explain list comprehension",
    "What is a Python decorator?",
    "Explain generators in Python",
    "Difference between tuple and list",
  ],
}

// ── Format AI response text (code blocks, newlines) ─────────────────────────
function FormattedMessage({ text }) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <div className="formatted-message">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n")
          const lang = lines[0].replace("```", "").trim() || "code"
          const code = lines.slice(1, -1).join("\n")
          return (
            <div key={i} className="code-block-wrapper">
              <div className="code-lang-badge">{lang}</div>
              <pre className="code-block"><code>{code}</code></pre>
            </div>
          )
        }
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part
              .split("\n")
              .map((line, li) => (
                <span key={li}>
                  {line}
                  {li < part.split("\n").length - 1 && <br />}
                </span>
              ))}
          </span>
        )
      })}
    </div>
  )
}

export default function ChatbotPage() {
  const { user } = useAuth()

  // ── State ────────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("DSA")
  const [language, setLanguage] = useState("english")
  const [messages, setMessages] = useState([]) // { id, role, content, ts, suggestedTopic? }
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [providerStatus, setProviderStatus] = useState({})
  const [lastProvider, setLastProvider] = useState("")

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)

  // ── Initial loads ────────────────────────────────────────────────────────
  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => {})
    getProviderStatus()
      .then((s) => {
        setProviderStatus(s)
        setLastProvider(
          Object.entries(s).find(([, v]) => v)?.[0] ?? "none"
        )
      })
      .catch(() => {})
  }, [])

  // ── Auto-scroll to latest message ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px"
  }, [input])

  // ── Get the active subject object ────────────────────────────────────────
  const activeSubject = subjects.find((s) => s.code === selectedSubject)

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      ts: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    // Build history from current messages (last 10)
    const history = [...messages, userMsg]
      .slice(-10)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))

    try {
      const data = await sendMessage(text, selectedSubject, language, history.slice(0, -1))
      setLastProvider(data.provider_used || lastProvider)
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response,
        suggestedTopic: data.suggested_topic,
        ts: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 429) {
        toast.error("Rate limit reached — 20 messages per hour.")
      } else {
        toast.error(detail || "AI service error. Please try again.")
      }
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setInput(text) // restore
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, selectedSubject, language, lastProvider])

  // ── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Copy AI message ──────────────────────────────────────────────────────
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Clear chat ───────────────────────────────────────────────────────────
  const handleClearChat = () => {
    setMessages([])
    toast.success("Chat cleared")
  }

  // ── Voice input ──────────────────────────────────────────────────────────
  const handleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      toast.error("Speech recognition not supported in this browser.")
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SR()
    recognition.lang = language === "hindi" ? "hi-IN" : "en-US"
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsRecording(false)
    }
    recognition.onerror = () => {
      toast.error("Voice input failed. Try again.")
      setIsRecording(false)
    }
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    setIsRecording(true)
  }

  // ── Click suggested topic chip → auto-fill input ─────────────────────────
  const handleSuggestedTopic = (topic) => {
    setInput(`Explain: ${topic}`)
    textareaRef.current?.focus()
  }

  // ── Select new subject → show welcome message ────────────────────────────
  const handleSubjectChange = (code) => {
    setSelectedSubject(code)
    setMessages([])
  }

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <div className="chatbot-root">
      {/* ══════════════════════ LEFT SIDEBAR ══════════════════════ */}
      <aside className="chatbot-sidebar">
        {/* Header */}
        <div className="chatbot-sidebar-header">
          <div className="chatbot-sidebar-avatar">
            <Bot size={22} />
          </div>
          <div>
            <div className="chatbot-sidebar-title">🤖 AI Tutor</div>
            <div className="chatbot-sidebar-sub">Available 24/7</div>
          </div>
        </div>

        {/* Subject selector */}
        <div className="chatbot-section-label">Subject</div>
        <div className="chatbot-subjects-grid">
          {subjects.map((s) => {
            const Icon = ICON_MAP[s.icon] || BookOpen
            const active = selectedSubject === s.code
            return (
              <button
                key={s.code}
                onClick={() => handleSubjectChange(s.code)}
                className={`chatbot-subject-btn ${active ? "chatbot-subject-btn--active" : ""}`}
                style={active ? { "--sub-color": s.color, borderColor: s.color } : {}}
              >
                <Icon size={14} style={active ? { color: s.color } : {}} />
                <span>{s.code}</span>
              </button>
            )
          })}
        </div>

        {/* Language toggle */}
        <div className="chatbot-section-label">Language</div>
        <div className="chatbot-lang-pill">
          <button
            className={`chatbot-lang-opt ${language === "english" ? "chatbot-lang-opt--active" : ""}`}
            onClick={() => setLanguage("english")}
          >
            🇬🇧 English
          </button>
          <button
            className={`chatbot-lang-opt ${language === "hindi" ? "chatbot-lang-opt--active" : ""}`}
            onClick={() => setLanguage("hindi")}
          >
            🇮🇳 हिंदी
          </button>
        </div>

        {/* Quick questions */}
        <div className="chatbot-section-label">Quick Questions</div>
        <div className="chatbot-quick-list">
          {(QUICK_QUESTIONS[selectedSubject] || []).map((q) => (
            <button
              key={q}
              className="chatbot-quick-chip"
              onClick={() => handleSend(q)}
              disabled={loading}
            >
              <ChevronRight size={12} />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* AI Provider status */}
        <div className="chatbot-provider-status">
          <Sparkles size={12} />
          <span>
            AI via:{" "}
            <strong className="chatbot-provider-name">
              {lastProvider === "groq"
                ? "Groq Llama-3"
                : lastProvider === "openai"
                ? "GPT-4o"
                : lastProvider === "gemini"
                ? "Gemini 1.5"
                : "Detecting…"}
            </strong>
          </span>
          {Object.entries(providerStatus).map(([k, v]) => (
            <span
              key={k}
              className={`chatbot-provider-dot ${v ? "chatbot-provider-dot--on" : "chatbot-provider-dot--off"}`}
              title={`${k}: ${v ? "configured" : "not set"}`}
            />
          ))}
        </div>
      </aside>

      {/* ══════════════════════ MAIN CHAT ══════════════════════ */}
      <div className="chatbot-main">
        {/* Chat header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div
              className="chatbot-header-icon"
              style={{ background: activeSubject?.color + "22", border: `1px solid ${activeSubject?.color}44` }}
            >
              {activeSubject && (() => {
                const Icon = ICON_MAP[activeSubject.icon] || BookOpen
                return <Icon size={18} style={{ color: activeSubject.color }} />
              })()}
            </div>
            <div>
              <div className="chatbot-header-title">
                {activeSubject?.name ?? "AI Tutor"}
              </div>
              <div className="chatbot-header-sub">IntelliLearn AI Tutor · {language === "hindi" ? "हिंदी mode" : "English mode"}</div>
            </div>
          </div>
          <button
            className="chatbot-clear-btn"
            onClick={handleClearChat}
            title="Clear chat"
          >
            <Trash2 size={15} />
            Clear
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.length === 0 && !loading && (
            <div className="chatbot-empty">
              <div className="chatbot-empty-icon">
                <Bot size={40} />
              </div>
              <h3 className="chatbot-empty-title">Start learning with AI</h3>
              <p className="chatbot-empty-sub">
                Select a subject, ask a question or pick a quick topic from the sidebar.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chatbot-msg-row ${msg.role === "user" ? "chatbot-msg-row--user" : "chatbot-msg-row--ai"}`}
            >
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div className="chatbot-avatar chatbot-avatar--ai">
                  <Bot size={16} />
                </div>
              )}

              <div className={`chatbot-bubble ${msg.role === "user" ? "chatbot-bubble--user" : "chatbot-bubble--ai"}`}>
                {msg.role === "assistant" ? (
                  <FormattedMessage text={msg.content} />
                ) : (
                  <span>{msg.content}</span>
                )}

                {/* AI message actions */}
                {msg.role === "assistant" && (
                  <div className="chatbot-msg-actions">
                    {msg.suggestedTopic && (
                      <button
                        className="chatbot-suggested-chip"
                        onClick={() => handleSuggestedTopic(msg.suggestedTopic)}
                        title="Click to ask about this topic"
                      >
                        <BookOpen size={11} />
                        📚 {msg.suggestedTopic}
                      </button>
                    )}
                    <button
                      className="chatbot-copy-btn"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                      {copiedId === msg.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <div className="chatbot-timestamp">
                  <Clock size={10} />
                  {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* User avatar */}
              {msg.role === "user" && (
                <div className="chatbot-avatar chatbot-avatar--user">
                  {initials}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="chatbot-msg-row chatbot-msg-row--ai">
              <div className="chatbot-avatar chatbot-avatar--ai">
                <Bot size={16} />
              </div>
              <div className="chatbot-bubble chatbot-bubble--ai chatbot-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chatbot-input-area">
          <div className="chatbot-input-box">
            <textarea
              ref={textareaRef}
              className="chatbot-textarea"
              placeholder={
                loading
                  ? "AI is thinking…"
                  : language === "hindi"
                  ? "यहाँ अपना प्रश्न लिखें… (Shift+Enter = नई लाइन)"
                  : "Ask a question… (Shift+Enter for new line)"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              maxLength={1000}
            />
            <div className="chatbot-input-actions">
              {/* Char counter */}
              <span className={`chatbot-char-count ${input.length > 900 ? "chatbot-char-count--warn" : ""}`}>
                {input.length}/1000
              </span>

              {/* Mic button */}
              <button
                className={`chatbot-mic-btn ${isRecording ? "chatbot-mic-btn--recording" : ""}`}
                onClick={handleMic}
                title={isRecording ? "Stop recording" : "Voice input"}
                disabled={loading}
              >
                {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
                {isRecording && <span className="chatbot-recording-dot" />}
              </button>

              {/* Send button */}
              <button
                className="chatbot-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                title="Send message"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
