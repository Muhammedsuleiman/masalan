import { useMemo, useState } from 'react'
import { BarChart3, Download, Printer, Receipt, ArrowUpRight, TrendingDown, HandCoins, Scale, Package, Wallet } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { usePeriodData } from '../hooks/usePeriodData'
import { FilterBar, DEFAULT_FILTERS, type FilterState } from '../components/FilterBar'
import { computeStats, buildDaySeries, buildBusinessComparison } from '../services/reportService'
import { formatNaira, formatDateTime } from '../lib/money'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { StatCard } from '../components/ui/StatCard'
import { PaymentStatusBadge } from '../components/ui/Badge'
import { RevenueTrendChart } from '../components/charts/RevenueTrendChart'
import { PaymentMethodChart } from '../components/charts/PaymentMethodChart'
import { BusinessComparisonChart } from '../components/charts/BusinessComparisonChart'
import { Button } from '../components/ui/Button'

export default function ReportsPage() {
  const { businesses } = useBusinesses()
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const { data, loading, error } = usePeriodData(filters)

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

  const salesSorted = useMemo(
    () => [...(data?.sales ?? [])].sort((a, b) => b.sale_date.localeCompare(a.sale_date)),
    [data],
  )

  const downloadCsv = () => {
    if (!data || !stats) return
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }

    const lines: string[] = []
    lines.push('MASALAN BUSINESS ENTERPRISE — BUSINESS REPORT')
    lines.push(`Period,${esc(filters.period)}`)
    lines.push(`Business,${esc(filters.businessId ? (names.get(filters.businessId) ?? '') : 'All businesses')}`)
    lines.push(`Generated,${esc(new Date().toLocaleString('en-GB'))}`)
    lines.push('')
    lines.push('SUMMARY')
    lines.push('Metric,Value')
    lines.push(`Total sales,${esc(formatNaira(stats.revenue))}`)
    lines.push(`Number of sales,${stats.salesCount}`)
    lines.push(`Payments received,${esc(formatNaira(stats.paymentsReceived))}`)
    lines.push(`Number of payments,${stats.paymentsCount}`)
    lines.push(`Cash received,${esc(formatNaira(stats.cashReceived))}`)
    lines.push(`Bank transfers,${esc(formatNaira(stats.bankReceived))}`)
    lines.push(`Credit sales (not fully paid),${esc(formatNaira(stats.creditExtended))}`)
    lines.push(`Partial payment sales,${stats.partialSalesCount}`)
    lines.push(`Outstanding balance,${esc(formatNaira(stats.outstandingCredit))}`)
    lines.push(`Expenses,${esc(formatNaira(stats.expensesTotal))}`)
    lines.push(`Number of expenses,${stats.expenseCount}`)
    lines.push(`Net position,${esc(formatNaira(stats.netPosition))}`)
    lines.push('')

    lines.push('SALES')
    lines.push('Date,Customer,Business,Total,Paid,Outstanding,Status')
    for (const s of data.sales) {
      lines.push(
        `${esc(formatDateTime(s.sale_date))},${esc(s.customer?.name)},${esc(names.get(s.business_id) ?? '')},${esc(formatNaira(s.total_amount))},${esc(formatNaira(s.amount_paid))},${esc(formatNaira(s.amount_outstanding))},${esc(s.payment_status)}`,
      )
    }
    lines.push('')

    lines.push('PAYMENTS')
    lines.push('Date,Customer,Amount,Method')
    for (const p of data.payments) {
      lines.push(`${esc(formatDateTime(p.payment_date))},${esc((p.sale as unknown as { customer?: { name?: string } })?.customer?.name ?? '')},${esc(formatNaira(p.amount))},${esc(p.payment_method)}`)
    }
    lines.push('')

    lines.push('EXPENSES')
    lines.push('Date,Business,Category,Description,Amount')
    for (const e of data.expenses) {
      lines.push(`${esc(formatDateTime(e.expense_date))},${esc(names.get(e.business_id) ?? '')},${esc(e.category)},${esc(e.description)},${esc(formatNaira(e.amount))}`)
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masalan-report-${filters.period}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <div className="no-print">
        <PageHeader
          title="Reports"
          subtitle="Filter by business and date range, then view, print or export."
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()} disabled={!data}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="gold" onClick={downloadCsv} disabled={!data}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </>
          }
        />

        <FilterBar businesses={businesses} filters={filters} onChange={setFilters} className="mb-6" />

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      </div>

      <div className="print-block">
        {loading && !data ? (
          <div className="flex items-center justify-center py-24 text-brand-600 no-print">
            <Spinner className="h-6 w-6" />
          </div>
        ) : stats && data ? (
          <div className="space-y-6">
            <div className="hidden print-block">
              <h1 className="font-display text-xl font-bold text-brand-950">Masalan Business Enterprise — Report</h1>
              <p className="text-sm">
                {filters.period === 'custom' ? `${filters.customFrom} to ${filters.customTo}` : filters.period} ·{' '}
                {filters.businessId ? names.get(filters.businessId) : 'All businesses'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total sales" value={formatNaira(stats.revenue)} icon={Receipt} tone="brown" sub={`${stats.salesCount} sales`} />
              <StatCard label="Payments received" value={formatNaira(stats.paymentsReceived)} icon={ArrowUpRight} tone="gold" sub={`${stats.paymentsCount} payments`} />
              <StatCard label="Expenses" value={formatNaira(stats.expensesTotal)} icon={TrendingDown} tone="red" sub={`${stats.expenseCount} entries`} />
              <StatCard label="Net position" value={formatNaira(stats.netPosition)} icon={Scale} tone="green" sub="Payments − expenses" />
              <StatCard label="Cash" value={formatNaira(stats.cashReceived)} icon={Wallet} tone="green" />
              <StatCard label="Bank transfers" value={formatNaira(stats.bankReceived)} icon={Wallet} tone="gold" />
              <StatCard label="Credit sales" value={formatNaira(stats.creditExtended)} icon={HandCoins} tone="red" sub={`${stats.creditSalesCount} sales`} />
              <StatCard label="Outstanding balance" value={formatNaira(stats.outstandingCredit)} icon={HandCoins} tone="red" sub={`${stats.outstandingCreditCount} sales`} />
            </div>

            {Object.keys(stats.productQuantities).length > 0 && (
              <Card>
                <CardHeader title="Product quantities" subtitle="Units sold in this period" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(stats.productQuantities).map(([name, v]) => (
                    <div key={name} className="flex items-center gap-3 rounded-xl bg-cream-100/70 p-4">
                      <div className="rounded-xl bg-brand-100 p-2.5 text-brand-800">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-950">{name}</p>
                        <p className="text-xs text-ink-faint">
                          {Number.isInteger(v.quantity) ? v.quantity : v.quantity.toFixed(2)} {v.unit}s
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2" padded>
                <CardHeader title="Revenue trend" subtitle="Sales, payments and expenses over time" />
                <RevenueTrendChart data={daySeries} />
              </Card>
              <Card padded>
                <CardHeader title="Payment methods" subtitle="Cash vs bank transfer" />
                <PaymentMethodChart data={methodData} />
              </Card>
            </div>

            {comparison.length > 1 && (
              <Card padded>
                <CardHeader title="Business comparison" subtitle="Bakery vs Water Factory" />
                <BusinessComparisonChart data={comparison} />
              </Card>
            )}

            <Card padded={false}>
              <CardHeader title={`Sales detail (${data.sales.length})`} subtitle="Transactions in the selected range" />
              {data.sales.length === 0 ? (
                <EmptyState icon={Receipt} title="No sales in this range" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Business</th>
                        <th className="!text-right">Total</th>
                        <th className="!text-right">Paid</th>
                        <th className="!text-right">Outstanding</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesSorted.slice(0, 100).map((s) => (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap text-ink-soft">{formatDateTime(s.sale_date)}</td>
                          <td className="font-semibold text-ink">{s.customer?.name ?? '—'}</td>
                          <td className="text-ink-soft">{names.get(s.business_id) ?? '—'}</td>
                          <td className="!text-right font-semibold">{formatNaira(s.total_amount)}</td>
                          <td className="!text-right text-emerald-700">{formatNaira(s.amount_paid)}</td>
                          <td className="!text-right text-red-600">{formatNaira(s.amount_outstanding)}</td>
                          <td><PaymentStatusBadge status={s.payment_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="No report data" description="Adjust the filters to build a report." />
        )}
      </div>
    </div>
  )
}
