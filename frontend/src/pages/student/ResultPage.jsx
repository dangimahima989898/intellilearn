import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Award, Clock, ArrowRight, CheckCircle2, XCircle, HelpCircle, ArrowLeft, BarChart2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'
import placementService from '../../services/placementService'
import toast from 'react-hot-toast'

export default function ResultPage() {
  const { id, attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResult()
  }, [id, attemptId])

  const fetchResult = async () => {
    try {
      const data = await placementService.getResult(id, attemptId)
      setResult(data)
    } catch (error) {
      toast.error("Failed to load attempt result")
      navigate('/tests')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  const { attempt, percentage, grade, pass_status, insights, answers } = result

  // Prepare chart data: section score vs maximum section marks
  const chartData = Object.entries(insights.section_max_marks || {}).map(([section, maxMarks]) => {
    const score = attempt.section_scores?.[section] || 0
    return {
      name: section,
      "Score": score,
      "Max Marks": maxMarks
    }
  })

  // Format time taken
  const formatDuration = (secs) => {
    if (!secs) return "0s"
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const getAnswerIndicator = (ans) => {
    if (!ans.user_answer) {
      return (
        <span className="flex items-center gap-1 text-white/40 text-xs font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded">
          <HelpCircle className="w-3.5 h-3.5" /> Unattempted
        </span>
      )
    }
    if (ans.is_correct) {
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
        <XCircle className="w-3.5 h-3.5" /> Incorrect
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link to="/tests" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to all tests
        </Link>

        {/* 1. Score Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="md:col-span-2 space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold font-outfit">Assessment Complete</h1>
            <p className="text-white/60 text-sm">Here is your detailed performance report and section analysis.</p>
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-extrabold border ${pass_status ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {pass_status ? <CheckCircle2 className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                {pass_status ? 'PASSED (Aptitude Standard)' : 'FAIL / NEEDS IMPROVEMENT'}
              </span>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center md:text-left flex flex-col justify-center">
            <div className="text-white/40 text-xs uppercase tracking-wider font-extrabold">Final Score</div>
            <div className="text-4xl font-black font-outfit mt-1 text-blue-400">
              {attempt.score} <span className="text-lg text-white/50">/ {attempt.total_marks}</span>
            </div>
            <div className="text-white/60 text-xs mt-1">Percentage: {percentage.toFixed(2)}%</div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center md:text-left flex flex-col justify-center">
            <div className="text-white/40 text-xs uppercase tracking-wider font-extrabold">Grade Awarded</div>
            <div className="text-5xl font-black font-outfit mt-1 text-purple-400">{grade}</div>
            <div className="text-white/60 text-xs mt-1">Time Taken: {formatDuration(attempt.time_taken_seconds)}</div>
          </div>
        </div>

        {/* 2. Charts and Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Section Breakdown Bar Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              Section Breakdown
            </h2>
            <div className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1628', borderColor: '#ffffff10', color: 'white' }} />
                  <Legend />
                  <Bar dataKey="Score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Max Marks" fill="#ffffff10" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights Summary Panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-outfit">Performance Insights</h2>
              
              <div className="space-y-4">
                {insights.strongest_section ? (
                  <div>
                    <div className="text-white/40 text-xs uppercase font-extrabold">Strongest Concept</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{insights.strongest_section}</div>
                    <div className="text-xs text-white/50 mt-0.5">Highest percentage accuracy scored in this section.</div>
                  </div>
                ) : (
                  <div className="text-white/40 text-sm">No section accuracy metadata.</div>
                )}

                {insights.most_time_spent_section ? (
                  <div>
                    <div className="text-white/40 text-xs uppercase font-extrabold">Focal Concept (Max Time)</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{insights.most_time_spent_section}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Spent {formatDuration(insights.section_time_spent?.[insights.most_time_spent_section])} resolving questions here.
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-white/40 text-xs uppercase font-extrabold">Tab violation events</div>
                  <div className="text-base font-bold text-white mt-1">
                    {attempt.tab_switches} {attempt.tab_switches === 1 ? 'tab switch' : 'tab switches'}
                  </div>
                </div>
              </div>
            </div>

            <Link 
              to="/tests" 
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-center font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
            >
              Take Another Practice Test
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3. Question-Wise Review */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-outfit">Question Review</h2>
          <div className="space-y-4">
            {answers.map((ans, idx) => (
              <div 
                key={ans.question_id}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
              >
                {/* Question Metadata Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400 text-sm">Question {idx + 1}</span>
                    <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/60 uppercase">
                      {ans.question.section}
                    </span>
                    <span className="text-xs text-white/40 font-medium">({ans.question.marks} Marks)</span>
                  </div>
                  {getAnswerIndicator(ans)}
                </div>

                {/* Question Content */}
                <p className="text-sm text-white/90 leading-relaxed font-medium whitespace-pre-line">
                  {ans.question.question_text}
                </p>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0E1628]/50 border border-white/5 rounded-xl p-4 text-sm font-mono">
                  <div>
                    <div className="text-xs text-white/40 uppercase font-extrabold font-outfit mb-1">Your Answer</div>
                    <div className={`p-2 rounded text-xs ${ans.is_correct ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'}`}>
                      {ans.user_answer || "(Unattempted)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 uppercase font-extrabold font-outfit mb-1">Correct Answer</div>
                    <div className="p-2 rounded text-xs text-blue-400 bg-blue-500/5">
                      {ans.question.correct_answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
