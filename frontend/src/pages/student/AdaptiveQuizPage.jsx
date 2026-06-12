import React, { useState, useEffect, useRef } from "react";
import { 
  BrainCircuit, Database, GitBranch, Monitor, Network, Coffee, Code, 
  BookOpen, ArrowRight, ArrowLeft, Check, X, Award, RefreshCw, 
  History, Target, AlertTriangle, ChevronDown, ChevronUp, Clock, 
  HelpCircle, LogOut, TrendingUp
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import quizService from "../../services/quizService";
import { getSubjects } from "../../services/chatbotService";
import PageWrapper from "../../components/PageWrapper";
import { useTheme } from "../../context/ThemeContext";

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
          stroke="rgba(255,255,255,0.05)"
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
      <span className={`absolute text-xs font-bold ${seconds <= 10 ? "text-rose-500 animate-pulse" : "text-white"}`}>
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
  if (score >= 80) color = "#10b981"; 
  else if (score >= 60) color = "#3b82f6"; 

  return (
    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="rgba(255,255,255,0.05)"
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
        <span className="text-3xl font-outfit font-bold text-white">{Math.round(score)}%</span>
      </div>
    </div>
  );
};

export default function AdaptiveQuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [screen, setScreen] = useState("setup"); // setup | quiz | results | history
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Setup State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topic, setTopic] = useState("");
  
  // Quiz State
  const [quizData, setQuizData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const timerRef = useRef(null);

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

  useEffect(() => {
    if (location.state?.prefillTopic && subjects.length > 0) {
      const sub = subjects.find(s => s.name === location.state.prefillSubject || s.code === location.state.prefillSubject);
      if (sub) {
        setSelectedSubject(sub);
        setTopic(location.state.prefillTopic);
      }
    }
  }, [location.state, subjects]);

  const startQuiz = async () => {
    if (!selectedSubject || !topic.trim()) {
      toast.error("Please select a subject and topic");
      return;
    }
    setLoading(true);
    try {
      const data = await quizService.startQuiz(selectedSubject.id, topic.trim());
      setQuizData(data);
      setCurrentIdx(0);
      setUserAnswers([]);
      setSelectedAnswer(null);
      setIsLocked(false);
      setTimeLeft(30);
      setScreen("quiz");
      startTimer();
    } catch (err) {
      toast.error("Failed to generate quiz. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(30);
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

  const handleAnswerSubmit = (ans) => {
    if (isLocked) return;
    
    const finalAns = ans || selectedAnswer;
    setIsLocked(true);
    clearInterval(timerRef.current);

    const currentQ = quizData.questions[currentIdx];
    
    setUserAnswers(prev => [...prev, {
      question_id: currentQ.id,
      selected_answer: finalAns || "",
      time_taken_seconds: 30 - timeLeft
    }]);
  };

  const nextQuestion = () => {
    if (currentIdx < 9) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsLocked(false);
      startTimer();
    } else {
      finishQuiz();
    }
  };

  const skipQuestion = () => {
    handleAnswerSubmit("");
    setTimeout(() => {
      nextQuestion();
    }, 100);
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const res = await quizService.submitQuiz(quizData.attempt_id, userAnswers);
      setResults(res);
      setScreen("results");
      loadInitialData();
    } catch (err) {
      toast.error("Failed to submit quiz");
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

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className={`text-4xl font-outfit font-black flex items-center justify-center gap-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Target className="w-10 h-10 text-blue-400" />
            Adaptive Quiz
          </h1>
          <p className={`text-lg font-medium ${isLight ? 'text-slate-400' : 'text-white/50'}`}>Difficulty levels self-adjust based on accuracy ratio</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Subject Selector Grid */}
            <div className={`border rounded-2xl p-6 space-y-4 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <BookOpen className="w-5 h-5 text-blue-400" />
                Select a Subject
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const detail = SUBJECT_DETAILS[sub.code] || { icon: BookOpen, color: "from-blue-600 to-indigo-600", accent: "#3b82f6" };
                  const Icon = detail.icon;
                  const isSel = selectedSubject?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 group ${
                        isSel 
                          ? "border-2 border-blue-500 bg-blue-500/10 scale-105 shadow-xl shadow-blue-500/10" 
                          : isLight ? "bg-slate-50 border-slate-200 hover:border-blue-300" : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white mb-2 shrink-0 bg-white/5`} style={{ color: detail.accent }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">{sub.code}</p>
                        <p className="text-xs font-bold text-white truncate max-w-full leading-tight">{sub.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic input field */}
              <div className={`border rounded-2xl p-6 space-y-4 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                Focus Topic
              </h3>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Virtual Memory, SQL Joins, Binary Trees..."
                className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
              />
              {selectedSubject?.topics && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {selectedSubject.topics.slice(0, 4).map(t => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Performance sidebar widgets */}
          <div className="space-y-6">
            <div className={`border rounded-2xl p-6 space-y-6 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Your Performance
              </h3>
              
              {history.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Recent scores history</p>
                    <div className="flex gap-2">
                      {last5.map((h, i) => (
                        <div 
                          key={i} 
                          title={`${h.subject_name}: ${h.score}%`}
                          className={`w-3.5 h-3.5 rounded-full border border-white/10 ${h.score >= 75 ? "bg-emerald-500" : h.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Predicted difficulty:</p>
                    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-black uppercase border ${
                      predictedDiff === "Hard" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      predictedDiff === "Medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}>
                      {predictedDiff}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/3 border border-white/5 rounded-xl p-6 text-center select-none">
                  <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-xs font-semibold">No quiz history available yet.</p>
                </div>
              )}
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !selectedSubject || !topic}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-95 text-white font-extrabold text-md shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:grayscale cursor-pointer"
            >
              {loading ? "Generating Quiz..." : "Start Adaptive Quiz 🚀"}
            </button>
            <button 
              onClick={() => setScreen("history")}
              className="w-full py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white bg-white/5 text-xs font-bold transition-colors cursor-pointer"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const q = quizData.questions[currentIdx];
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in relative">
        {/* Quiz Top Bar */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-3">
            <CircularTimer seconds={timeLeft} />
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase">Question {currentIdx + 1} of 10</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(quizData.difficulty_used)}`}>
                  {quizData.difficulty_used}
                </span>
                <span className="text-[9px] text-blue-300 font-black uppercase bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/25">
                  {quizData.subject_name}
                </span>
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
            className="bg-blue-500 h-full transition-all duration-350"
            style={{ width: `${((currentIdx + 1) / 10) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className={`border rounded-2xl p-8 space-y-6 shadow-2xl relative ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex justify-center mb-1">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse ${
              quizData.difficulty_used === 'hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              quizData.difficulty_used === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {quizData.difficulty_used} Difficulty
            </span>
          </div>

          <h2 className={`text-xl sm:text-2xl font-outfit font-bold text-center leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {q.question_text}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {[
              { key: "a", text: q.option_a },
              { key: "b", text: q.option_b },
              { key: "c", text: q.option_c },
              { key: "d", text: q.option_d }
            ].map((opt) => (
              <button
                key={opt.key}
                disabled={isLocked}
                onClick={() => setSelectedAnswer(opt.key)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedAnswer === opt.key 
                    ? "bg-blue-500/15 border-blue-500 text-blue-300 font-semibold shadow-lg shadow-blue-500/10" 
                    : "bg-white/5 border-white/10 text-white/80 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5"
                } ${isLocked && selectedAnswer !== opt.key ? "opacity-40 grayscale" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                    selectedAnswer === opt.key ? "bg-blue-500 text-white" : "bg-white/10 text-white/60"
                  }`}>
                    {opt.key.toUpperCase()}
                  </span>
                  <span>{opt.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button and Skip */}
        <div className="flex flex-col gap-4 items-center">
          {!isLocked ? (
            <div className="flex justify-between items-center w-full max-w-sm">
              <button
                onClick={skipQuestion}
                className="text-xs text-white/30 hover:text-white font-bold tracking-wider cursor-pointer uppercase transition-colors"
              >
                Skip Question
              </button>
              <button
                onClick={() => handleAnswerSubmit()}
                disabled={!selectedAnswer}
                className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                Submit Answer
              </button>
            </div>
          ) : (
            <button
              onClick={nextQuestion}
              className="px-12 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {currentIdx < 9 ? "Next Question" : "View Results"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quit Confirmation dialog */}
        {showQuitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Quit Quiz?</h3>
                <p className="text-white/40 text-xs mt-1">Your current practice attempts will be lost. Are you sure?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors cursor-pointer text-xs"
                >
                  Stay
                </button>
                <button 
                  onClick={() => setScreen("setup")}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors cursor-pointer text-xs"
                >
                  Quit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const message = results.score >= 80 ? "Excellent! 🎉" : results.score >= 60 ? "Good Job! 👍" : "Keep Practicing! 💪";
    const nextDiffColor = getDifficultyColor(results.next_difficulty);
    const isHighScore = results.score >= 80;

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in relative pb-12">
        
        {/* CSS-based Confetti burst if score > 80% */}
        {isHighScore && (
          <>
            <style>{`
              @keyframes floatUp {
                0% { transform: translateY(110vh) rotate(0deg); opacity: 1; }
                100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
              }
              .conf-piece {
                position: fixed;
                width: 6px;
                height: 6px;
                background-color: #3b82f6;
                animation: floatUp 3s linear infinite;
                z-index: 40;
                pointer-events: none;
              }
            `}</style>
            {Array.from({ length: 25 }).map((_, i) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
              const delay = (Math.random() * 3).toFixed(2)
              const left = (Math.random() * 100).toFixed(0)
              const bg = colors[i % colors.length]
              return (
                <div 
                  key={i} 
                  className="conf-piece"
                  style={{
                    left: `${left}vw`,
                    animationDelay: `${delay}s`,
                    backgroundColor: bg
                  }}
                />
              )
            })}
          </>
        )}

          <div className={`border rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className={`text-2xl font-extrabold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>Adaptive Results</h2>
          
          <ScoreRing score={results.score} />

          <div>
            <h3 className="text-xl font-bold text-white">{message}</h3>
            <p className="text-white/40 text-xs mt-1">Accuracy Score: {results.correct_count} / {results.total} correct</p>
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getDifficultyColor(results.difficulty_used)}`}>
              Current: {results.difficulty_used}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${nextDiffColor} inline-flex items-center gap-1`}>
              Next Level: {results.next_difficulty} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Weak Areas Section */}
        {results.weak_chapters && results.weak_chapters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white font-outfit px-1">Weak Areas Identified</h3>
            <div className="grid grid-cols-1 gap-3">
              {results.weak_chapters.map((weak, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/5 border border-white/10 border-l-4 border-l-red-500 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{weak.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${weak.correct_rate * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-bold text-red-400 uppercase shrink-0">
                        {Math.round(weak.correct_rate * 100)}% Accuracy
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate("/student/questions", { state: { prefillSubject: weak.subject, prefillTopic: weak.topic } })}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    Practice →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accordion Review */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white font-outfit px-1">Review Questions</h3>
          
          {results.per_question_results && results.per_question_results.map((r, i) => {
            const q = quizData.questions.find(x => x.id === r.question_id);
            const isEx = expandedReviews[r.question_id];
            
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow">
                <button 
                  onClick={() => setExpandedReviews(prev => ({ ...prev, [r.question_id]: !prev[r.question_id] }))}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-1.5 rounded-lg shrink-0 ${r.is_correct ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {r.is_correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </span>
                    <span className="text-white text-sm font-semibold truncate max-w-sm">{q?.question_text}</span>
                  </div>
                  {isEx ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </button>

                {isEx && (
                  <div className="p-4 bg-black/20 border-t border-white/10 space-y-4 animate-slide-down">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { k: 'a', text: q?.option_a },
                        { k: 'b', text: q?.option_b },
                        { k: 'c', text: q?.option_c },
                        { k: 'd', text: q?.option_d }
                      ].map((opt) => {
                        const isSelectedOpt = r.selected_answer === opt.k
                        const isCorrectOpt = r.correct_answer === opt.k
                        let borders = "border-white/10 text-white/60 bg-white/5"
                        if (isCorrectOpt) borders = "border-green-500/40 bg-green-500/10 text-green-300"
                        else if (isSelectedOpt) borders = "border-red-500/40 bg-red-500/10 text-red-300"

                        return (
                          <div key={opt.k} className={`p-3 rounded-lg border flex items-center gap-2 ${borders}`}>
                            <span className="font-bold uppercase">{opt.k}:</span>
                            <span>{opt.text}</span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-xs leading-relaxed">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Explanation:</span>
                      <p className="text-white/70">{r.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 justify-center pt-6">
          <button 
            onClick={() => setScreen("setup")}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-95 text-white font-bold shadow-lg text-xs cursor-pointer"
          >
            Take Another Quiz
          </button>
          <button 
            onClick={() => navigate("/student/progress")}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs cursor-pointer transition-all"
          >
            View Progress
          </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-3 font-outfit">
            <History className="w-6 h-6 text-blue-400 animate-pulse" />
            Quiz History
          </h2>
          <button 
            onClick={() => setScreen("setup")}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/40 text-[10px] uppercase tracking-wider font-bold border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Subject & Topic</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="px-6 py-4 text-xs">
                      <p className="text-white font-bold">{new Date(h.started_at).toLocaleDateString()}</p>
                      <p className="text-white/30 text-[9px] mt-0.5">{new Date(h.started_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 text-xs min-w-[200px]">
                      <p className="text-white font-bold">{h.subject_name}</p>
                      <p className="text-white/40 mt-0.5 line-clamp-1">{h.topic}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(h.difficulty_used)}`}>
                        {h.difficulty_used}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black ${
                        h.score >= 75 ? "text-emerald-400" : h.score >= 50 ? "text-amber-400" : "text-rose-400"
                      }`}>
                        {Math.round(h.score)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white/50 text-xs font-bold">{h.correct_count} / {h.total_questions}</span>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-white/30 text-xs italic">No quiz history available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[75vh] w-full relative">
      {screen === "setup" && renderSetup()}
      {screen === "quiz" && renderQuiz()}
      {screen === "results" && renderResults()}
      {screen === "history" && renderHistory()}
    </div>
  );
}
