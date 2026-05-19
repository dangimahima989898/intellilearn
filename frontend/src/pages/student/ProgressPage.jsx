import { useState, useEffect } from 'react'
import { Trophy, Target, Award, Lock, BookOpen, Star, Flame, Code } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import studentService from '../../services/studentService'
import toast from 'react-hot-toast'

export default function StudentProgressPage() {
  const [overview, setOverview] = useState(null)
  const [history, setHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, historyData, leaderboardData] = await Promise.all([
          studentService.getOverview(),
          studentService.getScoreHistory(),
          studentService.getLeaderboard()
        ])
        setOverview(overviewData)
        setHistory(historyData)
        setLeaderboard(leaderboardData)
      } catch (error) {
        toast.error('Failed to load progress data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8 text-center text-navy-400">Loading your progress...</div>

  // Prepare chart data
  const chartHistory = history.map((h, index) => ({
    name: `Q${index + 1}`,
    score: h.score,
    subject: h.subject_name,
    difficulty: h.difficulty_used
  }))

  const chartSubjects = overview?.subjects_studied?.map(s => ({
    name: s.subject_name.substring(0, 8) + (s.subject_name.length > 8 ? '...' : ''),
    score: s.avg_score,
    full_name: s.subject_name
  })) || []

  const radarData = overview?.subjects_studied?.map(s => ({
    subject: s.subject_name.substring(0, 6) + (s.subject_name.length > 6 ? '...' : ''),
    A: s.avg_score,
    fullMark: 100,
  })) || []

  // Milestones Logic
  const milestones = [
    { id: 1, title: "First Quiz", desc: "Took your first quiz", icon: BookOpen, color: "text-blue-500", achieved: overview?.total_quizzes > 0 },
    { id: 2, title: "Quiz Streak", desc: "Completed 3 quizzes", icon: Flame, color: "text-orange-500", achieved: overview?.total_quizzes >= 3 },
    { id: 3, title: "Perfect 100", desc: "Scored 100% in a quiz", icon: Star, color: "text-yellow-500", achieved: overview?.best_score === 100 },
    { id: 4, title: "Subject Master", desc: "Avg >80% in any subject", icon: Target, color: "text-emerald-500", achieved: overview?.subjects_studied?.some(s => s.avg_score >= 80) },
    { id: 5, title: "Daily Devotee", desc: "Completed 7 daily challenges", icon: Trophy, color: "text-brand", achieved: overview?.total_challenges_completed >= 7 },
    { id: 6, title: "Top 10", desc: "Made it to the leaderboard", icon: Award, color: "text-purple-500", achieved: leaderboard.some(l => l.name === "Mahima Dangi") || leaderboard.length > 0 },
    { id: 7, title: "Code Ninja", desc: "Solved a hard coding question", icon: Code, color: "text-pink-500", achieved: history.some(h => h.difficulty === 'Hard' && h.score > 80) },
    { id: 8, title: "Century", desc: "Completed 100 quizzes", icon: Award, color: "text-red-500", achieved: overview?.total_quizzes >= 100 },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-800 border border-navy-700 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold text-sm mb-1">{payload[0].payload.subject || payload[0].payload.full_name || label}</p>
          <p className="text-brand font-semibold">Score: {payload[0].value}%</p>
          {payload[0].payload.difficulty && <p className="text-navy-400 text-xs mt-1">Diff: {payload[0].payload.difficulty}</p>}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-2">My Progress</h1>
        <p className="text-navy-400 text-sm">Track your performance, achievements, and leaderboard standing.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Total Quizzes", value: overview?.total_quizzes || 0, icon: BookOpen, color: "text-blue-500" },
          { label: "Avg Score", value: `${overview?.average_score || 0}%`, icon: Target, color: "text-emerald-500" },
          { label: "Current Streak", value: `${overview?.streak_count || 0} 🔥`, icon: Flame, color: "text-orange-500" },
          { label: "Challenge Pts", value: overview?.challenge_score || 0, icon: Trophy, color: "text-brand" }
        ].map((stat, i) => (
          <div key={i} className="card bg-navy-800 border border-navy-700 rounded-2xl p-5 flex flex-col justify-center shadow-lg hover:border-navy-600 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-navy-400 text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
            </div>
            <h3 className="text-3xl font-outfit font-bold text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart: Score History */}
        <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl">
          <h3 className="font-outfit font-bold text-white mb-6">Recent Quiz Performance</h3>
          {chartHistory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-navy-500 text-sm">No quiz history available yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} />
                  <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4, strokeWidth: 2, stroke: '#0F172A' }} activeDot={{ r: 6, fill: '#60A5FA', stroke: '#0F172A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar/Radar Combo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="font-outfit font-bold text-white mb-6">Subject Averages</h3>
            {chartSubjects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-navy-500 text-sm">No data yet.</div>
            ) : (
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSubjects} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E293B', opacity: 0.4 }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartSubjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10B981' : entry.score >= 50 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="font-outfit font-bold text-white mb-4 text-center">Skill Profile</h3>
            {radarData.length < 3 ? (
              <div className="flex-1 flex items-center justify-center text-navy-500 text-sm text-center">Need at least 3 subjects for radar chart.</div>
            ) : (
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Milestones & Leaderboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Milestones Grid (Takes up 2 cols on Desktop) */}
        <div className="lg:col-span-2 card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-brand" />
            <h3 className="font-outfit font-bold text-white text-xl">My Milestones</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {milestones.map(m => (
              <div key={m.id} className={`relative flex flex-col items-center justify-center text-center p-4 rounded-xl border transition-all ${
                m.achieved 
                ? 'bg-navy-900/80 border-brand/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] overflow-hidden group' 
                : 'bg-navy-900/30 border-navy-800 grayscale opacity-60'
              }`}>
                {!m.achieved && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-navy-500" />
                  </div>
                )}
                {m.achieved && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                
                <div className={`p-3 rounded-full mb-3 ${m.achieved ? 'bg-navy-800' : 'bg-navy-800'}`}>
                  <m.icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <h4 className={`text-xs font-bold font-outfit leading-tight mb-1 ${m.achieved ? 'text-white' : 'text-navy-400'}`}>
                  {m.title}
                </h4>
                <p className="text-[10px] text-navy-500 leading-tight">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Global Leaderboard */}
        <div className="card bg-navy-800 border border-navy-700 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="font-outfit font-bold text-white text-xl">Top 10 Leaderboard</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {leaderboard.length === 0 ? (
              <div className="h-full flex items-center justify-center text-navy-500 text-sm">No data available yet.</div>
            ) : (
              leaderboard.map((student) => (
                <div key={student.rank} className="flex items-center gap-3 p-3 rounded-xl bg-navy-900 border border-navy-700 hover:border-navy-600 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                    student.rank === 1 ? 'bg-yellow-500 text-yellow-950 shadow-yellow-200/50' : 
                    student.rank === 2 ? 'bg-slate-300 text-slate-800 shadow-slate-100/50' : 
                    student.rank === 3 ? 'bg-orange-400 text-orange-950 shadow-orange-200/50' : 
                    'bg-navy-800 text-navy-400 border border-navy-600'
                  }`}>
                    {student.rank}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{student.name}</p>
                    <p className="text-navy-400 text-xs truncate">{student.total_quizzes} quizzes</p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-brand font-bold text-sm">{student.avg_score}%</p>
                    <p className="text-orange-500 text-xs font-semibold">🔥 {student.streak_count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
