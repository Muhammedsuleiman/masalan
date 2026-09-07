import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle,
  Wallet,
  UserPlus,
  TrendingDown,
  HandCoins,
  ShoppingBag,
  ArrowUpRight,
  ScrollText,
  Clock,
} from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { usePeriodData } from '../hooks/usePeriodData'
import { FilterBar, type FilterState } from '../components/FilterBar'
import { computeStats } from '../services/reportService'
import { fetchAuditLogs } from '../services/financeService'
import type { AuditLog } from '../types'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { formatNaira, formatDateTime } from '../lib/money'
import { useEffect } from 'react'

const QUICK_ACTIONS = [
  { label: 'New sale', desc: 'Record a sale', icon: ShoppingBag, to: '/sales/new', tone: 'bg-brand-100 text-brand-800' },
  { label: 'Record payment', desc: 'Payment against a sale', icon: Wallet, to: '/payments?quick=1', tone: 'bg-gold-100 text-gold-700' },
  { label: 'Add customer', desc: 'Individual or business', icon: UserPlus, to: '/customers?quick=1', tone: 'bg-emerald-100 text-emerald-700' },
  { label: 'Record expense', desc: 'Outgoing business money', icon: TrendingDown, to: '/expenses?quick=1', tone: 'bg-sky-100 text-sky-700' },
]

export default function ManagerDashboardPage() {
  const { businesses } = useBusinesses()
  const [filters, setFilters] = useState<FilterState>({ period: 'today', customFrom: '', customTo: '', businessId: '' })
  const { data, loading, error } = usePeriodData(filters)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    fetchAuditLogs({ limit: 8 })
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]))
  }, [])

  const stats = useMemo(() => (data ? computeStats(data) : null), [data])

  return (
    <div className="animate-fadeUp space-y-6">
<div className="rounded-2xl border border-brand-100/80 bg-gradient-to-r from-brand-50 via-cream-50 to-gold-50 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-brand-950 via-brand-700 to-gold-600 bg-clip-text text-transparent">
              Today's Operations
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Quick overview of today's activity — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
          </div>
          <FilterBar businesses={businesses} filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="group flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-cream-100/70 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className={`shrink-0 rounded-xl p-2.5 ${a.tone}`}>
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-950">{a.label}</p>
              <p className="truncate text-xs text-ink-faint">{a.desc}</p>
            </div>
            <PlusCircle className="ml-auto h-4 w-4 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-brand-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today's sales" value={formatNaira(stats.revenue)} icon={ShoppingBag} tone="brown" variant="colorful" sub={`${stats.salesCount} sale${stats.salesCount === 1 ? '' : 's'}`} />
            <StatCard label="Today's payments" value={formatNaira(stats.paymentsReceived)} icon={ArrowUpRight} tone="gold" variant="colorful" sub={`${stats.paymentsCount} payment${stats.paymentsCount === 1 ? '' : 's'}`} />
            <StatCard label="Today's expenses" value={formatNaira(stats.expensesTotal)} icon={TrendingDown} tone="red" variant="colorful" sub={`${stats.expenseCount} expense${stats.expenseCount === 1 ? '' : 's'}`} />
            <StatCard label="Outstanding credit" value={formatNaira(stats.outstandingCredit)} icon={HandCoins} tone="red" variant="colorful" sub={`${stats.outstandingCreditCount} open sale${stats.outstandingCreditCount === 1 ? '' : 's'}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card padded>
              <CardHeader title="Cash & bank" subtitle="How today's payments came in" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-100 to-cream-100 p-4">
                  <p className="text-xs font-semibold text-emerald-700">Cash received</p>
                  <p className="mt-1 text-xl font-extrabold text-brand-950">{formatNaira(stats.cashReceived)}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-gold-100 to-cream-100 p-4">
                  <p className="text-xs font-semibold text-gold-700">Bank transfers</p>
                  <p className="mt-1 text-xl font-extrabold text-brand-950">{formatNaira(stats.bankReceived)}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-gradient-to-br from-red-100 to-cream-100 p-4">
                <p className="text-xs font-semibold text-red-600">Credit extended today (not fully paid)</p>
                <p className="mt-1 text-xl font-extrabold text-red-700">{formatNaira(stats.creditExtended)}</p>
                <p className="text-xs text-red-600/70">{stats.creditSalesCount} sale{stats.creditSalesCount === 1 ? '' : 's'} on credit/partial</p>
              </div>
            </Card>

            <Card padded>
              <CardHeader
                title="Recent activity"
                subtitle="Latest recorded actions"
                action={
                  <div className="rounded-lg bg-cream-100 p-2 text-brand-700">
                    <ScrollText className="h-4 w-4" />
                  </div>
                }
              />
              {auditLogs.length === 0 ? (
                <EmptyState icon={Clock} title="No activity yet" />
              ) : (
                <ul className="divide-y divide-brand-50">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{humanizeAction(log.action)}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {log.user?.full_name || log.user?.email || 'User'} · {formatDateTime(log.created_at)}
                        </p>
                      </div>
                      <Badge tone={humanizeTone(log.action)}>{log.action.split('.')[0]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/activity" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:text-gold-800">
                View full activity log <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Clock}
          title="No activity today"
          description="Record a sale, payment or expense to see today's figures."
          action={
            <Link to="/sales/new" className="btn-primary">
              <ShoppingBag className="h-4 w-4" /> Record a sale
            </Link>
          }
        />
      )}
    </div>
  )
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    'sale.created': 'Sale recorded',
    'payment.recorded': 'Payment recorded',
    'expense.recorded': 'Expense recorded',
    'customer.created': 'Customer added',
    'customer.updated': 'Customer updated',
    'customer.deleted': 'Customer deleted',
    'product.created': 'Product created',
    'product.updated': 'Product updated',
    'staff.created': 'Staff added',
    'staff.updated': 'Staff updated',
    'staff.deleted': 'Staff deleted',
    'sale.deleted': 'Sale deleted',
    'business.created': 'Business created',
    'business.updated': 'Business updated',
    'user.role_changed': 'User role changed',
    'user.created': 'User created',
    'expense_category.created': 'Expense category added',
    'expense_category.updated': 'Expense category updated',
  }
  return map[action] ?? action.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeTone(action: string): 'green' | 'gold' | 'red' | 'gray' | 'blue' {
  if (action.startsWith('sale.') || action.startsWith('payment.')) return 'green'
  if (action.startsWith('expense.')) return 'red'
  if (action.startsWith('customer.') || action.startsWith('product.') || action.startsWith('business.')) return 'gold'
  if (action.startsWith('expense_category.')) return 'gold'
  if (action.startsWith('user.') || action.startsWith('staff.')) return 'blue'
  return 'gray'
}

export { humanizeAction }
