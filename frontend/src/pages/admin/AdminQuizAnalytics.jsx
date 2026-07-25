import React, { useState, useEffect } from "react";
import { 
  Sparkles, Grid, AlertTriangle, HelpCircle, 
  BookOpen, Flame, Percent, Layers, ChevronRight
} from "lucide-react";
import quizService from "../../services/quizService";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

export default function AdminQuizAnalytics() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await quizService.getAdminAnalytics();
        setAnalytics(data);
      } catch (err) {
        toast.error("Failed to load quiz analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const getHeatmapColor = (value) => {
    if (value === null || value === undefined) return isLight ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white/5 text-white/30 border-white/10";
    if (value < 50) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if (value < 75) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  };

  const getFailRateColor = (rate) => {
    if (rate >= 75) return "text-rose-500 font-black";
    if (rate >= 50) return "text-amber-500 font-bold";
    return "text-yellow-400";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">Loading Analytics Data...</p>
      </div>
    );
  }

  const units = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "General"];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black font-outfit tracking-tight flex items-center gap-2.5 ${isLight ? "text-slate-800" : "text-white"}`}>
            <Grid className="w-6 h-6 text-violet-500" />
            Quiz & Assessment Analytics
          </h2>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>
            Class-wide conceptual understanding heatmap and frequently missed concepts.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-violet-500/20 shadow-sm shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          Syllabus Mapped Insights
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className={`border rounded-2xl p-6 shadow-xl ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
        <h3 className={`text-lg font-bold flex items-center gap-2 mb-6 ${isLight ? "text-slate-800" : "text-white"}`}>
          <Layers className="w-5 h-5 text-violet-500" />
          Syllabus Unit-wise Accuracy Heatmap
        </h3>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full border-collapse text-left min-w-[650px]">
            <thead>
              <tr className={isLight ? "bg-slate-50 border-b border-slate-200" : "bg-white/5 border-b border-white/10"}>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider ${isLight ? "text-slate-600" : "text-white/50"}`}>Subject</th>
                {units.map(unit => (
                  <th key={unit} className={`px-4 py-4 text-xs uppercase font-extrabold tracking-wider text-center ${isLight ? "text-slate-600" : "text-white/50"}`}>
                    {unit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-white/10"}`}>
              {analytics?.heatmap && analytics.heatmap.map((row, idx) => (
                <tr key={idx} className={isLight ? "hover:bg-slate-50/50 transition-colors" : "hover:bg-white/3 transition-colors"}>
                  <td className={`px-6 py-4 text-sm font-bold truncate max-w-[180px] ${isLight ? "text-slate-800" : "text-white"}`}>
                    {row.subject}
                  </td>
                  {units.map(unit => {
                    const value = row[unit];
                    return (
                      <td key={unit} className="px-3 py-3 text-center">
                        <div className={`mx-auto max-w-[80px] py-2 px-3 rounded-lg border text-xs font-bold leading-none ${getHeatmapColor(value)}`}>
                          {value !== undefined ? `${value}%` : "-"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {(!analytics?.heatmap || analytics.heatmap.length === 0) && (
                <tr>
                  <td colSpan={units.length + 1} className={`px-6 py-12 text-center text-xs italic ${isLight ? "text-slate-400" : "text-white/30"}`}>
                    No assessment history available yet to generate accuracy heatmap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {analytics?.heatmap && analytics.heatmap.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 text-[10px] uppercase font-bold text-white/50 justify-end">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/20" />
              <span>Critical (&lt;50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/20" />
              <span>Developing (50-74%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" />
              <span>Proficient (&gt;=75%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Frequently Wrong Questions Section */}
      <div className={`border rounded-2xl p-6 shadow-xl ${isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
        <h3 className={`text-lg font-bold flex items-center gap-2 mb-6 ${isLight ? "text-slate-800" : "text-white"}`}>
          <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
          Frequently Incorrect Questions
        </h3>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className={isLight ? "bg-slate-50 border-b border-slate-200" : "bg-white/5 border-b border-white/10"}>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider ${isLight ? "text-slate-600" : "text-white/50"}`}>Question</th>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider ${isLight ? "text-slate-600" : "text-white/50"}`}>Subject & Topic</th>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider text-center ${isLight ? "text-slate-600" : "text-white/50"}`}>Errors</th>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider text-center ${isLight ? "text-slate-600" : "text-white/50"}`}>Attempts</th>
                <th className={`px-6 py-4 text-xs uppercase font-extrabold tracking-wider text-right ${isLight ? "text-slate-600" : "text-white/50"}`}>Fail Rate</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-white/10"}`}>
              {analytics?.frequently_wrong && analytics.frequently_wrong.map((item, idx) => {
                const failRate = (item.error_count / item.total_attempts) * 100;
                return (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedQuestion(item)}
                    className={`cursor-pointer transition-colors ${isLight ? "hover:bg-slate-50/50" : "hover:bg-white/3"}`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold max-w-[320px]">
                      <p className={`line-clamp-2 leading-relaxed ${isLight ? "text-slate-800" : "text-white"}`}>{item.question_text}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <p className={`font-bold ${isLight ? "text-slate-800" : "text-white"}`}>{item.subject_name}</p>
                      <p className={`mt-0.5 ${isLight ? "text-slate-400" : "text-white/40"}`}>{item.topic}</p>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-center ${isLight ? "text-slate-800" : "text-white"}`}>
                      {item.error_count}
                    </td>
                    <td className={`px-6 py-4 text-sm text-center ${isLight ? "text-slate-500" : "text-white/40"}`}>
                      {item.total_attempts}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-sm ${getFailRateColor(failRate)}`}>
                          {Math.round(failRate)}%
                        </span>
                        <ChevronRight className={`w-4 h-4 ${isLight ? "text-slate-400" : "text-white/20"}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!analytics?.frequently_wrong || analytics.frequently_wrong.length === 0) && (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center text-xs italic ${isLight ? "text-slate-400" : "text-white/30"}`}>
                    No missed questions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail for Question */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className={`border rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-fade-in ${
            isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0F172A] border-white/10 text-white"
          }`}>
            <h3 className={`text-lg font-bold font-outfit border-b pb-3 flex items-center gap-2 ${
              isLight ? "border-slate-200 text-slate-900" : "border-white/10 text-white"
            }`}>
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Frequently Missed Hotspot
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className={`text-xs uppercase font-extrabold ${isLight ? "text-slate-400" : "text-white/40"}`}>Question Text</p>
                <p className={`text-sm leading-relaxed mt-1.5 ${isLight ? "text-slate-800" : "text-white/80"}`}>{selectedQuestion.question_text}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs uppercase font-extrabold ${isLight ? "text-slate-400" : "text-white/40"}`}>Subject</p>
                  <p className="text-xs font-bold mt-1 text-violet-400">{selectedQuestion.subject_name}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase font-extrabold ${isLight ? "text-slate-400" : "text-white/40"}`}>Topic</p>
                  <p className={`text-xs font-bold mt-1 ${isLight ? "text-slate-800" : "text-white"}`}>{selectedQuestion.topic}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                <div>
                  <p className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-400" : "text-white/40"}`}>Total Mistakes</p>
                  <p className="text-sm font-black text-rose-500 mt-1">{selectedQuestion.error_count}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-400" : "text-white/40"}`}>Total Submissions</p>
                  <p className={`text-sm font-black mt-1 ${isLight ? "text-slate-800" : "text-white"}`}>{selectedQuestion.total_attempts}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-400" : "text-white/40"}`}>Fail Rate</p>
                  <p className={`text-sm font-black mt-1 ${getFailRateColor((selectedQuestion.error_count / selectedQuestion.total_attempts) * 100)}`}>
                    {Math.round((selectedQuestion.error_count / selectedQuestion.total_attempts) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-violet-500/20"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
