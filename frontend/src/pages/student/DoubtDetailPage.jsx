import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, MessageSquare, ThumbsUp, CheckCircle2, 
  Clock, User as UserIcon, Send, ShieldCheck, Award,
  CheckCircle, HelpCircle, Flag
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import { useAuth } from "../../context/AuthContext";
import PageWrapper from "../../components/PageWrapper";
import SubjectBadge from "../../components/SubjectBadge";
import { statusBadge, subjectColors } from "../../utils/badgeColors";

export default function DoubtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDoubt();
  }, [id]);

  useEffect(() => {
    const handleWsMessage = (e) => {
      const { type, doubt, doubt_id, answer } = e.detail || {};
      if (type === "doubt_answered" && doubt_id === id) {
        setData(prev => {
          if (!prev) return prev;
          if (prev.answers.some(a => a.id === answer.id)) return prev;
          return {
            ...prev,
            doubt: {
              ...prev.doubt,
              answer_count: (prev.doubt.answer_count || 0) + 1
            },
            answers: [...prev.answers, answer]
          };
        });
      } else if (type === "doubt_resolved" && doubt?.id === id) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            doubt: {
              ...prev.doubt,
              is_resolved: true,
              accepted_answer_id: doubt.accepted_answer_id
            },
            answers: prev.answers.map(a => 
              a.id === doubt.accepted_answer_id 
                ? { ...a, is_accepted: true } 
                : a
            )
          };
        });
      }
    };

    window.addEventListener("ws-message", handleWsMessage);
    return () => window.removeEventListener("ws-message", handleWsMessage);
  }, [id]);

  const loadDoubt = async () => {
    setLoading(true);
    try {
      const res = await doubtService.getDoubt(id);
      setData(res);
    } catch (err) {
      toast.error("Failed to load doubt details.");
      navigate("/student/doubts");
    } finally {
      setData(prev => prev);
      setLoading(false);
    }
  };

  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (answerText.trim().length < 10) {
      toast.error("Answer is too short.");
      return;
    }
    setSubmitting(true);
    try {
      await doubtService.answerDoubt(id, answerText);
      setAnswerText("");
      toast.success("Answer posted!");
      loadDoubt();
    } catch (err) {
      toast.error("Failed to post answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (answerId) => {
    try {
      const res = await doubtService.upvoteAnswer(answerId);
      // Optimistic update
      setData(prev => ({
        ...prev,
        answers: prev.answers.map(a => 
          a.id === answerId 
            ? { ...a, upvotes: res.upvotes, current_user_upvoted: res.user_upvoted } 
            : a
        )
      }));
    } catch (err) {
      toast.error("Upvote failed.");
    }
  };

  const handleUpvoteDoubt = async () => {
    try {
      const res = await doubtService.upvoteDoubt(id);
      setData(prev => ({
        ...prev,
        doubt: {
          ...prev.doubt,
          vote_count: res.vote_count,
          current_user_upvoted: res.user_upvoted
        }
      }));
    } catch (err) {
      toast.error("Failed to upvote doubt.");
    }
  };

  const handleResolve = async (answerId) => {
    try {
      await doubtService.resolveDoubt(id, answerId);
      toast.success("Doubt resolved!");
      loadDoubt();
    } catch (err) {
      toast.error("Failed to resolve.");
    }
  };

  const handleFlagAnswer = async (answerId) => {
    const reason = window.prompt("Please enter the reason for flagging this answer:");
    if (reason === null) return; // User cancelled
    try {
      await doubtService.flagAnswer(answerId, reason);
      toast.success("Answer flagged and faculty notified!", { icon: "🚩" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to flag answer.");
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

  if (loading) return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto py-24 text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
        </div>
        <p className="text-white/60 font-outfit text-lg font-medium animate-pulse">Loading discussion details...</p>
      </div>
    </PageWrapper>
  );

  const { doubt, answers } = data;
  const isAuthor = user?.id === doubt.student_id;
  const subStyle = getSubjectStyle(doubt.subject_name);

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-16">
        
        {/* Back & Status */}
        <div className="flex items-center justify-between select-none">
          <button 
            onClick={() => navigate("/student/doubts")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-all group cursor-pointer text-xs font-black uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Doubt Board
          </button>
          {doubt.is_resolved && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
              style={{
                background: statusBadge('resolved').bg,
                color: statusBadge('resolved').color,
                borderColor: `${statusBadge('resolved').color}30`
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" style={{ color: statusBadge('resolved').color }} /> Resolved
            </div>
          )}
        </div>

        {/* Main Doubt Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full border flex items-center justify-center font-black uppercase text-lg shadow-inner"
                style={subStyle.avatarStyle}
              >
                {doubt.student_name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-extrabold text-sm md:text-md font-outfit">{doubt.student_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1 font-bold">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-white/30" /> {getTimeAgo(doubt.created_at)}</span>
                  <span className="text-blue-500 font-black">•</span>
                  <SubjectBadge name={doubt.subject_name} />
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleUpvoteDoubt}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black transition-all cursor-pointer ${
                doubt.current_user_upvoted 
                  ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25" 
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${doubt.current_user_upvoted ? "fill-white" : ""}`} />
              <span className="text-xs">{doubt.vote_count} {doubt.vote_count === 1 ? "Helpful" : "Helpfuls"}</span>
            </button>
          </div>

          <div className="bg-white/2 rounded-xl p-6 md:p-8 border border-white/5 relative z-10">
            <p className="text-white text-md md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
              {doubt.question_text}
            </p>
          </div>
        </div>

        {/* Answer Form */}
        {!doubt.is_resolved && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl backdrop-blur-md relative">
            <h3 className="text-md font-outfit font-extrabold text-white flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Provide an Answer
            </h3>
            
            <form onSubmit={handlePostAnswer} className="space-y-4">
              <textarea
                required
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Give back to the community! Provide a comprehensive, detailed answer with step-by-step logic..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Please be respectful and helpful.</span>
                <button
                  type="submit"
                  disabled={submitting || answerText.trim().length < 10}
                  className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs shadow-xl shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? "Posting..." : "Broadcast Answer"}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Answers List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 select-none">
             <h3 className="text-lg font-outfit font-extrabold text-white flex items-center gap-2.5">
               <HelpCircle className="w-5 h-5 text-blue-400" />
               Discussion Thread ({answers.length})
             </h3>
          </div>

          <div className="space-y-6">
            {answers.map((ans) => (
              <div 
                key={ans.id}
                className={`border rounded-2xl p-6 space-y-4 transition-all duration-300 backdrop-blur-md shadow-lg ${
                  ans.is_accepted 
                    ? "border-emerald-500 bg-emerald-500/[0.04] shadow-emerald-500/5" 
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-blue-400 uppercase shadow-inner">
                      {ans.answered_by_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-extrabold font-outfit text-sm">{ans.answered_by_name}</p>
                        {ans.answered_by_name === "Admin" && (
                           <span className="px-2 py-0.5 bg-blue-500 text-[8px] font-black uppercase rounded text-white flex items-center gap-1">
                             <ShieldCheck className="w-2.5 h-2.5" /> Staff
                           </span>
                        )}
                      </div>
                      <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-0.5">{getTimeAgo(ans.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    {ans.is_verified_by_admin && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-full text-[9px] font-black uppercase shadow-lg shadow-blue-500/5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified by Admin
                      </div>
                    )}
                    {ans.is_accepted && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full text-[9px] font-black uppercase shadow-lg shadow-emerald-500/5">
                        <Award className="w-3.5 h-3.5 text-emerald-400" /> Best Answer
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/2 rounded-xl p-5 border border-white/5">
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{ans.answer_text}</p>
                </div>

                 <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleUpvote(ans.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black transition-all cursor-pointer ${
                        ans.current_user_upvoted 
                          ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25" 
                          : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${ans.current_user_upvoted ? "fill-white" : ""}`} />
                      <span className="text-xs">{ans.upvotes} {ans.upvotes === 1 ? "Helpful" : "Helpfuls"}</span>
                    </button>

                    {user?.role === "student" && ans.answered_by_id !== user.id && (
                      <button
                        onClick={() => handleFlagAnswer(ans.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400/70 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-black cursor-pointer"
                        title="Flag this answer as incorrect or inappropriate"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span className="text-xs">Flag</span>
                      </button>
                    )}
                  </div>

                  {isAuthor && !doubt.is_resolved && (
                    <button 
                      onClick={() => handleResolve(ans.id)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Answer
                    </button>
                  )}
                </div>
              </div>
            ))}

            {answers.length === 0 && (
              <div className="text-center py-20 bg-white/2 border border-dashed border-white/10 rounded-2xl backdrop-blur-md">
                 <MessageSquare className="w-12 h-12 text-white/20 mx-auto" />
                 <p className="text-white/50 font-outfit font-extrabold text-md mt-4">No responses posted yet.</p>
                 <p className="text-white/30 text-xs">Share your expertise! Write a response to assist this student.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
