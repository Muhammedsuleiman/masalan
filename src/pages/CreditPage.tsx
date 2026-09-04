import { useEffect, useMemo, useState } from 'react'
import { HandCoins, Search, Eye } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchCreditSales } from '../services/financeService'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCreditSales({ businessId: businessId || null, search: search || undefined })
      setSales(data)
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

  const totalOutstanding = useMemo(() => sales.reduce((acc, s) => acc + s.amount_outstanding, 0), [sales])
  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE))
  const visible = useMemo(() => sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sales, page])

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Credit"
        subtitle="Sales with unpaid balances — full visibility for the Owner, payments recorded here reduce outstanding."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-red-100 bg-red-50/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Total outstanding</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700">{formatNaira(totalOutstanding)}</p>
        </Card>
        <Card className="border-red-100 bg-cream-100/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Open credit sales</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-950">{sales.length}</p>
        </Card>
        <Card className="border-gold-100 bg-gold-50/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Status</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-800">Credit & Partial</p>
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
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
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
