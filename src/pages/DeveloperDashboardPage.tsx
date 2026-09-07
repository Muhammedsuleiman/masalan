import { useEffect, useState } from 'react'
import {
  Server,
  ShieldCheck,
  Database,
  KeyRound,
  RefreshCw,
  ScrollText,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { getSystemStatus, checkRlsGate, type SystemStatus } from '../services/systemService'
import { fetchAuditLogs } from '../services/financeService'
import type { AuditLog } from '../types'
import { Card, CardHeader } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDateTime } from '../lib/money'
import { cn } from '../lib/utils'

export default function DeveloperDashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [rlseNote, setRlseNote] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getSystemStatus()
      setStatus(s)
      const gate = await checkRlsGate()
      setRlseNote(gate.note)
      const logsData = await fetchAuditLogs({ limit: 8 })
      setLogs(logsData)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="animate-fadeUp space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400 bg-clip-text text-transparent">
              System Console
            </h1>
            <p className="mt-1 text-sm text-cream-200/80">
              Technical status and diagnostics. Financial business data is intentionally not shown here.
            </p>
          </div>
          <Button variant="outline" className="border-white/25 bg-white/10 text-cream-50 hover:bg-white/20 hover:text-cream-50" onClick={() => void load()} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh status
          </Button>
        </div>
      </div>

      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}

      {loading && !status ? (
        <div className="flex items-center justify-center py-24 text-gold-400">
          <Spinner className="h-6 w-6" />
        </div>
      ) : status ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon={Server}
              label="Supabase connection"
              ok={status.supabase.reachable}
              detail={
                status.supabase.latencyMs !== null
                  ? `${status.supabase.latencyMs} ms`
                  : 'unreachable'
              }
              error={status.supabase.error}
            />
            <StatusCard
              icon={Database}
              label="Database"
              ok={status.database.reachable}
              detail="businesses, products, profiles & audit_logs reachable"
              error={status.database.error}
            />
            <StatusCard
              icon={KeyRound}
              label="Auth status"
              ok={status.auth.signedIn}
              detail={
                status.auth.signedIn
                  ? `${status.auth.email ?? 'Authenticated'} · ${status.auth.provider ?? 'email'}`
                  : 'Signed out'
              }
            />
            <StatusCard
              icon={ShieldCheck}
              label="Configuration"
              ok={status.config.urlConfigured && status.config.keyConfigured}
              detail={`URL ${status.config.urlConfigured ? 'set' : 'missing'} · key ${status.config.keyConfigured ? 'set' : 'missing'}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-white/10 bg-white/[0.06] backdrop-blur [&_h3]:text-cream-50 [&_p]:text-cream-200/70">
              <CardHeader title="Application configuration" subtitle="Environment summary — no secrets shown" />
              <dl className="space-y-3 text-sm">
                <ConfigRow label="Project URL" value={status.config.url} />
                <ConfigRow label="Publishable key" value={status.config.keyPrefix} />
                <ConfigRow label="Service role key" value="Not present (correct)" safe />
                <ConfigRow label="Database password" value="Not present (correct)" safe />
                <ConfigRow label="Checked at" value={formatDateTime(status.checkedAt)} />
              </dl>
            </Card>

            <Card className="border-white/10 bg-white/[0.06] backdrop-blur [&_h3]:text-cream-50 [&_p]:text-cream-200/70">
              <CardHeader title="Database record counts" subtitle="Read-only technical metrics" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCell tone="gold" label="Businesses" value={status.database.counts.businesses} />
                <CountCell tone="brown" label="Products" value={status.database.counts.products} />
                <CountCell tone="green" label="Profiles" value={status.database.counts.profiles} />
                <CountCell tone="blue" label="Audit entries" value={status.database.counts.auditLogs} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/50 to-brand-950/70 p-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-100">{rlseNote || 'Row Level Security gate check pending.'}</span>
              </div>
            </Card>
          </div>

          <Card className="border-white/10 bg-white/[0.06] backdrop-blur [&_h3]:text-cream-50 [&_p]:text-cream-200/70">
            <CardHeader
              title="System activity"
              subtitle="Most recent system-wide actions (from audit log)"
              action={
                <div className="rounded-lg bg-white/10 p-2 text-gold-400">
                  <ScrollText className="h-4 w-4" />
                </div>
              }
            />
            {logs.length === 0 ? (
              <EmptyState icon={Clock} title="No activity recorded" />
            ) : (
              <ul className="divide-y divide-white/10">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream-50">{log.action}</p>
                      <p className="truncate text-xs text-cream-200/60">
                        {log.user?.email ?? 'system'} · {log.entity_type} · {log.entity_id ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-cream-200/60">{formatDateTime(log.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}

function StatusCard({
  icon: Icon,
  label,
  ok,
  detail,
  error,
}: {
  icon: typeof Server
  label: string
  ok: boolean
  detail: string
  error?: string | null
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-card backdrop-blur">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-xl p-2.5', ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}>
          <Icon className="h-5 w-5" />
        </div>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cream-200/60">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-cream-50">{ok ? 'Operational' : 'Issue detected'}</p>
      <p className="mt-1 text-xs text-cream-200/70">{detail}</p>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

function ConfigRow({ label, value, safe }: { label: string; value: string; safe?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-cream-200/70">{label}</dt>
      <dd className="text-right">
        {safe ? (
          <Badge tone="green">Verified</Badge>
        ) : (
          <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-gold-300">{value}</code>
        )}
      </dd>
    </div>
  )
}

type CountTone = 'brown' | 'gold' | 'green' | 'blue'
const countTones: Record<CountTone, string> = {
  brown: 'border-white/10 bg-gradient-to-br from-brand-800/80 to-brand-950/70',
  gold: 'border-gold-400/20 bg-gradient-to-br from-gold-800/50 to-brand-950/70',
  green: 'border-emerald-400/20 bg-gradient-to-br from-emerald-800/50 to-brand-950/70',
  blue: 'border-sky-800/50 bg-gradient-to-br from-sky-900/50 to-brand-950/70',
}

function CountCell({ label, value, tone = 'brown' }: { label: string; value: number | null; tone?: CountTone }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${countTones[tone]}`}>
      <p className="text-2xl font-extrabold text-cream-50">{value ?? '—'}</p>
      <p className="text-xs font-semibold text-cream-200/60">{label}</p>
    </div>
  )
}
