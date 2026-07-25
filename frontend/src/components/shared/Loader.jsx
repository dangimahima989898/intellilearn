import { Loader2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Reusable loading indicator. Supports full-page or inline modes.
 */
export default function Loader({ size = 'md', text = 'Loading...', fullPage = false, className = '' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-violet-500`} />
      {text && <p className={`text-sm font-medium ${isLight ? 'text-slate-400' : 'text-white/50'}`}>{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        {content}
      </div>
    )
  }

  return content
}
