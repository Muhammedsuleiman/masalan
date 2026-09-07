import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-12 text-center backdrop-blur">
      <div className="mb-3 rounded-2xl bg-white/10 p-4 text-gold-400">
        <Icon className="h-8 w-8" />
      </div>
      <h4 className="text-base font-bold text-cream-50">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-cream-200/70">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
