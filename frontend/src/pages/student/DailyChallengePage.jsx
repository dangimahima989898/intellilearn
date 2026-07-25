import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Trophy, Calendar, Award, CheckCircle2, XCircle, 
  Timer, BarChart3, TrendingUp, Sparkles, Medal, Star, Flame, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import dailyChallengeService from "../../services/dailyChallengeService";
import PageWrapper from "../../components/PageWrapper";
import SubjectBadge from "../../components/SubjectBadge";
import { useTheme } from "../../context/ThemeContext";

const MedalIcon = ({ rank }) => {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 font-extrabold text-sm"><Medal className="w-4.5 h-4.5" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-400/50 flex items-center justify-center text-slate-300 font-extrabold text-sm"><Medal className="w-4.5 h-4.5" /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-600/50 flex items-center justify-center text-amber-500 font-extrabold text-sm"><Medal className="w-4.5 h-4.5" /></div>;
  return <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 font-bold text-xs">{rank}</div>;
};

export default function DailyChallengePage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "history" ? "history" : "challenge";
  
  const setMode = (newMode) => {
    setSearchParams(prev => {
      prev.set("mode", newMode);
      return prev;
    });
  };

  const [challenge, setChallenge] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: "00", minutes: "00", seconds: "00" });

  const updateCountdown = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    
    if (diff <= 0) {
      setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    setTimeLeft({
      hours: h.toString().padStart(2, '0'),
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0')
    });
  };

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);

      // Load Today's Challenge
      try {
        const chalData = await dailyChallengeService.getTodayChallenge();
        if (active) {
          setChallenge(chalData?.challenge);
          setAlreadySubmitted(!!chalData?.already_submitted);
          setSubmission(chalData?.submission);
        }
      } catch (err) {
        console.error("Failed to load today's challenge:", err);
      }

      // Load Leaderboard
      try {
        const lbData = await dailyChallengeService.getLeaderboard();
        if (active) {
          setLeaderboard(lbData || []);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      }

      // Load History
      try {
        const histData = await dailyChallengeService.getMyHistory();
        if (active) {
          setHistory(histData || []);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      }

      if (active) setLoading(false);
    };

    loadData();
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedOpt) return;
    setSubmitting(true);
    try {
      const res = await dailyChallengeService.submitChallenge(challenge.id, selectedOpt);
      setSubmission({
        selected_answer: selectedOpt,
        is_correct: res.is_correct,
        score_earned: res.score_earned
      });
      setChallenge(prev => ({
        ...prev,
        correct_answer: res.correct_answer,
        explanation: res.explanation
      }));
      setAlreadySubmitted(true);
      toast.success(res.message);
      
      // Reload leaderboard and history
      const [lb, hist] = await Promise.all([
        dailyChallengeService.getLeaderboard(),
        dailyChallengeService.getMyHistory()
      ]);
      setLeaderboard(lb);
      setHistory(hist);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCorrect = submission?.is_correct;
  const isDone = alreadySubmitted;



  const renderChallenge = () => {
    if (loading) return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center space-y-4 shadow-2xl backdrop-blur-md">
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
        </div>
        <p className="text-white/60 font-outfit text-lg font-medium animate-pulse">Formulating your daily extreme challenge...</p>
      </div>
    );

    const correctAns = challenge?.correct_answer;
    const userAns = submission?.selected_answer;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Challenge Card */}
        <div className={`border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group backdrop-blur-md ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          {/* Subtle background gradient path */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SubjectBadge name={challenge?.subject} />
                <span className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Hard Mode
                </span>
              </div>
              
              {/* Premium Countdown clocks */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 px-3 py-1.5 rounded-xl text-white">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mr-1">Ends in:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-white">
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400">{timeLeft.hours}</span>
                  <span className="opacity-40 animate-pulse">:</span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400">{timeLeft.minutes}</span>
                  <span className="opacity-40 animate-pulse">:</span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400">{timeLeft.seconds}</span>
                </div>
              </div>
            </div>

            <h2 className={`text-xl md:text-2xl font-outfit font-extrabold leading-relaxed ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {challenge?.question}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { key: 'a', text: challenge?.option_a },
                { key: 'b', text: challenge?.option_b },
                { key: 'c', text: challenge?.option_c },
                { key: 'd', text: challenge?.option_d }
              ].map((opt) => {
                let style = "bg-white/5 border-white/10 text-white/70 hover:border-blue-500/40 hover:bg-white/10 hover:text-white";
                let icon = null;

                if (isDone) {
                  if (opt.key === correctAns) {
                    style = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-500/10";
                    icon = <CheckCircle2 className="w-5 h-5 shrink-0" />;
                  } else if (opt.key === userAns) {
                    style = "bg-red-500/10 border-red-500 text-red-400 font-bold shadow-lg shadow-red-500/10";
                    icon = <XCircle className="w-5 h-5 shrink-0" />;
                  } else {
                    style = "bg-white/2 border-white/5 text-white/20 opacity-40";
                  }
                } else if (selectedOpt === opt.key) {
                  style = "bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 font-bold";
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isDone || submitting}
                    onClick={() => setSelectedOpt(opt.key)}
                    className={`p-5 rounded-2xl border text-left transition-all active:scale-[0.98] duration-200 flex items-center justify-between gap-4 cursor-pointer ${style}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-all duration-200 ${
                        selectedOpt === opt.key && !isDone 
                          ? "bg-blue-500 text-white shadow-md" 
                          : isDone && opt.key === correctAns 
                            ? "bg-emerald-500 text-white"
                            : isDone && opt.key === userAns
                              ? "bg-red-500 text-white"
                              : "bg-white/5 text-white/40 border border-white/10"
                      }`}>
                        {opt.key.toUpperCase()}
                      </span>
                      <span className="text-sm md:text-md leading-relaxed">{opt.text}</span>
                    </div>
                    {icon}
                  </button>
                );
              })}
            </div>

            {!isDone ? (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOpt || submitting}
                  className="px-12 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-md shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      Submit Answer 🚀
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className={`p-6 rounded-2xl border ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"} space-y-4 animate-slide-up`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white animate-bounce-subtle"}`}>
                    {isCorrect ? <Award className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-extrabold font-outfit ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                      {isCorrect ? "Phenomenal! +10 Points Added" : "Not quite! 0 Points Awarded"}
                    </h4>
                    <p className="text-white/60 text-xs mt-0.5">Thanks for taking today's AI challenge!</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                     <Sparkles className="w-3 h-3 text-blue-400" /> Explanation
                   </p>
                   <p className="text-white/80 text-sm leading-relaxed font-medium">{challenge?.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className={`border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
           <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className={`text-lg font-outfit font-extrabold flex items-center gap-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <BarChart3 className="w-5 h-5 text-blue-400" />
                This Month's Elite Standings
              </h3>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-md">Realtime</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white/2 text-[10px] text-white/40 font-black uppercase tracking-wider border-b border-white/5">
                   <th className="px-6 py-4 font-bold">Rank</th>
                   <th className="px-6 py-4 font-bold">Student</th>
                   <th className="px-6 py-4 text-center font-bold">Total Score</th>
                   <th className="px-6 py-4 text-center font-bold">Accuracy</th>
                   <th className="px-6 py-4 text-right font-bold">Streak Days</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {leaderboard.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-white/40 font-medium">No standings recorded yet. Be the first!</td>
                   </tr>
                 ) : (
                   leaderboard.map((lb) => (
                     <tr key={lb.rank} className={`hover:bg-white/3 transition-all duration-200 ${lb.name === "You" ? "bg-blue-500/10 hover:bg-blue-500/15" : ""}`}>
                       <td className="px-6 py-4 align-middle">
                         <MedalIcon rank={lb.rank} />
                       </td>
                       <td className="px-6 py-4 align-middle font-outfit">
                          <span className="text-white font-extrabold text-sm">{lb.name}</span>
                          {lb.name === "You" && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[8px] font-black uppercase tracking-widest border border-blue-500/40">You</span>}
                       </td>
                       <td className="px-6 py-4 text-center align-middle">
                          <span className="text-blue-400 font-black text-md">{lb.total_score}</span>
                       </td>
                       <td className="px-6 py-4 text-center align-middle">
                          <div className="max-w-[120px] mx-auto">
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${lb.accuracy_rate}%` }} />
                            </div>
                            <span className="text-[9px] text-emerald-400/80 font-bold mt-1.5 block">{lb.accuracy_rate.toFixed(0)}% Accuracy</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right align-middle font-mono">
                          <span className="text-white/70 text-xs font-bold bg-white/5 border border-white/10 rounded-full px-3 py-1 inline-flex items-center gap-1">
                            🔥 {lb.attempt_count} Days
                          </span>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    // Generate calendar grid for current month
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const validHistory = history.filter(h => {
      const challengeDate = new Date(h.challenge_date);
      const chalDay = new Date(challengeDate.getFullYear(), challengeDate.getMonth(), challengeDate.getDate());
      return chalDay <= startOfToday;
    });

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const historyMap = validHistory.reduce((acc, h) => {
      acc[new Date(h.challenge_date).getDate()] = h;
      return acc;
    }, {});

    const stats = {
      attempted: validHistory.length,
      correct: validHistory.filter(h => h.is_correct).length,
      points: validHistory.reduce((acc, h) => acc + h.score_earned, 0),
      accuracy: validHistory.length > 0 ? (validHistory.filter(h => h.is_correct).length / validHistory.length * 100).toFixed(0) : 0
    };

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Points Earned", val: stats.points, color: "text-blue-400", icon: Star, bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Success Rate", val: `${stats.accuracy}%`, color: "text-emerald-400", icon: TrendingUp, bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Correct Answers", val: stats.correct, color: "text-emerald-500", icon: CheckCircle2, bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Challenge Attempts", val: stats.attempted, color: "text-white/70", icon: Calendar, bg: "bg-white/5 border-white/10" }
          ].map((s, i) => (
            <div key={i} className={`border rounded-2xl p-5 space-y-2 backdrop-blur-md shadow-lg ${s.bg}`}>
               <div className="flex items-center justify-between">
                 <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{s.label}</p>
                 <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
               </div>
               <p className={`text-2xl md:text-3xl font-outfit font-black ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-outfit font-extrabold text-white flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-blue-400" />
              Challenge Activity Tracker
            </h3>
            <span className="text-sm font-bold text-white/70 font-outfit">
              {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-white/30 uppercase mb-2">{d}</div>
            ))}
            {/* Pad leading empty days */}
            {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const h = historyMap[day];
              const isToday = day === today.getDate();

              const isFuture = day > today.getDate();
              let cellStyle = "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 cursor-help";
              let statusIcon = null;
              let tooltip = "";

              if (isFuture) {
                cellStyle = "bg-white/2 border-white/5 text-white/20 cursor-default select-none";
                tooltip = "Upcoming Challenge";
              } else if (h) {
                if (h.is_correct) {
                  cellStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 cursor-help";
                  statusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
                } else {
                  cellStyle = "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 cursor-help";
                  statusIcon = <XCircle className="w-3.5 h-3.5" />;
                }
                tooltip = `${h.subject}: ${h.is_correct ? "Correct" : "Incorrect"}`;
              } else if (isToday) {
                cellStyle = "border-blue-500 ring-2 ring-blue-500/25 bg-blue-500/10 text-white hover:bg-blue-500/20 cursor-help";
                tooltip = "Today's Challenge";
              } else {
                cellStyle = "bg-white/2 border-white/5 text-white/20 cursor-help";
                tooltip = "Missed / Untouched";
              }

              return (
                <div 
                  key={day} 
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all duration-200 group/cell ${cellStyle}`}
                  title={tooltip}
                >
                  <span className="text-xs md:text-sm font-black">{day}</span>
                  <div className="absolute bottom-1.5 md:bottom-2">
                    {statusIcon}
                  </div>
                  {isToday && !h && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 pt-5 border-t border-white/10 justify-center text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-sm" />
              <span>Correct Answer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500/40 rounded-sm" />
              <span>Incorrect Answer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/2 border border-white/5 rounded-sm" />
              <span>Missed / Untouched</span>
            </div>
          </div>
        </div>

        {/* Detailed History List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
           <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-outfit font-extrabold text-white">Daily Breakdown Log</h3>
           </div>
           
           <div className="divide-y divide-white/5">
             {validHistory.length === 0 ? (
               <div className="p-12 text-center text-white/40 font-medium">Your historical breakdown is empty. Start attempting today!</div>
             ) : (
               validHistory.map((h, i) => (
                  <div key={i} className="p-6 flex items-center justify-between group hover:bg-white/3 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border transition-all duration-300 ${
                        h.is_correct 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        {new Date(h.challenge_date).getDate()}
                      </div>
                      <div>
                        <p className="text-white font-extrabold font-outfit text-sm flex items-center gap-2">
                          {h.subject}
                          <SubjectBadge name={h.subject} />
                        </p>
                        <p className="text-white/40 text-xs mt-1 font-medium">{new Date(h.challenge_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xs font-black uppercase tracking-wider ${h.is_correct ? "text-emerald-400" : "text-red-400"}`}>
                        {h.is_correct ? "CORRECT" : "INCORRECT"}
                      </p>
                      <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-1">+{h.score_earned} POINTS</p>
                    </div>
                  </div>
               ))
             )}
           </div>
        </div>
      </div>
    );
  };

  return (
    <PageWrapper>
      {/* CSS-based Confetti burst if correctly submitted */}
      {isDone && isCorrect && (
        <>
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(110vh) rotate(0deg); opacity: 1; }
              100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
            }
            .conf-piece {
              position: fixed;
              width: 7px;
              height: 7px;
              background-color: #3b82f6;
              animation: floatUp 3.2s linear infinite;
              z-index: 50;
              pointer-events: none;
            }
          `}</style>
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
            const delay = (Math.random() * 3.5).toFixed(2)
            const left = (Math.random() * 100).toFixed(0)
            const bg = colors[i % colors.length]
            return (
              <div 
                key={i} 
                className="conf-piece"
                style={{
                  left: `${left}vw`,
                  animationDelay: `${delay}s`,
                  backgroundColor: bg,
                  borderRadius: i % 2 === 0 ? '50%' : '0px'
                }}
              />
            )
          })}
        </>
      )}

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <h1 className={`text-3xl md:text-4xl font-outfit font-extrabold tracking-tight flex items-center gap-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Trophy className="w-9 h-9 text-blue-500" />
              Daily Challenge
            </h1>
            <p className={`text-sm font-medium flex items-center gap-2 select-none ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              <Calendar className="w-4 h-4 text-blue-400/50" />
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className={`flex p-1 border rounded-xl relative select-none ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <button
              onClick={() => setMode("challenge")}
              className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                mode === "challenge" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"
              }`}
            >
              Challenge
            </button>
            <button
              onClick={() => setMode("history")}
              className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                mode === "history" 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"
              }`}
            >
              My Activity
            </button>
          </div>
        </div>

        {mode === "challenge" ? renderChallenge() : renderHistory()}
      </div>
    </PageWrapper>
  );
}
