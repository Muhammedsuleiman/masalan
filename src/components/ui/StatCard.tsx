import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: 'brown' | 'gold' | 'green' | 'red' | 'blue' | 'cream'
  sub?: ReactNode
  loading?: boolean
}

const toneIcon: Record<NonNullable<StatCardProps['tone']>, string> = {
  brown: 'bg-brand-100 text-brand-800',
  gold: 'bg-gold-100 text-gold-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  cream: 'bg-cream-200 text-brand-700',
}

export function StatCard({ label, value, icon: Icon, tone = 'brown', sub, loading }: StatCardProps) {
  return (
    <div className="card p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 animate-pulse rounded-md bg-cream-200" />
          ) : (
            <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-brand-950">{value}</p>
          )}
          {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', toneIcon[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
