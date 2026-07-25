// Mock archive data for Notes and Announcements tabs
// (Subjects come from real API — see HODArchive.jsx)

export const DEPT_CONFIG = {
  BCA:     { color: '#3b82f6', bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400' },
  MCA:     { color: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  'BSc CS':{ color: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400' },
  'MSc IT':{ color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
}



export function getDaysColor(days) {
  if (days <= 3) return { bar: 'from-red-600 to-red-400', text: 'text-red-400', badge: 'bg-red-500/15 border-red-500/30 text-red-400' }
  if (days <= 7) return { bar: 'from-amber-600 to-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400' }
  return { bar: 'from-green-600 to-green-400', text: 'text-green-400', badge: 'bg-green-500/15 border-green-500/30 text-green-400' }
}

export function formatArchiveDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
