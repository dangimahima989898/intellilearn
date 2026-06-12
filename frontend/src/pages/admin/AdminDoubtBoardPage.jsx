import React, { useState, useEffect } from "react";
import { 
  MessageCircle, Search, Filter, MessageSquare, 
  ThumbsUp, CheckCircle2, ChevronRight, Clock, User as UserIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import { getSubjects } from "../../services/chatbotService";

import SubjectBadge from "../../components/SubjectBadge";
import { statusBadge, subjectColors } from "../../utils/badgeColors";

export default function AdminDoubtBoardPage() {
  const navigate = useNavigate();
  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ subject_id: null, is_resolved: null });

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-outfit font-black text-white flex items-center gap-3">
            <MessageCircle className="w-10 h-10 text-brand" />
            Doubt Board Admin
          </h1>
          <p className="text-white/60 mt-1 font-medium">Review student doubts, monitor discussions, and verify correct answers.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: null }))}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === null ? "bg-violet-600 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
          >
            All Quests
          </button>
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: false }))}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === false ? "bg-violet-600 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
          >
            Unresolved
          </button>
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: true }))}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === true ? "bg-violet-600 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
          >
            Resolved
          </button>
        </div>

        <div className="h-8 w-px bg-white/10 hidden md:block" />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(prev => ({ ...prev, subject_id: null }))}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${!filter.subject_id ? "bg-brand/10 border-brand text-brand" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"}`}
          >
            All Subjects
          </button>
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setFilter(prev => ({ ...prev, subject_id: sub.id }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter.subject_id === sub.id ? "bg-brand/10 border-brand text-brand" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"}`}
            >
              {sub.code}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Doubts */}
      {error ? (
        <div className="text-center py-20 bg-white/5 border border-dashed border-red-500/20 rounded-2xl max-w-xl mx-auto shadow-xl">
          <MessageCircle className="w-16 h-16 text-red-500/40 mx-auto mb-4 animate-pulse" />
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
            <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doubts.map((doubt) => (
            <div 
              key={doubt.id}
              onClick={() => navigate(`/admin/doubts/${doubt.id}`)}
              className={`group bg-white/5 border rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer relative overflow-hidden flex flex-col justify-between h-full ${
                doubt.is_resolved ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-white/10 hover:border-violet-500/40 hover:shadow-violet-500/10"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <SubjectBadge name={doubt.subject_name} />
                  {doubt.is_resolved && (
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase border"
                      style={{
                        background: statusBadge('resolved').bg,
                        color: statusBadge('resolved').color,
                        borderColor: `${statusBadge('resolved').color}30`
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3" style={{ color: statusBadge('resolved').color }} /> Resolved
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-white line-clamp-3 leading-snug group-hover:text-violet-300 transition-colors">
                  {doubt.question_text}
                </h3>
              </div>

              <div className="pt-5 mt-auto flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const code = String(doubt.subject_name).split(' ')[0]?.toUpperCase();
                    const color = subjectColors[code] || subjectColors.default;
                    return (
                      <div 
                        className="w-8 h-8 rounded-full border flex items-center justify-center font-bold uppercase text-xs shadow-inner"
                        style={{
                          backgroundColor: `${color.text}15`,
                          color: color.text,
                          borderColor: `${color.text}25`
                        }}
                      >
                        {doubt.student_name.charAt(0)}
                      </div>
                    );
                  })()}
                  <div className="text-[11px]">
                    <p className="text-white font-semibold">{doubt.student_name}</p>
                    <p className="text-white/45 mt-0.5">{getTimeAgo(doubt.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/80 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-bold">{doubt.answer_count}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpvoteDoubt(doubt.id);
                    }}
                    className={`flex items-center gap-1.5 transition-colors ${doubt.current_user_upvoted ? 'text-brand' : 'text-white/50 hover:text-white'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${doubt.current_user_upvoted ? 'fill-brand' : ''}`} />
                    <span className="text-xs font-bold">{doubt.vote_count}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {doubts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-white/3 border border-dashed border-white/15 rounded-2xl">
              <MessageCircle className="w-16 h-16 text-white/20 mx-auto" />
              <p className="text-white/50 font-semibold">No questions found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
