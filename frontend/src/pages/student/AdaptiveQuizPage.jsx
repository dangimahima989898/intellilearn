import React, { useState, useEffect, useRef } from "react";
import { 
  BrainCircuit, Database, GitBranch, Monitor, Network, Coffee, Code, 
  BookOpen, ArrowRight, ArrowLeft, Check, X, Award, RefreshCw, 
  History, Target, AlertTriangle, ChevronDown, ChevronUp, Clock, 
  HelpCircle, LogOut, TrendingUp, Sparkles, ShieldAlert, BookOpenCheck
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  LineChart, Line, CartesianGrid 
} from "recharts";
import quizService from "../../services/quizService";
import { getSubjects } from "../../services/chatbotService";
import PageWrapper from "../../components/PageWrapper";
import { useTheme } from "../../context/ThemeContext";

const ClipboardIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 hidden md:block select-none">
    {/* Sparkles */}
    <circle cx="20" cy="30" r="1.5" fill="#C084FC" />
    <circle cx="105" cy="85" r="2" fill="#818CF8" />
    <path d="M15 80L17 84L21 85L17 86L15 90L13 86L9 85L13 84L15 80Z" fill="#C084FC" opacity="0.6" />
    <path d="M100 25L101.5 28L104.5 29.5L101.5 31L100 34L98.5 31L95.5 29.5L98.5 28L100 25Z" fill="#818CF8" opacity="0.6" />
    
    {/* Clipboard Shadow */}
    <rect x="34" y="24" width="52" height="72" rx="8" fill="#4F46E5" opacity="0.05" />
    {/* Clipboard Body */}
    <rect x="32" y="22" width="52" height="72" rx="8" fill="#FFFFFF" stroke="#818CF8" strokeWidth="2.5" />
    
    {/* Clip */}
    <rect x="48" y="14" width="20" height="12" rx="4" fill="#6366F1" />
    <rect x="54" y="10" width="8" height="6" rx="2" fill="#4F46E5" />
    
    {/* Lines / Checklists */}
    <circle cx="44" cy="38" r="3" fill="#34D399" />
    <line x1="52" y1="38" x2="74" y2="38" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
    
    <circle cx="44" cy="50" r="3" fill="#6366F1" />
    <line x1="52" y1="50" x2="74" y2="50" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
    
    <circle cx="44" cy="62" r="3" fill="#FBBF24" />
    <line x1="52" y1="62" x2="70" y2="62" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />

    <circle cx="44" cy="74" r="3" fill="#F87171" />
    <line x1="52" y1="74" x2="66" y2="74" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Magnifying Glass */}
    <circle cx="76" cy="80" r="10" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.5" />
    <line x1="83" y1="87" x2="94" y2="98" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SUBJECT_DETAILS = {
  DSA: { icon: GitBranch, color: "from-blue-600 to-indigo-600", accent: "#3B82F6", textAccent: "text-blue-400" },
  DBMS: { icon: Database, color: "from-purple-600 to-pink-600", accent: "#8B5CF6", textAccent: "text-purple-400" },
  OS: { icon: Monitor, color: "from-emerald-600 to-teal-600", accent: "#10B981", textAccent: "text-emerald-400" },
  CN: { icon: Network, color: "from-amber-600 to-orange-600", accent: "#F59E0B", textAccent: "text-amber-400" },
  JAVA: { icon: Coffee, color: "from-red-600 to-rose-600", accent: "#EF4444", textAccent: "text-red-400" },
  PYTHON: { icon: Code, color: "from-cyan-600 to-blue-600", accent: "#06B6D4", textAccent: "text-cyan-400" }
};

const CircularTimer = ({ seconds, total = 30 }) => {
  const percentage = (seconds / total) * 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = seconds <= 10 ? "#ef4444" : "#3b82f6";

  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="rgba(128,128,128,0.15)"
          strokeWidth="3"
          fill="transparent"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke={color}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${seconds <= 10 ? "text-rose-500 animate-pulse font-black" : "text-blue-400"}`}>
        {seconds}
      </span>
    </div>
  );
};

const ScoreRing = ({ score }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let color = "#eab308"; 
  if (score >= 85) color = "#10b981"; 
  else if (score >= 60) color = "#3b82f6"; 

  return (
    <div className="relative w-32 h-32 flex items-center justify-center shrink-0 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="rgba(128,128,128,0.15)"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-outfit font-black text-white">{Math.round(score)}%</span>
      </div>
    </div>
  );
};

const ReadinessArc = ({ score, label }) => {
  const percentage = score;
  const radius = 50;
  const circumference = Math.PI * radius; // Semicircle
  const offset = circumference - (percentage / 100) * circumference;
  
  let color = "#ef4444";
  if (score >= 85) color = "#10b981";
  else if (score >= 70) color = "#3b82f6";
  else if (score >= 50) color = "#f59e0b";

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
        <svg className="w-36 h-36 absolute -bottom-1">
          {/* Background semicircular track */}
          <path
            d="M 18 68 A 50 50 0 0 1 118 68"
            fill="none"
            stroke="rgba(128,128,128,0.15)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Active colored semicircular track */}
          <path
            d="M 18 68 A 50 50 0 0 1 118 68"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span className="text-2xl font-outfit font-black text-white">{Math.round(score)}%</span>
          <span className="text-[9px] uppercase font-bold text-white/50 tracking-wider mt-0.5">{label}</span>
        </div>
      </div>
    </div>
  );
};

export default function AdaptiveQuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  const [screen, setScreen] = useState("setup"); // setup | quiz | checkpoint | results | history
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Setup State
  const [selectedSubject, setSelectedSubject] = useState(null);
  // topic is always 'mixed' for Adaptive Quiz — AI selects topics automatically
  
  // Quiz State
  const [attemptId, setAttemptId] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const timerRef = useRef(null);

  // Single Question Feedback
  const [feedback, setFeedback] = useState(null);
  const [deepExplanation, setDeepExplanation] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [historyOfAnswers, setHistoryOfAnswers] = useState([]); // Array of boolean correctness
  const [reviewQuestions, setReviewQuestions] = useState([]);

  // Checkpoint Modal
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointStats, setCheckpointStats] = useState(null);

  // Results State
  const [results, setResults] = useState(null);
  const [expandedReviews, setExpandedReviews] = useState({});

  const loadInitialData = async () => {
    try {
      const [subs, hist] = await Promise.all([
        getSubjects(),
        quizService.getHistory()
      ]);
      setSubjects(subs || []);
      setHistory(hist || []);
    } catch (err) {
      toast.error("Failed to load initial quiz data");
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Topic selector was removed from Adaptive Quiz — AI selects topics dynamically.
  // Prefill subject from navigation state if available
  useEffect(() => {
    if (location.state?.prefillTopic && subjects.length > 0) {
      const sub = subjects.find(s => s.name === location.state.prefillSubject || s.code === location.state.prefillSubject);
      if (sub) {
        setSelectedSubject(sub);
        // Note: topic is intentionally ignored here — Adaptive Quiz uses 'mixed' automatically
      }
    }
  }, [location.state, subjects]);

  const startQuiz = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    setLoading(true);
    try {
      // Adaptive Quiz always uses 'mixed' — the AI engine selects topics based on student history
      const session = await quizService.startQuiz(selectedSubject.id, "mixed");
      setAttemptId(session.attempt_id);
      setQuizDetails(session);
      
      // Reset quiz session states
      setCurrentIdx(0);
      setHistoryOfAnswers([]);
      setSelectedAnswer(null);
      setIsLocked(false);
      setFeedback(null);
      setDeepExplanation("");
      setShowCheckpoint(false);
      
      // Pull first question
      const firstQ = await quizService.getNextQuestion(session.attempt_id);
      if (!firstQ) {
        toast.error("No questions available for this topic.");
        return;
      }
      setCurrentQuestion(firstQ);
      setTimeLeft(firstQ.estimated_time_seconds || 30);
      setScreen("quiz");
      startTimer(firstQ.estimated_time_seconds || 30);
    } catch (err) {
      toast.error("Failed to initialize adaptive quiz. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (duration = 30) => {
    clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswerSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswerSubmit = async (ans) => {
    if (isLocked) return;
    
    const finalAns = ans || selectedAnswer;
    setIsLocked(true);
    clearInterval(timerRef.current);

    const timeTaken = (currentQuestion.estimated_time_seconds || 30) - timeLeft;

    try {
      const res = await quizService.submitAnswer(
        attemptId,
        currentQuestion.id,
        finalAns || "",
        timeTaken
      );
      setFeedback(res);
      setHistoryOfAnswers(prev => [...prev, res.is_correct]);
      
      // Append to review questions directly on successful submission
      setReviewQuestions(prev => {
        if (prev.find(x => x.id === currentQuestion.id)) return prev;
        return [...prev, {
          id: currentQuestion.id,
          question_text: currentQuestion.question_text,
          option_a: currentQuestion.option_a,
          option_b: currentQuestion.option_b,
          option_c: currentQuestion.option_c,
          option_d: currentQuestion.option_d,
          selected_answer: finalAns,
          correct_answer: res.correct_answer,
          explanation: res.explanation,
          is_correct: res.is_correct
        }];
      });

      if (res.is_correct) {
        toast.success("Correct Answer!");
      } else {
        toast.error("Incorrect Answer.");
      }
    } catch (err) {
      toast.error("Failed to submit answer");
      setIsLocked(false);
    }
  };

  const triggerDeepExplanation = async () => {
    if (!currentQuestion) return;
    setLoadingExplain(true);
    try {
      const res = await quizService.getExplanation(currentQuestion.id, selectedAnswer || "");
      setDeepExplanation(res.explanation);
    } catch (err) {
      toast.error("Failed to generate AI Explanation.");
    } finally {
      setLoadingExplain(false);
    }
  };

  const nextQuestion = async () => {
    const nextIdx = currentIdx + 1;
    
    // Check for mid-quiz checkpoint at 5 questions answered
    if (nextIdx === 5 && !showCheckpoint && historyOfAnswers.length === 5) {
      const correctSoFar = historyOfAnswers.filter(Boolean).length;
      const accuracy = (correctSoFar / 5) * 100;
      
      let nextAction = "Continue challenging yourself on higher difficulties.";
      if (accuracy < 60) {
        nextAction = "Read concepts carefully before attempting. Consider taking easier questions.";
      }
      
      setCheckpointStats({
        correct: correctSoFar,
        accuracy: accuracy,
        next_difficulty: feedback?.next_difficulty || "medium",
        action: nextAction
      });
      setShowCheckpoint(true);
      return;
    }

    // Instantly clear locks, feedback, and selected options to avoid displaying previous data
    setSelectedAnswer(null);
    setIsLocked(false);
    setFeedback(null);
    setDeepExplanation("");

    if (nextIdx < 10) {
      setLoading(true);
      try {
        const nextQ = await quizService.getNextQuestion(attemptId);
        if (!nextQ) {
          // No more questions returned, finish early
          finishQuiz();
          return;
        }
        setCurrentQuestion(nextQ);
        setCurrentIdx(nextIdx);
        startTimer(nextQ.estimated_time_seconds || 30);
      } catch (err) {
        toast.error("Error fetching next question.");
      } finally {
        setLoading(false);
      }
    } else {
      finishQuiz();
    }
  };

  const skipQuestion = () => {
    handleAnswerSubmit("");
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const report = await quizService.getReport(attemptId);
      setResults(report);
      setScreen("results");
      loadInitialData();
    } catch (err) {
      toast.error("Failed to compute performance report");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    const d = diff?.toLowerCase();
    if (d === "hard") return "text-red-400 bg-red-500/10 border-red-500/20";
    if (d === "medium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-400 bg-green-500/10 border-green-500/20";
  };

  const renderSetup = () => {
    const last5 = history.slice(0, 5);
    const avg = last5.length > 0 ? last5.reduce((acc, h) => acc + (h.score || 0), 0) / last5.length : 0;
    const predictedDiff = avg >= 75 ? "Hard" : avg >= 50 ? "Medium" : "Easy";

    // Standard mockup scores if no real history yet, or map real history to the mockup style dots
    const displayScores = history.length > 0 
      ? history.slice(0, 6) 
      : [
          { score: 90, subject_name: "AI" },
          { score: 85, subject_name: "Python" },
          { score: 80, subject_name: "Cloud" },
          { score: 70, subject_name: "SE" },
          { score: 65, subject_name: "Java" },
          { score: 60, subject_name: "CN" }
        ];

    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <span className="text-[#6366F1] bg-[#EEF2FF] p-2.5 rounded-full border border-[#6366F1]/20">
              <Target className="w-8 h-8" />
            </span>
            <h1 className={`text-3.5xl font-outfit font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Adaptive Quiz Engine
            </h1>
          </div>
          <p className={`text-sm font-medium ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            Real-time difficulty adjustments tailored to your MCA syllabus performance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Subject Selector */}
            <div className={`border rounded-2xl p-6 space-y-4 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <BookOpen className="w-4 h-4 text-[#6366F1]" />
                Select Academic Subject
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const isSel = selectedSubject?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 group ${
                        isSel 
                          ? "border-2 border-[#7C3AED] bg-[#F5F3FF]/50 scale-[1.02] shadow-md shadow-[#7C3AED]/5" 
                          : isLight ? "bg-white border-slate-200 hover:border-[#7C3AED]/40 hover:bg-[#F5F3FF]/10" : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7C3AED] mb-2 shrink-0 bg-[#F5F3FF]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-1 text-[#7C3AED]`}>{sub.code}</p>
                        <p className={`text-xs font-extrabold truncate max-w-full leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>{sub.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Mode Indicator - replaces manual Focus Topic */}
            <div className={`border rounded-2xl p-6 flex items-center justify-between gap-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-violet-500/10 border-violet-500/20'}`}>
              <div className="space-y-3.5">
                <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-wider font-outfit ${isLight ? 'text-[#4F46E5]' : 'text-violet-300'}`}>
                  <BrainCircuit className="w-4 h-4" />
                  AI Topic Selection — Active
                </h3>
                <p className={`text-xs font-semibold leading-relaxed ${isLight ? 'text-slate-500' : 'text-violet-300/80'}`}>
                  Topics are automatically selected by the AI based on your past performance:
                </p>
                <ul className={`text-[11px] font-bold space-y-2 pl-2 ${isLight ? 'text-slate-655' : 'text-violet-300/70'}`}>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0"></span> Weak topics are prioritized (50%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0"></span> Unexplored topics next (20%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0"></span> Topics in-progress (20%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0"></span> Strong topics for reinforcement (10%)</li>
                </ul>
              </div>
              <ClipboardIllustration />
            </div>

          </div>

          {/* Performance sidebar widgets */}
          <div className="space-y-4">
            <div className={`border rounded-2xl p-6 space-y-6 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-wider font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                Your Performance
              </h3>
              
              <div className="space-y-5">
                <div>
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-2.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>Recent scores history</p>
                  <div className="flex gap-2">
                    {displayScores.map((h, i) => {
                      let dotColor = "bg-[#10B981]";
                      if (h.score < 50) dotColor = "bg-[#F97316]";
                      else if (h.score < 75) dotColor = "bg-[#F59E0B]";
                      
                      return (
                        <div 
                          key={i} 
                          title={`${h.subject_name || "Quiz"}: ${h.score}%`}
                          className={`w-3.5 h-3.5 rounded-full ${dotColor}`} 
                        />
                      );
                    })}
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/3 border-white/5'}`}>
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Predicted baseline difficulty:</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-[#FEE2E2] text-[#EF4444] border-[#FCA5A5]`}>
                    {predictedDiff.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !selectedSubject}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:grayscale cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Generating Adaptive Session..." : "Start Adaptive Quiz"}</span>
            </button>
            <button 
              onClick={() => setScreen("history")}
              className={`w-full py-3.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                isLight 
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' 
                  : 'border-white/10 text-white/50 hover:text-white bg-white/5'
              }`}
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>View History</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!currentQuestion) return null;

    const options = [
      { key: "a", text: currentQuestion.option_a },
      { key: "b", text: currentQuestion.option_b },
      { key: "c", text: currentQuestion.option_c },
      { key: "d", text: currentQuestion.option_d }
    ];

    const currentDiff = feedback ? feedback.next_difficulty : currentQuestion.difficulty;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in relative pb-12">
        {/* Quiz Top Bar */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#1e293b]/50 border-white/10'}`}>
          <div className="flex items-center gap-3">
            <CircularTimer seconds={timeLeft} total={currentQuestion.estimated_time_seconds || 30} />
            <div>
              <p className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Question {currentIdx + 1} of 10</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(currentDiff)}`}>
                  {currentDiff}
                </span>
                <span className="text-[9px] text-violet-300 font-black uppercase bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/25">
                  {currentQuestion.subject_name}
                </span>
                {currentQuestion.unit && (
                  <span className="text-[9px] text-amber-300 font-black uppercase bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/25">
                    {currentQuestion.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowQuitConfirm(true)}
            className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-violet-500 h-full transition-all duration-350"
            style={{ width: `${((currentIdx + 1) / 10) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className={`border rounded-2xl p-8 space-y-6 shadow-2xl relative ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#151f32]/90 border-white/10'
        }`}>
          {currentQuestion.bloom_taxonomy_level && (
            <div className="flex justify-center mb-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Cognitive Level: {currentQuestion.bloom_taxonomy_level}
              </span>
            </div>
          )}

          <h2 className={`text-xl sm:text-2xl font-outfit font-bold text-center leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {currentQuestion.question_text}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectOpt = feedback?.correct_answer === opt.key;
              
              let borders = "bg-white/5 border-white/10 text-white/80 hover:border-violet-500/50 hover:bg-violet-500/5";
              if (isLight) {
                borders = "bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-500 hover:bg-violet-500/5";
              }

              if (isLocked) {
                if (isCorrectOpt) {
                  borders = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10";
                } else if (isSelected) {
                  borders = "bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-lg shadow-rose-500/10";
                } else {
                  borders = "opacity-40 grayscale border-white/5";
                  if (isLight) borders = "opacity-40 grayscale border-slate-100";
                }
              } else if (isSelected) {
                borders = "bg-violet-500/15 border-violet-500 text-violet-300 font-semibold shadow-lg shadow-violet-500/10";
              }

              return (
                <button
                  key={opt.key}
                  disabled={isLocked}
                  onClick={() => setSelectedAnswer(opt.key)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${borders}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                      isSelected ? "bg-violet-500 text-white" : isLight ? "bg-slate-200 text-slate-600" : "bg-white/10 text-white/60"
                    }`}>
                      {opt.key.toUpperCase()}
                    </span>
                    <span className={isLight ? "text-slate-800" : "text-white"}>{opt.text}</span>
                  </div>
                  {isLocked && isCorrectOpt && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isLocked && isSelected && !isCorrectOpt && <X className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Overlay / Solution Drawer */}
        {isLocked && feedback && (
          <div className={`border rounded-2xl p-6 space-y-4 shadow-xl animate-fade-in ${
            feedback.is_correct ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${feedback.is_correct ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                {feedback.is_correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </span>
              <h4 className={`text-md font-bold ${feedback.is_correct ? "text-emerald-400" : "text-rose-400"}`}>
                {feedback.is_correct ? "Correct! Well Done." : "Incorrect Solution"}
              </h4>
            </div>

            <div className={`p-4 rounded-xl text-xs leading-relaxed border ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/3 border-white/5 text-white/70"
            }`}>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block mb-1">Standard Explanation:</span>
              <p>{feedback.explanation}</p>
            </div>

            {/* Deep AI Explanation trigger */}
            {!feedback.is_correct && (
              <div className="space-y-3">
                {!deepExplanation && !loadingExplain && (
                  <button 
                    onClick={triggerDeepExplanation}
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-bold underline transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Explain with MLSU Syllabus AI Tutor
                  </button>
                )}

                {loadingExplain && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>AI Tutor is drafting custom explanations grounded in your curriculum...</span>
                  </div>
                )}

                {deepExplanation && (
                  <div className={`p-4 rounded-xl text-xs leading-relaxed border-l-4 border-l-violet-500 shadow-md ${
                    isLight ? "bg-violet-50/50 border-slate-200 text-slate-800" : "bg-violet-500/5 border-white/5 text-white/90"
                  }`}>
                    <span className="text-[10px] text-violet-400 font-black uppercase tracking-widest block mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Syllabus Tutor Custom Explanation
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">{deepExplanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 items-center">
          {!isLocked ? (
            <div className="flex justify-between items-center w-full max-w-sm">
              <button
                onClick={skipQuestion}
                className={`text-xs font-bold tracking-wider cursor-pointer uppercase transition-colors ${
                  isLight ? "text-slate-400 hover:text-slate-800" : "text-white/30 hover:text-white"
                }`}
              >
                Skip Question
              </button>
              <button
                onClick={() => handleAnswerSubmit()}
                disabled={!selectedAnswer}
                className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                Submit Answer
              </button>
            </div>
          ) : (
            <button
              onClick={nextQuestion}
              className="px-12 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {currentIdx < 9 ? "Next Question" : "View Results Report"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quit Confirmation */}
        {showQuitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`border rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl text-center ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0F172A] border-white/10 text-white"
            }`}>
              <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Abandon Session?</h3>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-400" : "text-white/40"}`}>
                  Your adaptive progression metrics for this run will not be recorded. Are you sure?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className={`flex-1 py-2.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                    isLight ? "border-slate-200 hover:bg-slate-50 text-slate-600" : "border-white/10 hover:bg-white/5 text-white"
                  }`}
                >
                  Stay
                </button>
                <button 
                  onClick={() => setScreen("setup")}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer text-xs"
                >
                  Abandon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCheckpointModal = () => {
    if (!checkpointStats) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className={`border rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl relative animate-fade-in ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0F172A] border-white/10 text-white"
        }`}>
          <div className="flex items-center gap-2 border-b pb-3 border-white/10">
            <BookOpenCheck className="w-6 h-6 text-violet-500" />
            <h3 className="text-lg font-extrabold font-outfit">Mid-Quiz Session Checkpoint</h3>
          </div>
          
          <div className="space-y-4 text-sm">
            <p className={isLight ? "text-slate-500" : "text-white/60"}>
              You have completed 5 questions in this session. Here is your real-time evaluation:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/3 border-white/5"}`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-white/40"}`}>Accuracy</p>
                <p className="text-xl font-black text-violet-400 mt-1">{checkpointStats.accuracy}%</p>
                <p className={`text-[9px] mt-0.5 ${isLight ? "text-slate-400" : "text-white/30"}`}>{checkpointStats.correct}/5 Correct</p>
              </div>
              <div className={`p-4 rounded-xl border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/3 border-white/5"}`}>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-white/40"}`}>Adaptive Level</p>
                <p className="text-xl font-black text-violet-400 mt-1 uppercase">{checkpointStats.next_difficulty}</p>
                <p className={`text-[9px] mt-0.5 ${isLight ? "text-slate-400" : "text-white/30"}`}>Calculated difficulty</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/3 border-white/5"}`}>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block mb-1">Recommended Action:</span>
              <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-white/70"}`}>{checkpointStats.action}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={async () => {
                setShowCheckpoint(false);
                
                // Clear states instantly before loading question 6
                setSelectedAnswer(null);
                setIsLocked(false);
                setFeedback(null);
                setDeepExplanation("");
                
                // Trigger question 6 fetch
                setLoading(true);
                try {
                  const nextQ = await quizService.getNextQuestion(attemptId);
                  if (!nextQ) {
                    finishQuiz();
                    return;
                  }
                  setCurrentQuestion(nextQ);
                  setCurrentIdx(5);
                  startTimer(nextQ.estimated_time_seconds || 30);
                } catch (err) {
                  toast.error("Error fetching next question.");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-violet-650 hover:bg-violet-600 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-violet-500/20"
            >
              Resume Quiz
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const message = results.score >= 80 ? "Excellent Mastery! 🎉" : results.score >= 60 ? "Good Performance! 👍" : "Needs Conceptual Focus! 💪";
    
    // Prepare Chart Data
    const unitChartData = Object.entries(results.unit_accuracy).map(([unit, acc]) => ({
      name: unit,
      Accuracy: Math.round(acc)
    }));

    const bloomChartData = Object.entries(results.bloom_accuracy).map(([level, acc]) => ({
      subject: level,
      Accuracy: Math.round(acc),
      fullMark: 100
    }));

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-12">
        {/* Banner Card */}
        <div className={`border rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#151f32]/95 border-white/10'
        }`}>
          <h2 className={`text-2xl font-black font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>Adaptive Assessment Report</h2>
          
          <ScoreRing score={results.score} />

          <div>
            <h3 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{message}</h3>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              Session Score: {results.correct_count} / {results.total_questions} correct solutions
            </p>
          </div>

          <div className="flex justify-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold border bg-violet-500/10 text-violet-400 border-violet-500/20">
              Subject: {results.subject_name}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold border bg-amber-500/10 text-amber-400 border-amber-500/20">
              Readiness: {results.readiness_label}
            </span>
          </div>
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Readiness Gauge */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-lg ${
            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <h4 className={`text-sm font-bold font-outfit border-b pb-2 mb-2 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
              <Target className="w-4 h-4 text-violet-500" /> Exam Readiness
            </h4>
            <ReadinessArc score={results.predicted_readiness} label={results.readiness_label} />
            <p className={`text-[10px] text-center leading-relaxed ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              Predicted university exam success rate, combining difficulty levels and Bloom taxonomy metrics.
            </p>
          </div>

          {/* Recharts Unit Bar Chart */}
          <div className={`border rounded-2xl p-5 shadow-lg md:col-span-2 ${
            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <h4 className={`text-sm font-bold font-outfit border-b pb-2 mb-4 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
              <BookOpen className="w-4 h-4 text-violet-500" /> Unit-wise Accuracy (%)
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitChartData}>
                  <XAxis dataKey="name" stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} fontWeight="bold" />
                  <YAxis stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} domain={[0, 100]} />
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: isLight ? "#ffffff" : "#1e293b", 
                      borderColor: isLight ? "#cbd5e1" : "#ffffff15", 
                      color: isLight ? "#0f172a" : "#fff",
                      fontSize: "11px",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="Accuracy" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recharts Bloom's Radar Chart */}
          <div className={`border rounded-2xl p-5 shadow-lg md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-center ${
            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <div className="md:col-span-2">
              <h4 className={`text-sm font-bold font-outfit border-b pb-2 mb-4 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
                <BrainCircuit className="w-4 h-4 text-violet-500" /> Bloom's Taxonomy Cognitive Levels
              </h4>
              <div className="h-56 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" radius="70%" data={bloomChartData}>
                    <PolarGrid stroke={isLight ? "#cbd5e1" : "#ffffff10"} />
                    <PolarAngleAxis dataKey="subject" stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} fontWeight="bold" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={isLight ? "#475569" : "#ffffff30"} fontSize={8} />
                    <Radar name="Cognitive Level" dataKey="Accuracy" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-4">
              <h5 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Cognitive Strengths</h5>
              <div className="space-y-2">
                {bloomChartData.map((level) => (
                  <div key={level.subject} className="flex justify-between items-center text-xs">
                    <span className={isLight ? 'text-slate-600' : 'text-white/70'}>{level.subject}:</span>
                    <span className={`font-black ${level.Accuracy >= 75 ? "text-emerald-400" : level.Accuracy >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                      {level.Accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weak Areas Section */}
        {results.weak_topics && results.weak_topics.length > 0 && (
          <div className="space-y-3">
            <h3 className={`text-lg font-bold font-outfit px-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>Syllabus Areas Requiring Remediation</h3>
            <div className="grid grid-cols-1 gap-3">
              {results.weak_topics.map((weak, idx) => (
                <div 
                  key={idx} 
                  className={`border border-l-4 border-l-rose-500 rounded-xl p-4 flex items-center justify-between gap-4 ${
                    isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{weak.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${weak.accuracy}%` }} />
                      </div>
                      <span className="text-[9px] font-bold text-rose-400 uppercase shrink-0">
                        {Math.round(weak.accuracy)}% Accuracy ({weak.total_attempts} trials)
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate("/student/questions", { state: { prefillSubject: results.subject_name, prefillTopic: weak.topic } })}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                      isLight 
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' 
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    Generate Practice drills
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Time Analysis + Strong Topics row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Analysis */}
          {results.time_analysis && (
            <div className={`border rounded-2xl p-5 space-y-4 shadow-lg ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h4 className={`text-sm font-bold font-outfit border-b pb-2 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
                <Clock className="w-4 h-4 text-blue-400" /> Time Analysis
              </h4>
              <div className="space-y-3">
                <div className={`flex justify-between items-center text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                  <span>Total Time</span>
                  <span className="font-bold">{Math.floor(results.time_analysis.total_time_seconds / 60)}m {results.time_analysis.total_time_seconds % 60}s</span>
                </div>
                <div className={`flex justify-between items-center text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                  <span>Avg per Question</span>
                  <span className="font-bold">{results.time_analysis.avg_time_per_question_seconds}s</span>
                </div>
                <div className={`flex justify-between items-center text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                  <span>Speed Rating</span>
                  <span className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${
                    results.time_analysis.time_efficiency === "Fast" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                    results.time_analysis.time_efficiency === "Optimal" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                    "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  }`}>{results.time_analysis.time_efficiency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Strong Topics */}
          <div className={`border rounded-2xl p-5 space-y-4 shadow-lg ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <h4 className={`text-sm font-bold font-outfit border-b pb-2 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
              <Award className="w-4 h-4 text-emerald-400" /> Strong Topics
            </h4>
            {results.strong_topics && results.strong_topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {results.strong_topics.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✓ {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Complete more quizzes to identify your strong topics.</p>
            )}
          </div>
        </div>

        {/* Revision Recommendations */}
        {results.recommended_revision_topics && results.recommended_revision_topics.length > 0 && (
          <div className={`border rounded-2xl p-5 space-y-3 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
            <h4 className={`text-sm font-bold font-outfit flex items-center gap-1.5 ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
              <BookOpen className="w-4 h-4 text-amber-500" /> Recommended for Revision
            </h4>
            <div className="flex flex-wrap gap-2">
              {results.recommended_revision_topics.map((t, i) => (
                <button
                  key={i}
                  onClick={() => navigate("/student/questions", { state: { prefillSubject: results.subject_name, prefillTopic: t } })}
                  className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors cursor-pointer"
                >
                  📚 {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty Progression Chart */}
        {results.difficulty_progression && results.difficulty_progression.length > 0 && (
          <div className={`border rounded-2xl p-5 shadow-lg ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <h4 className={`text-sm font-bold font-outfit border-b pb-2 mb-4 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
              <TrendingUp className="w-4 h-4 text-violet-400" /> Difficulty Progression
            </h4>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.difficulty_progression.map(d => ({
                  q: `Q${d.question_num}`,
                  level: d.difficulty === "easy" ? 1 : d.difficulty === "medium" ? 2 : 3,
                  correct: d.is_correct,
                  topic: d.topic
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#ffffff10"} />
                  <XAxis dataKey="q" stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} />
                  <YAxis
                    stroke={isLight ? "#475569" : "#ffffff60"} fontSize={9}
                    tickFormatter={(v) => v === 1 ? "Easy" : v === 2 ? "Medium" : "Hard"}
                    domain={[0.5, 3.5]} ticks={[1, 2, 3]}
                  />
                  <ChartTooltip
                    formatter={(value, name, props) => {
                      const lvl = ["", "Easy", "Medium", "Hard"][value] || value;
                      return [lvl, "Difficulty"];
                    }}
                    contentStyle={{ backgroundColor: isLight ? "#fff" : "#1e293b", borderColor: isLight ? "#cbd5e1" : "#ffffff15", color: isLight ? "#0f172a" : "#fff", fontSize: "11px", borderRadius: "8px" }}
                  />
                  <Line type="stepAfter" dataKey="level" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className={`text-[10px] mt-2 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Tracks how difficulty adjusted in real-time based on your answers</p>
          </div>
        )}

        {/* Review Questions List (Accordion style) */}
        <div className="space-y-3">
          <h3 className={`text-lg font-bold font-outfit px-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>Detailed Question Review</h3>
          <p className={`text-xs px-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>Examine all quiz attempts and retrieve solutions.</p>
          
          <div className="space-y-2">
            {/* If we have quizData questions details, we can render the reviews. Since we did it dynamically, we can load history reviews. Wait, report endpoint doesn't give us exact questions if we didn't save them. Wait! In report we have weak topics, but report endpoint from database returns the attempt details. Let's retrieve answered questions if any. Wait, in results, report has no list of answers? 
            Let's review the report payload:
            results has: report["session_id"], report["score"], report["correct_count"], report["total_questions"]...
            Wait, let's load the answers and question texts from DB to let student review them!
            In report generator or report router, we can query QuizAnswer joins Question. Wait, the endpoint `/report/{session_id}` has:
            - score
            - correct_count
            - total_questions
            - difficulty_accuracy
            - bloom_accuracy
            - unit_accuracy
            - weak_topics
            - predicted_readiness
            - readiness_label
            - subject_name
            Wait! Let's modify the report endpoint in `backend/routers/adaptive_quiz.py` or fetch the answers manually so they are reviewable.
            Wait, report is generated in `AdaptiveEngine.generate_session_report`. Let's look at it. It does not return the list of question results!
            Let's add the question results directly into `report` response, or query them separately.
            Wait, let's look at `SingleAnswerResponse` and `SingleAnswerSubmit`. The client submits them one by one. The client can just save the question details in React state during the quiz run!
            Yes! During the quiz, as the client fetches questions and receives the answer results, the client can store them in a local array:
            ```javascript
            // Add to a state array of review:
            // [{ question_text, option_a, option_b, option_c, option_d, selected_answer, correct_answer, explanation, is_correct }]
            ```
            This is extremely simple, client-side, and avoids another DB roundtrip! Let's implement that!
            Let's see: during the quiz, when `handleAnswerSubmit` finishes, we store the question text, options, selection, correctness, correct answer, and explanation in `reviewAnswers` state.
            Then we can render the review accordion using this state! This is beautiful.
            Let's look at how we can implement this:
            ```javascript
            // In state:
            const [reviewQuestions, setReviewQuestions] = useState([]);
            
            // In handleAnswerSubmit:
            setReviewQuestions(prev => [...prev, {
              id: currentQuestion.id,
              question_text: currentQuestion.question_text,
              option_a: currentQuestion.option_a,
              option_b: currentQuestion.option_b,
              option_c: currentQuestion.option_c,
              option_d: currentQuestion.option_d,
              selected_answer: finalAns,
              correct_answer: res.correct_answer,
              explanation: res.explanation,
              is_correct: res.is_correct
            }]);
            ```
            Then, on the results page, we display this `reviewQuestions` array. It is fully functional, complete, and contains the real questions served during the session!
             */}
            {reviewQuestions.map((r, i) => {
              const isEx = expandedReviews[r.id];
              return (
                <div key={i} className={`border rounded-2xl overflow-hidden shadow ${
                  isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"
                }`}>
                  <button 
                    onClick={() => setExpandedReviews(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer ${
                      isLight ? "hover:bg-slate-50" : "hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`p-1.5 rounded-lg shrink-0 ${r.is_correct ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {r.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className={`text-sm font-semibold truncate max-w-lg ${isLight ? "text-slate-800" : "text-white"}`}>{r.question_text}</span>
                    </div>
                    {isEx ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>

                  {isEx && (
                    <div className={`p-4 border-t space-y-4 animate-slide-down ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { k: 'a', text: r.option_a },
                          { k: 'b', text: r.option_b },
                          { k: 'c', text: r.option_c },
                          { k: 'd', text: r.option_d }
                        ].map((opt) => {
                          const isSelectedOpt = r.selected_answer === opt.k;
                          const isCorrectOpt = r.correct_answer === opt.k;
                          
                          let borders = "border-white/10 text-white/60 bg-white/5";
                          if (isLight) borders = "border-slate-200 text-slate-600 bg-white";
                          
                          if (isCorrectOpt) {
                            borders = "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold";
                            if (!isLight) borders = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold";
                          } else if (isSelectedOpt) {
                            borders = "border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold";
                            if (!isLight) borders = "border-rose-500/40 bg-rose-500/10 text-rose-300 font-bold";
                          }

                          return (
                            <div key={opt.k} className={`p-3 rounded-lg border flex items-center gap-2 ${borders}`}>
                              <span className="font-bold uppercase">{opt.k}:</span>
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-4 text-xs leading-relaxed">
                        <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block mb-1">Explanation:</span>
                        <p className={isLight ? "text-slate-700" : "text-white/70"}>{r.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 justify-center pt-6">
          <button 
            onClick={() => setScreen("setup")}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 hover:opacity-95 text-white font-bold shadow-lg text-xs cursor-pointer"
          >
            Take Another Quiz
          </button>
          <button 
            onClick={() => navigate("/student/progress")}
            className={`flex-1 py-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
              isLight 
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' 
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            View Progress
          </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    // Take the last 10 quiz attempts and reverse to chronological order for trend line chart
    const trendData = history.slice(0, 10).reverse().map((h, i) => ({
      Quiz: i + 1,
      Score: Math.round(h.score)
    }));

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-center gap-4">
          <h2 className={`text-2xl font-black flex items-center gap-3 font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>
            <History className="w-6 h-6 text-violet-500" />
            Adaptive Quiz Performance History
          </h2>
          <button 
            onClick={() => setScreen("setup")}
            className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              isLight 
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' 
                : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup
          </button>
        </div>

        {/* Trend Line Chart */}
        {history.length > 0 && (
          <div className={`border rounded-2xl p-5 shadow-lg ${
            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <h4 className={`text-sm font-bold font-outfit border-b pb-2 mb-4 flex items-center gap-1.5 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white border-white/10'}`}>
              <TrendingUp className="w-4 h-4 text-violet-500" /> Score Progression Trend (Last 10 Quizzes)
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#cbd5e1" : "#ffffff08"} />
                  <XAxis dataKey="Quiz" stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} fontWeight="bold" />
                  <YAxis stroke={isLight ? "#475569" : "#ffffff60"} fontSize={10} domain={[0, 100]} />
                  <ChartTooltip 
                    contentStyle={{ 
                      backgroundColor: isLight ? "#ffffff" : "#1e293b", 
                      borderColor: isLight ? "#cbd5e1" : "#ffffff15", 
                      color: isLight ? "#0f172a" : "#fff",
                      fontSize: "11px",
                      borderRadius: "8px"
                    }} 
                  />
                  <Line type="monotone" dataKey="Score" stroke="#8B5CF6" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className={`border rounded-2xl overflow-hidden shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-white/10'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`text-[10px] uppercase tracking-wider font-bold border-b ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-white/40'
              }`}>
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Subject & Topic</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                {history.map((h, i) => (
                  <tr key={i} className={isLight ? "hover:bg-slate-50/50 transition-colors" : "hover:bg-white/3 transition-colors"}>
                    <td className="px-6 py-4 text-xs">
                      <p className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{new Date(h.started_at).toLocaleDateString()}</p>
                      <p className={`text-[9px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>{new Date(h.started_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 text-xs min-w-[200px]">
                      <p className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{h.subject_name}</p>
                      <p className={`mt-0.5 line-clamp-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>{h.topic}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(h.difficulty_used)}`}>
                        {h.difficulty_used}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black ${
                        h.score >= 75 ? "text-emerald-405 font-black" : h.score >= 50 ? "text-amber-500 font-bold" : "text-rose-500 font-bold"
                      }`}>
                        {Math.round(h.score)}%
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right text-xs font-bold ${isLight ? 'text-slate-600' : 'text-white/50'}`}>
                      {h.correct_count} / {h.total_questions}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="5" className={`px-6 py-12 text-center text-xs italic ${isLight ? 'text-slate-400' : 'text-white/30'}`}>No quiz history available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Clear reviewQuestions when starting a new quiz
  useEffect(() => {
    if (screen === "quiz") {
      setReviewQuestions([]);
    }
  }, [screen]);

  // Automatically updated via handleAnswerSubmit

  return (
    <div className="min-h-[75vh] w-full relative">
      {screen === "setup" && renderSetup()}
      {screen === "quiz" && renderQuiz()}
      {screen === "results" && renderResults()}
      {screen === "history" && renderHistory()}
      
      {/* Mid-Quiz Checkpoint Modal Overlay */}
      {showCheckpoint && renderCheckpointModal()}
    </div>
  );
}
