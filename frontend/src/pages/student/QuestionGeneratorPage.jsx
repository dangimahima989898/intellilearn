import { useState, useEffect } from "react"
import { 
  GitBranch, Database, Monitor, Network, Coffee, Code, 
  HelpCircle, ArrowRight, ArrowLeft, Check, X, Award, 
  Download, RefreshCw, Sparkles, BookOpen, BrainCircuit, Loader2
} from "lucide-react"
import { getSubjects } from "../../services/chatbotService"
import { generateQuestions, submitPractice } from "../../services/questionService"
import quizService from "../../services/quizService"
import toast from "react-hot-toast"
import PageWrapper from "../../components/PageWrapper"
import { useTheme } from "../../context/ThemeContext"

const SUBJECT_DETAILS = {
  DSA: { icon: GitBranch, color: "from-blue-600 to-indigo-600", accent: "#3B82F6", textAccent: "text-blue-400" },
  DBMS: { icon: Database, color: "from-purple-600 to-pink-600", accent: "#8B5CF6", textAccent: "text-purple-400" },
  OS: { icon: Monitor, color: "from-emerald-600 to-teal-600", accent: "#10B981", textAccent: "text-emerald-400" },
  CN: { icon: Network, color: "from-amber-600 to-orange-600", accent: "#F59E0B", textAccent: "text-amber-400" },
  JAVA: { icon: Coffee, color: "from-red-600 to-rose-600", accent: "#EF4444", textAccent: "text-red-400" },
  PYTHON: { icon: Code, color: "from-cyan-600 to-blue-600", accent: "#06B6D4", textAccent: "text-cyan-400" }
}

export default function QuestionGeneratorPage() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState("setup") // "setup" | "practice" | "results"
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [count, setCount] = useState(5)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [availableTopics, setAvailableTopics] = useState({})
  const [topicsLoading, setTopicsLoading] = useState(false)

  // Practice State
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  const [submittedAnswers, setSubmittedAnswers] = useState({}) 
  const [isCurrentAnswerSubmitted, setIsCurrentAnswerSubmitted] = useState(false)
  const [activeResults, setActiveResults] = useState(null) 
  const [expandedReviewId, setExpandedReviewId] = useState(null)
  const [questionWarning, setQuestionWarning] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSubjects()
        setSubjects(data || [])
      } catch (err) {
        toast.error("Failed to load subjects.")
      } finally {
        setLoadingSubjects(false)
      }
    }
    load()
  }, [])

  const handleSelectSubject = (sub) => {
    const hasMaterials = sub.notes_count > 0 || sub.chunks_count > 0;
    if (!hasMaterials) {
      toast.error(`Cannot select ${sub.name}: Study materials or topics are missing.`);
      return;
    }
    // Immediately clear topics to prevent stale loading state
    setAvailableTopics({})
    setTopic("")
    setTopicsLoading(true)
    setSelectedSubject(sub)
    setStep(2)
  }

  // Fetch available topics when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setAvailableTopics({})
      setTopic("")
      return
    }
    const fetchTopics = async () => {
      setTopicsLoading(true)
      try {
        const data = await quizService.getTopics(selectedSubject.id)
        if (data && Object.keys(data).length > 0) {
          setAvailableTopics(data)
        } else {
          setAvailableTopics({
            "Syllabus Topics": selectedSubject.topics || []
          })
        }
      } catch (err) {
        setAvailableTopics({
          "Syllabus Topics": selectedSubject.topics || []
        })
      } finally {
        setTopicsLoading(false)
      }
    }
    fetchTopics()
  }, [selectedSubject])

  const handleGenerate = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject first.")
      setStep(1)
      return
    }
    const hasMaterials = selectedSubject.notes_count > 0 || selectedSubject.chunks_count > 0;
    if (!hasMaterials) {
      toast.error("Study materials or topics are missing for this subject.")
      setStep(1)
      return
    }
    if (!topic.trim()) {
      toast.error("Please enter or select a topic.")
      setStep(2)
      return
    }

    setLoadingGenerate(true)
    setQuestionWarning(null)
    try {
      const data = await generateQuestions(selectedSubject.code, topic.trim(), difficulty, count)
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions were returned. Please try again.")
      }
      setQuestions(data.questions)
      setCurrentIdx(0)
      setSelectedAnswers({})
      setSubmittedAnswers({})
      setIsCurrentAnswerSubmitted(false)
      setActiveResults(null)
      setMode("practice")
      if (data.warning) {
        setQuestionWarning(data.warning)
      }
      toast.success(`Generated ${data.questions.length} questions successfully!`)
    } catch (err) {
      toast.error(err.message || "Failed to generate questions. Try again.")
    } finally {
      setLoadingGenerate(false)
    }
  }

  const handleSingleAnswerSubmit = () => {
    const currentQ = questions[currentIdx]
    const selected = selectedAnswers[currentQ.id]
    if (!selected) {
      toast.error("Please select an option first.")
      return
    }

    const correctAns = currentQ.correct_answer.toLowerCase().trim()
    const isCorrect = selected === correctAns
    
    setSubmittedAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        isCorrect,
        selected,
        correct: correctAns,
        explanation: currentQ.explanation
      }
    }))
    
    setIsCurrentAnswerSubmitted(true)
    
    if (isCorrect) {
      toast.success("Correct answer! 🎉")
    } else {
      toast.error("Incorrect answer. Read the explanation below.")
    }
  }

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setIsCurrentAnswerSubmitted(false)
    } else {
      submitFinalPractice()
    }
  }

  const submitFinalPractice = async () => {
    const formattedAnswers = Object.entries(selectedAnswers).map(([qid, ans]) => ({
      question_id: qid,
      selected_answer: ans
    }))

    try {
      const res = await submitPractice(questions.map(q => q.id), formattedAnswers)
      setActiveResults(res)
      setMode("results")
    } catch (err) {
      toast.error("Failed to compile final score.")
    }
  }

  const resetGenerator = () => {
    setStep(1)
    setSelectedSubject(null)
    setTopic("")
    setDifficulty("medium")
    setCount(5)
    setMode("setup")
  }

  const getDiffBadge = (diff) => {
    const d = diff.toLowerCase()
    if (d === "easy") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    if (d === "hard") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
    return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  }

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className={`text-3xl font-outfit font-extrabold mb-2 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <BrainCircuit className="w-8 h-8 text-blue-400 shrink-0" />
            AI Question Generator
          </h1>
          <p className={`text-sm ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
            Generate custom, syllabus-aligned multiple choice questions for exam practice.
          </p>
        </div>
      </div>

      {/* ── SETUP MODE ── */}
      {mode === "setup" && (
        <div className="space-y-8 animate-fade-in">
          
          {/* STEP INDICATORS */}
          <div className={`border rounded-2xl p-5 flex justify-between items-center max-w-2xl mx-auto relative overflow-hidden ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            {[1, 2, 3, 4].map((s, idx) => {
              const isCompleted = step > s
              const isCurrent = step === s
              const isFuture = step < s
              
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2.5 z-10">
                    <button
                      disabled={s > step && !selectedSubject}
                      onClick={() => setStep(s)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-[#8B5CF6] text-white"
                          : isCurrent
                          ? "border-2 border-[#8B5CF6] text-[#8B5CF6] bg-transparent font-extrabold shadow-lg shadow-[#8B5CF6]/15"
                          : "bg-white/5 border border-white/10 text-white/30"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : s}
                    </button>
                    <span className={`text-xs font-bold hidden sm:inline ${isCurrent ? (isLight ? 'text-slate-800' : 'text-white') : (isLight ? 'text-slate-400' : 'text-white/40')}`}>
                      {s === 1 && "Subject"}
                      {s === 2 && "Topic"}
                      {s === 3 && "Difficulty"}
                      {s === 4 && "Configure"}
                    </span>
                  </div>
                  {s < 4 && (
                    <div className={`flex-1 h-[2px] mx-4 hidden sm:block ${isCompleted ? 'bg-[#8B5CF6]' : 'bg-white/10'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* STEP 1: CHOOSE A SUBJECT */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className={`text-xl font-bold text-center font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Step 1: Choose a Subject</h2>
              {loadingSubjects ? (
                <div className={`text-center py-12 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Loading syllabus topics...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {subjects.map((sub) => {
                    const detail = SUBJECT_DETAILS[sub.code] || { icon: BookOpen, color: "from-blue-600 to-indigo-650", accent: "#3B82F6", textAccent: "text-blue-400" }
                    const Icon = detail.icon
                    const isSel = selectedSubject?.code === sub.code
                    const hasMaterials = sub.notes_count > 0 || sub.chunks_count > 0;

                    return (
                      <button
                        key={sub.code}
                        onClick={() => handleSelectSubject(sub)}
                        className={`border rounded-2xl p-5 text-left transition-all hover:-translate-y-1 duration-300 flex flex-col justify-between cursor-pointer group ${
                          isSel 
                            ? "border-2 border-[#3B82F6] bg-[#3B82F6]/10 scale-105 shadow-xl shadow-blue-500/10" 
                            : isLight ? "bg-white border-slate-200 hover:border-blue-300" : "bg-white/5 border-white/10 hover:border-white/20"
                        } ${!hasMaterials ? "opacity-60" : ""}`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className={`p-3 rounded-xl inline-block bg-white/5 text-white group-hover:scale-110 transition-transform`} style={{ color: detail.accent }}>
                              <Icon className="w-6 h-6" />
                            </div>
                            {!hasMaterials && (
                              <span className="text-[8px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={`Notes: ${sub.notes_count || 0}, Chunks: ${sub.chunks_count || 0}, Topics: ${sub.topics_list?.length || 0}`}>
                                Missing Content
                              </span>
                            )}
                          </div>
                          <h3 className={`text-md font-bold mb-1 line-clamp-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{sub.name}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${detail.textAccent}`}>{sub.code}</span>
                        </div>
                        <p className={`text-xs mt-3.5 font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                          {sub.topics_list?.length || 0} topics listed
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DEFINE THE TOPIC */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <h2 className={`text-xl font-bold text-center font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Step 2: Select a Topic</h2>
              <div className={`border rounded-2xl p-6 space-y-4 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <label className={`block text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-white'}`}>Choose a topic from uploaded syllabus:</label>
                
                {topicsLoading ? (
                  <div className={`flex items-center gap-2 py-4 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading topics for {selectedSubject?.name}...</span>
                  </div>
                ) : Object.keys(availableTopics).length === 0 ? (
                  <div className={`py-6 text-center border border-dashed rounded-xl ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <p className="text-amber-500 text-sm font-semibold">No topics available for this subject.</p>
                    <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Ask your faculty to upload study materials first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all font-medium ${
                        isLight 
                          ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500 focus:ring-violet-500/50" 
                          : "bg-white/5 border-white/15 text-white focus:border-violet-500 focus:ring-violet-500/50"
                      }`}
                    >
                      <option value="">Select a topic...</option>
                      {Object.entries(availableTopics)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([unit, topics]) => (
                          <optgroup key={unit} label={unit}>
                            {topics.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </optgroup>
                        ))}
                    </select>

                    {/* Quick topic chips */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Object.values(availableTopics).flat().slice(0, 8).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTopic(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                            topic === t 
                              ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                              : isLight ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!topic.trim()}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-sm font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DIFFICULTY */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <h2 className={`text-xl font-bold text-center font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Step 3: Choose Difficulty</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: "easy", name: "Easy 🟢", color: "border-green-500 bg-green-500/10", border: "border-white/10 hover:border-green-500/40 hover:bg-green-500/5", desc: "Basic concepts, core definitions" },
                  { key: "medium", name: "Medium 🟡", color: "border-yellow-500 bg-yellow-500/10", border: "border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/5", desc: "Scenario application, analytical metrics" },
                  { key: "hard", name: "Hard 🔴", color: "border-red-500 bg-red-500/10", border: "border-white/10 hover:border-red-500/40 hover:bg-red-500/5", desc: "Tricky edge cases, university exam questions" }
                ].map((d) => {
                  const isSel = difficulty === d.key
                  return (
                    <button
                      key={d.key}
                      onClick={() => setDifficulty(d.key)}
                      className={`flex flex-col p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSel ? d.color : d.border
                      }`}
                    >
                      <h4 className={`font-bold text-md mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>{d.name}</h4>
                      <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-500' : 'text-white/40'}`}>{d.desc}</p>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-sm font-bold text-white transition-colors cursor-pointer"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COUNT & CONFIGURE */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <h2 className={`text-xl font-bold text-center font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Step 4: Finalize Settings</h2>
              
              <div className={`border rounded-2xl p-6 space-y-6 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-white'}`}>Number of questions:</label>
                    <span className="text-3xl font-black text-[#8B5CF6]">{count}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6] ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}
                  />
                  <div className={`flex justify-between text-[10px] font-bold px-1 mt-1.5 uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                    <span>1 question</span>
                    <span>5</span>
                    <span>10 questions</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 text-center">
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Questions will be generated dynamically by artificial intelligence.</p>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  disabled={loadingGenerate}
                  onClick={handleGenerate}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-95 text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loadingGenerate ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating AI Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" /> Generate Questions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── PRACTICE MODE ── */}
      {mode === "practice" && questions.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Bank exhausted warning banner */}
          {questionWarning && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-xs font-semibold leading-relaxed">{questionWarning}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Box Card */}
          <div className={`border rounded-2xl p-8 shadow-2xl space-y-6 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <div className={`flex justify-between items-center pb-2 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getDiffBadge(difficulty)}`}>
                  {difficulty}
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                  {selectedSubject?.code}
                </span>
              </div>
            </div>

            <h3 className={`text-xl font-outfit font-semibold leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>
              {questions[currentIdx].question_text}
            </h3>

            {/* Answer Options */}
            <div className="flex flex-col gap-3 mt-6">
              {[
                { key: "a", text: questions[currentIdx].option_a },
                { key: "b", text: questions[currentIdx].option_b },
                { key: "c", text: questions[currentIdx].option_c },
                { key: "d", text: questions[currentIdx].option_d }
              ].map((opt) => {
                const qId = questions[currentIdx].id
                const isSelected = selectedAnswers[qId] === opt.key
                const isSubmitted = isCurrentAnswerSubmitted
                const corrAns = questions[currentIdx].correct_answer.toLowerCase().trim()
                const isCorrect = corrAns === opt.key
                const userSelected = submittedAnswers[qId]?.selected === opt.key

                let classes = "bg-white/5 border border-white/10 text-white/80 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5"
                if (isSubmitted) {
                  if (isCorrect) {
                    classes = "bg-green-500/15 border-green-500/30 text-green-300"
                  } else if (userSelected) {
                    classes = "bg-red-500/15 border-red-500/30 text-red-300"
                  } else {
                    classes = "bg-white/3 border border-white/5 text-white/20 opacity-50"
                  }
                } else if (isSelected) {
                  classes = "bg-blue-500/15 border-blue-500 text-blue-300 font-semibold"
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isSubmitted}
                    onClick={() => setSelectedAnswers(prev => ({ ...prev, [qId]: opt.key }))}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl text-left text-sm transition-all cursor-pointer border ${classes}`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-mono font-bold text-white/60 shrink-0 uppercase">
                      {opt.key}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {/* Explanation card (slides down after answer) */}
            {isCurrentAnswerSubmitted && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-4 animate-slide-down">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
                  💡 Explanation:
                </span>
                <p className="text-white/70 text-sm leading-relaxed">
                  {questions[currentIdx].explanation || "No explanation provided."}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center gap-4">
            <button
              onClick={resetGenerator}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Quit Practice
            </button>

            {!isCurrentAnswerSubmitted ? (
              <button
                onClick={handleSingleAnswerSubmit}
                disabled={!selectedAnswers[questions[currentIdx].id]}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 text-xs font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer"
              >
                {currentIdx < questions.length - 1 ? "Next Question →" : "Finish & Score"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS SCREEN ── */}
      {mode === "results" && activeResults && (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <div className={`border rounded-2xl p-8 text-center space-y-6 shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <h2 className={`text-2xl font-extrabold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>Practice Finished!</h2>
            
            {/* Score ring */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="#3B82F6" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray="263.8"
                  strokeDashoffset={263.8 - (263.8 * activeResults.score) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="relative flex flex-col items-center">
                <span className="text-4xl font-outfit font-bold text-white">{activeResults.correct_count}</span>
                <span className="text-white/50 text-xs font-bold">/ {activeResults.total}</span>
              </div>
            </div>

            {/* Performance badge */}
            <div className="pt-2">
              <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest ${
                activeResults.score >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 animate-pulse' :
                activeResults.score >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35' :
                'bg-red-500/20 text-red-400 border border-red-500/35'
              }`}>
                {activeResults.score >= 80 ? "Excellent" : activeResults.score >= 50 ? "Good" : "Keep Practicing"}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-center">
              <div className="bg-white/3 border border-white/5 rounded-xl p-3.5">
                <span className="text-emerald-400 text-lg font-bold">{activeResults.correct_count}</span>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Correct</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-3.5">
                <span className="text-red-400 text-lg font-bold">{activeResults.total - activeResults.correct_count}</span>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Wrong</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-3.5">
                <span className="text-blue-400 text-lg font-bold">1.5m</span>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Time Spent</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={resetGenerator}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors text-xs cursor-pointer"
              >
                Generate New Set
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-bold transition-all shadow-md text-xs cursor-pointer"
              >
                Download PDF
              </button>
            </div>
          </div>

          {/* Review Accordion */}
          <div className="space-y-3">
            <h3 className={`text-lg font-bold font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Review Answers</h3>
            
            {questions.map((q, idx) => {
              const uAns = selectedAnswers[q.id]
              const correctAns = q.correct_answer.toLowerCase().trim()
              const isCorrect = uAns === correctAns
              const isOpen = expandedReviewId === q.id

              return (
                    <div className={`border rounded-2xl overflow-hidden shadow ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                  <button
                    onClick={() => setExpandedReviewId(isOpen ? null : q.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 rounded-lg ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                    <span className={`text-sm font-semibold truncate max-w-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Q{idx + 1}: {q.question_text}
                      </span>
                    </div>
                    <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{isOpen ? 'Close' : 'Review'}</span>
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-black/20 border-t border-white/10 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { k: 'a', text: q.option_a },
                          { k: 'b', text: q.option_b },
                          { k: 'c', text: q.option_c },
                          { k: 'd', text: q.option_d }
                        ].map((opt) => {
                          const isCorr = correctAns === opt.k
                          const isSelected = uAns === opt.k
                          let borderClass = 'border-white/10 text-white/60 bg-white/5'
                          if (isCorr) borderClass = 'border-green-500/40 bg-green-500/10 text-green-300'
                          else if (isSelected) borderClass = 'border-red-500/40 bg-red-500/10 text-red-300'

                          return (
                            <div key={opt.k} className={`p-3 rounded-lg border flex items-center gap-2 ${borderClass}`}>
                              <span className="font-bold uppercase">{opt.k}:</span>
                              <span>{opt.text}</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-xs leading-relaxed">
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Explanation:</span>
                        <p className="text-white/70">{q.explanation || 'No explanation provided.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      )}
    </PageWrapper>
  )
}
