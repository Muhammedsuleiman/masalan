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
} from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { usePeriodData } from '../hooks/usePeriodData'
import { DEFAULT_FILTERS, FilterBar, type FilterState } from '../components/FilterBar'
import {
  computeStats,
  buildDaySeries,
  buildBusinessComparison,
  fetchOutstandingByBusiness,
  type PeriodData,
} from '../services/reportService'
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

  useEffect(() => {
    void fetchOutstandingByBusiness().then(setOutstandingByBiz)
  }, [])

  const stats = useMemo(() => (data ? computeStats(data) : null), [data])

  const bakery = businesses.find((b) => b.name.toLowerCase().includes('bakery'))
  const water = businesses.find((b) => b.name.toLowerCase().includes('water'))

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

  const bakeryStats = bakery ? businessTotals(data, bakery.id, outstandingByBiz.get(bakery.id)?.total ?? 0) : null
  const waterStats = water ? businessTotals(data, water.id, outstandingByBiz.get(water.id)?.total ?? 0) : null

  const isAll = !filters.businessId

  return (
    <div className="animate-fadeUp space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950">Business Overview</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isAll
              ? 'Combined performance across Masalan Bakery Limited and Masalan Water Factory.'
              : names.get(filters.businessId) ?? 'Selected business'}
          </p>
        </div>
        <FilterBar businesses={businesses} filters={filters} onChange={setFilters} />
      </div>

      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-brand-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : stats ? (
        <>
          {/* Overall metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total sales" value={formatNaira(stats.revenue)} icon={Receipt} tone="brown" sub={`${stats.salesCount} sale${stats.salesCount === 1 ? '' : 's'}`} />
            <StatCard label="Payments received" value={formatNaira(stats.paymentsReceived)} icon={Wallet} tone="gold" sub={`${stats.paymentsCount} payment${stats.paymentsCount === 1 ? '' : 's'}`} />
            <StatCard label="Outstanding credit" value={formatNaira(stats.outstandingCredit)} icon={HandCoins} tone="red" sub={`${stats.outstandingCreditCount} open sale${stats.outstandingCreditCount === 1 ? '' : 's'}`} />
            <StatCard label="Expenses" value={formatNaira(stats.expensesTotal)} icon={TrendingDown} tone="blue" sub={`${stats.expenseCount} expense${stats.expenseCount === 1 ? '' : 's'}`} />
            <StatCard label="Net position" value={formatNaira(stats.netPosition)} icon={Scale} tone="green" sub="Payments received − expenses" />
            <StatCard label="Cash received" value={formatNaira(stats.cashReceived)} icon={Banknote} tone="green" />
            <StatCard label="Bank transfers" value={formatNaira(stats.bankReceived)} icon={Layers} tone="gold" />
            <StatCard label="Credit sales" value={formatNaira(stats.creditExtended)} icon={HandCoins} tone="red" sub={`${stats.creditSalesCount} not fully paid`} />
          </div>

          {/* Business breakdown */}
          {isAll && bakery && water && (bakeryStats || waterStats) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Masalan Bakery Limited" subtitle="Masalan Bread — revenue & activity" />
                <div className="grid grid-cols-2 gap-3">
                  <MiniMetric label="Revenue" value={formatNaira(bakeryStats?.revenue)} />
                  <MiniMetric label="Bread quantity sold" value={formatQuantity(sumQty(bakeryStats))} sub="loaves" />
                  <MiniMetric label="Cash received" value={formatNaira(bakeryStats?.cashReceived)} />
                  <MiniMetric label="Bank transfers" value={formatNaira(bakeryStats?.bankReceived)} />
                  <MiniMetric label="Credit (not fully paid)" value={formatNaira(bakeryStats?.creditExtended)} sub={`${bakeryStats?.creditSalesCount ?? 0} sales`} />
                  <MiniMetric label="Partial payments" value={String(bakeryStats?.partialSalesCount ?? 0)} sub="sales" />
                  <MiniMetric label="Expenses" value={formatNaira(bakeryStats?.expensesTotal)} />
                  <MiniMetric label="Outstanding amount" value={formatNaira(bakeryStats?.outstandingCredit)} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Masalan Water Factory" subtitle="Pure Water — revenue & activity" />
                <div className="grid grid-cols-2 gap-3">
                  <MiniMetric label="Revenue" value={formatNaira(waterStats?.revenue)} />
                  <MiniMetric label="Bags sold" value={formatQuantity(sumQty(waterStats))} sub="bags" />
                  <MiniMetric label="Cash received" value={formatNaira(waterStats?.cashReceived)} />
                  <MiniMetric label="Bank transfers" value={formatNaira(waterStats?.bankReceived)} />
                  <MiniMetric label="Credit (not fully paid)" value={formatNaira(waterStats?.creditExtended)} sub={`${waterStats?.creditSalesCount ?? 0} sales`} />
                  <MiniMetric label="Partial payments" value={String(waterStats?.partialSalesCount ?? 0)} sub="sales" />
                  <MiniMetric label="Expenses" value={formatNaira(waterStats?.expensesTotal)} />
                  <MiniMetric label="Outstanding amount" value={formatNaira(waterStats?.outstandingCredit)} />
                </div>
              </Card>
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
              <CardHeader title="Business comparison" subtitle="How the two businesses are performing" />
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
                right: <span className="font-semibold text-brand-950">{formatNaira(s.total_amount)}</span>,
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
                right: <span className="font-semibold text-emerald-700">{formatNaira(p.amount)}</span>,
                badge: <PaymentStatusBadge status="paid" />,
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
                right: <span className="font-semibold text-red-600">−{formatNaira(e.amount)}</span>,
                badge: <PaymentStatusBadge status="paid" />,
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

function MiniMetric({ label, value, sub }: { label: string; value?: string | number | null; sub?: string }) {
  return (
    <div className="rounded-xl bg-cream-100/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-brand-950">
        {value ?? '₦0.00'}
      </p>
      {sub && <p className="text-[11px] text-ink-faint">{sub}</p>}
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
  badge: React.ReactNode
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
          <div className="rounded-lg bg-cream-100 p-2 text-brand-700">
            <Icon className="h-4 w-4" />
          </div>
        }
      />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-brand-50">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                  {r.badge}
                </div>
                <p className="truncate text-xs text-ink-faint">{r.detail} · {r.time}</p>
              </div>
              <div className="shrink-0 text-right">{r.right}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
