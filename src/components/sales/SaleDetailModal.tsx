import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { fetchSale, fetchSaleItems, fetchPayments, recordPayment } from '../../services/financeService'
import type { Payment, PaymentMethod, Sale, SaleItem } from '../../types'
import { formatNaira, formatQuantity, formatDate, formatDateTime } from '../../lib/money'
import { Modal } from '../ui/Modal'
import { Badge, PaymentStatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Spinner } from '../ui/Spinner'
import { parseAmount } from '../../lib/money'

interface SaleDetailModalProps {
  open: boolean
  saleId: string | null
  onClose: () => void
  onChanged?: () => void
  canRecordPayment?: boolean
}

export function SaleDetailModal({ open, saleId, onClose, onChanged, canRecordPayment = true }: SaleDetailModalProps) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payDate, setPayDate] = useState('')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!open || !saleId) return
    let active = true
    setLoading(true)
    setError(null)
    setPayOpen(false)
    Promise.all([fetchSale(saleId), fetchSaleItems(saleId), fetchPayments({ saleId })])
      .then(([s, i, p]) => {
        if (!active) return
        setSale(s)
        setItems(i)
        setPayments(p)
      })
      .catch((e) => active && setError((e as Error).message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, saleId])

  const recordPay = async () => {
    if (!sale) return
    const amount = parseAmount(payAmount)
    if (amount === null || amount <= 0) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    if (amount > sale.amount_outstanding + 0.009) {
      setError('Payment amount exceeds the outstanding balance.')
      return
    }
    setPaying(true)
    const result = await recordPayment({
      sale_id: sale.id,
      amount,
      payment_method: payMethod,
      payment_date: payDate ? new Date(`${payDate}T12:00:00`).toISOString() : null,
      notes: payNote.trim() || null,
    })
    setPaying(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setPayAmount('')
    setPayNote('')
    onChanged?.()
    const [s2, p2] = await Promise.all([fetchSale(sale.id), fetchPayments({ saleId: sale.id })])
    setSale(s2)
    setPayments(p2)
    setPayOpen(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sale ? `Sale · ${sale.customer?.name ?? 'Customer'}` : 'Sale details'}
      subtitle={sale ? `Recorded ${formatDateTime(sale.sale_date)}` : undefined}
      size="lg"
      footer={
        sale && canRecordPayment && sale.amount_outstanding > 0 ? (
          <Button variant="gold" onClick={() => setPayOpen((v) => !v)}>
            <Wallet className="h-4 w-4" /> Record payment
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-brand-600" />
        </div>
      ) : sale ? (
        <div className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCell label="Business" value={sale.business?.name ?? '—'} />
            <InfoCell label="Customer" value={sale.customer?.name ?? '—'} />
            <InfoCell label="Date" value={formatDate(sale.sale_date)} />
            <InfoCell label="Worker" value={sale.staff?.name ?? '—'} />
          </div>

          <div className="table-wrap rounded-xl border border-brand-100 dark:border-brand-800">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="!text-right">Qty</th>
                  <th className="!text-right">Unit price</th>
                  <th className="!text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name ?? 'Product'}</td>
                    <td className="!text-right">{formatQuantity(item.quantity)}</td>
                    <td className="!text-right">{formatNaira(item.unit_price)}</td>
                    <td className="!text-right font-semibold">{formatNaira(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-cream-100/70 p-4 text-center dark:bg-white/5">
            <div>
              <p className="text-xs font-semibold text-ink-faint dark:text-cream-400/70">Total</p>
              <p className="text-lg font-extrabold text-brand-950 dark:text-cream-50">{formatNaira(sale.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-faint dark:text-cream-400/70">Paid</p>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{formatNaira(sale.amount_paid)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-faint dark:text-cream-400/70">Outstanding</p>
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{formatNaira(sale.amount_outstanding)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint dark:text-cream-400/70">Payment status</span>
            <PaymentStatusBadge status={sale.payment_status} />
          </div>

          {/* Payment history */}
          <div>
            <h4 className="mb-2 text-sm font-bold text-brand-900 dark:text-cream-100">Payment history</h4>
            {payments.length === 0 ? (
              <p className="text-sm text-ink-faint dark:text-cream-400/70">No payments recorded for this sale yet.</p>
            ) : (
              <ul className="divide-y divide-brand-50 rounded-xl border border-brand-100 dark:divide-brand-800 dark:border-brand-800">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-cream-100">
                        {p.payment_method === 'cash' ? 'Cash' : 'Bank transfer'} — {formatNaira(p.amount)}
                      </p>
                      <p className="text-xs text-ink-faint dark:text-cream-400/70">
                        {formatDateTime(p.payment_date)} {p.recorder?.full_name ? `· ${p.recorder.full_name}` : ''}
                      </p>
                    </div>
                    <Badge tone={p.payment_method === 'cash' ? 'brown' : 'blue'}>{p.payment_method.replace('_', ' ')}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {payOpen && sale.amount_outstanding > 0 && (
            <div className="rounded-xl border border-gold-200 bg-gold-50/60 p-4 space-y-3 dark:border-gold-500/30 dark:bg-gold-500/10">
              <h4 className="text-sm font-bold text-gold-800 dark:text-gold-300">
                Record payment — outstanding {formatNaira(sale.amount_outstanding)}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Amount (₦)</label>
                  <input type="number" min="0.01" step="0.01" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void recordPay()} loading={paying}>
                  <Wallet className="h-4 w-4" /> Save payment
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-ink-faint dark:text-cream-400/70">Sale not found or no longer available.</p>
      )}
    </Modal>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream-100/70 p-3 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint dark:text-cream-400/70">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-brand-950 dark:text-cream-50">{value}</p>
    </div>
  )
}
