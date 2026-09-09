import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../lib/utils'

interface ThemeToggleProps {
  className?: string
  /** `auto` adapts to light/dark via Tailwind variants; `dark` is styled for use on always-dark surfaces (sidebar, mobile header). */
  variant?: 'auto' | 'dark'
}

export function ThemeToggle({ className, variant = 'auto' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const base =
    variant === 'dark'
      ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-cream-100 transition-colors hover:bg-white/10'
      : 'inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-50 dark:border-white/15 dark:text-cream-100 dark:hover:bg-white/10'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(base, className)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}