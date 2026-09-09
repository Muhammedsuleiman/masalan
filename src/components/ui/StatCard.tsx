import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'brown' | 'gold' | 'green' | 'red' | 'blue' | 'cream'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: Tone
  sub?: ReactNode
  loading?: boolean
  /**
   * `flat` (default): neutral white card. `colorful`: tinted gradient panel
   * with a solid icon chip — used on the dashboards.
   */
  variant?: 'flat' | 'colorful'
}

const toneIcon: Record<Tone, string> = {
  brown: 'bg-brand-100 text-brand-800 dark:bg-brand-700/40 dark:text-gold-300',
  gold: 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  cream: 'bg-cream-200 text-brand-700 dark:bg-cream-500/20 dark:text-cream-200',
}

const tonePanel: Record<Tone, string> = {
  brown: 'bg-gradient-to-br from-brand-800/90 to-brand-950/80 border-white/10',
  gold: 'bg-gradient-to-br from-gold-800/60 to-brand-950/80 border-gold-400/20',
  green: 'bg-gradient-to-br from-emerald-800/60 to-brand-950/80 border-emerald-400/20',
  red: 'bg-gradient-to-br from-red-900/50 to-brand-950/80 border-red-400/20',
  blue: 'bg-gradient-to-br from-sky-800/60 to-brand-950/80 border-sky-400/20',
  cream: 'bg-gradient-to-br from-brand-700/80 to-brand-950/80 border-cream-300/20',
}

const toneChip: Record<Tone, string> = {
  brown: 'bg-gold-500 text-brand-950',
  gold: 'bg-gold-400 text-brand-950',
  green: 'bg-emerald-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-sky-500 text-white',
  cream: 'bg-cream-200 text-brand-900',
}

const toneLabel: Record<Tone, string> = {
  brown: 'text-gold-300',
  gold: 'text-gold-300',
  green: 'text-emerald-300',
  red: 'text-red-300',
  blue: 'text-sky-300',
  cream: 'text-cream-200',
}

export function StatCard({ label, value, icon: Icon, tone = 'brown', sub, loading, variant = 'flat' }: StatCardProps) {
  const colorful = variant === 'colorful'
  return (
    <div
      className={cn(
        'rounded-2xl p-5 shadow-card border transition-shadow hover:shadow-lift',
        colorful ? cn(tonePanel[tone], 'backdrop-blur') : 'card p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase tracking-wide', colorful ? toneLabel[tone] : 'text-ink-faint dark:text-cream-400/70')}>
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-md bg-white/15" />
          ) : (
            <p className={cn('mt-1 truncate text-2xl font-extrabold tracking-tight', colorful ? 'text-cream-50' : 'text-brand-950 dark:text-cream-50')}>
              {value}
            </p>
          )}
          {sub && <p className={cn('mt-1 text-xs', colorful ? 'text-cream-200/60' : 'text-ink-soft dark:text-cream-300')}>{sub}</p>}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', colorful ? toneChip[tone] : toneIcon[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
