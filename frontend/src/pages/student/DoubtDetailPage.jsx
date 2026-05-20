import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, MessageSquare, ThumbsUp, CheckCircle2, 
  Clock, User as UserIcon, Send, ShieldCheck, Award,
  CheckCircle, HelpCircle
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import { useAuth } from "../../context/AuthContext";

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

  const loadDoubt = async () => {
    setLoading(true);
    try {
      const res = await doubtService.getDoubt(id);
      setData(res);
    } catch (err) {
      toast.error("Failed to load doubt details.");
      navigate("/student/doubts");
    } finally {
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

  const handleResolve = async (answerId) => {
    try {
      await doubtService.resolveDoubt(id, answerId);
      toast.success("Doubt resolved!");
      loadDoubt();
    } catch (err) {
      toast.error("Failed to resolve.");
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-navy-400">Loading discussion...</p>
    </div>
  );

  const { doubt, answers } = data;
  const isAuthor = user?.id === doubt.student_id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-12">
      {/* Back & Status */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/student/doubts")}
          className="flex items-center gap-2 text-navy-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Doubt Board
        </button>
        {doubt.is_resolved && (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-black uppercase">
            <CheckCircle className="w-4 h-4" /> Resolved
          </div>
        )}
      </div>

      {/* Main Doubt Card */}
      <div className="bg-navy-800 border-2 border-navy-700 rounded-3xl p-8 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center font-bold text-brand uppercase text-lg">
              {doubt.student_name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{doubt.student_name}</p>
              <div className="flex items-center gap-3 text-xs text-navy-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getTimeAgo(doubt.created_at)}</span>
                <span className="text-brand font-black">•</span>
                <span className="flex items-center gap-1 font-black text-brand uppercase tracking-tighter">{doubt.subject_name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-navy-900/50 rounded-2xl p-8 border border-navy-700/50">
          <p className="text-white text-xl leading-relaxed whitespace-pre-wrap font-medium">
            {doubt.question_text}
          </p>
        </div>
      </div>

      {/* Answer Form */}
      {!doubt.is_resolved && (
        <div className="bg-navy-800 border border-navy-700 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" />
            Your Answer
          </h3>
          <form onSubmit={handlePostAnswer} className="space-y-4">
            <textarea
              required
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Provide a helpful, detailed answer..."
              className="w-full h-32 bg-navy-900 border border-navy-700 rounded-2xl p-6 text-white focus:border-brand outline-none transition-all resize-none leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || answerText.trim().length < 10}
                className="px-8 py-3 rounded-xl bg-brand hover:brightness-110 text-white font-black shadow-xl shadow-brand/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? "Posting..." : "Post Answer"}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Answers List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-navy-800 pb-4">
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <HelpCircle className="w-6 h-6 text-brand" />
             Discussion ({answers.length})
           </h3>
        </div>

        <div className="space-y-6">
          {answers.map((ans) => (
            <div 
              key={ans.id}
              className={`bg-navy-800 border rounded-3xl p-6 space-y-4 transition-all ${
                ans.is_accepted ? "border-emerald-500 bg-emerald-500/[0.03]" : "border-navy-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-900 flex items-center justify-center font-bold text-brand uppercase">
                    {ans.answered_by_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{ans.answered_by_name}</p>
                      {ans.answered_by_name === "Admin" && (
                         <span className="px-2 py-0.5 bg-brand text-[8px] font-black uppercase rounded text-white flex items-center gap-1">
                           <ShieldCheck className="w-2.5 h-2.5" /> Staff
                         </span>
                      )}
                    </div>
                    <p className="text-navy-500 text-[10px] uppercase font-black tracking-widest">{getTimeAgo(ans.created_at)}</p>
                  </div>
                </div>

                {ans.is_accepted && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase">
                    <Award className="w-3 h-3" /> Best Answer
                  </div>
                )}
              </div>

              <div className="bg-navy-900/30 rounded-2xl p-6">
                <p className="text-navy-100 leading-relaxed whitespace-pre-wrap">{ans.answer_text}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={() => handleUpvote(ans.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold transition-all ${
                    ans.current_user_upvoted 
                      ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                      : "bg-navy-900 border-navy-700 text-navy-400 hover:border-navy-600 hover:text-white"
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${ans.current_user_upvoted ? "fill-white" : ""}`} />
                  <span className="text-xs">{ans.upvotes} {ans.upvotes === 1 ? "Helpful" : "Helpfuls"}</span>
                </button>

                {isAuthor && !doubt.is_resolved && (
                  <button 
                    onClick={() => handleResolve(ans.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Answer
                  </button>
                )}
              </div>
            </div>
          ))}

          {answers.length === 0 && (
            <div className="text-center py-20 bg-navy-800/10 border border-dashed border-navy-700 rounded-3xl">
               <MessageSquare className="w-12 h-12 text-navy-800 mx-auto opacity-50" />
               <p className="text-navy-500 font-bold mt-4">No answers yet. Share your knowledge!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
