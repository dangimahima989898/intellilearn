import React, { useState, useEffect, useRef } from "react";
import { 
  Trophy, Calendar, Award, CheckCircle2, XCircle, 
  ChevronRight, Timer, BarChart3, TrendingUp, Sparkles,
  Medal, Star
} from "lucide-react";
import toast from "react-hot-toast";
import dailyChallengeService from "../../services/dailyChallengeService";

const MedalIcon = ({ rank }) => {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-navy-500 font-bold">{rank}</span>;
};

export default function DailyChallengePage() {
  const [mode, setMode] = useState("challenge"); // challenge | history
  const [challenge, setChallenge] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    loadData();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateCountdown = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [chalData, lbData, histData] = await Promise.all([
        dailyChallengeService.getTodayChallenge(),
        dailyChallengeService.getLeaderboard(),
        dailyChallengeService.getMyHistory()
      ]);
      setChallenge(chalData.challenge);
      setAlreadySubmitted(chalData.already_submitted);
      setSubmission(chalData.submission);
      setLeaderboard(lbData || []);
      setHistory(histData || []);
    } catch (err) {
      toast.error("Failed to load today's challenge.");
    } finally {
      setLoading(false);
    }
  };

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

  const renderChallenge = () => {
    if (loading) return (
      <div className="bg-navy-800 border border-navy-700 rounded-3xl p-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-navy-400 animate-pulse">Generating today's hard-mode challenge...</p>
      </div>
    );

    const isDone = alreadySubmitted;
    const correctAns = challenge?.correct_answer;
    const userAns = submission?.selected_answer;
    const isWin = submission?.is_correct;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Challenge Card */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Trophy className="w-48 h-48 text-brand" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase rounded-full tracking-widest">
                {challenge?.subject}
              </span>
              <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-full tracking-widest">
                Hard Mode
              </span>
              <span className="px-3 py-1 bg-navy-950 border border-navy-700 text-navy-400 text-[10px] font-black uppercase rounded-full tracking-widest flex items-center gap-1.5">
                <Timer className="w-3 h-3" /> Ends in {timeLeft}
              </span>
            </div>

            <h2 className="text-2xl font-outfit font-bold text-white leading-relaxed">
              {challenge?.question}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'a', text: challenge?.option_a },
                { key: 'b', text: challenge?.option_b },
                { key: 'c', text: challenge?.option_c },
                { key: 'd', text: challenge?.option_d }
              ].map((opt) => {
                let style = "bg-navy-900 border-navy-700 text-navy-300 hover:border-brand/50 hover:bg-navy-850";
                let icon = null;

                if (isDone) {
                  if (opt.key === correctAns) {
                    style = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                    icon = <CheckCircle2 className="w-5 h-5" />;
                  } else if (opt.key === userAns) {
                    style = "bg-rose-500/10 border-rose-500 text-rose-400";
                    icon = <XCircle className="w-5 h-5" />;
                  } else {
                    style = "bg-navy-950/50 border-navy-800 text-navy-600 opacity-50";
                  }
                } else if (selectedOpt === opt.key) {
                  style = "bg-brand border-brand text-white shadow-lg shadow-brand/20";
                }

                return (
                  <button
                    key={opt.key}
                    disabled={isDone || submitting}
                    onClick={() => setSelectedOpt(opt.key)}
                    className={`p-5 rounded-2xl border text-left transition-all active:scale-[0.98] flex items-center justify-between ${style}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                        selectedOpt === opt.key && !isDone ? "bg-white/20 text-white" : "bg-navy-950 text-navy-500"
                      }`}>
                        {opt.key.toUpperCase()}
                      </span>
                      <span className="font-semibold">{opt.text}</span>
                    </div>
                    {icon}
                  </button>
                );
              })}
            </div>

            {!isDone ? (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOpt || submitting}
                  className="px-12 py-4 rounded-2xl bg-brand hover:brightness-110 text-white font-black text-lg shadow-xl shadow-brand/20 transition-all disabled:opacity-50 flex items-center gap-3"
                >
                  {submitting ? "Submitting..." : "Submit Answer 🚀"}
                </button>
              </div>
            ) : (
              <div className={`p-6 rounded-2xl border ${isWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"} space-y-3 animate-slide-up`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isWin ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                    {isWin ? <Award className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-black ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                      {isWin ? "Correct! +10 Points" : "Not quite! +3 Points Earned"}
                    </h4>
                    <p className="text-navy-400 text-sm">Thanks for participating today!</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-navy-700/50">
                   <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Expert Explanation:</p>
                   <p className="text-navy-200 text-sm leading-relaxed">{challenge?.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl overflow-hidden shadow-xl">
           <div className="p-6 border-b border-navy-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-brand" />
                This Month's Leaderboard
              </h3>
              <span className="text-[10px] font-bold text-navy-500 uppercase tracking-widest bg-navy-950 px-2.5 py-1 rounded-md">Updates Daily</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-navy-900/50 text-[10px] text-navy-400 font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Rank</th>
                   <th className="px-6 py-4">Student</th>
                   <th className="px-6 py-4 text-center">Score</th>
                   <th className="px-6 py-4 text-center">Accuracy</th>
                   <th className="px-6 py-4 text-right">Attempted</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-navy-700">
                 {leaderboard.map((lb) => (
                   <tr key={lb.rank} className={`hover:bg-navy-750 transition-colors ${lb.name === "You" ? "bg-brand/5" : ""}`}>
                     <td className="px-6 py-4">
                       <div className="w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center">
                         <MedalIcon rank={lb.rank} />
                       </div>
                     </td>
                     <td className="px-6 py-4">
                        <span className="text-white font-bold">{lb.name}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="text-brand font-black text-lg">{lb.total_score}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <div className="w-24 h-1.5 bg-navy-950 rounded-full mx-auto overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${lb.accuracy_rate}%` }} />
                        </div>
                        <span className="text-[10px] text-navy-500 font-bold mt-1 block">{lb.accuracy_rate.toFixed(0)}% Correct</span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <span className="text-navy-400 text-xs font-bold">{lb.attempt_count} Days</span>
                     </td>
                   </tr>
                 ))}
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
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const historyMap = history.reduce((acc, h) => {
      acc[new Date(h.challenge_date).getDate()] = h;
      return acc;
    }, {});

    const stats = {
      attempted: history.length,
      correct: history.filter(h => h.is_correct).length,
      points: history.reduce((acc, h) => acc + h.score_earned, 0),
      accuracy: history.length > 0 ? (history.filter(h => h.is_correct).length / history.length * 100).toFixed(0) : 0
    };

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Points Earned", val: stats.points, color: "text-brand", icon: Star },
            { label: "Success Rate", val: `${stats.accuracy}%`, color: "text-emerald-400", icon: TrendingUp },
            { label: "Total Correct", val: stats.correct, color: "text-emerald-500", icon: CheckCircle2 },
            { label: "Total Attempted", val: stats.attempted, color: "text-navy-400", icon: Calendar }
          ].map((s, i) => (
            <div key={i} className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-2">
               <div className="flex items-center justify-between">
                 <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest">{s.label}</p>
                 <s.icon className={`w-4 h-4 ${s.color}`} />
               </div>
               <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-6 h-6 text-brand" />
              Challenge Activity
            </h3>
            <span className="text-sm font-bold text-navy-400">
              {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-navy-600 uppercase mb-2">{d}</div>
            ))}
            {/* Pad leading empty days */}
            {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const h = historyMap[day];
              const isToday = day === today.getDate();

              let cellStyle = "bg-navy-900 border-navy-800 text-navy-500";
              let statusIcon = null;

              if (h) {
                if (h.is_correct) {
                  cellStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                  statusIcon = <CheckCircle2 className="w-3 h-3" />;
                } else {
                  cellStyle = "bg-rose-500/10 border-rose-500/30 text-rose-400";
                  statusIcon = <XCircle className="w-3 h-3" />;
                }
              } else if (isToday) {
                cellStyle = "border-brand ring-1 ring-brand/30 bg-navy-850 text-white";
              } else if (day < today.getDate()) {
                cellStyle = "bg-navy-950 border-navy-900 text-navy-700";
              }

              return (
                <div 
                  key={day} 
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative ${cellStyle}`}
                  title={h ? `${h.subject}: ${h.is_correct ? "Correct" : "Incorrect"}` : ""}
                >
                  <span className="text-sm font-bold">{day}</span>
                  <div className="absolute bottom-1">
                    {statusIcon}
                  </div>
                  {isToday && !h && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full animate-ping" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 pt-4 border-t border-navy-700 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span className="text-[10px] font-bold text-navy-500 uppercase">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-sm" />
              <span className="text-[10px] font-bold text-navy-500 uppercase">Incorrect</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-navy-950 border border-navy-900 rounded-sm" />
              <span className="text-[10px] font-bold text-navy-500 uppercase">Missed/Future</span>
            </div>
          </div>
        </div>

        {/* Detailed History List */}
        <div className="bg-navy-800 border border-navy-700 rounded-3xl overflow-hidden shadow-xl">
           <div className="p-6 border-b border-navy-700">
              <h3 className="text-xl font-bold text-white">Daily Breakdown</h3>
           </div>
           <div className="divide-y divide-navy-700">
             {history.map((h, i) => (
                <div key={i} className="p-6 flex items-center justify-between group hover:bg-navy-750 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${h.is_correct ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {new Date(h.challenge_date).getDate()}
                    </div>
                    <div>
                      <p className="text-white font-bold">{h.subject}</p>
                      <p className="text-navy-500 text-xs">{new Date(h.challenge_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${h.is_correct ? "text-emerald-400" : "text-rose-400"}`}>
                      {h.is_correct ? "CORRECT" : "INCORRECT"}
                    </p>
                    <p className="text-navy-500 text-[10px] font-black uppercase tracking-widest">{h.score_earned} POINTS</p>
                  </div>
                </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-outfit font-black text-white flex items-center gap-3">
            <Trophy className="w-10 h-10 text-brand" />
            Daily Challenge
          </h1>
          <p className="text-navy-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex bg-navy-800 p-1.5 rounded-2xl border border-navy-700">
          <button
            onClick={() => setMode("challenge")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "challenge" ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-navy-400 hover:text-white"
            }`}
          >
            Challenge
          </button>
          <button
            onClick={() => setMode("history")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "history" ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-navy-400 hover:text-white"
            }`}
          >
            My Activity
          </button>
        </div>
      </div>

      {mode === "challenge" ? renderChallenge() : renderHistory()}
    </div>
  );
}
