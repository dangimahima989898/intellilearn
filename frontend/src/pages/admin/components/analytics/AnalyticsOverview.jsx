import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import {
  Users, TrendingUp, Activity, AlertTriangle,
  Sparkles, RefreshCw, ArrowUpRight, ArrowDownRight, ChevronRight, Loader2
} from 'lucide-react'
import { DEPT_CONFIG, DEPARTMENTS } from './analyticsData'
import hodService from '../../../../services/hodService'
import toast from 'react-hot-toast'

// AI Insights are dynamically loaded and computed inside the component

const INSIGHT_COLOR = {
  performance: 'border-violet-500/20 bg-violet-500/5',
  improvement: 'border-green-500/20 bg-green-500/5',
  risk: 'border-amber-500/20 bg-amber-500/5',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-xs font-bold text-white/60 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.dataKey || p.name}:</span>
          <span className="font-bold text-white">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsOverview({ deptFilter, onSetDeptFilter, onTabChange }) {
  const [insightsLoading, setInsightsLoading] = useState(false)
  
  const [summaryData, setSummaryData] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryRes, suggestionRes] = await Promise.allSettled([
        hodService.getAnalyticsSummary(),
        hodService.getAiSuggestion()
      ])
      if (summaryRes.status === 'fulfilled') {
        setSummaryData(summaryRes.value)
      } else {
        console.warn('Analytics summary failed:', summaryRes.reason?.message)
        setSummaryData({ dept_summary: [], score_trend: [] })
      }
      if (suggestionRes.status === 'fulfilled') {
        setAiSuggestion(suggestionRes.value)
      }
      setError(null)
    } catch (err) {
      setError('Failed to load department analytics summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefreshInsights = async () => {
    try {
      setInsightsLoading(true)
      const suggestion = await hodService.getAiSuggestion()
      setAiSuggestion(suggestion)
      toast.success('Generated fresh insights!')
    } catch (err) {
      toast.error('Failed to generate fresh insights')
    } finally {
      setInsightsLoading(false)
    }
  }

  // Derive metrics dynamically
  const metrics = useMemo(() => {
    if (!summaryData || !Array.isArray(summaryData.dept_summary)) {
      return { totalStudents: 0, avgScore: 0, avgEngagement: 0, atRisk: 0, activeSummary: [], trendData: [] }
    }

    const rawSummary = summaryData.dept_summary
    const activeSummary = deptFilter !== 'All'
      ? rawSummary.filter(d => d.dept === deptFilter)
      : rawSummary

    const totalStudents = activeSummary.reduce((s, d) => s + (d.students || 0), 0)
    const avgScore = activeSummary.length > 0
      ? Math.round(activeSummary.reduce((s, d) => s + (d.avg_score || 0), 0) / activeSummary.length)
      : 0
    const avgEngagement = activeSummary.length > 0
      ? Math.round(activeSummary.reduce((s, d) => s + (d.engagement || 0), 0) / activeSummary.length)
      : 0
    const atRisk = activeSummary.reduce((s, d) => s + (d.at_risk || 0), 0)

    const trendData = deptFilter !== 'All'
      ? (Array.isArray(summaryData.score_trend) ? summaryData.score_trend : []).map(w => ({ week: w.week, [deptFilter]: w[deptFilter] }))
      : (Array.isArray(summaryData.score_trend) ? summaryData.score_trend : [])

    return { totalStudents, avgScore, avgEngagement, atRisk, activeSummary, trendData }
  }, [summaryData, deptFilter])

  const insights = useMemo(() => {
    const list = []
    
    // 1. Performance Insight
    if (aiSuggestion && aiSuggestion.suggestion) {
      list.push({
        type: 'performance',
        icon: '📊',
        title: 'Performance Insight',
        text: aiSuggestion.suggestion,
        action: aiSuggestion.subject_name !== 'N/A' ? `View ${aiSuggestion.subject_name} Details` : 'View Details',
      })
    } else {
      list.push({
        type: 'performance',
        icon: '📊',
        title: 'Performance Insight',
        text: 'No quiz performance concerns identified in the department.',
        action: 'View Details',
      })
    }

    // 2. Improvement Alert / Top Department
    if (summaryData?.dept_summary?.length) {
      const highestScoreDept = [...summaryData.dept_summary].sort((a, b) => b.avg_score - a.avg_score)[0]
      list.push({
        type: 'improvement',
        icon: '📈',
        title: 'Top Department',
        text: `${highestScoreDept.dept} is the leading department with an average score of ${highestScoreDept.avg_score}% and student engagement of ${highestScoreDept.engagement}%.`,
        action: `Filter by ${highestScoreDept.dept}`,
        onClick: () => onSetDeptFilter(highestScoreDept.dept),
      })
    } else {
      list.push({
        type: 'improvement',
        icon: '📈',
        title: 'Top Department',
        text: 'No department performance averages are available to analyze.',
        action: 'View Analytics',
      })
    }

    // 3. Risk Alert
    list.push({
      type: 'risk',
      icon: '⚠️',
      title: 'Risk Alert',
      text: metrics.atRisk > 0
        ? `${metrics.atRisk} students are currently flagged as at-risk across departments due to low activity or quiz scores. Immediate intervention is advised.`
        : 'All students are performing within safe engagement margins. No at-risk alerts.',
      action: 'View At-Risk Students',
      onClick: () => onTabChange('Student Progress'),
    })

    return list
  }, [aiSuggestion, summaryData, metrics.atRisk, onSetDeptFilter, onTabChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-white/5 border border-white/10 rounded-2xl p-6 gap-3">
        <p className="text-red-400 text-sm font-semibold">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    )
  }

  if (!summaryData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: metrics.totalStudents, sub: 'across all departments', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', trend: null },
          { label: 'Avg Quiz Score', value: `${metrics.avgScore}%`, sub: 'this month', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', trend: '+3%' },
          { label: 'Platform Engagement', value: `${metrics.avgEngagement}%`, sub: 'daily active students', icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', trend: '-2%' },
          { label: 'At-Risk Students', value: metrics.atRisk, sub: 'need immediate attention', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', trend: null, onClick: () => onTabChange('Student Progress') },
        ].map(card => (
          <button key={card.label} onClick={card.onClick}
            className={`flex items-start gap-3 p-4 rounded-2xl border ${card.bg} text-left hover:brightness-110 transition ${card.onClick ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className="p-2 rounded-xl bg-white/5 shrink-0">
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-white/50 mt-0.5 leading-tight">{card.label}</p>
              {card.trend && (
                <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${card.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {card.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.trend} vs last month
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Department Summary Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <h3 className="font-bold text-white text-sm">Department Performance Summary</h3>
          <p className="text-xs text-white/40 mt-0.5">Click a row to filter all analytics by department</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Department', 'Students', 'Avg Score', 'Engagement', 'At-Risk', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(summaryData.dept_summary || []).map(d => {
                const cfg = DEPT_CONFIG[d.dept] || { color: 'gray', hex: '#6b7280', bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', header: 'bg-gray-500/15 border-gray-500/25' }
                const isActive = deptFilter === d.dept
                return (
                  <tr key={d.dept}
                    onClick={() => onSetDeptFilter(isActive ? 'All' : d.dept)}
                    className={`border-b border-white/5 cursor-pointer transition-all ${isActive ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0`} style={{ background: cfg.hex }} />
                        <span className={`font-bold ${cfg.text}`}>{d.dept}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/80">{d.students}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${d.avg_score}%` }} />
                        </div>
                        <span className="text-white font-semibold">{d.avg_score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${d.engagement >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {d.engagement}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {d.at_risk > 0 && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">{d.at_risk}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition">
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Trend */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold text-white text-sm mb-4">Quiz Score Trend — Last 8 Weeks</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 90]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }} />
              {(deptFilter === 'All' ? DEPARTMENTS : [deptFilter]).map(dept => {
                const hex = DEPT_CONFIG[dept]?.hex || '#6b7280'
                return <Line key={dept} type="monotone" dataKey={dept} stroke={hex} strokeWidth={2} dot={false} />
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Score Comparison Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold text-white text-sm mb-4">Department Score Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summaryData.dept_summary || []} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dept" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 90]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_score" radius={[6, 6, 0, 0]}
                fill="url(#barGrad)"
                label={{ position: 'top', fill: 'rgba(255,255,255,0.6)', fontSize: 10, formatter: v => `${v}%` }}>
                {(summaryData.dept_summary || []).map((entry, index) => {
                  const hex = DEPT_CONFIG[entry.dept]?.hex || '#6b7280'
                  return <Cell key={`cell-${index}`} fill={hex} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> AI Department Insights
          </h3>
          <button onClick={handleRefreshInsights}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition">
            <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} /> Generate Fresh Insights
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightsLoading
            ? [1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)
            : insights.map(insight => (
              <div key={insight.type} className={`p-4 rounded-xl border ${INSIGHT_COLOR[insight.type]} flex flex-col gap-2`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{insight.icon}</span>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{insight.title}</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed flex-1">{insight.text}</p>
                <button
                  onClick={insight.onClick}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold text-left transition flex items-center gap-1">
                  {insight.action} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
