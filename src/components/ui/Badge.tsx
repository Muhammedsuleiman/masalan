import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type BadgeTone = 'green' | 'amber' | 'red' | 'gray' | 'gold' | 'brown' | 'blue'

const toneClasses: Record<BadgeTone, string> = {
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  gray: 'badge-gray',
  gold: 'badge-gold',
  brown: 'badge-brown',
  blue: 'badge-blue',
}

export function Badge({ tone = 'gray', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn(toneClasses[tone], className)}>{children}</span>
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    paid: { tone: 'green', label: 'Paid' },
    partial: { tone: 'amber', label: 'Partial' },
    credit: { tone: 'red', label: 'Credit' },
  }
  const item = map[status] ?? { tone: 'gray' as BadgeTone, label: status }
  return <Badge tone={item.tone}>{item.label}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeTone> = { owner: 'gold', manager: 'brown', developer: 'blue' }
  return <Badge tone={map[role] ?? 'gray'}>{role}</Badge>
}
