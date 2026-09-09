import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  HandCoins,
  TrendingDown,
  Scale,
  Receipt,
  Banknote,
  Layers,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { usePeriodData } from '../hooks/usePeriodData'
import { DEFAULT_FILTERS, FilterBar, type FilterState } from '../components/FilterBar'
import {
  computeStats,
  buildDaySeries,
  buildBusinessComparison,
  fetchOutstandingByBusiness,
  fetchLifetimeNetPosition,
  type PeriodData,
} from '../services/reportService'
import { fetchStockSummary } from '../services/dataService'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { PaymentStatusBadge } from '../components/ui/Badge'
import { RevenueTrendChart } from '../components/charts/RevenueTrendChart'
import { PaymentMethodChart } from '../components/charts/PaymentMethodChart'
import { BusinessComparisonChart } from '../components/charts/BusinessComparisonChart'
import { formatNaira, formatQuantity, formatDateTime } from '../lib/money'
import type { InventoryStock } from '../types'

function businessTotals(data: PeriodData | null, businessId: string, outstanding: number) {
  if (!data) return null
  const sales = data.sales.filter((s) => s.business_id === businessId)
  const payments = data.payments.filter((p) => (p as unknown as { sale?: { business_id?: string } }).sale?.business_id === businessId)
  const expenses = data.expenses.filter((e) => e.business_id === businessId)
  const items = data.items.filter((i) => i.product?.business_id === businessId)
  const sub: PeriodData = { sales, payments, expenses, items, outstandingCredit: outstanding, outstandingCreditCount: 0 }
  return computeStats(sub)
}

export default function OwnerDashboardPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const { businesses } = useBusinesses()
  const { data, loading, error } = usePeriodData(filters)
  const [outstandingByBiz, setOutstandingByBiz] = useState<Map<string, { total: number; count: number }>>(new Map())
  const [lifetimeNet, setLifetimeNet] = useState<number | null>(null)
  const [lowStock, setLowStock] = useState<InventoryStock[]>([])

  useEffect(() => {
    void fetchOutstandingByBusiness().then(setOutstandingByBiz)
    void fetchLifetimeNetPosition().then(setLifetimeNet).catch(() => setLifetimeNet(null))
    void fetchStockSummary().then((rows) => setLowStock(rows.filter((r) => r.reorder_level > 0 && r.available <= r.reorder_level))).catch(() => setLowStock([]))
  }, [])

  const stats = useMemo(() => (data ? computeStats(data) : null), [data])

  const names = useMemo(() => new Map(businesses.map((b) => [b.id, b.name])), [businesses])
  const daySeries = useMemo(() => (data ? buildDaySeries(data.sales, data.payments, data.expenses) : []), [data])
  const comparison = useMemo(() => (data ? buildBusinessComparison(names, data.sales, data.payments, data.expenses) : []), [data, names])
  const methodData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Cash', value: stats.cashReceived },
      { name: 'Bank transfer', value: stats.bankReceived },
    ]
  }, [stats])

  const recentSales = useMemo(
    () => [...(data?.sales ?? [])].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 5),
    [data],
  )
  const recentPayments = useMemo(
    () => [...(data?.payments ?? [])].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 5),
    [data],
  )
  const recentExpenses = useMemo(
    () => [...(data?.expenses ?? [])].sort((a, b) => b.expense_date.localeCompare(a.expense_date)).slice(0, 5),
    [data],
  )

  const isAll = !filters.businessId

  return (
    <div className="animate-fadeUp space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400 bg-clip-text text-transparent">
              Business Overview
            </h1>
            <p className="mt-1 text-sm text-cream-200/80">
              {isAll
                ? `Combined performance across ${businesses.map((b) => b.name).join(' and ') || 'all businesses'}.`
                : names.get(filters.businessId) ?? 'Selected business'}
            </p>
          </div>
          <FilterBar businesses={businesses} filters={filters} onChange={setFilters} />
        </div>
      </div>

      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-gold-400">
          <Spinner className="h-6 w-6" />
        </div>
      ) : stats ? (
        <>
          {/* Overall metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total sales" value={formatNaira(stats.revenue)} icon={Receipt} tone="brown" variant="colorful" sub={`${stats.salesCount} sale${stats.salesCount === 1 ? '' : 's'}`} />
            <StatCard label="Payments received" value={formatNaira(stats.paymentsReceived)} icon={Wallet} tone="gold" variant="colorful" sub={`${stats.paymentsCount} payment${stats.paymentsCount === 1 ? '' : 's'}`} />
            <StatCard label="Outstanding credit" value={formatNaira(stats.outstandingCredit)} icon={HandCoins} tone="red" variant="colorful" sub={`${stats.outstandingCreditCount} open sale${stats.outstandingCreditCount === 1 ? '' : 's'}`} />
            <StatCard label="Expenses" value={formatNaira(stats.expensesTotal)} icon={TrendingDown} tone="blue" variant="colorful" sub={`${stats.expenseCount} expense${stats.expenseCount === 1 ? '' : 's'}`} />
            <StatCard label="Net position" value={formatNaira(stats.netPosition)} icon={Scale} tone="green" variant="colorful" sub="Payments received − expenses" />
            <StatCard label="Total net position" value={formatNaira(lifetimeNet ?? 0)} icon={Scale} tone="cream" variant="colorful" sub="All-time payments received − expenses" />
            <StatCard label="Cash received" value={formatNaira(stats.cashReceived)} icon={Banknote} tone="green" variant="colorful" />
            <StatCard label="Bank transfers" value={formatNaira(stats.bankReceived)} icon={Layers} tone="gold" variant="colorful" />
            <StatCard label="Credit sales" value={formatNaira(stats.creditExtended)} icon={HandCoins} tone="red" variant="colorful" sub={`${stats.creditSalesCount} not fully paid`} />
          </div>

          {/* Low-stock alert */}
          {lowStock.length > 0 && (
            <Card className="border-red-400/20 bg-gradient-to-br from-red-950/70 to-brand-950/80 [&_h3]:text-red-100 [&_p]:text-red-200/70">
              <CardHeader
                title="Low-stock alert"
                subtitle={`${lowStock.length} product${lowStock.length === 1 ? '' : 's'} at or below reorder level`}
                action={<AlertTriangle className="h-5 w-5 text-red-400" />}
              />
              <ul className="divide-y divide-white/10">
                {lowStock.map((r) => (
                  <li key={r.product_id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream-50">{r.name}</p>
                      <p className="text-xs text-cream-200/60">{names.get(r.business_id) ?? r.business_id} · {r.unit}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-300">{formatQuantity(r.available)}</span>
                      <span className="text-xs text-cream-200/60"> remaining</span>
                      {r.reorder_level > 0 && <p className="text-[11px] text-cream-200/60">reorder at {formatQuantity(r.reorder_level)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Business breakdown */}
          {isAll && businesses.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {businesses.map((b) => {
                const bizStats = businessTotals(data, b.id, outstandingByBiz.get(b.id)?.total ?? 0)
                if (!bizStats) return null
                return (
                  <Card key={b.id}>
                    <CardHeader title={b.name} subtitle={b.description ?? 'Business operation'} />
                    <div className="grid grid-cols-2 gap-3">
                      <MiniMetric tone="brown" label="Revenue" value={formatNaira(bizStats.revenue)} />
                      <MiniMetric tone="blue" label="Units sold" value={formatQuantity(sumQty(bizStats))} />
                      <MiniMetric tone="green" label="Cash received" value={formatNaira(bizStats.cashReceived)} />
                      <MiniMetric tone="gold" label="Bank transfers" value={formatNaira(bizStats.bankReceived)} />
                      <MiniMetric tone="red" label="Credit (not fully paid)" value={formatNaira(bizStats.creditExtended)} sub={`${bizStats.creditSalesCount} sales`} />
                      <MiniMetric tone="amber" label="Partial payments" value={String(bizStats.partialSalesCount)} sub="sales" />
                      <MiniMetric tone="blue" label="Expenses" value={formatNaira(bizStats.expensesTotal)} />
                      <MiniMetric tone="red" label="Outstanding amount" value={formatNaira(bizStats.outstandingCredit)} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" padded>
              <CardHeader title="Revenue trend" subtitle="Sales, payments and expenses over the selected period" />
              <RevenueTrendChart data={daySeries} />
            </Card>
            <Card padded>
              <CardHeader title="Payment methods" subtitle="Cash vs bank transfer" />
              <PaymentMethodChart data={methodData} />
            </Card>
          </div>

          {isAll && comparison.length > 1 && (
            <Card padded>
              <CardHeader title="Business comparison" subtitle="How each business is performing" />
              <BusinessComparisonChart data={comparison} />
            </Card>
          )}

          {/* Recent transactions */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RecentCard
              title="Recent sales"
              icon={ShoppingBag}
              empty="No sales in this period yet."
              rows={recentSales.map((s) => ({
                key: s.id,
                title: s.customer?.name ?? 'Customer',
                detail: names.get(s.business_id) ?? '',
                right: <span className="font-semibold text-brand-950 dark:text-cream-50">{formatNaira(s.total_amount)}</span>,
                badge: <PaymentStatusBadge status={s.payment_status} />,
                time: formatDateTime(s.sale_date),
              }))}
            />
            <RecentCard
              title="Recent payments"
              icon={ArrowUpRight}
              empty="No payments recorded in this period."
              rows={recentPayments.map((p) => ({
                key: p.id,
                title: p.payment_method === 'cash' ? 'Cash payment' : 'Bank transfer',
                detail: p.sale?.customer?.name ?? 'Sale payment',
                right: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatNaira(p.amount)}</span>,
                time: formatDateTime(p.payment_date),
              }))}
            />
            <RecentCard
              title="Recent expenses"
              icon={TrendingDown}
              empty="No expenses recorded in this period."
              rows={recentExpenses.map((e) => ({
                key: e.id,
                title: e.category,
                detail: e.description,
                right: <span className="font-semibold text-red-600 dark:text-red-400">−{formatNaira(e.amount)}</span>,
                time: formatDateTime(e.expense_date),
              }))}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={Clock}
          title="No data yet"
          description="Once sales, payments and expenses are recorded, the dashboard will populate here."
        />
      )}
    </div>
  )
}

type MiniTone = 'brown' | 'gold' | 'green' | 'red' | 'blue' | 'amber'
const miniTones: Record<MiniTone, string> = {
  brown: 'border-white/10 bg-gradient-to-br from-brand-800/80 to-brand-950/70',
  gold: 'border-gold-400/20 bg-gradient-to-br from-gold-800/50 to-brand-950/70',
  green: 'border-emerald-400/20 bg-gradient-to-br from-emerald-800/50 to-brand-950/70',
  red: 'border-red-400/20 bg-gradient-to-br from-red-900/50 to-brand-950/70',
  blue: 'border-sky-800/50 bg-gradient-to-br from-sky-900/50 to-brand-950/70',
  amber: 'border-amber-400/20 bg-gradient-to-br from-amber-800/50 to-brand-950/70',
}

const miniLabels: Record<MiniTone, string> = {
  brown: 'text-gold-300',
  gold: 'text-gold-300',
  green: 'text-emerald-300',
  red: 'text-red-300',
  blue: 'text-sky-300',
  amber: 'text-amber-300',
}

function MiniMetric({ label, value, sub, tone = 'brown' }: { label: string; value?: string | number | null; sub?: string; tone?: MiniTone }) {
  return (
    <div className={`rounded-xl border p-3 ${miniTones[tone]}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${miniLabels[tone]}`}>{label}</p>
      <p className={`mt-0.5 text-base font-extrabold ${tone === 'red' ? 'text-red-300' : 'text-cream-50'}`}>
        {value ?? '₦0.00'}
      </p>
      {sub && <p className="text-[11px] text-cream-200/60">{sub}</p>}
    </div>
  )
}

function sumQty(stats: ReturnType<typeof computeStats> | null): number {
  if (!stats) return 0
  return Object.values(stats.productQuantities).reduce((acc, v) => acc + v.quantity, 0)
}

interface RecentRow {
  key: string
  title: string
  detail: string
  right: React.ReactNode
  badge?: React.ReactNode
  time: string
}

function RecentCard({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string
  icon: typeof ShoppingBag
  rows: RecentRow[]
  empty: string
}) {
  return (
    <Card padded>
      <CardHeader
        title={title}
        action={
          <div className="rounded-lg bg-cream-100 p-2 text-brand-700 dark:bg-brand-800 dark:text-gold-300">
            <Icon className="h-4 w-4" />
          </div>
        }
      />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint dark:text-cream-400/70">{empty}</p>
      ) : (
        <ul className="divide-y divide-brand-50 dark:divide-brand-800">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink dark:text-cream-100">{r.title}</p>
                  {r.badge}
                </div>
                <p className="truncate text-xs text-ink-faint dark:text-cream-400/70">{r.detail} · {r.time}</p>
              </div>
              <div className="shrink-0 text-right">{r.right}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
