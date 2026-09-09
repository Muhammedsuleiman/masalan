import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'info' | 'success' | 'warning' | 'error'

const config: Record<Tone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30' },
  success: { icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' },
  warning: { icon: AlertTriangle, classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' },
  error: { icon: XCircle, classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30' },
}

export function Alert({ tone = 'info', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const { icon: Icon, classes } = config[tone]
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', classes, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
