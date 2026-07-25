// ── Analytics configuration and utility functions ─────────────────────────────

export const DEPARTMENTS = ['BCA', 'MCA', 'BSc CS', 'MSc IT']

export const DEPT_CONFIG = {
  BCA:     { color: 'blue',   hex: '#3b82f6', bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   header: 'bg-blue-500/15 border-blue-500/25' },
  MCA:     { color: 'violet', hex: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', header: 'bg-violet-500/15 border-violet-500/25' },
  'BSc CS':{ color: 'green',  hex: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  header: 'bg-green-500/15 border-green-500/25' },
  'MSc IT':{ color: 'orange', hex: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', header: 'bg-orange-500/15 border-orange-500/25' },
}

// Utility: smooth heatmap color
export function getHeatColor(value) {
  if (value === null || value === undefined) return { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.25)', border: 'rgba(255,255,255,0.06)' }
  const hue = Math.min(value * 1.2, 120) // 0 → red, 120 → green
  return {
    bg: `hsla(${hue}, 70%, 40%, 0.18)`,
    text: `hsl(${hue}, 80%, 70%)`,
    border: `hsla(${hue}, 70%, 45%, 0.25)`,
  }
}

export function calcAvg(row) {
  const vals = [row.u1, row.u2, row.u3, row.u4, row.u5].filter(v => v != null)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
}
