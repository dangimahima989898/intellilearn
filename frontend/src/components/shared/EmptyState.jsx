import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable EmptyState component for when no data is available.
 * Use across all panels for consistent empty messaging.
 */
export default function EmptyState({ icon: Icon = null, emoji = null, title, subtitle, action = null, className = '' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed rounded-2xl ${
      isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/10'
    } ${className}`}>
      {emoji && <span className="text-4xl mb-3">{emoji}</span>}
      {Icon && (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          isLight ? 'bg-slate-100' : 'bg-white/5'
        }`}>
          <Icon className={`w-7 h-7 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
        </div>
      )}
      <h3 className={`text-sm font-bold ${isLight ? 'text-slate-600' : 'text-white/60'}`}>{title}</h3>
      {subtitle && (
        <p className={`text-xs mt-1.5 max-w-xs ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
