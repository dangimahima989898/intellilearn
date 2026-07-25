import { X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable Modal with overlay, title, close button, and footer slot.
 */
export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <div className={`relative w-full ${maxWidth} rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0F172A] border-white/10'
      }`}>
        {/* Header */}
        {title && (
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <h2 className={`text-lg font-bold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-white/10 text-white/40'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t shrink-0 flex items-center justify-end gap-3 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
