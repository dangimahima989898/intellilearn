import React, { useState, useEffect } from "react";
import { 
  MessageCircle, Plus, Search, Filter, MessageSquare, 
  ThumbsUp, CheckCircle2, ChevronRight, Clock, User as UserIcon,
  Tag, X, HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import { getSubjects } from "../../services/chatbotService";
import PageWrapper from "../../components/PageWrapper";
import SubjectBadge from "../../components/SubjectBadge";
import { statusBadge, subjectColors } from "../../utils/badgeColors";
import { useTheme } from "../../context/ThemeContext";


export default function DoubtBoardPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ subject_id: null, is_resolved: null });
  const [showModal, setShowModal] = useState(false);
  
  // New Doubt Form
  const [newDoubt, setNewDoubt] = useState({ subject_id: "", question_text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [doubtsData, subjectsData] = await Promise.all([
        doubtService.getDoubts(filter),
        getSubjects()
      ]);
      setDoubts(doubtsData || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      setError("Failed to load doubts. Check your API connection.");
      toast.error("Failed to load doubt board.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleUpvoteDoubt = async (doubtId) => {
    try {
      const res = await doubtService.upvoteDoubt(doubtId);
      setDoubts(prev => prev.map(d => 
        d.id === doubtId 
          ? { ...d, vote_count: res.vote_count, current_user_upvoted: res.user_upvoted } 
          : d
      ));
    } catch (err) {
      toast.error("Failed to upvote doubt.");
    }
  };

  const handleCreateDoubt = async (e) => {
    e.preventDefault();
    if (newDoubt.question_text.length < 20) {
      toast.error("Please provide more detail (min 20 characters)");
      return;
    }
    setIsSubmitting(true);
    try {
      await doubtService.createDoubt(newDoubt.subject_id, newDoubt.question_text);
      toast.success("Doubt posted successfully!");
      setShowModal(false);
      setNewDoubt({ subject_id: "", question_text: "" });
      loadData();
    } catch (err) {
      toast.error("Failed to post doubt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubjectStyle = (subName) => {
    const parts = String(subName).split(' ');
    const code = parts[0]?.toUpperCase();
    const color = subjectColors[code] || subjectColors.default;
    return {
      color: color,
      avatarStyle: {
        backgroundColor: `${color.text}15`,
        color: color.text,
        borderColor: `${color.text}25`
      }
    };
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative pb-20">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <h1 className={`text-3xl md:text-4xl font-outfit font-extrabold tracking-tight flex items-center gap-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <MessageCircle className="w-9 h-9 text-blue-500" />
              Doubt Board
            </h1>
            <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Community-powered learning. Ask questions, share detailed knowledge.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 transition-all duration-300 flex items-center gap-2 group cursor-pointer"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Ask a Question
          </button>
        </div>

        {/* Filters Bar */}
        <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex bg-white/5 rounded-xl border border-white/10 p-1 relative select-none">
            <button 
              onClick={() => setFilter(prev => ({ ...prev, is_resolved: null }))}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                filter.is_resolved === null 
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"
              }`}
            >
              All Quests
            </button>
            <button 
              onClick={() => setFilter(prev => ({ ...prev, is_resolved: false }))}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                filter.is_resolved === false 
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"
              }`}
            >
              Unresolved
            </button>
            <button 
              onClick={() => setFilter(prev => ({ ...prev, is_resolved: true }))}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                filter.is_resolved === true 
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white"
              }`}
            >
              Resolved
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 select-none">
            <button
              onClick={() => setFilter(prev => ({ ...prev, subject_id: null }))}
              className={`px-4 py-2 rounded-xl text-xs font-black border uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                !filter.subject_id 
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-600 shadow-sm" 
                  : isLight ? "bg-white border-slate-200 text-slate-500 hover:text-slate-900" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
              }`}
            >
              All Subjects
            </button>
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setFilter(prev => ({ ...prev, subject_id: sub.id }))}
                className={`px-4 py-2 rounded-xl text-xs font-black border uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filter.subject_id === sub.id 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-600 shadow-sm" 
                    : isLight ? "bg-white border-slate-200 text-slate-500 hover:text-slate-900" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                }`}
              >
                {sub.code}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Doubts */}
        {error ? (
          <div className={`text-center py-20 border border-dashed border-red-500/20 rounded-2xl max-w-xl mx-auto shadow-xl ${isLight ? 'bg-red-50' : 'bg-white/5'}`}>
            <HelpCircle className="w-16 h-16 text-red-500/40 mx-auto mb-4 animate-pulse" />
            <h3 className="text-red-400 font-extrabold text-lg">Failed to load doubts</h3>
            <p className="text-white/40 text-xs mt-1 px-8">{error}</p>
            <button 
              onClick={loadData}
              className="mt-6 px-6 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-60 bg-white/5 border border-white/10 rounded-2xl animate-pulse shadow-md" />
            ))}
          </div>
        ) : doubts.length === 0 ? (
          <div className={`text-center py-20 border border-dashed rounded-2xl max-w-xl mx-auto shadow-xl ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/15'}`}>
            <MessageCircle className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'text-slate-300' : 'text-white/20'}`} />
            <h3 className={`font-extrabold text-lg ${isLight ? 'text-slate-700' : 'text-white'}`}>No questions found</h3>
            <p className={`text-xs mt-1 px-8 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No student questions have been posted for this filter yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doubts.map((doubt) => {
              const subStyle = getSubjectStyle(doubt.subject_name);
              return (
                <div 
                  key={doubt.id}
                  onClick={() => navigate(`/student/doubts/${doubt.id}`)}
                  className={`group border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer relative overflow-hidden flex flex-col justify-between h-full backdrop-blur-md ${
                    doubt.is_resolved 
                      ? isLight ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300 shadow-lg" : "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40 shadow-lg shadow-emerald-500/2" 
                      : isLight ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md shadow-sm" : "border-white/10 hover:border-blue-500/40 hover:bg-white/8 shadow-md"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <SubjectBadge name={doubt.subject_name} />
                      {doubt.is_resolved && (
                        <span 
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider select-none border"
                          style={{
                            background: statusBadge('resolved').bg,
                            color: statusBadge('resolved').color,
                            borderColor: `${statusBadge('resolved').color}30`
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: statusBadge('resolved').color }} /> Resolved
                        </span>
                      )}
                    </div>

                    <h3 className={`text-md md:text-lg font-outfit font-extrabold line-clamp-3 leading-snug group-hover:text-blue-500 transition-colors ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {doubt.question_text}
                    </h3>
                  </div>

                  <div className="pt-6 mt-8 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full border flex items-center justify-center font-black uppercase text-xs shadow-inner"
                        style={subStyle.avatarStyle}
                      >
                        {doubt.student_name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-extrabold text-xs font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>{doubt.student_name}</p>
                        <p className={`text-[10px] mt-0.5 font-medium flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                          <Clock className="w-3 h-3 text-white/30" /> {getTimeAgo(doubt.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 select-none">
                      <div className="flex items-center gap-1.5 text-white/40 group-hover:text-white/70 transition-colors">
                        <MessageSquare className="w-4 h-4 text-white/30" />
                        <span className="text-xs font-black">{doubt.answer_count}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpvoteDoubt(doubt.id);
                        }}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          doubt.current_user_upvoted 
                            ? 'text-blue-400' 
                            : 'text-white/40 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 transition-all duration-300 ${doubt.current_user_upvoted ? 'fill-blue-500/30 stroke-blue-400' : ''}`} />
                        <span className="text-xs font-black">{doubt.vote_count}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {doubts.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 bg-white/2 border border-dashed border-white/10 rounded-2xl backdrop-blur-md">
                <HelpCircle className="w-14 h-14 text-white/20 mx-auto" />
                <p className="text-white/50 font-outfit font-extrabold text-md">No questions found matching your filter criteria.</p>
                <p className="text-white/30 text-xs">Be the pioneer! Click the button above to post the first doubt.</p>
              </div>
            )}
          </div>
        )}

        {/* Post Doubt Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl scale-in relative ${isLight ? 'bg-white border-slate-200' : 'bg-[#0e1424] border-white/10'}`}>
              <div className={`absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20 ${isLight ? 'hidden' : ''}`} />
              
            <div className={`p-6 border-b border-white/10 flex items-center justify-between bg-white/2 relative z-10 ${isLight ? 'border-slate-200 bg-slate-50' : ''}`}>
                <h3 className={`text-lg font-outfit font-extrabold flex items-center gap-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Plus className="w-5 h-5 text-blue-400" />
                  Post a New Doubt
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDoubt} className="p-6 md:p-8 space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-blue-400/60" /> Select Target Subject
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={newDoubt.subject_id}
                      onChange={(e) => setNewDoubt(prev => ({ ...prev, subject_id: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0e1424]">Choose a subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id} className="bg-[#0e1424]">{s.name} ({s.code})</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-xs">▼</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400/60" /> Detailed Query
                    </label>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${newDoubt.question_text.length < 20 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                      {newDoubt.question_text.length} / 1000 chars (Min 20)
                    </span>
                  </div>
                  <textarea
                    required
                    value={newDoubt.question_text}
                    onChange={(e) => setNewDoubt(prev => ({ ...prev, question_text: e.target.value }))}
                    placeholder="Provide depth! Explain the exact issue, what you've investigated, and where you're struggling. This increases your chances of getting a top-tier accepted answer."
                    maxLength={1000}
                  className="w-full h-44 border border-white/10 rounded-xl p-5 placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none leading-relaxed text-sm"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 py-3.5 rounded-xl border text-sm font-extrabold hover:text-white transition-all cursor-pointer ${isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-white/10 text-white/70 hover:bg-white/5'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newDoubt.subject_id || newDoubt.question_text.length < 20}
                    className="flex-1 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Posting Doubt...
                      </span>
                    ) : (
                      "Broadcast Doubt 🚀"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
