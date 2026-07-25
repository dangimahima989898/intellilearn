import { RotateCcw, Trash2, X } from 'lucide-react'

export default function BulkActionBar({ count, onRestoreAll, onDeleteAll, onClearSelection, restoreLoading, deleteLoading }) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1E293B] border border-white/20 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-lg">
        {/* Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-xs font-black text-white">
            {count}
          </div>
          <span className="text-sm font-semibold text-white/70">
            item{count !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Restore All */}
        <button onClick={onRestoreAll} disabled={restoreLoading || deleteLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/25 hover:bg-green-500/25 text-green-400 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
          <RotateCcw className={`w-3.5 h-3.5 ${restoreLoading ? 'animate-spin' : ''}`} />
          {restoreLoading ? 'Restoring…' : 'Restore All'}
        </button>

        {/* Delete All */}
        <button onClick={onDeleteAll} disabled={restoreLoading || deleteLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 text-red-400 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
          <Trash2 className={`w-3.5 h-3.5 ${deleteLoading ? 'animate-pulse' : ''}`} />
          {deleteLoading ? 'Deleting…' : 'Delete All Permanently'}
        </button>

        {/* Dismiss */}
        <button onClick={onClearSelection} disabled={restoreLoading || deleteLoading}
          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition ml-1 disabled:opacity-50">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
