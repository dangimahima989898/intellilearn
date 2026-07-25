import { AlertTriangle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import Button from './Button'

/**
 * Reusable confirmation dialog for destructive actions.
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0F172A] border-white/10'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
          </div>
          <div>
            <h3 className={`font-bold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
            <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant} size="sm" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
