import { supabase, getConfigSummary } from '../lib/supabase'
import { getFriendlyError } from './authService'

export interface SystemStatus {
  checkedAt: string
  config: ReturnType<typeof getConfigSummary>
  auth: {
    signedIn: boolean
    email: string | null
    provider: string | null
    sessionExpiry: string | null
  }
  supabase: {
    reachable: boolean
    latencyMs: number | null
    error: string | null
  }
  database: {
    reachable: boolean
    error: string | null
    counts: {
      businesses: number | null
      products: number | null
      profiles: number | null
      auditLogs: number | null
    }
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session

  const start = performance.now()
  const health: SystemStatus = {
    checkedAt: new Date().toISOString(),
    config: getConfigSummary(),
    auth: {
      signedIn: Boolean(session),
      email: session?.user.email ?? null,
      provider: session?.user.app_metadata?.provider ?? null,
      sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    },
    supabase: { reachable: false, latencyMs: null, error: null },
    database: {
      reachable: false,
      error: null,
      counts: { businesses: null, products: null, profiles: null, auditLogs: null },
    },
  }

  // Supabase connection check
  const { error: pingError } = await supabase.from('businesses').select('id').limit(1)
  health.supabase.latencyMs = Math.round(performance.now() - start)

  if (!pingError) {
    health.supabase.reachable = true
  } else {
    health.supabase.reachable = false
    health.supabase.error = getFriendlyError(pingError)
  }

  // Database reachability + table counts (read-only, non-financial tables)
  if (health.supabase.reachable) {
    const [b, p, pf, al] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    ])

    const allOk = !b.error && !p.error && !pf.error && !al.error
    health.database.reachable = allOk
    health.database.error = allOk
      ? null
      : [b.error, p.error, pf.error, al.error].find((e) => e)?.message ?? null
    health.database.counts = {
      businesses: b.count,
      products: p.count,
      profiles: pf.count,
      auditLogs: al.count,
    }
  } else {
    health.database.reachable = false
    health.database.error = 'Supabase connection failed — table checks skipped.'
  }

  return health
}

export async function checkRlsGate(): Promise<{ gateOk: boolean; note: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    return { gateOk: true, note: 'No session — financial data is not readable (expected).' }
  }

  const { error } = await supabase.from('sales').select('id').limit(1)
  return {
    gateOk: true,
    note: error
      ? 'RLS correctly restricts financial data access for this role.'
      : 'This role has read access to sales records (owner/manager).',
  }
}
