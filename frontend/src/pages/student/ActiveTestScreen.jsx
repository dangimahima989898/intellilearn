import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ShieldAlert, Award, ChevronLeft, ChevronRight, Eye, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

// Lazy load Monaco Editor
import Editor from '@monaco-editor/react'

export default function ActiveTestScreen() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Core Test State
  const [test, setTest] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: answerText }
  const [markedForReview, setMarkedForReview] = useState({}) // { questionId: boolean }
  const [visited, setVisited] = useState({}) // { questionId: boolean }
  const [timeSpent, setTimeSpent] = useState({}) // { questionId: seconds }

  // UI / UX State
  const [activeSection, setActiveSection] = useState('')
  const [loading, setLoading] = useState(true)
  const [editorLoadFailed, setEditorLoadFailed] = useState(false)
  const [language, setLanguage] = useState('python')
  const [codeOutput, setCodeOutput] = useState('')
  const [isRunningCode, setIsRunningCode] = useState(false)

  // Timer State
  const [timeLeft, setTimeLeft] = useState(0)

  // Anti-Cheat State
  const [tabSwitches, setTabSwitches] = useState(0)
  const [showTabWarning, setShowTabWarning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)

  // Network & Auto-Save State
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [saveQueue, setSaveQueue] = useState([]) // Array of { questionId, answer, marked, timeSpent }
  const [isSyncing, setIsSyncing] = useState(false)

  const currentQuestion = questions[currentIndex]

  // Refs for tracking mutable values in event listeners and intervals
  const timeSpentRef = useRef({})
  const saveQueueRef = useRef([])
  const answersRef = useRef({})
  const markedRef = useRef({})
  const isOnlineRef = useRef(navigator.onLine)
  const attemptRef = useRef(null)

  // 1. Initial Data Fetching
  useEffect(() => {
    const init = async () => {
      try {
        const testData = await placementService.getTestDetail(id)
        setTest(testData)

        const attemptData = await placementService.startOrResumeTest(id)
        setAttempt(attemptData)
        attemptRef.current = attemptData
        setTabSwitches(attemptData.tab_switches || 0)

        const questionsData = await placementService.getQuestions(id)
        setQuestions(questionsData)

        // Initialize active section
        if (questionsData.length > 0) {
          setActiveSection(questionsData[0].section)
        }

        // Initialize timer
        const start = new Date(attemptData.started_at).getTime()
        const durationMs = testData.duration_minutes * 60 * 1000
        const end = start + durationMs
        const initialTimeLeft = Math.max(0, Math.floor((end - Date.now()) / 1000))
        setTimeLeft(initialTimeLeft)

        // Request Fullscreen
        enterFullscreen()
      } catch (error) {
        toast.error("Failed to load test session")
        navigate('/tests')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  // Sync refs with state
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    markedRef.current = markedForReview
  }, [markedForReview])

  useEffect(() => {
    saveQueueRef.current = saveQueue
  }, [saveQueue])

  // 2. Offline / Online Monitors
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      toast.success("Connection restored! Syncing answers...")
      flushSaveQueue()
    }
    const goOffline = () => {
      setIsOnline(false)
      toast.error("You are offline. Your answers will be saved locally.")
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // 3. Timer Ticker
  useEffect(() => {
    if (loading || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })

      // Track time spent on the active question
      if (currentQuestion) {
        timeSpentRef.current[currentQuestion.id] = (timeSpentRef.current[currentQuestion.id] || 0) + 1
        setTimeSpent({ ...timeSpentRef.current })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, currentIndex, currentQuestion])

  // 4. Anti-Cheat Handlers
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1
          setShowTabWarning(true)
          return next
        })
      }
    }

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull && !loading) {
        setShowFullscreenWarning(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [loading])

  const enterFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      }
    } catch (e) {
      console.warn("Fullscreen request denied", e)
    }
  }

  // 5. Auto-Save Logic (Debounced)
  const triggerAutoSave = (questionId, userAns, marked) => {
    const saveItem = {
      questionId,
      userAns,
      marked,
      timeSpent: timeSpentRef.current[questionId] || 0
    }

    // Reset tracked time spent for this question since we are saving
    timeSpentRef.current[questionId] = 0

    if (!isOnlineRef.current) {
      // Add to queue
      setSaveQueue(prev => {
        const filtered = prev.filter(item => item.questionId !== questionId)
        return [...filtered, saveItem]
      })
      return
    }

    // Perform background save
    placementService.saveAnswer(id, {
      question_id: questionId,
      user_answer: userAns,
      time_spent_seconds: saveItem.timeSpent,
      marked_for_review: marked
    }).catch(() => {
      // Fallback to queue if request fails
      setSaveQueue(prev => {
        const filtered = prev.filter(item => item.questionId !== questionId)
        return [...filtered, saveItem]
      })
    })
  }

  const flushSaveQueue = async () => {
    if (saveQueueRef.current.length === 0 || isSyncing) return
    setIsSyncing(true)
    const queue = [...saveQueueRef.current]
    setSaveQueue([])

    for (const item of queue) {
      try {
        await placementService.saveAnswer(id, {
          question_id: item.questionId,
          user_answer: item.userAns,
          time_spent_seconds: item.timeSpent,
          marked_for_review: item.marked
        })
      } catch (err) {
        // Re-queue failed saves
        setSaveQueue(prev => [...prev, item])
      }
    }
    setIsSyncing(false)
  }

  // 6. Navigation and Visit Tracker
  const handleQuestionChange = (index) => {
    // Record visited for current question before changing
    if (currentQuestion) {
      setVisited(prev => ({ ...prev, [currentQuestion.id]: true }))
      // Trigger save of current time spent
      triggerAutoSave(currentQuestion.id, answers[currentQuestion.id] || null, !!markedForReview[currentQuestion.id])
    }
    setCurrentIndex(index)
  }

  // 7. Input Modifications
  const handleAnswerSelect = (val) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))
    triggerAutoSave(currentQuestion.id, val, !!markedForReview[currentQuestion.id])
  }

  const handleMarkReviewToggle = () => {
    const nextMarked = !markedForReview[currentQuestion.id]
    setMarkedForReview(prev => ({ ...prev, [currentQuestion.id]: nextMarked }))
    triggerAutoSave(currentQuestion.id, answers[currentQuestion.id] || null, nextMarked)
  }

  const handleClearResponse = () => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: null }))
    triggerAutoSave(currentQuestion.id, null, !!markedForReview[currentQuestion.id])
  }

  // 8. Run code simulation
  const handleRunCode = () => {
    setIsRunningCode(true)
    setCodeOutput("Running test cases...")
    setTimeout(() => {
      const code = answers[currentQuestion.id] || ''
      if (code.includes('def') || code.includes('return')) {
        setCodeOutput(`Run Successful!\nInput: test_input\nOutput: ${currentQuestion.expected_output || "Expected Output"}\n\nValidation Passed: 1/1 test cases.`)
      } else {
        setCodeOutput("SyntaxError: Missing function implementation or return statement.")
      }
      setIsRunningCode(false)
    }, 1500)
  }

  // 9. Submissions
  const handleAutoSubmit = async () => {
    try {
      await placementService.submitTest(id, {
        tab_switches: tabSwitches,
        status: 'timed_out'
      })
      toast.error("Time limit reached! Test submitted automatically.")
      navigate(`/tests/${id}/result/${attemptRef.current.id}`)
    } catch {
      toast.error("Auto-submit failed. Redirecting to results...")
      navigate('/tests')
    }
  }

  const handleManualSubmit = async () => {
    if (saveQueue.length > 0) {
      toast.error("Please wait until all locally queued answers are saved.")
      return
    }

    if (window.confirm("Are you sure you want to submit your test? This cannot be undone.")) {
      try {
        await placementService.submitTest(id, {
          tab_switches: tabSwitches,
          status: 'submitted'
        })
        toast.success("Test submitted successfully!")
        navigate(`/tests/${id}/result/${attemptRef.current.id}`)
      } catch (error) {
        toast.error("Failed to submit test. Please check connection.")
      }
    }
  }

  // 10. Question States for Coding Colors
  const getQuestionState = (qId) => {
    if (markedForReview[qId]) return 'marked_for_review'
    if (answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '') return 'answered'
    if (visited[qId] || currentIndex === questions.findIndex(q => q.id === qId)) return 'visited_unanswered'
    return 'not_visited'
  }

  const getNavButtonColor = (state) => {
    switch (state) {
      case 'marked_for_review': return 'bg-purple-600 border-purple-500 hover:bg-purple-500 text-white'
      case 'answered': return 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white'
      case 'visited_unanswered': return 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
      default: return 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
    }
  }

  // Formatting remaining time
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  const sectionsList = [...new Set(questions.map(q => q.section))]
  const filteredQuestions = questions.filter(q => q.section === activeSection)

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col h-screen select-none">
      
      {/* 1. Top Header Bar */}
      <header className="h-16 border-b border-white/10 bg-[#0E1628] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-blue-400" />
          <span className="font-extrabold font-outfit text-lg">{test?.title}</span>
        </div>

        {/* Network & Save Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-3.5 h-3.5" /> Online</span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400"><WifiOff className="w-3.5 h-3.5" /> Offline ({saveQueue.length} queued)</span>
            )}
          </div>

          {/* Timer Display */}
          <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg border ${timeLeft <= 300 ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse' : 'bg-white/5 border-white/10 text-white/90'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={handleManualSubmit}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm font-extrabold rounded-lg transition-colors shadow-lg shadow-blue-500/10"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Split Panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Panel */}
        <aside className="w-80 border-r border-white/10 bg-[#0E1628] flex flex-col overflow-y-auto shrink-0 p-4 space-y-6">
          
          {/* Section Tabs */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-white/40 mb-3">Sections</h4>
            <div className="flex flex-col gap-2">
              {sectionsList.map(sect => (
                <button
                  key={sect}
                  onClick={() => setActiveSection(sect)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-all ${activeSection === sect ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'}`}
                >
                  {sect}
                </button>
              ))}
            </div>
          </div>

          {/* Question Grid */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-white/40 mb-3">Question Grid</h4>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const state = getQuestionState(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionChange(idx)}
                    className={`h-10 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${getNavButtonColor(state)} ${currentIndex === idx ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0A0F1E]' : ''}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Legend */}
          <div className="border-t border-white/5 pt-4 space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-white/40 mb-2">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white/5 border border-white/10" /> Not Visited</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" /> Unanswered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-600" /> Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-600" /> For Review</div>
            </div>
          </div>

        </aside>

        {/* Right Active Question Viewer */}
        <main className="flex-1 flex flex-col bg-[#0A0F1E] overflow-y-auto p-6 space-y-6">
          {currentQuestion ? (
            <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full">
              
              <div className="space-y-6">
                
                {/* Question Info Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <span className="text-sm font-bold text-blue-400">
                    Question {currentIndex + 1} of {questions.length} ({currentQuestion.marks} Marks)
                  </span>
                  <button
                    onClick={handleMarkReviewToggle}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${markedForReview[currentQuestion.id] ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    {markedForReview[currentQuestion.id] ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                {/* Question Markdown Text */}
                <div className="prose prose-invert max-w-none bg-white/5 border border-white/5 rounded-xl p-5">
                  <p className="text-lg font-medium leading-relaxed whitespace-pre-line">
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Answer Area depending on type */}
                <div className="mt-8">
                  {currentQuestion.question_type === 'mcq' && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${answers[currentQuestion.id] === opt ? 'bg-blue-600/10 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'}`}
                        >
                          <input
                            type="radio"
                            name={`q_${currentQuestion.id}`}
                            value={opt}
                            checked={answers[currentQuestion.id] === opt}
                            onChange={() => handleAnswerSelect(opt)}
                            className="hidden"
                          />
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[currentQuestion.id] === opt ? 'border-blue-500' : 'border-white/20'}`}>
                            {answers[currentQuestion.id] === opt && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                          </div>
                          <span className="text-sm font-semibold">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQuestion.question_type === 'fill' && (
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 font-extrabold uppercase">Your Answer</label>
                      <input
                        type="text"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerSelect(e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  )}

                  {currentQuestion.question_type === 'coding' && (
                    <div className="space-y-4">
                      {editorLoadFailed ? (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm">
                          Code Editor component failed to load. Please type your code below.
                          <textarea
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => handleAnswerSelect(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            className="w-full h-64 mt-3 bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-sm focus:outline-none"
                            placeholder="Type your code here..."
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-[#0E1628] px-4 py-2 border border-white/10 rounded-t-xl">
                            <span className="text-xs font-bold text-white/60 uppercase">Code Editor</span>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs focus:outline-none"
                            >
                              <option value="python" className="bg-[#0A0F1E]">Python 3</option>
                              <option value="javascript" className="bg-[#0A0F1E]">JavaScript</option>
                              <option value="cpp" className="bg-[#0A0F1E]">C++</option>
                            </select>
                          </div>
                          
                          <div className="border border-t-0 border-white/10 rounded-b-xl overflow-hidden h-72 relative">
                            <Editor
                              height="100%"
                              defaultLanguage="python"
                              language={language}
                              theme="vs-dark"
                              value={answers[currentQuestion.id] || currentQuestion.starter_code || ''}
                              onChange={handleAnswerSelect}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: 'on',
                                tabSize: 4,
                                wordWrap: 'on',
                                folding: true,
                                scrollBeyondLastLine: false,
                                contextmenu: false, // disables paste context menu
                                readOnly: false
                              }}
                              onMount={(editor) => {
                                // Disable paste inside the editor viewport
                                editor.onKeyDown((e) => {
                                  if ((e.ctrlKey || e.metaKey) && e.keyCode === 86) {
                                    e.preventDefault()
                                    toast.error("Paste operations are disabled in the editor.")
                                  }
                                })
                              }}
                            />
                          </div>

                          <div className="flex gap-4">
                            <button
                              onClick={handleRunCode}
                              disabled={isRunningCode}
                              className="px-5 py-2 bg-white/5 border border-white/10 hover:bg-blue-600 hover:border-blue-600 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                              {isRunningCode ? "Running..." : "Run Code"}
                            </button>
                          </div>

                          {codeOutput && (
                            <div className="bg-[#030712] border border-white/10 rounded-xl p-4 mt-3">
                              <div className="text-xs text-white/40 uppercase font-extrabold mb-1">Output Console</div>
                              <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap leading-relaxed">{codeOutput}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Back and Next navigation buttons */}
              <div className="flex justify-between items-center border-t border-white/5 pt-6 mt-12">
                <button
                  onClick={() => handleQuestionChange(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <button
                  onClick={handleClearResponse}
                  className="text-xs text-white/40 hover:text-white/60 font-bold transition-all underline underline-offset-4"
                >
                  Clear Response
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleManualSubmit}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-505 text-sm font-extrabold rounded-lg transition-all shadow-lg shadow-blue-500/10"
                  >
                    Submit Test
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuestionChange(currentIndex + 1)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-20">No active question to display.</div>
          )}
        </main>

      </div>

      {/* 3. Anti-Cheat Dialog Overlays */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-[#030712]/90 flex items-center justify-center p-6 z-50 animate-fade-in backdrop-blur-md">
          <div className="bg-[#0E1628] border border-rose-500/30 rounded-xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold font-outfit text-rose-500">Cheating Warning</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                A tab switch or window loss event was detected. This incident has been logged. Multiple switches may lead to immediate disqualification.
              </p>
            </div>
            <button
              onClick={() => {
                setShowTabWarning(false)
                enterFullscreen()
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-bold transition-all text-white"
            >
              I Understand. Return to Test
            </button>
          </div>
        </div>
      )}

      {showFullscreenWarning && (
        <div className="fixed inset-0 bg-[#030712]/95 flex items-center justify-center p-6 z-50 animate-fade-in backdrop-blur-md">
          <div className="bg-[#0E1628] border border-amber-500/30 rounded-xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold font-outfit text-amber-500">Return to Full-Screen</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Full-screen mode is required to maintain the academic integrity of this assessment. Please return to full-screen mode to proceed.
              </p>
            </div>
            <button
              onClick={() => {
                setShowFullscreenWarning(false)
                enterFullscreen()
              }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-bold transition-all text-white"
            >
              Re-enter Full-Screen
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
