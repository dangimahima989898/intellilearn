import { useState, useEffect } from "react"
import { 
  GitBranch, Database, Monitor, Network, Coffee, Code, 
  HelpCircle, ArrowRight, ArrowLeft, Check, X, Award, 
  Download, RefreshCw, Sparkles, BookOpen, BrainCircuit 
} from "lucide-react"
import { getSubjects } from "../../services/chatbotService"
import { generateQuestions, submitPractice } from "../../services/questionService"
import toast from "react-hot-toast"

const SUBJECT_DETAILS = {
  DSA: { icon: GitBranch, color: "from-blue-600 to-indigo-600", accent: "text-blue-400", border: "border-blue-500/30" },
  DBMS: { icon: Database, color: "from-purple-600 to-pink-600", accent: "text-purple-400", border: "border-purple-500/30" },
  OS: { icon: Monitor, color: "from-emerald-600 to-teal-600", accent: "text-emerald-400", border: "border-emerald-500/30" },
  CN: { icon: Network, color: "from-amber-600 to-orange-600", accent: "text-amber-400", border: "border-amber-500/30" },
  JAVA: { icon: Coffee, color: "from-red-600 to-rose-600", accent: "text-red-400", border: "border-red-500/30" },
  PYTHON: { icon: Code, color: "from-cyan-600 to-blue-600", accent: "text-cyan-400", border: "border-cyan-500/30" }
}

export default function QuestionGeneratorPage() {
  // Navigation & Config State
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState("setup") // "setup" | "practice" | "results"
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  
  // Selection State
  const [selectedSubject, setSelectedSubject] = useState(null) // Object from SUBJECTS
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium") // "easy" | "medium" | "hard"
  const [count, setCount] = useState(5)
  const [loadingGenerate, setLoadingGenerate] = useState(false)

  // Practice State
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionId: "a"/"b"/"c"/"d" }
  const [submittedAnswers, setSubmittedAnswers] = useState({}) // { questionId: { isCorrect, selected, correct, explanation } }
  const [isCurrentAnswerSubmitted, setIsCurrentAnswerSubmitted] = useState(false)
  const [activeResults, setActiveResults] = useState(null) // { results: [...], score, correct_count, total }
  const [expandedReviewId, setExpandedReviewId] = useState(null)

  // Fetch subjects for metadata
  useEffect(() => {
    async function load() {
      try {
        const data = await getSubjects()
        setSubjects(data)
      } catch (err) {
        toast.error("Failed to load subject topics.")
      } finally {
        setLoadingSubjects(false)
      }
    }
    load()
  }, [])

  // Handle subject select
  const handleSelectSubject = (sub) => {
    setSelectedSubject(sub)
    setTopic("") // Reset topic on subject change
    setStep(2)
  }

  // Handle Generate Questions
  const handleGenerate = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject first.")
      setStep(1)
      return
    }
    if (!topic.trim()) {
      toast.error("Please enter or select a topic.")
      setStep(2)
      return
    }

    setLoadingGenerate(true)
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
      toast.success(`Successfully generated ${data.questions.length} questions!`)
    } catch (err) {
      toast.error(err.message || "Failed to generate questions. Please check your API key / connection.")
    } finally {
      setLoadingGenerate(false)
    }
  }

  // Submit Answer for the current question in single mode
  const handleSingleAnswerSubmit = () => {
    const currentQ = questions[currentIdx]
    const selected = selectedAnswers[currentQ.id]
    if (!selected) {
      toast.error("Please select an option first.")
      return
    }

    const isCorrect = selected === currentQ.correct_answer.toLowerCase().strip()
    
    // Save locally
    setSubmittedAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        isCorrect,
        selected,
        correct: currentQ.correct_answer,
        explanation: currentQ.explanation
      }
    }))
    
    setIsCurrentAnswerSubmitted(true)
    
    if (isCorrect) {
      toast.success("Correct answer! 🎉")
    } else {
      toast.error("Incorrect answer. Check the explanation below.")
    }
  }

  // Next Question
  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setIsCurrentAnswerSubmitted(false)
    } else {
      // Last question completed, now compile final results
      submitFinalPractice()
    }
  }

  // Submit final results to backend to sync/validate
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

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Helper colors
  const getDiffBadge = (diff) => {
    const d = diff.toLowerCase()
    if (d === "easy") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    if (d === "hard") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
    return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  }

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:text-black print:p-0">
      
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white mb-2 flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-brand" />
            AI Question Generator
          </h1>
          <p className="text-navy-400 text-sm">
            Generate custom, syllabus-aligned multiple choice questions for exam practice.
          </p>
        </div>
      </div>

      {/* ── SETUP MODE ── */}
      {mode === "setup" && (
        <div className="space-y-6 print:hidden">
          
          {/* STEP INDICATORS */}
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 flex justify-between items-center max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  disabled={s > step && !selectedSubject}
                  onClick={() => setStep(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step === s 
                      ? "bg-brand text-white ring-4 ring-brand/20" 
                      : step > s 
                        ? "bg-brand/20 text-brand border border-brand/30" 
                        : "bg-navy-900 text-navy-500 border border-navy-800"
                  }`}
                >
                  {s}
                </button>
                <span className={`text-xs font-semibold hidden sm:inline ${step === s ? "text-white" : "text-navy-400"}`}>
                  {s === 1 && "Subject"}
                  {s === 2 && "Topic"}
                  {s === 3 && "Difficulty"}
                  {s === 4 && "Configure"}
                </span>
                {s < 4 && <div className="w-8 h-[2px] bg-navy-700 hidden sm:block" />}
              </div>
            ))}
          </div>

          {/* STEP 1: SELECT SUBJECT */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white text-center">Step 1: Choose a Subject</h2>
              {loadingSubjects ? (
                <div className="text-center text-navy-400 py-12">Loading subject metadata...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {subjects.map((sub) => {
                    const meta = SUBJECT_DETAILS[sub.code] || { icon: BookOpen, color: "from-blue-600 to-indigo-600", accent: "text-blue-400", border: "border-blue-500/20" }
                    const Icon = meta.icon
                    const isSel = selectedSubject?.code === sub.code

                    return (
                      <button
                        key={sub.code}
                        onClick={() => handleSelectSubject(sub)}
                        className={`card relative overflow-hidden bg-navy-800 border p-6 text-left rounded-2xl transition-all hover:scale-[1.02] duration-300 ${
                          isSel ? "border-brand ring-2 ring-brand/55" : "border-navy-700 hover:border-navy-600"
                        }`}
                      >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${meta.color} opacity-10 rounded-bl-full`} />
                        <div className={`p-3 rounded-xl inline-block bg-gradient-to-br ${meta.color} text-white mb-4`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{sub.name}</h3>
                        <p className="text-xs text-brand font-bold uppercase tracking-wider mb-2">{sub.code}</p>
                        <p className="text-navy-400 text-xs line-clamp-2">
                          {sub.topics ? `${sub.topics.length} core modules` : "Standard university syllabus"}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ENTER TOPIC */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-white text-center">Step 2: Define the Topic</h2>
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
                <label className="block text-sm font-semibold text-white">Enter study topic details:</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Binary Trees, SQL Joins, Deadlocks, OSI Model..."
                  className="w-full bg-navy-900 border border-navy-700 text-white rounded-xl px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand/40 outline-none"
                />

                {selectedSubject?.topics && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-navy-400">Suggested Syllabus Topics:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubject.topics.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTopic(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            topic === t 
                              ? "bg-brand/20 text-brand border-brand" 
                              : "bg-navy-900 border-navy-800 text-navy-400 hover:border-navy-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-sm font-bold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!topic.trim()}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE DIFFICULTY */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-white text-center">Step 3: Choose Difficulty</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: "easy", name: "Easy 🟢", desc: "Basic concepts, definitions, straightforward recall questions" },
                  { key: "medium", name: "Medium 🟡", desc: "Application-based, moderate complexity, analytical questions" },
                  { key: "hard", name: "Hard 🔴", desc: "Advanced analysis, tricky edge cases, university exam style" }
                ].map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDifficulty(d.key)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all ${
                      difficulty === d.key 
                        ? "bg-brand/10 border-brand ring-1 ring-brand/30" 
                        : "bg-navy-800 border-navy-700 hover:border-navy-600"
                    }`}
                  >
                    <div className="mt-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${difficulty === d.key ? "border-brand" : "border-navy-500"}`}>
                        {difficulty === d.key && <div className="w-2 h-2 rounded-full bg-brand" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base mb-1">{d.name}</h4>
                      <p className="text-navy-400 text-xs">{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-sm font-bold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-sm font-bold text-white transition-all"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIGURE & GENERATE */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl font-bold text-white text-center">Step 4: Finalize & Generate</h2>
              
              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-white">Number of questions:</label>
                    <span className="text-2xl font-black text-brand">{count}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-navy-950 rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                  <div className="flex justify-between text-[10px] text-navy-400 font-bold px-1">
                    <span>1 QUESTION</span>
                    <span>5</span>
                    <span>10 QUESTIONS</span>
                  </div>
                </div>

                <div className="border-t border-navy-700 pt-4 space-y-3">
                  <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Summary of request:</span>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-navy-900/50 p-4 rounded-xl border border-navy-800">
                    <div>
                      <span className="text-navy-400 block mb-0.5">Subject</span>
                      <span className="text-white font-bold">{selectedSubject?.name} ({selectedSubject?.code})</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block mb-0.5">Topic</span>
                      <span className="text-white font-bold">{topic}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block mb-0.5">Difficulty</span>
                      <span className="text-white font-bold capitalize">{difficulty}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block mb-0.5">Count</span>
                      <span className="text-white font-bold">{count} Questions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-sm font-bold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  disabled={loadingGenerate}
                  onClick={handleGenerate}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {loadingGenerate ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      🤖 Generating questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> Generate Questions
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
        <div className="max-w-3xl mx-auto space-y-6 print:hidden">
          {/* Practice Header */}
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-brand/10 text-brand border border-brand/20 mb-2">
                {selectedSubject?.code}
              </span>
              <h2 className="text-xl font-bold text-white line-clamp-1">{topic}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase ${getDiffBadge(difficulty)}`}>
                {difficulty}
              </span>
              <span className="text-navy-400 text-xs font-bold bg-navy-900 border border-navy-800 px-3 py-1 rounded-md">
                Question {currentIdx + 1} of {questions.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-navy-950 rounded-full h-2">
            <div 
              className="bg-brand h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
              {questions[currentIdx].question_text}
            </h3>

            {/* Options */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { key: "a", text: questions[currentIdx].option_a },
                { key: "b", text: questions[currentIdx].option_b },
                { key: "c", text: questions[currentIdx].option_c },
                { key: "d", text: questions[currentIdx].option_d }
              ].map((opt) => {
                const qId = questions[currentIdx].id
                const isSelected = selectedAnswers[qId] === opt.key
                const isSubmitted = isCurrentAnswerSubmitted
                const isCorrectOpt = questions[currentIdx].correct_answer.toLowerCase().strip() === opt.key
                const userSelectedThis = submittedAnswers[qId]?.selected === opt.key

                let optStyle = "bg-navy-900 border-navy-800 hover:border-navy-700 text-white"
                let icon = null

                if (isSubmitted) {
                  if (isCorrectOpt) {
                    optStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                    icon = <Check className="w-4 h-4 text-emerald-400" />
                  } else if (userSelectedThis) {
                    optStyle = "bg-rose-500/10 border-rose-500 text-rose-400"
                    icon = <X className="w-4 h-4 text-rose-400" />
                  } else {
                    optStyle = "bg-navy-900/40 border-navy-900 text-navy-600 opacity-60"
                  }
                } else if (isSelected) {
                  optStyle = "bg-brand/10 border-brand text-brand ring-1 ring-brand/35"
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isSubmitted}
                    onClick={() => setSelectedAnswers(prev => ({ ...prev, [qId]: opt.key }))}
                    className={`flex items-center justify-between p-4 rounded-xl border text-left text-sm font-semibold transition-all ${optStyle}`}
                  >
                    <span className="flex-1 pr-4">{opt.text}</span>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] bg-navy-950 px-2 py-0.5 rounded border border-navy-800 text-navy-400">
                        {opt.key}
                      </span>
                      {icon}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explanation box */}
            {isCurrentAnswerSubmitted && (
              <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-2 animate-slide-down">
                <span className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> Explanation
                </span>
                <p className="text-navy-300 text-xs sm:text-sm leading-relaxed">
                  {questions[currentIdx].explanation || "No explanation provided."}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={resetGenerator}
              className="px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 text-sm font-bold text-white transition-all"
            >
              Quit Practice
            </button>

            {!isCurrentAnswerSubmitted ? (
              <button
                onClick={handleSingleAnswerSubmit}
                disabled={!selectedAnswers[questions[currentIdx].id]}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-sm font-bold text-white transition-all disabled:opacity-50"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-sm font-bold text-white transition-all"
              >
                {currentIdx < questions.length - 1 ? "Next Question" : "Finish Practice"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS MODE ── */}
      {mode === "results" && activeResults && (
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Printable only view */}
          <div className="hidden print:block text-black bg-white p-6 space-y-6">
            <div className="border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold">IntelliLearn AI MCQ Practice Set</h1>
              <p className="text-sm">Subject: {selectedSubject?.name} | Topic: {topic} | Difficulty: {difficulty}</p>
              <p className="text-sm font-semibold mt-1">Score: {activeResults.correct_count} / {activeResults.total} ({activeResults.score}%)</p>
            </div>
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-2 pb-6 border-b">
                <h3 className="font-bold text-sm">Q{idx + 1}. {q.question_text}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs pl-4">
                  <p>A: {q.option_a}</p>
                  <p>B: {q.option_b}</p>
                  <p>C: {q.option_c}</p>
                  <p>D: {q.option_d}</p>
                </div>
                <p className="text-xs font-bold text-emerald-600 mt-2 pl-4">Correct Answer: {q.correct_answer.toUpperCase()}</p>
                <p className="text-xs italic text-gray-600 pl-4">Explanation: {q.explanation}</p>
              </div>
            ))}
          </div>

          <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 sm:p-8 text-center space-y-6 print:hidden">
            <Award className="w-16 h-16 text-brand mx-auto animate-bounce" />
            
            <div>
              <h2 className="text-2xl font-bold text-white">Practice Finished!</h2>
              <p className="text-navy-400 text-sm mt-1">Here is your performance summary</p>
            </div>

            {/* Score circle */}
            <div className="relative w-36 h-36 mx-auto flex flex-col items-center justify-center rounded-full border-4 border-brand bg-navy-950 shadow-xl shadow-brand/10">
              <span className="text-3xl font-black text-white">{activeResults.correct_count} / {activeResults.total}</span>
              <span className="text-xs text-navy-400 font-bold uppercase mt-1">CORRECT</span>
            </div>

            {/* Performance message */}
            <div>
              <h3 className="text-xl font-bold text-white">
                {activeResults.score >= 80 ? "Excellent! 🎉" : activeResults.score >= 60 ? "Good job! 👍" : "Keep practicing! 💪"}
              </h3>
              <p className="text-navy-400 text-xs mt-1">You scored {activeResults.score}%</p>
            </div>

            {/* Percentage Bar */}
            <div className="w-full bg-navy-950 rounded-full h-3">
              <div 
                className="bg-brand h-3 rounded-full transition-all duration-500"
                style={{ width: `${activeResults.score}%` }}
              />
            </div>

            {/* Print & Return Actions */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-navy-900 border border-navy-700 text-sm font-bold text-white hover:bg-navy-800 transition-all"
              >
                <Download className="w-4 h-4" /> Download as PDF
              </button>
              <button
                onClick={resetGenerator}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-sm font-bold text-white hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Generate New Set
              </button>
            </div>
          </div>

          {/* Question Review Accordion */}
          <div className="space-y-4 print:hidden">
            <h3 className="text-lg font-bold text-white">Review Questions</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const userAns = selectedAnswers[q.id]
                const corrAns = q.correct_answer.toLowerCase().strip()
                const isCorrect = userAns === corrAns
                const isOpen = expandedReviewId === q.id

                return (
                  <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedReviewId(isOpen ? null : q.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-navy-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-white text-sm sm:text-base line-clamp-1">
                          Q{idx + 1}: {q.question_text}
                        </span>
                      </div>
                      <span className="text-xs text-navy-400 font-bold uppercase shrink-0 ml-2">
                        {isOpen ? "Hide" : "Show"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="p-4 bg-navy-900/50 border-t border-navy-700 text-xs sm:text-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <p className={`p-3 rounded-lg border ${corrAns === "a" ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" : userAns === "a" ? "border-rose-500/40 bg-rose-500/5 text-rose-400" : "border-navy-800 text-navy-400"}`}>
                            <strong>A:</strong> {q.option_a}
                          </p>
                          <p className={`p-3 rounded-lg border ${corrAns === "b" ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" : userAns === "b" ? "border-rose-500/40 bg-rose-500/5 text-rose-400" : "border-navy-800 text-navy-400"}`}>
                            <strong>B:</strong> {q.option_b}
                          </p>
                          <p className={`p-3 rounded-lg border ${corrAns === "c" ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" : userAns === "c" ? "border-rose-500/40 bg-rose-500/5 text-rose-400" : "border-navy-800 text-navy-400"}`}>
                            <strong>C:</strong> {q.option_c}
                          </p>
                          <p className={`p-3 rounded-lg border ${corrAns === "d" ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" : userAns === "d" ? "border-rose-500/40 bg-rose-500/5 text-rose-400" : "border-navy-800 text-navy-400"}`}>
                            <strong>D:</strong> {q.option_d}
                          </p>
                        </div>

                        <div className="bg-navy-900 border border-navy-800 p-4 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">EXPLANATION:</span>
                          <p className="text-navy-300 leading-relaxed text-xs sm:text-sm">
                            {q.explanation || "No explanation provided."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// Simple helper polyfill in case strip() doesn't exist
if (!String.prototype.strip) {
  String.prototype.strip = function () {
    return this.replace(/^\s+|\s+$/g, "");
  };
}
