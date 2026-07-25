import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable Card component — the standard container for dashboard sections.
 * Matches the .il-card design system class.
 */
export default function Card({ children, className = '', hover = false, onClick = null, ...props }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const base = `rounded-2xl border p-6 transition-all duration-200 ${
    isLight
      ? 'bg-white border-slate-200 shadow-sm'
      : 'bg-white/5 border-white/10'
  }`

  const hoverStyle = hover
    ? isLight
      ? 'hover:border-violet-300 hover:shadow-md cursor-pointer'
      : 'hover:border-violet-500/30 hover:bg-white/[0.07] cursor-pointer'
    : ''

  return (
    <div className={`${base} ${hoverStyle} ${className}`} onClick={onClick} {...props}>
      {children}
    </div>
  )
}
