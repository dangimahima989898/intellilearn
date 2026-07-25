import { useState, useEffect } from 'react'
import { Trophy, Target, Lock, BookOpen, Star, Flame } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import studentService from '../../services/studentService'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/PageWrapper'

export default function StudentProgressPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
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
        setHistory(historyData || [])
        setLeaderboard(leaderboardData || [])
      } catch (error) {
        toast.error('Failed to load progress data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className={`h-10 w-48 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-white/5'}`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className={`h-28 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5'}`} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`h-64 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5'}`} />
          <div className={`h-64 border rounded-2xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5'}`} />
        </div>
      </div>
    )
  }

  const uniqueSubjects = [...new Set(history.map(h => h.subject_name))]
  const subjectColors = { DSA: "#3B82F6", DBMS: "#8B5CF6", OS: "#10B981", CN: "#F59E0B", JAVA: "#EF4444", PYTHON: "#06B6D4" }

  const chartHistory = history.map((h, idx) => ({
    name: `Quiz ${idx + 1}`,
    [h.subject_name]: h.score,
    score: h.score,
    subject: h.subject_name
  }))

  const radarData = overview?.subjects_studied?.map(s => ({
    subject: s.subject_name.substring(0, 10),
    A: s.avg_score,
    fullMark: 100
  })) || []

  const chartSubjects = overview?.subjects_studied?.map(s => ({
    name: s.subject_name.substring(0, 10),
    percentage: s.avg_score,
  })) || []

  const milestones = [
    { id: 1, title: "First Quiz", desc: "First quiz taken", icon: BookOpen, color: "#3B82F6", achieved: overview?.total_quizzes > 0, req: "1 quiz done", count: overview?.total_quizzes || 0, max: 1 },
    { id: 2, title: "Quiz Streak", desc: "Complete 3 quizzes", icon: Flame, color: "#F59E0B", achieved: overview?.total_quizzes >= 3, req: "3 quizzes", count: overview?.total_quizzes || 0, max: 3 },
    { id: 3, title: "Perfect 100", desc: "Score 100% on any quiz", icon: Star, color: "#EAB308", achieved: overview?.best_score === 100, req: "100% score", count: overview?.best_score || 0, max: 100 },
    { id: 4, title: "Daily Devotee", desc: "Complete 7 challenges", icon: Trophy, color: "#EC4899", achieved: overview?.total_challenges_completed >= 7, req: "7 challenges", count: overview?.total_challenges_completed || 0, max: 7 }
  ]

  const sortedLeaderboard = [...leaderboard].sort((a, b) => a.rank - b.rank)
  const top3 = sortedLeaderboard.slice(0, 3)
  const rest = sortedLeaderboard.slice(3)

  // Shared tooltip style
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isLight ? '#ffffff' : '#0F172A',
      borderColor: isLight ? '#e2e8f0' : '#ffffff10',
      borderRadius: '12px',
      boxShadow: isLight ? '0 4px 24px rgba(0,0,0,0.08)' : 'none'
    },
    labelStyle: { color: isLight ? '#1e293b' : '#ffffff', fontWeight: 'bold' },
  }
  const axisColor = isLight ? '#94a3b8' : '#ffffff30'
  const tickColor = isLight ? '#64748b' : 'rgba(255,255,255,0.4)'
  const gridColor = isLight ? '#e2e8f0' : '#ffffff10'

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-outfit font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>My Progress</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-400' : 'text-white/50'}`}>Track your learning journey</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Quizzes", value: overview?.total_quizzes ?? 0, icon: BookOpen, color: "text-blue-500" },
          { label: "Avg Score %", value: `${overview?.average_score ?? 0}%`, icon: Target, color: "text-teal-500" },
          { label: "Current Streak", value: `${overview?.streak_count ?? 0} 🔥`, icon: Flame, color: "text-orange-500" },
          { label: "Challenge Points", value: overview?.challenge_score ?? 0, icon: Trophy, color: "text-yellow-500" }
        ].map((stat, i) => (
          <div key={i} className={`border rounded-2xl p-5 shadow-lg flex flex-col justify-center ${
            isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <h3 className={`text-2xl font-outfit font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Two Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Score History */}
        <div className={`border rounded-2xl p-6 shadow-xl relative overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <h3 className={`font-outfit font-bold mb-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>Score History</h3>
          <div className="h-52 flex justify-center items-center">
            {chartHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📈</p>
                <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No score history available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} tick={{ fill: tickColor }} />
                  <YAxis stroke={axisColor} domain={[0, 100]} fontSize={10} tickLine={false} tick={{ fill: tickColor }} />
                  <Tooltip {...tooltipStyle} itemStyle={{ color: '#3B82F6' }} />
                  <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 1, fill: '#3B82F6' }} fill="url(#scoreGlow)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Radar */}
        <div className={`border rounded-2xl p-6 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <h3 className={`font-outfit font-bold mb-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>Subject Radar</h3>
          <div className="h-52 flex justify-center items-center">
            {radarData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📡</p>
                <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Not enough data to display skills breakdown</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: isLight ? '#64748b' : '#ffffff50', fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} dot={{ r: 4, fill: '#3B82F6' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className={`border rounded-2xl p-6 shadow-xl mb-6 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
        <h3 className={`font-outfit font-bold mb-6 ${isLight ? 'text-slate-800' : 'text-white'}`}>Subject Breakdown</h3>
        <div className="h-56">
          {chartSubjects.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-3xl mb-2">📊</p>
                <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Not enough data to display subject scores</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSubjects} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} width={70} tick={{ fill: tickColor }} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: '#3B82F6' }} />
                <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={16}>
                  {chartSubjects.map((entry, idx) => {
                    let fill = "#EF4444"
                    if (entry.percentage >= 70) fill = "#10B981"
                    else if (entry.percentage >= 50) fill = "#F59E0B"
                    return <Cell key={idx} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className={`border rounded-2xl p-6 shadow-xl mb-6 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
        <h3 className={`font-outfit font-bold mb-6 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
          🏆 Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map(m => {
            const progressPct = Math.min(100, Math.round((m.count / m.max) * 100))
            return (
              <div 
                key={m.id} 
                className={`rounded-2xl p-5 text-center relative overflow-hidden flex flex-col justify-between border ${
                  m.achieved 
                    ? isLight 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "bg-[#3B82F6]/10 border-[#3B82F6]/30 shadow-lg shadow-blue-500/10" 
                    : isLight 
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white/5 border-white/10"
                }`}
              >
                {!m.achieved && (
                  <div className={`absolute top-3 right-3 ${isLight ? 'text-slate-300' : 'text-white/30'}`}>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
                
                <div>
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
                  }`} style={{ color: m.color }}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <h4 className={`font-bold text-sm leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>{m.title}</h4>
                  <p className={`text-[10px] leading-relaxed mt-1 font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{m.desc}</p>
                </div>

                {!m.achieved && (
                  <div className="mt-4 space-y-1.5">
                    <div className={`w-full rounded-full h-1 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/5'}`}>
                      <div className={`h-full ${isLight ? 'bg-blue-400' : 'bg-white/20'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-white/30'}`}>{m.count} / {m.max} Done</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className={`border rounded-2xl p-6 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
        <h3 className={`font-outfit font-bold mb-6 flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
          📊 Top Students This Month
        </h3>
        
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🏆</p>
            <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/40'}`}>No standings recorded yet</p>
          </div>
        ) : (
          <>
            {/* Top 3 Medals */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {top3.map((student, idx) => {
                const medals = ["🥇", "🥈", "🥉"]
                const isSelf = student.name === user?.name
                return (
                  <div 
                    key={student.name}
                    className={`rounded-2xl p-5 text-center flex flex-col items-center justify-center border ${
                      isSelf
                        ? isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/30"
                        : isLight ? "bg-slate-50 border-slate-200" : "bg-white/3 border-white/5"
                    }`}
                  >
                    <span className="text-3xl mb-1">{medals[idx]}</span>
                    <h4 className={`text-sm font-extrabold truncate max-w-full leading-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h4>
                    <p className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{student.total_quizzes} quizzes</p>
                    <div className={`mt-3.5 font-black text-lg leading-none ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{student.avg_score}%</div>
                  </div>
                )
              })}
            </div>

            {/* Rest of leaderboard */}
            <div className="space-y-2">
              {rest.map((student) => {
                const isSelf = student.name === user?.name
                return (
                  <div 
                    key={student.name}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isSelf 
                        ? isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/20" 
                        : isLight ? "bg-slate-50 border-slate-200" : "bg-white/3 border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`w-5 font-mono font-bold text-center ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{student.rank}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</span>
                    </div>
                    <div className={`flex items-center gap-6 font-semibold uppercase tracking-wider text-[10px]`}>
                      <span className={isLight ? 'text-slate-400' : 'text-white/40'}>{student.total_quizzes} quizzes</span>
                      <span className="text-orange-500">🔥 {student.streak_count}</span>
                      <span className={`font-extrabold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{student.avg_score}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

    </PageWrapper>
  )
}
