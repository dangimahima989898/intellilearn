import React from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { TrendingUp, Award, PieChart as PieIcon, Loader2 } from "lucide-react"

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#F43F5E"]

// Tooltip that respects theme (uses CSS vars)
const ThemedTooltip = {
  contentStyle: {
    backgroundColor: 'var(--bg-navy-800)',
    border: '1px solid var(--border-color-strong)',
    borderRadius: '10px',
    fontSize: '11px',
    color: 'var(--text-primary)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  labelStyle: { color: 'var(--text-secondary)', fontWeight: 700 },
  itemStyle: { color: 'var(--text-primary)', fontWeight: 600 },
}

const GRID_COLOR = 'var(--border-color)'
const AXIS_COLOR = 'var(--text-muted)'

function ChartCard({ children, icon: Icon, iconColor, title, subtitle, span }) {
  return (
    <div className={`dash-card p-5 flex flex-col ${span ? `lg:col-span-${span}` : ''}`}>
      <div className="flex items-center gap-2 mb-5">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <div>
          <h3 className="font-bold font-outfit dash-text-primary text-sm">{title}</h3>
          <p className="text-xs dash-text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function EngagementCharts({
  data = { dau: [], quiz_attempts: [], feature_usage: [] },
  isLoading = false
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-64">
        {[1, 2, 3].map(i => (
          <div key={i} className={`dash-card flex flex-col items-center justify-center h-64 ${i === 1 ? 'lg:col-span-2' : ''}`}>
            <Loader2 className="w-7 h-7 animate-spin text-blue-500 mb-2" />
            <p className="dash-text-muted text-xs font-semibold">Loading chart data…</p>
          </div>
        ))}
      </div>
    )
  }

  const { dau = [], quiz_attempts = [], feature_usage = [] } = data

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* ── DAU Area Chart ── */}
      <ChartCard span={2} icon={TrendingUp} iconColor="text-indigo-500" title="Daily Active Students (30d)" subtitle="Unique student platform interactions per day">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dau} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date"        stroke={AXIS_COLOR} fontSize={10} tickLine={false} interval="preserveStartEnd" />
              <YAxis                       stroke={AXIS_COLOR} fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip {...ThemedTooltip} />
              <Area type="monotone" dataKey="users_count" name="Active Students" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDau)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Feature Usage Pie ── */}
      <ChartCard icon={PieIcon} iconColor="text-amber-500" title="Feature Utilization" subtitle="Engagement weight by module">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={feature_usage} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                {feature_usage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...ThemedTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-3 border-t dash-border pt-3">
          {feature_usage.map((e, i) => (
            <div key={e.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] dash-text-muted font-semibold truncate">{e.name} ({e.value})</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* ── Quiz Bar Chart ── */}
      <ChartCard span={3} icon={Award} iconColor="text-emerald-500" title="Quiz Attempt Activity (30d)" subtitle="Total adaptive quiz submissions across all subjects">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quiz_attempts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date"   stroke={AXIS_COLOR} fontSize={10} tickLine={false} interval="preserveStartEnd" />
              <YAxis                  stroke={AXIS_COLOR} fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip {...ThemedTooltip} />
              <Bar dataKey="attempts" name="Quiz Attempts" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
