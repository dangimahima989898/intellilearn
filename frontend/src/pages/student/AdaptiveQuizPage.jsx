import React, { useState, useEffect, useRef } from "react";
import { 
  BrainCircuit, Database, GitBranch, Monitor, Network, Coffee, Code, 
  BookOpen, ArrowRight, ArrowLeft, Check, X, Award, RefreshCw, 
  History, Target, AlertTriangle, ChevronDown, ChevronUp, Clock, 
  HelpCircle, LogOut, TrendingUp
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import quizService from "../../services/quizService";
import { getSubjects } from "../../services/chatbotService";

const SUBJECT_DETAILS = {
  DSA: { icon: GitBranch, color: "from-blue-600 to-indigo-600", accent: "text-blue-400", border: "border-blue-500/30" },
  DBMS: { icon: Database, color: "from-purple-600 to-pink-600", accent: "text-purple-400", border: "border-purple-500/30" },
  OS: { icon: Monitor, color: "from-emerald-600 to-teal-600", accent: "text-emerald-400", border: "border-emerald-500/30" },
  CN: { icon: Network, color: "from-amber-600 to-orange-600", accent: "text-amber-400", border: "border-amber-500/30" },
  JAVA: { icon: Coffee, color: "from-red-600 to-rose-600", accent: "text-red-400", border: "border-red-500/30" },
  PYTHON: { icon: Code, color: "from-cyan-600 to-blue-600", accent: "text-cyan-400", border: "border-cyan-500/30" }
};

const CircularTimer = ({ seconds, total = 30 }) => {
  const percentage = (seconds / total) * 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = seconds <= 10 ? "#ef4444" : "#3b82f6";

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="transparent"
          className="text-navy-700"
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
  
  let color = "#eab308"; // yellow (<60)
  if (score >= 80) color = "#10b981"; // green
  else if (score >= 60) color = "#3b82f6"; // blue

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-navy-950"
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
        <span className="text-3xl font-black text-white">{Math.round(score)}%</span>
      </div>
    </div>
  );
};

export default function AdaptiveQuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    loadInitialData();
  }, []);

  // Pre-fill topic if coming from recommendation
  useEffect(() => {
    if (location.state?.prefillTopic && subjects.length > 0) {
      const sub = subjects.find(s => s.name === location.state.prefillSubject || s.code === location.state.prefillSubject);
      if (sub) {
        setSelectedSubject(sub);
        setTopic(location.state.prefillTopic);
      }
    }
  }, [location.state, subjects]);

  const loadInitialData = async () => {
    try {
      const [subs, hist] = await Promise.all([
        getSubjects(),
        quizService.getHistory()
      ]);
      setSubjects(subs);
      setHistory(hist);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

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
          handleAnswerSubmit(null); // Auto-submit with null
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
    
    // We don't have the correct answer yet from backend strictly speaking in the start response
    // But for the "immediate feedback" UI during quiz, the prompt says:
    // "Selected wrong: turns red + shake animation, Correct: turns green + check mark"
    // This implies we need the answer or we can't show it.
    // WAIT: The prompt says "In the response... set correct_answer=null... so student can't cheat"
    // AND "After submission (before next question): Selected wrong: turns red... Correct: turns green"
    // This is contradictory unless I perform a check on submit-answer endpoint or I'm supposed to know.
    // I will assume for now I show correctly if I have it, but the prompt says hide it.
    // Given the requirement "After submission... Selected wrong: turns red", I'll just save the answer 
    // and wait for the final results screen to show the checkmarks, OR I'll reveal it if the requirement 
    // says so. Since it says "After submission (before next question)...", I'll reveal it.
    // BUT how if I don't have it? I'll let the user proceed to the next question.
    // Actually, looking at the requirement: "No explanation revealed during quiz (suspense maintained)".
    // It doesn't explicitly say "Don't show if correct". 
    // Okay, I'll stick to the "reveal after submit" logic IF I can. 
    // If I followed Step 9 backend strictly, I don't have correct_answer in start response.
    // So I can't show immediate green/red during the quiz UNLESS I hit a per-answer API or have the answer.
    // I'll proceed without immediate feedback during quiz and show it only at the end to be safe with the "no cheating" rule.
    // RE-READING: "immediate lock (cannot change) -> turns red + shake... Correct: turns green"
    // I will include the correct_answer in the start response but as a HASH or something? No, let's just 
    // assume the developer meant I should reveal it AFTER the student locks their choice.
    // Since I can't do that without the answer, I'll skip the immediate red/green and just show "Locked".
    
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

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const res = await quizService.submitQuiz(quizData.attempt_id, userAnswers);
      setResults(res);
      setScreen("results");
      loadInitialData(); // Refresh history
    } catch (err) {
      toast.error("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    if (diff === "hard") return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (diff === "medium") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  };

  const renderSetup = () => {
    const last5 = history.slice(0, 5);
    const avg = last5.length > 0 ? last5.reduce((acc, h) => acc + (h.score || 0), 0) / last5.length : 0;
    const predictedDiff = avg >= 75 ? "Hard" : avg >= 50 ? "Medium" : "Easy";

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-outfit font-black text-white flex items-center justify-center gap-3">
            <Target className="w-10 h-10 text-brand" />
            Adaptive Quiz 🎯
          </h1>
          <p className="text-navy-400 text-lg">Difficulty adjusts based on your performance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Subject Selector */}
            <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" />
                Select a Subject
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const meta = SUBJECT_DETAILS[sub.code] || { icon: BookOpen, color: "from-blue-600 to-indigo-600" };
                  const Icon = meta.icon;
                  const isSel = selectedSubject?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub)}
                      className={`relative group p-4 rounded-2xl border transition-all text-left ${
                        isSel ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-navy-700 bg-navy-900/50 hover:border-navy-600"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-brand uppercase tracking-tighter mb-1">{sub.code}</p>
                      <p className="text-sm font-bold text-white line-clamp-1">{sub.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic Input */}
            <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-brand" />
                Focus Topic
              </h3>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Memory Mangement, React Hooks, SQL Joins..."
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:border-brand outline-none transition-all"
              />
              {selectedSubject?.topics && (
                <div className="flex flex-wrap gap-2">
                  {selectedSubject.topics.slice(0, 5).map(t => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className="px-3 py-1 rounded-lg bg-navy-950 border border-navy-800 text-xs text-navy-400 hover:border-brand transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Sidebar */}
          <div className="space-y-6">
            <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand" />
                Your Stats
              </h3>
              
              {history.length > 0 ? (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-navy-400 uppercase tracking-widest">Recent Quizzes</p>
                    <div className="flex gap-2">
                      {last5.map((h, i) => (
                        <div 
                          key={i} 
                          title={`${h.subject_name}: ${h.score}%`}
                          className={`w-4 h-4 rounded-full ${h.score >= 75 ? "bg-emerald-500" : h.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-navy-900 border border-navy-700">
                    <p className="text-xs font-bold text-navy-400 uppercase mb-1">Expected Difficulty</p>
                    <p className={`text-xl font-black ${predictedDiff === "Hard" ? "text-rose-400" : predictedDiff === "Medium" ? "text-amber-400" : "text-emerald-400"}`}>
                      {predictedDiff}
                    </p>
                    <p className="text-[10px] text-navy-500 mt-1 italic">Based on your last 5 attempts</p>
                  </div>
                </>
              ) : (
                <div className="bg-navy-900/50 border border-dashed border-navy-700 rounded-2xl p-6 text-center">
                  <History className="w-8 h-8 text-navy-700 mx-auto mb-2" />
                  <p className="text-navy-500 text-sm">No history yet.</p>
                </div>
              )}
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !selectedSubject || !topic}
              className="w-full py-4 rounded-2xl bg-brand hover:brightness-110 text-white font-black text-lg shadow-xl shadow-brand/20 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {loading ? "Generating Quiz..." : "Start Quiz 🚀"}
            </button>
            <button 
              onClick={() => setScreen("history")}
              className="w-full py-3 rounded-2xl border border-navy-700 text-navy-400 font-bold hover:bg-navy-800 transition-colors"
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
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in relative pb-20">
        {/* Top Bar */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <CircularTimer seconds={timeLeft} />
            <div>
              <p className="text-xs font-bold text-navy-400 uppercase">Question {currentIdx + 1} of 10</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(quizData.difficulty_used)}`}>
                  {quizData.difficulty_used}
                </span>
                <span className="text-[10px] text-brand font-black uppercase bg-brand/10 px-2 py-0.5 rounded-full">
                  {quizData.subject_name}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowQuitConfirm(true)}
            className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-xl transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-brand h-full transition-all duration-1000 ease-linear"
            style={{ width: `${((currentIdx + 1) / 10) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 space-y-8 shadow-2xl relative">
          <h2 className="text-2xl font-outfit font-bold text-white text-center leading-relaxed">
            {q.question_text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className={`group p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  selectedAnswer === opt.key 
                    ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" 
                    : "bg-navy-900 border-navy-700 text-navy-300 hover:border-navy-500 hover:bg-navy-800"
                } ${isLocked && selectedAnswer !== opt.key ? "opacity-50 grayscale" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    selectedAnswer === opt.key ? "bg-white/20 text-white" : "bg-navy-950 text-navy-500"
                  }`}>
                    {opt.key.toUpperCase()}
                  </span>
                  <p className="font-semibold">{opt.text}</p>
                </div>
                {selectedAnswer === opt.key && (
                  <div className="absolute top-0 right-0 p-2 opacity-20">
                    <Check className="w-12 h-12" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          {!isLocked ? (
            <button
              onClick={() => handleAnswerSubmit()}
              disabled={!selectedAnswer}
              className="px-12 py-4 rounded-2xl bg-brand hover:brightness-110 text-white font-black text-lg shadow-xl shadow-brand/20 transition-all disabled:opacity-50"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="group px-12 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              {currentIdx < 9 ? "Next Question" : "View Results"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Quit Dialog */}
        {showQuitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
            <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-pop">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">Quit Quiz?</h3>
                <p className="text-navy-400">Your progress will be lost. Are you sure you want to end this session?</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-navy-700 text-white font-bold hover:bg-navy-700 transition-colors"
                >
                  Stay
                </button>
                <button 
                  onClick={() => setScreen("setup")}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
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

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Award className="w-48 h-48 text-brand" />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <ScoreRing score={results.score} />
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-black text-white">{message}</h2>
              <p className="text-navy-400 text-lg">You got <span className="text-brand font-bold">{results.correct_count} out of {results.total}</span> correct</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                 <div className="px-3 py-1 bg-navy-950 border border-navy-800 rounded-full text-xs font-bold text-navy-400 flex items-center gap-2">
                   Difficulty: <span className="text-white capitalize">{results.difficulty_used}</span>
                 </div>
                 <div className={`px-3 py-1 border rounded-full text-xs font-bold flex items-center gap-2 ${nextDiffColor}`}>
                   Next Quiz: <span className="capitalize">{results.next_difficulty}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {results.weak_chapters.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-lg shadow-rose-500/5">
            <h3 className="text-rose-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Areas Needing Attention
            </h3>
            <div className="space-y-4">
              {results.weak_chapters.map((weak, idx) => (
                <div key={idx} className="bg-navy-900/50 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-white font-bold">{weak.topic}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-navy-950 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${weak.correct_rate * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">
                        {Math.round(weak.correct_rate * 100)}% Accuracy
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate("/student/questions", { state: { prefillSubject: weak.subject, prefillTopic: weak.topic } })}
                    className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-xs font-bold text-white transition-all whitespace-nowrap"
                  >
                    Practice Topic
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white px-2">Answer Review</h3>
          <div className="space-y-3">
            {results.per_question_results.map((r, i) => {
              const q = quizData.questions.find(x => x.id === r.question_id);
              const isEx = expandedReviews[r.question_id];
              return (
                <div key={i} className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden shadow-md">
                  <button 
                    onClick={() => setExpandedReviews(prev => ({ ...prev, [r.question_id]: !prev[r.question_id] }))}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-navy-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.is_correct ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                        {r.is_correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <p className="text-white font-bold text-sm line-clamp-1">{q.question_text}</p>
                    </div>
                    {isEx ? <ChevronUp className="w-5 h-5 text-navy-500" /> : <ChevronDown className="w-5 h-5 text-navy-500" />}
                  </button>
                  
                  {isEx && (
                    <div className="p-6 bg-navy-900/50 border-t border-navy-700 space-y-4 animate-slide-down">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className={`p-4 rounded-xl border ${r.selected_answer === 'a' ? (r.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5') : (r.correct_answer === 'a' ? 'border-emerald-500/50' : 'border-navy-800')}`}>
                            <p className="text-xs font-bold text-navy-500 mb-1 uppercase">Option A</p>
                            <p className="text-sm text-white">{q.option_a}</p>
                         </div>
                         <div className={`p-4 rounded-xl border ${r.selected_answer === 'b' ? (r.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5') : (r.correct_answer === 'b' ? 'border-emerald-500/50' : 'border-navy-800')}`}>
                            <p className="text-xs font-bold text-navy-500 mb-1 uppercase">Option B</p>
                            <p className="text-sm text-white">{q.option_b}</p>
                         </div>
                         <div className={`p-4 rounded-xl border ${r.selected_answer === 'c' ? (r.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5') : (r.correct_answer === 'c' ? 'border-emerald-500/50' : 'border-navy-800')}`}>
                            <p className="text-xs font-bold text-navy-500 mb-1 uppercase">Option C</p>
                            <p className="text-sm text-white">{q.option_c}</p>
                         </div>
                         <div className={`p-4 rounded-xl border ${r.selected_answer === 'd' ? (r.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5') : (r.correct_answer === 'd' ? 'border-emerald-500/50' : 'border-navy-800')}`}>
                            <p className="text-xs font-bold text-navy-500 mb-1 uppercase">Option D</p>
                            <p className="text-sm text-white">{q.option_d}</p>
                         </div>
                       </div>
                       
                       <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                            <HelpCircle className="w-6 h-6 text-brand" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Expert Explanation</p>
                            <p className="text-navy-300 text-sm leading-relaxed">{r.explanation}</p>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center py-8">
           <button 
             onClick={() => setScreen("setup")}
             className="px-8 py-4 rounded-2xl bg-brand text-white font-black shadow-xl shadow-brand/20 hover:scale-105 transition-all"
           >
             Take Another Quiz
           </button>
           <button 
             onClick={() => navigate("/progress")}
             className="px-8 py-4 rounded-2xl border border-navy-700 text-navy-300 font-bold hover:bg-navy-800 transition-all"
           >
             View Progress
           </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const chartData = [...history].reverse().slice(-10).map(h => ({
      name: new Date(h.started_at).toLocaleDateString(),
      score: h.score || 0
    }));

    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <History className="w-8 h-8 text-brand" />
            Quiz History
          </h2>
          <button 
            onClick={() => setScreen("setup")}
            className="px-6 py-2 rounded-xl bg-navy-800 text-white font-bold hover:bg-navy-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </button>
        </div>

        {/* Chart */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-6 h-80 shadow-xl">
           <h3 className="text-lg font-bold text-white mb-6">Score Trend (Last 10)</h3>
           <ResponsiveContainer width="100%" height="85%">
             <LineChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
               <XAxis dataKey="name" stroke="#718096" fontSize={10} />
               <YAxis stroke="#718096" fontSize={10} domain={[0, 100]} />
               <Tooltip 
                 contentStyle={{ backgroundColor: "#1a202c", borderColor: "#2d3748", borderRadius: '12px' }}
                 itemStyle={{ color: "#3b82f6" }}
               />
               <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
             </LineChart>
           </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-navy-900 text-navy-400 text-xs font-black uppercase tracking-widest border-b border-navy-700">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Subject & Topic</th>
                <th className="px-6 py-4">Difficulty</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-navy-750 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-white text-sm font-bold">{new Date(h.started_at).toLocaleDateString()}</p>
                    <p className="text-navy-500 text-[10px]">{new Date(h.started_at).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white text-sm font-bold">{h.subject_name}</p>
                    <p className="text-navy-500 text-xs line-clamp-1">{h.topic}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border ${getDifficultyColor(h.difficulty_used)}`}>
                      {h.difficulty_used}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className={`text-lg font-black ${h.score >= 75 ? "text-emerald-400" : h.score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                      {Math.round(h.score)}%
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-white text-xs font-bold">{h.correct_count} / {h.total_questions}</p>
                    <div className="w-20 h-1 bg-navy-950 rounded-full mt-1 ml-auto overflow-hidden">
                       <div 
                         className={`h-full ${h.score >= 75 ? "bg-emerald-500" : h.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                         style={{ width: `${h.score}%` }}
                       />
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-navy-500 italic">No quiz history available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] p-4 sm:p-8">
      {screen === "setup" && renderSetup()}
      {screen === "quiz" && renderQuiz()}
      {screen === "results" && renderResults()}
      {screen === "history" && renderHistory()}
    </div>
  );
}
