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
  brown: 'bg-brand-100 text-brand-800',
  gold: 'bg-gold-100 text-gold-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  cream: 'bg-cream-200 text-brand-700',
}

const tonePanel: Record<Tone, string> = {
  brown: 'bg-gradient-to-br from-brand-100 via-cream-100 to-cream-50 border-brand-200/50',
  gold: 'bg-gradient-to-br from-gold-100 via-cream-100 to-cream-50 border-gold-200/60',
  green: 'bg-gradient-to-br from-emerald-100 via-cream-100 to-cream-50 border-emerald-200/50',
  red: 'bg-gradient-to-br from-red-100 via-cream-100 to-cream-50 border-red-200/40',
  blue: 'bg-gradient-to-br from-sky-100 via-cream-100 to-cream-50 border-sky-200/50',
  cream: 'bg-gradient-to-br from-cream-200 via-cream-100 to-cream-50 border-brand-200/50',
}

const toneChip: Record<Tone, string> = {
  brown: 'bg-brand-700 text-cream-100',
  gold: 'bg-gold-500 text-brand-950',
  green: 'bg-emerald-600 text-white',
  red: 'bg-red-600 text-white',
  blue: 'bg-sky-600 text-white',
  cream: 'bg-brand-900 text-gold-400',
}

const toneLabel: Record<Tone, string> = {
  brown: 'text-brand-700',
  gold: 'text-gold-700',
  green: 'text-emerald-700',
  red: 'text-red-600',
  blue: 'text-sky-700',
  cream: 'text-brand-800',
}

export function StatCard({ label, value, icon: Icon, tone = 'brown', sub, loading, variant = 'flat' }: StatCardProps) {
  const colorful = variant === 'colorful'
  return (
    <div
      className={cn(
        'rounded-2xl p-5 shadow-card border transition-shadow hover:shadow-lift',
        colorful ? tonePanel[tone] : 'card p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase tracking-wide', colorful ? toneLabel[tone] : 'text-ink-faint')}>
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-md bg-cream-200" />
          ) : (
            <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-brand-950">{value}</p>
          )}
          {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', colorful ? toneChip[tone] : toneIcon[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
