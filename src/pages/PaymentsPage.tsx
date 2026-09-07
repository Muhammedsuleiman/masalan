import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Wallet, Search, CheckCircle2, Download } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchPayments, recordPayment, fetchCreditSales } from '../services/financeService'
import type { Payment, PaymentMethod, Sale } from '../types'
import { formatNaira, formatDateTime, parseAmount } from '../lib/money'
import { todayInputValue } from '../lib/dates'
import { toCsv, downloadCsv, makeFilename } from '../lib/csv'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'

const PAGE_SIZE = 12

export default function PaymentsPage() {
  const { businesses } = useBusinesses()
  const [searchParams, setSearchParams] = useSearchParams()

  const [businessId, setBusinessId] = useState('')
  const [method, setMethod] = useState('')
  const [search, setSearch] = useState('')

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(Boolean(searchParams.get('quick')))
  const [creditSales, setCreditSales] = useState<Sale[]>([])
  const [selectedSaleId, setSelectedSaleId] = useState('')
  const [amount, setAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payDate, setPayDate] = useState(todayInputValue())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPayments({
        businessId: businessId || null,
        method: method || undefined,
      })
      const filtered = search.trim()
        ? data.filter(
            (p) =>
              p.sale?.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
              p.notes?.toLowerCase().includes(search.toLowerCase()),
          )
        : data
      setPayments(filtered)
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
  }, [businessId, method, search])

  useEffect(() => {
    if (modalOpen) {
      void fetchCreditSales({}).then(setCreditSales).catch(() => setCreditSales([]))
    }
  }, [modalOpen])

  const selectedSale = creditSales.find((s) => s.id === selectedSaleId)
  const pageCount = Math.max(1, Math.ceil(payments.length / PAGE_SIZE))
  const visible = useMemo(() => payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [payments, page])

  const exportCsv = () => {
    const csv = toCsv(
      ['Date', 'Customer', 'Business', 'Amount', 'Method', 'Recorded by', 'Notes'],
      payments.map((p) => [
        formatDateTime(p.payment_date),
        p.sale?.customer?.name ?? '',
        p.sale?.business?.name ?? '',
        formatNaira(p.amount),
        p.payment_method === 'cash' ? 'Cash' : 'Bank transfer',
        p.recorder?.full_name ?? '',
        p.notes ?? '',
      ]),
    )
    downloadCsv(makeFilename('masalan-payments'), csv)
  }

  const openModal = () => {
    setError(null)
    setAmount('')
    setNotes('')
    setSelectedSaleId('')
    setModalOpen(true)
    setSearchParams({ quick: '1' })
  }

  const closeModal = () => {
    setModalOpen(false)
    setSearchParams({})
  }

  const submit = async () => {
    if (!selectedSaleId) {
      setError('Select a sale to receive the payment.')
      return
    }
    const amt = parseAmount(amount)
    if (amt === null || amt <= 0) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    if (selectedSale && amt > selectedSale.amount_outstanding + 0.009) {
      setError(`Payment exceeds the outstanding balance of ${formatNaira(selectedSale.amount_outstanding)}.`)
      return
    }
    setSubmitting(true)
    const result = await recordPayment({
      sale_id: selectedSaleId,
      amount: amt,
      payment_method: payMethod,
      payment_date: payDate ? new Date(`${payDate}T12:00:00`).toISOString() : null,
      notes: notes.trim() || null,
    })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(`Payment of ${formatNaira(amt)} recorded.`)
    closeModal()
    void load()
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Payment records — cash and bank transfers. Payments are only recorded, never processed."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={payments.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="gold" onClick={openModal}>
              <Plus className="h-4 w-4" /> Record payment
            </Button>
          </>
        }
      />

      {success && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span>
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search by customer or note…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">All businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="input !w-auto" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments found"
            description="Record a payment against a sale to see it here."
            action={
              <Button variant="gold" onClick={openModal}>
                <Plus className="h-4 w-4" /> Record payment
              </Button>
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Business</th>
                    <th className="!text-right">Amount</th>
                    <th>Method</th>
                    <th>Recorded by</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap text-ink-soft">{formatDateTime(p.payment_date)}</td>
                      <td className="font-semibold text-ink">{p.sale?.customer?.name ?? '—'}</td>
                      <td className="text-ink-soft">{p.sale?.business?.name ?? '—'}</td>
                      <td className="!text-right font-bold text-emerald-700">{formatNaira(p.amount)}</td>
                      <td>
                        <Badge tone={p.payment_method === 'cash' ? 'brown' : 'blue'}>
                          {p.payment_method === 'cash' ? 'Cash' : 'Bank transfer'}
                        </Badge>
                      </td>
                      <td className="text-ink-soft">{p.recorder?.full_name || '—'}</td>
                      <td className="max-w-[160px] truncate text-ink-faint">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={payments.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Record payment"
        subtitle="Payments are records only — no payment is processed online."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <div>
            <label className="label">Sale *</label>
            <select className="input" value={selectedSaleId} onChange={(e) => setSelectedSaleId(e.target.value)}>
              <option value="">Select a sale with an outstanding balance…</option>
              {creditSales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.customer?.name ?? 'Customer'} — {s.business?.name ?? ''} — outstanding {formatNaira(s.amount_outstanding)}
                </option>
              ))}
            </select>
            {selectedSale && (
              <div className="mt-2 rounded-xl bg-cream-100/70 p-3 text-sm">
                <p className="font-semibold text-ink">Sale total: {formatNaira(selectedSale.total_amount)}</p>
                <p className="text-ink-soft">
                  Paid: {formatNaira(selectedSale.amount_paid)} · Outstanding: <span className="font-bold text-red-600">{formatNaira(selectedSale.amount_outstanding)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Amount (₦) *</label>
              <input type="number" min="0.01" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Method *</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={payDate} max={todayInputValue()} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="gold" onClick={() => void submit()} loading={submitting}>
              <Wallet className="h-4 w-4" /> Save payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
