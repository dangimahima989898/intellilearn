import { useState, useEffect, useRef, useCallback } from "react"
import {
  Bot, Send, Mic, MicOff, Copy, Check, Trash2,
  GitBranch, Database, Monitor, Network, Coffee, Code,
  ChevronRight, Loader2, AlertCircle, Clock,
  Sparkles, BookOpen, Paperclip, X, FileText,
  ChevronLeft, Languages
} from "lucide-react"
import { sendMessage, getSubjects, getProviderStatus, uploadPdf } from "../../services/chatbotService"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import toast from "react-hot-toast"

const ICON_MAP = { GitBranch, Database, Monitor, Network, Coffee, Code }

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
        isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'
      } ${
        small ? isLight ? 'px-2 py-0.5 rounded bg-slate-200/50 border border-slate-200' : 'px-2 py-0.5 rounded bg-white/5 border border-white/5' : ''
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {!small && <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  )
}

export default function ChatbotPage() {
  const { user } = useAuth()

  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("DSA")
  const [language, setLanguage] = useState("english")
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

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {})
    getProviderStatus().then(s => {
      setProviderStatus(s)
      setLastProvider(Object.entries(s).find(([, v]) => v)?.[0] ?? "none")
    }).catch(() => {})
  }, [])

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

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = { id: Date.now(), role: "user", content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const history = [...messages, userMsg]
      .slice(-10)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))

    try {
      const data = await sendMessage(text, selectedSubject, language, history.slice(0, -1), pdfContext)
      setLastProvider(data.provider_used || lastProvider)
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response,
        suggestedTopic: data.suggested_topic,
        ts: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
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
  }, [input, loading, messages, selectedSubject, language, pdfContext, lastProvider])

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
      toast.error("Speech recognition not supported.")
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
      toast.error("Voice input failed.")
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

  const { theme } = useTheme()
  const isLight = theme === 'light'

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "ST"

  const providerLabel =
    lastProvider === "groq" ? "Groq Llama-3" :
    lastProvider === "openai" ? "GPT-4o" :
    lastProvider === "gemini" ? "Gemini 1.5" : "AI Tutor Active"

  const WELCOME_SUGGESTIONS = [
    "Explain Binary Tree",
    "What is Big O notation?",
    "Explain DBMS normalization",
    "Help me prepare for exam",
    "Generate quiz questions"
  ]

  return (
    <div className={`flex h-[calc(100vh-6rem)] border rounded-2xl overflow-hidden shadow-2xl transition-all ${
      isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
    }`}>
      
      {/* ── LEFT PANEL ── */}
      <aside className={`w-72 flex-shrink-0 flex flex-col p-4 overflow-y-auto ${
        isLight ? 'bg-slate-50 border-r border-slate-200' : 'bg-[#0F172A] border-r border-white/10'
      }`}>
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
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              AI Active
            </p>
          </div>
        </div>

        <div className={`h-px my-3.5 ${isLight ? 'bg-slate-250' : 'bg-white/10'}`} />

        {/* Subject selector */}
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
            Select Subject
          </label>
          <div className="flex flex-col gap-1.5">
            {subjects.map(s => {
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
                        ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-800 border-transparent'
                        : 'hover:bg-white/5 text-white/50 hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs uppercase tracking-wide font-medium">{s.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${
                    isLight 
                      ? 'bg-slate-200/50 text-slate-500 border-slate-350/40' 
                      : 'bg-white/5 text-white/40 border-white/5'
                  }`}>
                    {QUICK_QUESTIONS[s.code]?.length || 4} topics
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={`h-px my-3.5 ${isLight ? 'bg-slate-250' : 'bg-white/10'}`} />

        {/* Language selector */}
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
            Language
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage("english")}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                language === "english"
                  ? isLight
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-800 bg-slate-100 border-slate-200'
                    : 'text-white/40 hover:text-white bg-white/5 border-white/10'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setLanguage("hindi")}
              className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                language === "hindi"
                  ? isLight
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-800 bg-slate-100 border-slate-200'
                    : 'text-white/40 hover:text-white bg-white/5 border-white/10'
              }`}
            >
              🇮🇳 हिंदी
            </button>
          </div>
        </div>

        <div className={`h-px my-3.5 ${isLight ? 'bg-slate-250' : 'bg-white/10'}`} />

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

        {/* Clear Conversation at the bottom */}
        <div className="mt-auto pt-4">
          <button 
            onClick={handleClearChat}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs border border-dashed cursor-pointer transition-colors ${
              isLight 
                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-300 hover:border-red-200' 
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
        
        {/* Chat header */}
        <div className={`h-14 border-b flex items-center justify-between px-6 ${
          isLight ? 'bg-white border-slate-200/80' : 'bg-[#0F172A] border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <p className={`text-sm font-semibold leading-tight font-outfit uppercase tracking-wide ${
                isLight ? 'text-slate-800' : 'text-white'
              }`}>
                MLSU AI Tutor Assistant
              </p>
              <p className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                {activeSubject?.name || selectedSubject} • Active in {language === "hindi" ? "हिंदी" : "English"}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isLight 
              ? 'bg-violet-50 border-violet-200 text-violet-600' 
              : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}>
            {providerLabel}
          </span>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center select-none my-auto max-w-2xl mx-auto px-4 w-full">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center p-2 mb-6 ${
                isLight ? 'bg-white shadow-md border border-slate-200/60' : 'bg-white/5 border border-white/10'
              }`}>
                <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className={`font-outfit font-extrabold text-2xl tracking-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
                Hi! I'm your MLSU AI Tutor
              </h2>
              <p className={`text-sm max-w-md mt-2 px-4 leading-relaxed ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                Welcome to the MLSU Student Portal. Ask doubts, learn concepts, upload study notes, and study smarter for your exams.
              </p>

              <div className="mt-8 w-full">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                  Suggested Topics & Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                  {WELCOME_SUGGESTIONS.map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleSend(q)}
                      className={`text-xs px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer font-medium leading-snug flex items-center justify-between group ${
                        isLight 
                          ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-350 hover:shadow-sm' 
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span>{q}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 ${
                        isLight ? 'text-slate-400 group-hover:text-slate-650' : 'text-white/30 group-hover:text-white/60'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages list items */}
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-4 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              
              {/* Bot icon avatar */}
              {msg.role === "assistant" && (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center p-1.5 shrink-0 shadow-sm ${
                  isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
                }`}>
                  <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
                </div>
              )}

              {/* Message bubble */}
              <div 
                className={`px-6 py-4 rounded-2xl relative group ${
                  msg.role === "user" 
                    ? isLight
                      ? "max-w-[70%] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-tr-none text-white shadow-md shadow-blue-500/10"
                      : "max-w-[70%] bg-blue-600/80 rounded-tr-none text-white" 
                    : isLight
                      ? "max-w-[75%] bg-white border border-slate-200/80 rounded-tl-none text-slate-800 shadow-sm"
                      : "max-w-[75%] bg-white/5 border border-white/10 rounded-tl-none text-white/90"
                }`}
              >
                {/* Copy button hovering inside AI bubbles */}
                {msg.role === "assistant" && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <CopyButton text={msg.content} small isLight={isLight} />
                  </div>
                )}

                <div>
                  {msg.role === "assistant" 
                    ? <FormattedMessage text={msg.content} isLight={isLight} /> 
                    : <span className="text-sm font-medium leading-relaxed break-words whitespace-pre-line">{msg.content}</span>
                  }
                </div>

                {/* Suggested topic path chip */}
                {msg.role === "assistant" && msg.suggestedTopic && (
                  <div className={`mt-4 pt-3 flex flex-wrap gap-2 border-t ${
                    isLight ? 'border-slate-100' : 'border-white/5'
                  }`}>
                    <button
                      onClick={() => setInput(`Explain more about: ${msg.suggestedTopic}`)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer border ${
                        isLight 
                          ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                          : 'bg-blue-500/15 border-blue-500/20 text-blue-300 hover:bg-blue-500/25'
                      }`}
                    >
                      📚 Next: {msg.suggestedTopic}
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[9px] mt-3 flex items-center gap-1 ${
                  msg.role === "user" 
                    ? "justify-end text-white/50" 
                    : isLight ? "justify-start text-slate-400" : "justify-start text-white/30"
                }`}>
                  <Clock className="w-2.5 h-2.5" />
                  {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* User initials initials avatar */}
              {msg.role === "user" && (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                  isLight 
                    ? 'bg-blue-100 border-blue-200 text-blue-700' 
                    : 'bg-blue-500/30 border-blue-500/20 text-blue-300'
                }`}>
                  {initials}
                </div>
              )}

            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3 w-full justify-start">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center p-1.5 shrink-0 shadow-sm ${
                isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
              }`}>
                <img src="/mlsu-logo.png" alt="MLSU Logo" className="w-full h-full object-contain" />
              </div>
              <div className={`px-5 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 h-9 shrink-0 ${
                isLight ? 'bg-white border border-slate-200' : 'bg-white/5 border border-white/10'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-bounce ${isLight ? 'bg-slate-400' : 'bg-white/30'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${isLight ? 'bg-slate-400' : 'bg-white/30'}`} style={{ animationDelay: '150ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${isLight ? 'bg-slate-400' : 'bg-white/30'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

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
          <div className="flex items-end gap-3">
            {/* Hidden file selector */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />

            <div className={`flex-1 border rounded-2xl flex items-end pr-2 pl-3 ${
              isLight ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500' : 'bg-white/5 border border-white/15'
            }`}>
              {/* Paperclip attachment button */}
              <button 
                onClick={() => !loading && !pdfLoading && fileInputRef.current?.click()}
                disabled={loading || pdfLoading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer shrink-0 mb-1.5 ${
                  isLight ? 'text-slate-400 hover:text-slate-650' : 'text-white/40 hover:text-white'
                }`}
                title="Attach PDF context"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                className={`flex-1 bg-transparent py-3 px-1 outline-none resize-none text-sm max-h-28 overflow-y-auto leading-relaxed ${
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
                <span className={`text-[10px] font-bold mb-3.5 mr-2 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>{input.length}/1000</span>
              )}
            </div>

            {/* Mic trigger */}
            <button
              onClick={handleMic}
              disabled={loading}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isRecording 
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' 
                  : isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/50 hover:text-white'
              }`}
              title={isRecording ? "Recording..." : "Voice Input"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send submit button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all cursor-pointer shrink-0 ${
                isLight 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/10'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-between items-center px-2 mt-2 select-none">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/25'}`}>Ctrl+Enter to send</span>
            <span className={`text-[9px] font-bold ${isLight ? 'text-slate-300' : 'text-white/20'}`}>MLSU AI Tutor Assistant v1.0</span>
          </div>
        </div>

      </div>

    </div>
  )
}
