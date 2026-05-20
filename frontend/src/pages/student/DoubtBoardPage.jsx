import React, { useState, useEffect } from "react";
import { 
  MessageCircle, Plus, Search, Filter, MessageSquare, 
  ThumbsUp, CheckCircle2, ChevronRight, Clock, User as UserIcon,
  Tag, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import doubtService from "../../services/doubtService";
import { getSubjects } from "../../services/chatbotService";

const SUBJECT_COLORS = {
  DSA: "from-blue-600 to-indigo-600",
  DBMS: "from-purple-600 to-pink-600",
  OS: "from-emerald-600 to-teal-600",
  CN: "from-amber-600 to-orange-600",
  JAVA: "from-red-600 to-rose-600",
  PYTHON: "from-cyan-600 to-blue-600"
};

export default function DoubtBoardPage() {
  const navigate = useNavigate();
  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const [doubtsData, subjectsData] = await Promise.all([
        doubtService.getDoubts(filter),
        getSubjects()
      ]);
      setDoubts(doubtsData);
      setSubjects(subjectsData);
    } catch (err) {
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-outfit font-black text-white flex items-center gap-3">
            <MessageCircle className="w-10 h-10 text-brand" />
            Doubt Board
          </h1>
          <p className="text-navy-400 mt-1">Community-powered learning. Ask questions, share knowledge.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-2xl bg-brand hover:brightness-110 text-white font-black shadow-xl shadow-brand/20 transition-all flex items-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Ask a Question
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-navy-800/50 border border-navy-700/50 rounded-3xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex bg-navy-900 rounded-2xl border border-navy-800 p-1">
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: null }))}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === null ? "bg-navy-800 text-white shadow-lg" : "text-navy-500 hover:text-white"}`}
          >
            All Quests
          </button>
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: false }))}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === false ? "bg-navy-800 text-white shadow-lg" : "text-navy-500 hover:text-white"}`}
          >
            Unresolved
          </button>
          <button 
            onClick={() => setFilter(prev => ({ ...prev, is_resolved: true }))}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filter.is_resolved === true ? "bg-navy-800 text-white shadow-lg" : "text-navy-500 hover:text-white"}`}
          >
            Resolved
          </button>
        </div>

        <div className="h-8 w-px bg-navy-800 hidden md:block" />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(prev => ({ ...prev, subject_id: null }))}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${!filter.subject_id ? "bg-brand/10 border-brand text-brand" : "bg-navy-900 border-navy-800 text-navy-500 hover:border-navy-700"}`}
          >
            All Subjects
          </button>
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setFilter(prev => ({ ...prev, subject_id: sub.id }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter.subject_id === sub.id ? "bg-brand/10 border-brand text-brand" : "bg-navy-900 border-navy-800 text-navy-500 hover:border-navy-700"}`}
            >
              {sub.code}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Doubts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-64 bg-navy-800 rounded-3xl animate-pulse border border-navy-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doubts.map((doubt) => (
            <div 
              key={doubt.id}
              onClick={() => navigate(`/student/doubts/${doubt.id}`)}
              className={`group bg-navy-800 border-2 rounded-3xl p-6 transition-all hover:translate-y-[-4px] cursor-pointer relative overflow-hidden flex flex-col justify-between h-full ${
                doubt.is_resolved ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-navy-700 hover:border-brand/40"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`px-3 py-1 bg-gradient-to-r ${SUBJECT_COLORS[doubt.subject_name.split(' ')[0]] || "from-blue-600 to-indigo-600"} rounded-lg text-[10px] font-black text-white uppercase tracking-widest`}>
                    {doubt.subject_name}
                  </div>
                  {doubt.is_resolved && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-black uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white line-clamp-3 leading-snug group-hover:text-brand transition-colors">
                  {doubt.question_text}
                </h3>
              </div>

              <div className="pt-6 mt-auto flex items-center justify-between border-t border-navy-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy-950 border border-navy-700 flex items-center justify-center font-bold text-brand uppercase text-xs">
                    {doubt.student_name.charAt(0)}
                  </div>
                  <div className="text-[10px]">
                    <p className="text-white font-bold">{doubt.student_name}</p>
                    <p className="text-navy-500">{getTimeAgo(doubt.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-navy-400 group-hover:text-white transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-black">{doubt.answer_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-navy-400">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-black">{doubt.vote_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {doubts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-navy-800/20 border border-dashed border-navy-700 rounded-3xl">
              <MessageCircle className="w-16 h-16 text-navy-700 mx-auto" />
              <p className="text-navy-500 font-bold">No questions found. Be the first to ask!</p>
            </div>
          )}
        </div>
      )}

      {/* Post Doubt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-800 border border-navy-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl scale-in">
            <div className="p-6 border-b border-navy-700 flex items-center justify-between bg-navy-850">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-brand" />
                Post a Doubt
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-navy-700 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-navy-400" />
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Select Subject
                </label>
                <select
                  required
                  value={newDoubt.subject_id}
                  onChange={(e) => setNewDoubt(prev => ({ ...prev, subject_id: e.target.value }))}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Your Question
                  </label>
                  <span className={`text-[10px] font-bold ${newDoubt.question_text.length < 20 ? "text-rose-400" : "text-emerald-400"}`}>
                    {newDoubt.question_text.length} / 1000
                  </span>
                </div>
                <textarea
                  required
                  value={newDoubt.question_text}
                  onChange={(e) => setNewDoubt(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Explain your doubt clearly. What did you try? What is confusing you?"
                  maxLength={1000}
                  className="w-full h-48 bg-navy-900 border border-navy-700 rounded-2xl p-6 text-white focus:border-brand outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 rounded-2xl border border-navy-700 text-white font-bold hover:bg-navy-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDoubt.subject_id || newDoubt.question_text.length < 20}
                  className="flex-1 py-4 rounded-2xl bg-brand hover:brightness-110 text-white font-black shadow-xl shadow-brand/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Posting..." : "Post Doubt Now 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
