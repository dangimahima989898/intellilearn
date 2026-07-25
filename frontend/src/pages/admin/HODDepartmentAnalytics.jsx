import { useState, useMemo } from 'react'
import {
  BarChart3, Grid, Users, GraduationCap, TrendingUp,
  Calendar, Download, ChevronDown, RefreshCw, Filter
} from 'lucide-react'
import PageWrapper from '../../components/PageWrapper'
import toast from 'react-hot-toast'

import AnalyticsOverview from './components/analytics/AnalyticsOverview'
import PerformanceHeatmap from './components/analytics/PerformanceHeatmap'
import StudentProgress from './components/analytics/StudentProgress'
import AttendanceTab from './components/analytics/AttendanceTab'
import ComparativeReport from './components/analytics/ComparativeReport'
import {
  exportHeatmapExcel,
  exportMissedQuestionsExcel,
  exportStudentPerformanceExcel,
  exportFullReportPDF,
} from './components/analytics/analyticsExport'
import { DEPARTMENTS } from './components/analytics/analyticsData'

const TABS = [
  { id: 'overview',    label: 'Overview',           icon: BarChart3 },
  { id: 'quiz',        label: 'Quiz Analytics',      icon: Grid },
  { id: 'students',    label: 'Student Progress',    icon: Users },
  { id: 'attendance',  label: 'Attendance',          icon: Calendar },
  { id: 'comparative', label: 'Comparative Report',  icon: TrendingUp },
]

const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']
const PERIODS   = ['This Month', 'This Semester', 'This Year']

export default function HODDepartmentAnalytics() {
  const [activeTab, setActiveTab]   = useState('overview')
  const [deptFilter, setDeptFilter] = useState('All')
  const [semFilter, setSemFilter]   = useState('All')
  const [period, setPeriod]         = useState('This Semester')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting]   = useState(false)

  const handleExport = async (type) => {
    setExportOpen(false)
    setExporting(true)
    try {
      if (type === 'heatmap')   await exportHeatmapExcel(deptFilter)
      if (type === 'questions') await exportMissedQuestionsExcel(deptFilter)
      if (type === 'students')  await exportStudentPerformanceExcel(deptFilter)
      if (type === 'full')      await exportFullReportPDF(deptFilter)
    } catch (err) {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)

  return (
    <PageWrapper title="Department Analytics">
      <div className="w-full max-w-[1400px] mx-auto p-4 lg:p-6 flex flex-col gap-5">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-400" />
              Student Performance Analytics
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Unit-wise quiz accuracy across all subjects and most commonly missed questions.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Export dropdown */}
            <div className="relative">
              <button onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-sm font-medium transition">
                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Report
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-11 w-56 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden">
                  {[
                    { id: 'heatmap',   label: '📊 Heatmap as Excel' },
                    { id: 'questions', label: '❓ Missed Questions as Excel' },
                    { id: 'students',  label: '👥 Student Performance as Excel' },
                    { id: 'full',      label: '📄 Full Department Report (PDF)' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => handleExport(opt.id)}
                      className="flex items-start w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition border-b border-white/5 last:border-0">
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Global Filter Bar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
          <Filter className="w-4 h-4 text-white/30 shrink-0" />
          {/* Department */}
          <div className="relative">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
              <option value="All" className="bg-[#0F172A]">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#0F172A]">{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
          </div>
          {/* Semester */}
          <div className="relative">
            <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
              {SEMESTERS.map(s => <option key={s} value={s} className="bg-[#0F172A]">{s === 'All' ? 'All Semesters' : s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
          </div>
          {/* Period */}
          <div className="relative">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition cursor-pointer">
              {PERIODS.map(p => <option key={p} value={p} className="bg-[#0F172A]">{p}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
          </div>

          {/* Active filter pills */}
          {(deptFilter !== 'All' || semFilter !== 'All') && (
            <div className="flex items-center gap-1.5 ml-1">
              {deptFilter !== 'All' && (
                <span className="flex items-center gap-1 text-xs font-bold bg-violet-500/20 border border-violet-500/30 text-violet-300 px-2.5 py-1 rounded-full">
                  {deptFilter}
                  <button onClick={() => setDeptFilter('All')} className="ml-1 text-violet-400/60 hover:text-violet-300 transition">×</button>
                </span>
              )}
              {semFilter !== 'All' && (
                <span className="flex items-center gap-1 text-xs font-bold bg-violet-500/20 border border-violet-500/30 text-violet-300 px-2.5 py-1 rounded-full">
                  {semFilter}
                  <button onClick={() => setSemFilter('All')} className="ml-1 text-violet-400/60 hover:text-violet-300 transition">×</button>
                </span>
              )}
            </div>
          )}

          <span className="ml-auto text-xs text-white/30">{period}</span>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <AnalyticsOverview
              deptFilter={deptFilter}
              onSetDeptFilter={setDeptFilter}
              onTabChange={(tabLabel) => {
                const found = TABS.find(t => t.label === tabLabel)
                if (found) setActiveTab(found.id)
              }}
            />
          )}
          {activeTab === 'quiz' && <PerformanceHeatmap deptFilter={deptFilter} />}
          {activeTab === 'students' && <StudentProgress deptFilter={deptFilter} />}
          {activeTab === 'attendance' && <AttendanceTab deptFilter={deptFilter} />}
          {activeTab === 'comparative' && <ComparativeReport deptFilter={deptFilter} />}
        </div>
      </div>

      {/* Click-away for export menu */}
      {exportOpen && <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />}
    </PageWrapper>
  )
}
