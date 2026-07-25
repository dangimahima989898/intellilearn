import { Loader2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable Button component with variants: primary, secondary, danger, success, ghost
 * Supports loading state, disabled, icon, and size props.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  ...props
}) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }

  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500 shadow-lg shadow-violet-500/20',
    secondary: isLight
      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 focus:ring-slate-400'
      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 focus:ring-white/20',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    ghost: isLight
      ? 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-300'
      : 'bg-transparent hover:bg-white/5 text-white/70 focus:ring-white/10',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  )
}
