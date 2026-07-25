import { useState } from 'react'
import { X, Settings, Save, AlertTriangle } from 'lucide-react'

const LEAVE_TYPES = [
  { key: 'CL', label: 'Casual Leave (CL)', color: 'text-blue-400' },
  { key: 'ML', label: 'Medical Leave (ML)', color: 'text-red-400' },
  { key: 'EL', label: 'Earned Leave (EL)', color: 'text-green-400' },
  { key: 'OD', label: 'On Duty Leave (OD)', color: 'text-purple-400' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-white/20'} relative`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </div>
      <span className="text-sm text-white/70">{label}</span>
    </label>
  )
}

export default function LeavePolicyDrawer({ policy, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...policy })

  const handleChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative h-full w-full max-w-md bg-[#0F172A] border-l border-white/10 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-400" /> Leave Policy Settings
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">Changes apply to future leave submissions only. Existing requests are unaffected.</p>
          </div>

          {/* Leave Quotas */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Annual Leave Quotas (days)</p>
            <div className="flex flex-col gap-3">
              {LEAVE_TYPES.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChange(key, Math.max(1, (draft[key] || 0) - 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-lg transition flex items-center justify-center"
                    >−</button>
                    <span className="w-8 text-center text-white font-bold text-lg">{draft[key] || 0}</span>
                    <button
                      onClick={() => handleChange(key, Math.min(60, (draft[key] || 0) + 1))}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-lg transition flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minimum Notice */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Minimum Notice Period</p>
            <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">Minimum notice required</p>
                <p className="text-xs text-white/40 mt-0.5">Days before leave must be applied</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChange('minNoticeDays', Math.max(0, (draft.minNoticeDays || 0) - 1))}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-lg transition flex items-center justify-center"
                >−</button>
                <span className="w-8 text-center text-white font-bold text-lg">{draft.minNoticeDays || 0}</span>
                <button
                  onClick={() => handleChange('minNoticeDays', Math.min(30, (draft.minNoticeDays || 0) + 1))}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-lg transition flex items-center justify-center"
                >+</button>
                <span className="text-sm text-white/50 ml-1">days</span>
              </div>
            </div>
          </div>

          {/* Toggle Settings */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Approval Rules</p>
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <Toggle
                  checked={draft.requireMedCert}
                  onChange={v => handleChange('requireMedCert', v)}
                  label="Require medical certificate for ML"
                />
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <Toggle
                  checked={draft.allowHalfDay}
                  onChange={v => handleChange('allowHalfDay', v)}
                  label="Allow half-day leave applications"
                />
              </div>
            </div>
          </div>

          {/* Current Summary */}
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <p className="text-xs font-bold text-violet-300 mb-3">Current Policy Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {LEAVE_TYPES.map(({ key, label }) => (
                <div key={key} className="flex justify-between">
                  <span className="text-white/50">{key}</span>
                  <span className="text-white font-semibold">{draft[key]} days/yr</span>
                </div>
              ))}
              <div className="flex justify-between col-span-2 border-t border-white/10 pt-2 mt-1">
                <span className="text-white/50">Min notice</span>
                <span className="text-white font-semibold">{draft.minNoticeDays} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={() => onSave(draft)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition shadow-lg shadow-violet-500/25"
          >
            <Save className="w-4 h-4" /> Save Policy Settings
          </button>
        </div>
      </div>
    </div>
  )
}
