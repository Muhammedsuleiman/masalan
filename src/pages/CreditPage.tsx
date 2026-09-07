import { useEffect, useMemo, useState } from 'react'
import { HandCoins, Search, Eye } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchCreditSales, fetchCustomerCreditSummaries, type CustomerCreditSummary } from '../services/financeService'
import type { Sale } from '../types'
import { formatNaira, formatDate } from '../lib/money'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { PaymentStatusBadge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { SaleDetailModal } from '../components/sales/SaleDetailModal'

const PAGE_SIZE = 12

export default function CreditPage() {
  const { businesses } = useBusinesses()
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [customerSummaries, setCustomerSummaries] = useState<CustomerCreditSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'customers' | 'sales'>('customers')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCreditSales({ businessId: businessId || null, search: search || undefined })
      setSales(data)
      const summaries = await fetchCustomerCreditSummaries(search || undefined)
      setCustomerSummaries(summaries)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, search])

  const totalOutstanding = useMemo(
    () => customerSummaries.reduce((acc, c) => acc + c.total_outstanding, 0),
    [customerSummaries],
  )
  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE))
  const visible = useMemo(() => sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sales, page])
  const customersPageCount = Math.max(1, Math.ceil(customerSummaries.length / PAGE_SIZE))
  const visibleCustomers = useMemo(
    () => customerSummaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [customerSummaries, page],
  )

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Credit & Debts"
        subtitle="Unpaid balances by customer — payments recorded here reduce outstanding automatically."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-red-400/20 bg-gradient-to-br from-red-950/70 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Total outstanding</p>
          <p className="mt-1 text-2xl font-extrabold text-red-300">{formatNaira(totalOutstanding)}</p>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-brand-800/90 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-300">Customers owing</p>
          <p className="mt-1 text-2xl font-extrabold text-cream-50">{customerSummaries.length}</p>
        </Card>
        <Card className="border-gold-400/20 bg-gradient-to-br from-gold-800/50 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-300">Open credit sales</p>
          <p className="mt-1 text-2xl font-extrabold text-cream-50">{sales.length}</p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search by customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">All businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-brand-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('customers')}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'customers' ? 'bg-brand-900 text-cream-50' : 'bg-white text-ink-soft hover:bg-cream-100'}`}
            >
              By customer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sales')}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === 'sales' ? 'bg-brand-900 text-cream-50' : 'bg-white text-ink-soft hover:bg-cream-100'}`}
            >
              By sale
            </button>
          </div>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : viewMode === 'customers' ? (
          customerSummaries.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="No outstanding credit"
              description="All customers have fully paid. When credit sales are made, they will appear here."
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th className="!text-right">Open sales</th>
                      <th className="!text-right">Total owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCustomers.map((c) => (
                      <tr key={c.customer_id}>
                        <td className="font-semibold text-ink">{c.customer_name}</td>
                        <td className="text-ink-soft">{c.customer_phone || '—'}</td>
                        <td className="!text-right text-ink-soft">{c.open_sale_count}</td>
                        <td className="!text-right font-bold text-red-600">{formatNaira(c.total_outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageCount={customersPageCount} total={customerSummaries.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          )
        ) : sales.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="No outstanding credit"
            description="All sales are fully paid. When credit sales are made, they will appear here."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Business</th>
                    <th>Sale date</th>
                    <th className="!text-right">Original amount</th>
                    <th className="!text-right">Paid</th>
                    <th className="!text-right">Outstanding</th>
                    <th>Status</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-semibold text-ink">{sale.customer?.name ?? '—'}</td>
                      <td className="text-ink-soft">{sale.business?.name ?? '—'}</td>
                      <td className="whitespace-nowrap text-ink-soft">{formatDate(sale.sale_date)}</td>
                      <td className="!text-right font-semibold">{formatNaira(sale.total_amount)}</td>
                      <td className="!text-right text-emerald-700">{formatNaira(sale.amount_paid)}</td>
                      <td className="!text-right font-bold text-red-600">{formatNaira(sale.amount_outstanding)}</td>
                      <td><PaymentStatusBadge status={sale.payment_status} /></td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailSaleId(sale.id)}
                            className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50"
                            aria-label="View credit sale"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={sales.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <SaleDetailModal
        open={Boolean(detailSaleId)}
        saleId={detailSaleId}
        onClose={() => setDetailSaleId(null)}
        onChanged={() => void load()}
      />
    </div>
  )
}
