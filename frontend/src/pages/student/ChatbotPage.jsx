import { useState, useEffect, useRef, useCallback } from "react"
import {
  Bot, Send, Mic, MicOff, Copy, Check, Trash2,
  GitBranch, Database, Monitor, Network, Coffee, Code,
  ChevronRight, Loader2, AlertCircle, Clock,
  Sparkles, BookOpen, Paperclip, X, FileText,
  ChevronLeft, Languages, AlertTriangle, Flag, History,
  Settings, CheckCircle, Search, Info, ChevronDown
} from "lucide-react"
import { sendMessage, getSubjects, getProviderStatus, uploadPdf, flagAnswer, getChatHistory } from "../../services/chatbotService"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import toast from "react-hot-toast"

const ICON_MAP = { GitBranch, Database, Monitor, Network, Coffee, Code }

const RobotAvatarIllustration = () => (
  <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
    {/* Background circle */}
    <div className="absolute inset-0 bg-[#F5F3FF] rounded-full border-2 border-[#C084FC]/30 flex items-center justify-center" />
    
    {/* Sparkles */}
    <span className="absolute -top-1 -right-1 text-lg">✨</span>
    <span className="absolute -bottom-1 -left-1 text-lg">✨</span>
    
    {/* Robot SVG */}
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
      {/* Graduation Cap */}
      <path d="M32 10L14 18L32 26L50 18L32 10Z" fill="#7C3AED" />
      <path d="M20 20.6V28C20 34.6 25.4 40 32 40C38.6 40 44 34.6 44 28V20.6" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 19V32" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="33" r="2" fill="#7C3AED" />
      
      {/* Robot Head */}
      <rect x="20" y="26" width="24" height="20" rx="6" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
      
      {/* Eyes */}
      <circle cx="27" cy="35" r="2.5" fill="#4F46E5" />
      <circle cx="37" cy="35" r="2.5" fill="#4F46E5" />
      
      {/* Smile */}
      <path d="M29 40C30.5 41.5 33.5 41.5 35 40" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      
      {/* Antenna */}
      <line x1="32" y1="26" x2="32" y2="21" stroke="#4F46E5" strokeWidth="3" />
    </svg>
  </div>
);

const SUBJECT_COLORS = {
  DSA: "#3B82F6",
  DBMS: "#8b5cf6",
  OS: "#10b981",
  CN: "#f59e0b",
  JAVA: "#ef4444",
  PYTHON: "#84cc16",
}

const QUICK_QUESTIONS = {
  DSA: ["Explain Binary Trees with example", "What is Big O notation?", "Difference between Stack and Queue", "Explain Dijkstra's algorithm"],
  DBMS: ["What is database normalization?", "Explain ACID properties", "Difference between SQL and NoSQL", "What is an ER diagram?"],
  OS: ["Explain process vs thread", "What is deadlock and how to prevent it?", "Explain virtual memory", "What is CPU scheduling?"],
  CN: ["Explain OSI model layers", "Difference between TCP and UDP", "How does DNS work?", "What is IP addressing?"],
  JAVA: ["Explain OOP concepts in Java", "What are Java Streams?", "Explain multithreading in Java", "Difference between ArrayList and LinkedList"],
  PYTHON: ["Explain list comprehension", "What is a Python decorator?", "Explain generators in Python", "Difference between tuple and list"],
}

// ── Confidence tooltip descriptions ──
const CONFIDENCE_INFO = {
  high: "The answer directly matches your subject syllabus keywords. High likelihood of accuracy.",
  medium: "The answer is inferred from general context. Verify key details with your professor.",
  low: "This topic may be outside your syllabus or loosely matched. Cross-check with course material."
}

// ── Model display names ──
const MODEL_LABELS = {
  groq: "Groq Llama-3",
  openai: "GPT-4o",
  gemini: "Gemini 1.5",
}

function FormattedMessage({ text, isLight }) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n")
          const lang = lines[0].replace("```", "").trim() || "code"
          const code = lines.slice(1, -1).join("\n")
          return (
            <div key={i} className={`rounded-xl overflow-hidden border my-4 shadow-sm ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'
            }`}>
              <div className={`px-5 py-2.5 flex justify-between items-center border-b ${
                isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-black/35 border-white/5'
              }`}>
                <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>{lang}</span>
                <CopyButton text={code} small isLight={isLight} />
              </div>
              <pre className={`p-5 overflow-x-auto font-mono text-xs max-w-full ${
                isLight ? 'text-slate-800' : 'text-blue-300'
              }`}>
                <code>{code}</code>
              </pre>
            </div>
          )
        }
        return (
          <span key={i} className={`block leading-relaxed break-words whitespace-pre-line text-sm ${
            isLight ? 'text-slate-700' : 'text-white/90'
          }`}>
            {part}
          </span>
        )
      })}
    </div>
  )
}

function CopyButton({ text, small, isLight }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button 
      onClick={handleCopy}
      className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
        isLight ? 'text-slate-400 hover:text-slate-750' : 'text-white/45 hover:text-white'
      } ${
        small ? isLight ? 'px-2 py-0.5 rounded bg-slate-205/50 border border-slate-200' : 'px-2 py-0.5 rounded bg-white/5 border border-white/5' : ''
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {!small && <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  )
}

// ── Merged Status Pill Component (combines AI-generated disclaimer + confidence) ──
function StatusPill({ confidenceLevel, isLight }) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const colorMap = {
    high: {
      bg: isLight ? 'bg-emerald-50' : 'bg-emerald-500/10',
      border: isLight ? 'border-emerald-200' : 'border-emerald-500/20',
      text: isLight ? 'text-emerald-700' : 'text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'High Confidence'
    },
    medium: {
      bg: isLight ? 'bg-amber-50' : 'bg-amber-500/10',
      border: isLight ? 'border-amber-200' : 'border-amber-500/20',
      text: isLight ? 'text-amber-700' : 'text-amber-400',
      dot: 'bg-amber-500',
      label: 'Medium Confidence'
    },
    low: {
      bg: isLight ? 'bg-red-50' : 'bg-red-500/10',
      border: isLight ? 'border-red-200' : 'border-red-500/20',
      text: isLight ? 'text-red-700' : 'text-red-400',
      dot: 'bg-red-500',
      label: 'Low Confidence'
    }
  }

  const style = colorMap[confidenceLevel] || colorMap.medium

  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-help transition-all ${style.bg} ${style.border} ${style.text}`}
        aria-label={`${style.label} - AI generated response`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span>{style.label}</span>
        <span className="opacity-60">·</span>
        <span className="opacity-75">AI-generated</span>
        <Info className="w-3 h-3 opacity-60" />
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className={`absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl border shadow-xl z-50 text-xs leading-relaxed ${
          isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#1a2236] border-white/10 text-white/70'
        }`}>
          <p className="font-semibold mb-1">{style.label}</p>
          <p>{CONFIDENCE_INFO[confidenceLevel] || CONFIDENCE_INFO.medium}</p>
          <p className={`mt-2 pt-2 border-t text-[10px] opacity-60 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
            Always verify critical answers with your professor.
          </p>
          <div className={`absolute -bottom-1 left-6 w-2 h-2 rotate-45 border-r border-b ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#1a2236] border-white/10'
          }`} />
        </div>
      )}
    </div>
  )
}

// ── Source Chip Component (shows PDF page/section used) ──
function SourceChip({ pdfFilename, isLight }) {
  if (!pdfFilename) return null
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold mt-2 ${
      isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
    }`}>
      <FileText className="w-3 h-3" />
      <span>Source: {pdfFilename}</span>
    </div>
  )
}

// ── Model Selector Dropdown ──
function ModelSelector({ lastProvider, providerStatus, isLight }) {
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeLabel = MODEL_LABELS[lastProvider] || "AI Model"
  const availableModels = Object.entries(providerStatus).filter(([, v]) => v)

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
          isLight 
            ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' 
            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
        }`}
        aria-label="Select AI model"
      >
        <Sparkles className="w-3 h-3" />
        <span>{activeLabel}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className={`absolute top-full right-0 mt-1.5 w-44 rounded-xl border shadow-xl z-50 py-1.5 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#1a2236] border-white/10'
        }`}>
          {availableModels.map(([key]) => (
            <div
              key={key}
              className={`px-3 py-2 flex items-center justify-between text-xs ${
                key === lastProvider 
                  ? isLight ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-blue-500/10 text-blue-300 font-semibold'
                  : isLight ? 'text-slate-600' : 'text-white/60'
              }`}
            >
              <span>{MODEL_LABELS[key] || key}</span>
              {key === lastProvider && <CheckCircle className="w-3.5 h-3.5" />}
            </div>
          ))}
          {availableModels.length === 0 && (
            <div className={`px-3 py-2 text-xs ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
              No models available
            </div>
          )}
          <div className={`mx-3 my-1.5 pt-1.5 border-t text-[9px] ${isLight ? 'border-slate-100 text-slate-400' : 'border-white/5 text-white/25'}`}>
            Model is auto-selected by the server
          </div>
        </div>
      )}
    </div>
  )
}

// ── Typing/Thinking Loader (distinct from idle green dot) ──
function ThinkingLoader({ isLight }) {
  return (
    <div className="flex items-start gap-3 w-full justify-start">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center p-1.5 shrink-0 shadow-sm ${
        isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
      }`}>
        <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
      </div>
      <div className={`px-5 py-3 rounded-2xl rounded-bl-sm flex items-center gap-3 ${
        isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
      }`}>
        {/* Skeleton shimmer bars instead of simple dots */}
        <div className="flex flex-col gap-1.5">
          <div className={`h-2 w-32 rounded-full animate-pulse ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
          <div className={`h-2 w-24 rounded-full animate-pulse ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} style={{ animationDelay: '150ms' }} />
          <div className={`h-2 w-28 rounded-full animate-pulse ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} style={{ animationDelay: '300ms' }} />
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Loader2 className={`w-3.5 h-3.5 animate-spin ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/30'}`}>Thinking...</span>
        </div>
      </div>
    </div>
  )
}

// ── Scrollable Suggested Topics Row ──
function SuggestedTopicsRow({ topics, onSelect, isLight }) {
  const scrollRef = useRef(null)
  
  if (!topics || topics.length === 0) return null

  return (
    <div className={`mt-4 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {topics.map((topic, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(topic)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
              isLight 
                ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                : 'bg-blue-500/15 border-blue-500/20 text-blue-300 hover:bg-blue-500/25'
            }`}
          >
            📚 {topic}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [activeTab, setActiveTab] = useState("settings") // "settings" or "history"
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("DSA")
  const [language, setLanguage] = useState("auto") // "english", "hindi", "auto"
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [providerStatus, setProviderStatus] = useState({})
  const [lastProvider, setLastProvider] = useState("")

  // PDF context state
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfContext, setPdfContext] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Flag answer modal state
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false)
  const [flagTargetId, setFlagTargetId] = useState(null)
  const [flagReason, setFlagReason] = useState("")
  const [flagLoading, setFlagLoading] = useState(false)

  // Past 30 Days Chat History
  const [historyLogs, setHistoryLogs] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // NEW: Subject search/filter in sidebar
  const [subjectSearch, setSubjectSearch] = useState("")

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load initial configurations
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {})
    getProviderStatus().then(s => {
      setProviderStatus(s)
      setLastProvider(Object.entries(s).find(([, v]) => v)?.[0] ?? "none")
    }).catch(() => {})
    loadHistory()
  }, [])

  // Load chat history
  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await getChatHistory()
      setHistoryLogs(data)
    } catch (err) {
      console.error("Failed to load chat history", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px"
  }, [input])

  const activeSubject = subjects.find(s => s.code === selectedSubject)
  const accentColor = SUBJECT_COLORS[selectedSubject] || "#3B82F6"

  // Filter subjects by search
  const filteredSubjects = subjects.filter(s => {
    if (!subjectSearch.trim()) return true
    const q = subjectSearch.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  })

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = { id: `user-${Date.now()}`, role: "user", content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const history = [...messages, userMsg]
      .slice(-10)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))

    try {
      const data = await sendMessage(text, selectedSubject, language, history.slice(0, -1), pdfContext)
      setLastProvider(data.provider_used || lastProvider)
      
      // Parse multiple suggested topics if they exist
      const suggestedTopics = data.suggested_topic 
        ? data.suggested_topic.split(/[,;]/).map(t => t.trim()).filter(Boolean)
        : []
      
      const aiMsg = {
        id: data.id,
        role: "assistant",
        content: data.response,
        suggestedTopic: data.suggested_topic,
        suggestedTopics: suggestedTopics.length > 0 ? suggestedTopics : (data.suggested_topic ? [data.suggested_topic] : []),
        confidenceLevel: data.confidence_level,
        ts: new Date(),
        pdfSource: pdfFile ? pdfFile.name : null,
      }
      setMessages(prev => [...prev, aiMsg])
      
      // Reload history in background
      loadHistory()
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error("Rate limit reached — 20 messages per hour.")
      } else {
        toast.error(err.response?.data?.detail || "AI service error. Please try again.")
      }
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, selectedSubject, language, pdfContext, lastProvider, pdfFile])

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault()
      handleSend() 
    }
  }

  const handleClearChat = () => { 
    setMessages([])
    toast.success("Chat cleared") 
  }

  const handleSubjectChange = code => { 
    setSelectedSubject(code)
    setMessages([]) 
  }

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
    recognition.onresult = e => { 
      setInput(e.results[0][0].transcript)
      setIsRecording(false) 
    }
    recognition.onerror = () => { 
      toast.error("Voice input failed. Please try again.")
      setIsRecording(false) 
    }
    recognition.onend = () => setIsRecording(false)
    recognition.start()
    setIsRecording(true)
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF must be under 5 MB.")
      return
    }
    setPdfLoading(true)
    setPdfFile(file)
    try {
      const result = await uploadPdf(file)
      setPdfContext(result.text)
      toast.success(`📄 "${file.name}" loaded!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to extract PDF text.")
      setPdfFile(null)
      setPdfContext(null)
    } finally {
      setPdfLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemovePdf = () => {
    setPdfFile(null)
    setPdfContext(null)
    toast("PDF context removed.", { icon: "🗑️" })
  }

  // Handle student flagging an answer
  const handleOpenFlagModal = (messageId) => {
    setFlagTargetId(messageId)
    setFlagReason("")
    setIsFlagModalOpen(true)
  }

  const handleFlagSubmit = async () => {
    if (!flagReason.trim()) {
      toast.error("Please provide a reason for flagging")
      return
    }
    setFlagLoading(true)
    try {
      await flagAnswer(flagTargetId, flagReason)
      toast.success("Response flagged. Admin will review this answer.", { icon: "🚩" })
      setMessages(prev => prev.map(m => m.id === flagTargetId ? { ...m, isFlagged: true } : m))
      setIsFlagModalOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to flag answer.")
    } finally {
      setFlagLoading(false)
    }
  }

  // Load a session from history logs
  const handleLoadSession = (log) => {
    setSelectedSubject(log.subject?.toUpperCase?.() || log.subject)
    const mockUserMsg = {
      id: `history-user-${log.id}`,
      role: "user",
      content: log.user_message,
      ts: new Date(log.created_at)
    }
    const mockAiMsg = {
      id: log.id,
      role: "assistant",
      content: log.ai_response,
      suggestedTopic: log.suggested_topic,
      suggestedTopics: log.suggested_topic ? [log.suggested_topic] : [],
      confidenceLevel: log.confidence_level,
      isFlagged: log.is_flagged,
      ts: new Date(log.created_at)
    }
    setMessages([mockUserMsg, mockAiMsg])
    toast.success("Loaded chat session from history")
  }

  // Helper to parse syllabus unit info out of AI responses
  const getSyllabusUnitInfo = (text) => {
    const match = text.match(/(based on\s+[a-zA-Z\s]+\s*—\s*Unit\s+\d+|outside\s+your\s+current\s+syllabus)/i)
    return match ? match[0] : null
  }

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "ST"

  const WELCOME_SUGGESTIONS = [
    "Explain Binary Tree",
    "What is Big O notation?",
    "Explain DBMS normalization",
    "Help me prepare for exam"
  ]

  // Group history logs by date
  const groupedHistory = historyLogs.reduce((acc, log) => {
    const dateStr = new Date(log.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(log)
    return acc
  }, {})

  return (
    <div className={`flex h-[calc(100vh-6rem)] border rounded-2xl overflow-hidden shadow-2xl transition-all relative ${
      isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
    }`}>
      
      {/* ── LEFT PANEL WITH DUAL TAB (SETTINGS & HISTORY) ── */}
      <aside className={`w-76 flex-shrink-0 flex flex-col p-4 overflow-y-auto border-r ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0F172A] border-white/10'
      }`}>
        
        {/* Header & Logo */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className={`w-9 h-9 p-1.5 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-white shadow-sm border border-slate-200' : 'bg-white/5 border border-white/10'
          }`}>
            <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className={`font-outfit font-extrabold text-base leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
              MLSU AI Tutor
            </h2>
            <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
              {loading ? 'Processing' : 'Idle'}
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className={`flex rounded-lg p-0.5 mb-4 border ${isLight ? 'bg-slate-200/60 border-slate-300/40' : 'bg-white/5 border-white/5'}`}>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              activeTab === "settings"
                ? isLight ? 'bg-[#EEF2FF] border-[#6366F1] text-[#4F46E5] shadow-sm' : 'bg-white/10 text-white shadow-sm border-white/5'
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Chat Settings</span>
          </button>
          <button
            onClick={() => { setActiveTab("history"); loadHistory(); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              activeTab === "history"
                ? isLight ? 'bg-[#EEF2FF] border-[#6366F1] text-[#4F46E5] shadow-sm' : 'bg-white/10 text-white shadow-sm border-white/5'
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History (30d)</span>
          </button>
        </div>

        {/* Tab Content: Chat Settings */}
        {activeTab === "settings" ? (
          <div className="flex flex-col gap-4">
            {/* Subject Selector with Search Filter */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
                Select Subject
              </label>
              
              {/* NEW: Search/filter input for subjects */}
              <div className={`relative mb-2.5`}>
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Filter subjects..."
                  className={`w-full pl-8 pr-3 py-2 rounded-lg text-xs border outline-none transition-all ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-400' 
                      : 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500'
                  }`}
                />
                {subjectSearch && (
                  <button 
                    onClick={() => setSubjectSearch("")}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {filteredSubjects.map(s => {
                  const color = SUBJECT_COLORS[s.code] || s.color
                  const isSelected = selectedSubject === s.code
                  return (
                    <button
                      key={s.code}
                      onClick={() => handleSubjectChange(s.code)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? isLight
                            ? 'bg-blue-50/80 border-blue-500/30 text-blue-700 font-semibold shadow-sm'
                            : 'bg-blue-500/15 border-blue-500/30 text-white font-semibold' 
                          : isLight
                            ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-850 border-transparent'
                            : 'hover:bg-white/5 text-white/50 hover:text-white border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs uppercase tracking-wide font-medium">{s.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${
                        isLight 
                          ? 'bg-slate-200/50 text-slate-500 border-slate-300/40' 
                          : 'bg-white/5 text-white/40 border-white/5'
                      }`}>
                        {QUICK_QUESTIONS[s.code]?.length || 4} topics
                      </span>
                    </button>
                  )
                })}
                {filteredSubjects.length === 0 && (
                  <p className={`text-xs text-center py-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                    No subjects match "{subjectSearch}"
                  </p>
                )}
              </div>
            </div>

            <div className={`h-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

            {/* Language Selector */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
                Language
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["english", "hindi", "auto"].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-2 rounded-lg text-[10px] font-bold border capitalize transition-all cursor-pointer ${
                      language === lang
                        ? isLight
                          ? 'bg-[#EEF2FF] border-[#6366F1] text-[#4F46E5] shadow-sm'
                          : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                        : isLight
                          ? 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-150'
                          : 'text-white/40 bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {lang === "english" ? "🌐 EN" : lang === "hindi" ? "अ HI" : "+ Auto"}
                  </button>
                ))}
              </div>
            </div>

            <div className={`h-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

            {/* Quick Ask */}
            {selectedSubject && (
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
                  Quick Ask
                </label>
                <div className="flex flex-col gap-2">
                  {(QUICK_QUESTIONS[selectedSubject] || []).map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      disabled={loading}
                      className={`text-[11px] rounded-lg px-3 py-2 cursor-pointer transition-all text-left truncate leading-tight disabled:opacity-40 border ${
                        isLight 
                          ? 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350' 
                          : 'text-white/60 hover:text-white bg-white/5 hover:bg-blue-500/10 border-white/10 hover:border-blue-500/30'
                      }`}
                      title={q}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab Content: History List */
          <div className="flex flex-col flex-1 overflow-y-auto pr-1">
            <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
              Past 30 Days Activity
            </label>
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs text-slate-500">Loading history...</span>
              </div>
            ) : Object.keys(groupedHistory).length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No recent chat logs found in the past 30 days.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(groupedHistory).map(([date, logs]) => (
                  <div key={date} className="space-y-1.5">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                      {date}
                    </p>
                    {logs.map((log) => {
                      const subjColor = SUBJECT_COLORS[log.subject?.toUpperCase()] || "#3B82F6"
                      return (
                        <button
                          key={log.id}
                          onClick={() => handleLoadSession(log)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 cursor-pointer group ${
                            isLight
                              ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm text-slate-700'
                              : 'bg-white/5 border-white/5 hover:border-white/10 text-white/85'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 justify-between w-full">
                            <span className="font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-current text-opacity-80 shrink-0" style={{ color: subjColor }}>
                              {log.subject}
                            </span>
                            <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`truncate font-medium text-xs w-full ${isLight ? 'group-hover:text-blue-600' : 'group-hover:text-blue-400'}`}>
                            {log.user_message}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear Conversation at the bottom */}
        <div className="mt-auto pt-4 border-t border-dashed border-slate-200/50">
          <button 
            onClick={handleClearChat}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs border border-dashed cursor-pointer transition-colors ${
              isLight 
                ? 'text-slate-400 hover:text-red-650 hover:bg-red-50 border-slate-300 hover:border-red-200' 
                : 'text-white/30 hover:text-red-400 hover:bg-red-500/10 border-white/10'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear conversation</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <div className={`flex-1 flex flex-col ${isLight ? 'bg-slate-100' : 'bg-[#0A0F1E]'}`}>
        
        {/* Chat header — REDESIGNED: model label moved to dropdown */}
        <div className={`h-14 border-b flex items-center justify-between px-6 ${
          isLight ? 'bg-white border-slate-200/80' : 'bg-[#0F172A] border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            {/* Status dot: green=idle, blue-pulse=thinking */}
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              loading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
            }`} />
            <div>
              <p className={`text-sm font-semibold leading-tight font-outfit uppercase tracking-wide ${
                isLight ? 'text-slate-800' : 'text-white'
              }`}>
                MLSU AI Tutor Assistant
              </p>
              <p className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                {activeSubject?.name || selectedSubject} • Mode: {language === "hindi" ? "हिंदी" : language === "english" ? "English" : "Auto-detect"}
              </p>
            </div>
          </div>
          {/* Model selector dropdown instead of static badge */}
          <ModelSelector lastProvider={lastProvider} providerStatus={providerStatus} isLight={isLight} />
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center select-none my-auto max-w-2xl mx-auto px-4 w-full">
              <RobotAvatarIllustration />
              <h2 className={`font-outfit font-extrabold text-2.5xl tracking-tight ${isLight ? 'text-slate-850' : 'text-white'}`}>
                Hi! I'm your <span className={isLight ? "text-[#4F46E5]" : "text-indigo-300"}>MLSU AI Tutor</span>
              </h2>
              <p className={`text-sm max-w-md mt-3 px-4 leading-relaxed ${isLight ? 'text-slate-500 font-medium' : 'text-white/40'}`}>
                Ask doubts, analyze study topics, map syllabus guidelines, and prepare smartly with instant source unit citations.
              </p>

              <div className="mt-10 w-full">
                <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${isLight ? 'text-[#4F46E5]' : 'text-indigo-400'}`}>
                  Suggested Topics & Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                  {WELCOME_SUGGESTIONS.map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleSend(q)}
                      className={`text-xs px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer font-medium leading-snug flex items-center justify-between group ${
                        isLight 
                          ? 'bg-white hover:bg-slate-55 text-slate-700 border-slate-200/80 hover:border-slate-350 hover:shadow-sm' 
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{q}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 ${
                        isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-white/30 group-hover:text-white/60'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages list items */}
          {messages.map(msg => {
            const isBot = msg.role === "assistant"
            const unitInfo = isBot ? getSyllabusUnitInfo(msg.content) : null
            
            return (
              <div key={msg.id} className={`flex items-start gap-4 w-full ${isBot ? "justify-start" : "justify-end"}`}>
                
                {/* Bot icon avatar */}
                {isBot && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center p-1.5 shrink-0 shadow-sm ${
                    isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
                  }`}>
                    <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Message bubble */}
                <div 
                  className={`px-6 py-4 rounded-2xl relative group ${
                    !isBot 
                      ? isLight
                        ? "max-w-[70%] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-tr-none text-white shadow-md shadow-blue-500/10"
                        : "max-w-[70%] bg-blue-600/80 rounded-tr-none text-white" 
                      : isLight
                        ? "max-w-[75%] bg-white border border-slate-200/80 rounded-tl-none text-slate-800 shadow-sm"
                        : "max-w-[75%] bg-white/5 border border-white/10 rounded-tl-none text-white/90"
                  }`}
                >
                  {/* REDESIGNED: Single merged status pill (replaces separate disclaimer + confidence badges) */}
                  {isBot && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5 items-center">
                      <StatusPill confidenceLevel={msg.confidenceLevel || "medium"} isLight={isLight} />

                      {/* Flagged marker */}
                      {msg.isFlagged && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border bg-red-500/20 border-red-500/30 text-red-400 flex items-center gap-1`}>
                          <Flag className="w-3 h-3 fill-current" />
                          Flagged
                        </span>
                      )}
                    </div>
                  )}

                  {/* Copy & Flag buttons hovering inside AI bubbles */}
                  {isBot && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-2">
                      {!msg.isFlagged && (
                        <button
                          onClick={() => handleOpenFlagModal(msg.id)}
                          className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer text-slate-400 hover:text-red-500`}
                          title="Flag as incorrect"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <CopyButton text={msg.content} small isLight={isLight} />
                    </div>
                  )}

                  <div>
                    {isBot 
                      ? <FormattedMessage text={msg.content} isLight={isLight} /> 
                      : <span className="text-sm font-medium leading-relaxed break-words whitespace-pre-line">{msg.content}</span>
                    }
                  </div>

                  {/* Unit Citation display widget */}
                  {unitInfo && (
                    <div className={`mt-3 py-1.5 px-3 rounded-lg border text-[10px] font-bold tracking-wide inline-flex items-center gap-1.5 ${
                      unitInfo.includes("outside")
                        ? isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        : isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-500/15 border-blue-500/20 text-blue-300'
                    }`}>
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{unitInfo.toUpperCase()}</span>
                    </div>
                  )}

                  {/* NEW: Source chip when PDF is attached */}
                  {isBot && msg.pdfSource && (
                    <SourceChip pdfFilename={msg.pdfSource} isLight={isLight} />
                  )}

                  {/* REDESIGNED: Horizontally scrollable suggested topics row */}
                  {isBot && msg.suggestedTopics && msg.suggestedTopics.length > 0 && (
                    <SuggestedTopicsRow 
                      topics={msg.suggestedTopics} 
                      onSelect={(topic) => setInput(`Explain more about: ${topic}`)}
                      isLight={isLight}
                    />
                  )}

                  {/* Timestamp */}
                  <p className={`text-[9px] mt-3 flex items-center gap-1 ${
                    !isBot 
                      ? "justify-end text-white/50" 
                      : isLight ? "justify-start text-slate-400" : "justify-start text-white/30"
                  }`}>
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* User initials avatar */}
                {!isBot && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                    isLight 
                      ? 'bg-blue-100 border-blue-200 text-blue-700' 
                      : 'bg-blue-500/30 border-blue-500/20 text-blue-300'
                  }`}>
                    {initials}
                  </div>
                )}

              </div>
            )
          })}

          {/* REDESIGNED: Skeleton/typing loader distinct from idle green dot */}
          {loading && <ThinkingLoader isLight={isLight} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box wrap */}
        <div className={`border-t p-4 ${
          isLight ? 'bg-white border-slate-200/80' : 'bg-[#0F172A] border-white/10'
        }`}>
          {/* PDF attachment container */}
          {pdfFile && (
            <div className={`border rounded-xl px-3 py-1.5 flex items-center justify-between mb-3 max-w-xs transition-all ${
              isLight ? 'bg-slate-50 border-slate-200/85' : 'bg-white/5 border border-white/10'
            }`}>
              {pdfLoading ? (
                <div className={`flex items-center gap-2 text-xs font-semibold animate-pulse ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting PDF text...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                    <span className={`text-xs truncate font-medium ${isLight ? 'text-slate-700' : 'text-white'}`}>{pdfFile.name}</span>
                  </div>
                  <button onClick={handleRemovePdf} className={`cursor-pointer shrink-0 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/40 hover:text-white'}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat text box container */}
          <div className="flex items-center gap-2">
            {/* Hidden file selector */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />

            <div className={`flex-1 border rounded-2xl flex items-center pr-2 pl-3 py-1 bg-[#EEF2FF]/10 focus-within:bg-white focus-within:border-[#6366F1] focus-within:ring-2 focus-within:ring-[#6366F1]/10 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border border-white/15'
            }`}>
              {/* Paperclip attachment button */}
              <button 
                onClick={() => !loading && !pdfLoading && fileInputRef.current?.click()}
                disabled={loading || pdfLoading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer shrink-0 ${
                  isLight ? 'text-slate-400 hover:text-slate-655' : 'text-white/40 hover:text-white'
                }`}
                title="Attach PDF context"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                className={`flex-1 bg-transparent py-2.5 px-2.5 outline-none resize-none text-sm max-h-28 overflow-y-auto leading-relaxed ${
                  isLight ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-white/25'
                }`}
                placeholder={
                  pdfLoading ? "Extracting PDF…" :
                  loading ? "AI is thinking…" :
                  pdfFile ? `Ask about "${pdfFile.name}"...` :
                  language === "hindi" ? "यहाँ अपना प्रश्न लिखें (Ctrl+Enter)..." :
                  "Ask your question..."
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || pdfLoading}
                rows={1}
                maxLength={1000}
              />

              {/* Character limit counter */}
              {input.length > 800 && (
                <span className={`text-[10px] font-bold mr-2 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>{input.length}/1000</span>
              )}

              {/* Voice input mic trigger */}
              <button
                onClick={handleMic}
                disabled={loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 mr-1.5 ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 animate-pulse' 
                    : isLight 
                      ? 'text-slate-400 hover:text-slate-600'
                      : 'text-white/40 hover:text-white'
                }`}
                title={isRecording ? "Recording..." : "Voice Input"}
              >
                {isRecording ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>

              {/* Send submit button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-[#6366F1] hover:bg-[#5053db] shadow-md shadow-indigo-500/10'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-2 mt-2 select-none">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-white/25'}`}>CTRL+ENTER TO SEND</span>
            <span className={`text-[9px] font-bold ${isLight ? 'text-slate-400' : 'text-white/20'}`}>MLSU AI Tutor Assistant</span>
          </div>
        </div>

      </div>

      {/* ── FLAG ANSWER INACCURACY DIALOG MODAL ── */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0F172A] border-white/10 text-white'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                <Flag className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-outfit">Report Inaccurate Answer</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                  Help us train the AI to better follow MLSU guidelines.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                Explain why this answer is wrong or incorrect:
              </label>
              <textarea
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder="e.g., The normal form definition is wrong, or the dynamic programming complexity listed is incorrect for MLSU exams..."
                className={`w-full h-28 p-3 rounded-xl border outline-none text-xs resize-none leading-relaxed ${
                  isLight ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 text-slate-800' : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'
                }`}
                maxLength={500}
                disabled={flagLoading}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-650' : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
                disabled={flagLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleFlagSubmit}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer"
                disabled={flagLoading}
              >
                {flagLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                <span>Submit Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
