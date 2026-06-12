import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, MessageSquare, ThumbsUp, CheckCircle2, 
  Clock, User as UserIcon, Send, ShieldCheck, Award,
  CheckCircle, HelpCircle, ShieldAlert
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import SubjectBadge from "../../components/SubjectBadge";
import { statusBadge, subjectColors } from "../../utils/badgeColors";

export default function AdminDoubtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      navigate("/admin/doubts");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAnswer = async (answerId) => {
    try {
      const res = await doubtService.toggleAnswerVerification(answerId);
      toast.success(res.is_verified_by_admin ? "Answer verified!" : "Verification removed.");
      setData(prev => ({
        ...prev,
        answers: prev.answers.map(a => 
          a.id === answerId 
            ? { ...a, is_verified_by_admin: res.is_verified_by_admin } 
            : a
        )
      }));
    } catch (err) {
      toast.error("Verification failed.");
    }
  };

  const handleUpvote = async (answerId) => {
    try {
      const res = await doubtService.upvoteAnswer(answerId);
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
      <p className="text-white/60 font-medium">Loading discussion...</p>
    </div>
  );

  const { doubt, answers } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative pb-12">
      {/* Back & Status */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/admin/doubts")}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group font-medium"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Doubt Board
        </button>
        {doubt.is_resolved && (
          <div 
            className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase"
            style={{
              background: statusBadge('resolved').bg,
              color: statusBadge('resolved').color,
              borderColor: `${statusBadge('resolved').color}30`
            }}
          >
            <CheckCircle className="w-4 h-4" style={{ color: statusBadge('resolved').color }} /> Resolved
          </div>
        )}
      </div>

      {/* Main Doubt Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(() => {
              const code = String(doubt.subject_name).split(' ')[0]?.toUpperCase();
              const color = subjectColors[code] || subjectColors.default;
              return (
                <>
                  <div 
                    className="w-12 h-12 rounded-full border flex items-center justify-center font-bold uppercase text-lg shadow-inner"
                    style={{
                      backgroundColor: `${color.text}15`,
                      color: color.text,
                      borderColor: `${color.text}25`
                    }}
                  >
                    {doubt.student_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{doubt.student_name}</p>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getTimeAgo(doubt.created_at)}</span>
                      <span className="text-brand font-bold">•</span>
                      <SubjectBadge name={doubt.subject_name} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <p className="text-white text-lg leading-relaxed whitespace-pre-wrap font-medium">
            {doubt.question_text}
          </p>
        </div>
      </div>

      {/* Answers List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <HelpCircle className="w-6 h-6 text-brand" />
             Discussion ({answers.length})
           </h3>
        </div>

        <div className="space-y-5">
          {answers.map((ans) => (
            <div 
              key={ans.id}
              className={`bg-white/5 border rounded-2xl p-6 space-y-4 transition-all ${
                ans.is_accepted ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-brand uppercase">
                    {ans.answered_by_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{ans.answered_by_name}</p>
                      {ans.answered_by_name === "Admin" && (
                         <span className="px-2 py-0.5 bg-brand text-[8px] font-black uppercase rounded text-white flex items-center gap-1">
                           <ShieldCheck className="w-2.5 h-2.5" /> Staff
                         </span>
                      )}
                    </div>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-0.5">{getTimeAgo(ans.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ans.is_verified_by_admin && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-full text-[10px] font-bold uppercase">
                      <ShieldCheck className="w-3 h-3" /> Verified by Admin
                    </div>
                  )}
                  {ans.is_accepted && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase">
                      <Award className="w-3 h-3" /> Best Answer
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-5 border border-white/8">
                <p className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm">{ans.answer_text}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button 
                  onClick={() => handleUpvote(ans.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold transition-all text-sm ${
                    ans.current_user_upvoted 
                      ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                      : "bg-white/5 border-white/15 text-white/60 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${ans.current_user_upvoted ? "fill-white" : ""}`} />
                  <span className="text-xs">{ans.upvotes} {ans.upvotes === 1 ? "Helpful" : "Helpfuls"}</span>
                </button>

                <button 
                  onClick={() => handleVerifyAnswer(ans.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    ans.is_verified_by_admin
                    ? "border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-white"
                    : "border-blue-500/40 text-blue-400 hover:bg-blue-500 hover:text-white"
                  }`}
                >
                  {ans.is_verified_by_admin ? (
                    <>
                      <ShieldAlert className="w-4 h-4" /> Unverify Answer
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Verify Answer
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {answers.length === 0 && (
            <div className="text-center py-20 bg-white/3 border border-dashed border-white/15 rounded-2xl">
               <MessageSquare className="w-12 h-12 text-white/20 mx-auto" />
               <p className="text-white/50 font-semibold mt-4">No answers yet for this doubt.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
