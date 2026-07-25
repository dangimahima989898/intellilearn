import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable Input component with label, error message, and icon support.
 */
export default function Input({
  label,
  error,
  icon: Icon = null,
  className = '',
  ...props
}) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
        )}
        <input
          className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-400 focus:ring-red-500/30'
              : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:ring-violet-500/20'
                : 'bg-white/5 border-white/10 text-white focus:border-violet-500 focus:ring-violet-500/20'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  )
}
