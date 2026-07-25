import { useState } from 'react'
import { Upload, Download, AlertTriangle } from 'lucide-react'

export default function AttendanceTab({ deptFilter }) {
  const [csvUploaded, setCsvUploaded] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2">Attendance Data Not Integrated</h3>
        <p className="text-white/50 text-sm max-w-md">
          Attendance analytics requires integration with your college attendance system (ERP). Connect your system or upload a CSV to enable this view.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition">
          <Download className="w-4 h-4" /> Download CSV Template
        </button>
        <button onClick={() => setCsvUploaded(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition">
          <Upload className="w-4 h-4" /> Upload Attendance CSV
        </button>
      </div>
    </div>
  )
}
