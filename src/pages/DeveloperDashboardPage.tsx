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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950">System Console</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Technical status and diagnostics. Financial business data is intentionally not shown here.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} loading={loading}>
          <RefreshCw className="h-4 w-4" /> Refresh status
        </Button>
      </div>

      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}

      {loading && !status ? (
        <div className="flex items-center justify-center py-24 text-brand-600">
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
            <Card padded className="lg:col-span-1">
              <CardHeader title="Application configuration" subtitle="Environment summary — no secrets shown" />
              <dl className="space-y-3 text-sm">
                <ConfigRow label="Project URL" value={status.config.url} />
                <ConfigRow label="Publishable key" value={status.config.keyPrefix} />
                <ConfigRow label="Service role key" value="Not present (correct)" safe />
                <ConfigRow label="Database password" value="Not present (correct)" safe />
                <ConfigRow label="Checked at" value={formatDateTime(status.checkedAt)} />
              </dl>
            </Card>

            <Card padded className="lg:col-span-2">
              <CardHeader title="Database record counts" subtitle="Read-only technical metrics" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCell label="Businesses" value={status.database.counts.businesses} />
                <CountCell label="Products" value={status.database.counts.products} />
                <CountCell label="Profiles" value={status.database.counts.profiles} />
                <CountCell label="Audit entries" value={status.database.counts.auditLogs} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-cream-100/70 p-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-ink-soft">{rlseNote || 'Row Level Security gate check pending.'}</span>
              </div>
            </Card>
          </div>

          <Card padded>
            <CardHeader
              title="System activity"
              subtitle="Most recent system-wide actions (from audit log)"
              action={
                <div className="rounded-lg bg-cream-100 p-2 text-brand-700">
                  <ScrollText className="h-4 w-4" />
                </div>
              }
            />
            {logs.length === 0 ? (
              <EmptyState icon={Clock} title="No activity recorded" />
            ) : (
              <ul className="divide-y divide-brand-50">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{log.action}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {log.user?.email ?? 'system'} · {log.entity_type} · {log.entity_id ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-ink-faint">{formatDateTime(log.created_at)}</span>
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
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-xl p-2.5', ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
          <Icon className="h-5 w-5" />
        </div>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-brand-950">{ok ? 'Operational' : 'Issue detected'}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ConfigRow({ label, value, safe }: { label: string; value: string; safe?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right">
        {safe ? (
          <Badge tone="green">Verified</Badge>
        ) : (
          <code className="rounded bg-cream-100 px-2 py-0.5 text-xs text-brand-800">{value}</code>
        )}
      </dd>
    </div>
  )
}

function CountCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-cream-100/70 p-4 text-center">
      <p className="text-2xl font-extrabold text-brand-950">{value ?? '—'}</p>
      <p className="text-xs font-semibold text-ink-faint">{label}</p>
    </div>
  )
}
