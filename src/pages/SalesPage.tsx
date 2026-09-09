import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Receipt, Search, Eye, Trash2, CheckCircle2, Download } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchSales, deleteSale } from '../services/financeService'
import type { Sale } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { formatNaira, formatDateTime } from '../lib/money'
import { toCsv, downloadCsv, makeFilename } from '../lib/csv'
import { getDateRange } from '../lib/dates'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { PaymentStatusBadge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SaleDetailModal } from '../components/sales/SaleDetailModal'

const PAGE_SIZE = 12
const PERIOD_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

export default function SalesPage() {
  const { profile } = useAuth()
  const { businesses } = useBusinesses()
  const [searchParams] = useSearchParams()

  const [businessId, setBusinessId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('')

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [showCreated, setShowCreated] = useState(Boolean(searchParams.get('created')))

  const [detailSaleId, setDetailSaleId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isOwner = profile?.role === 'owner'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const range = getDateRangeForPeriod()
      const data = await fetchSales({
        from: range?.from,
        to: range?.to,
        businessId: businessId || null,
        status: status || undefined,
        search: search || undefined,
      })
      setSales(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function getDateRangeForPeriod() {
    if (!period) return null
    const r = getDateRange(period as 'today' | 'week' | 'month')
    return { from: r.from, to: r.to }
  }

  useEffect(() => {
    setPage(1)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, status, search, period])

  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE))
  const visible = useMemo(() => sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sales, page])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: err } = await deleteSale(deleteTarget.id)
    setDeleting(false)
    if (err) {
      setError(err)
    } else {
      setDeleteTarget(null)
      void load()
    }
  }

  const exportCsv = () => {
    const csv = toCsv(
      ['Date', 'Customer', 'Business', 'Total', 'Paid', 'Outstanding', 'Status', 'Recorded by'],
      sales.map((s) => [
        formatDateTime(s.sale_date),
        s.customer?.name ?? '',
        s.business?.name ?? '',
        formatNaira(s.total_amount),
        formatNaira(s.amount_paid),
        formatNaira(s.amount_outstanding),
        s.payment_status,
        s.creator?.full_name ?? '',
      ]),
    )
    downloadCsv(makeFilename('masalan-sales'), csv)
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Sales"
        subtitle="All recorded sales, with full payment status across your businesses."
        actions={
          <>
            <button type="button" className="btn-outline" onClick={exportCsv} disabled={sales.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <Link to="/sales/new" className="btn-primary">
              <Plus className="h-4 w-4" /> New sale
            </Link>
          </>
        }
      />

      {showCreated && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Sale recorded successfully.
          </span>
          <button className="ml-auto text-xs underline" onClick={() => setShowCreated(false)}>
            Dismiss
          </button>
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center dark:border-brand-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint dark:text-cream-400/50" />
            <input
              className="input pl-10"
              placeholder="Search by customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input !w-auto" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">All businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="credit">Credit</option>
          </select>
          <select className="input !w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600 dark:text-gold-300">
            <Spinner className="h-6 w-6" />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales found"
            description="Try adjusting your filters, or record your first sale."
            action={
              <Link to="/sales/new" className="btn-primary">
                <Plus className="h-4 w-4" /> New sale
              </Link>
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Business</th>
                    <th>Date</th>
                    <th className="!text-right">Total</th>
                    <th className="!text-right">Outstanding</th>
                    <th>Status</th>
                    <th>Recorded by</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-semibold text-ink dark:text-cream-100">{sale.customer?.name ?? '—'}</td>
                      <td className="text-ink-soft dark:text-cream-300">{sale.business?.name ?? '—'}</td>
                      <td className="whitespace-nowrap text-ink-soft dark:text-cream-300">{formatDateTime(sale.sale_date)}</td>
                      <td className="!text-right font-semibold">{formatNaira(sale.total_amount)}</td>
                      <td className="!text-right">
                        {sale.amount_outstanding > 0 ? (
                          <span className="font-semibold text-red-600 dark:text-red-400">{formatNaira(sale.amount_outstanding)}</span>
                        ) : (
                          <span className="text-ink-faint dark:text-cream-400/70">—</span>
                        )}
                      </td>
                      <td><PaymentStatusBadge status={sale.payment_status} /></td>
                      <td className="text-ink-soft dark:text-cream-300">{sale.creator?.full_name || '—'}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailSaleId(sale.id)}
                            className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50 dark:text-cream-300 dark:hover:bg-white/10"
                            aria-label="View sale"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(sale)}
                              className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:text-cream-400/70 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                              aria-label="Delete sale"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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
        canRecordPayment={Boolean(profile)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete sale"
        message={`Delete the sale to ${deleteTarget?.customer?.name ?? 'this customer'} of ${deleteTarget ? formatNaira(deleteTarget.total_amount) : ''}? This also removes its payment records and audit entry cannot be undone by normal users.`}
        confirmLabel="Delete sale"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
