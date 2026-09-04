import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Search,
  UserPlus,
  Wheat,
  GlassWater,
} from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchProductsByBusiness, fetchCustomers, createCustomer, fetchStaff } from '../services/dataService'
import { recordSale } from '../services/financeService'
import type { Customer, Product, Staff, PaymentMethod } from '../types'
import { formatNaira, formatQuantity, parseAmount } from '../lib/money'
import { todayInputValue } from '../lib/dates'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge, PaymentStatusBadge } from '../components/ui/Badge'
import { CustomerForm, emptyCustomerValues, type CustomerFormValues } from '../components/customers/CustomerForm'

interface LineItem {
  key: string
  productId: string
  quantity: string
}

let idCounter = 0
function newItem(): LineItem {
  idCounter += 1
  return { key: `line-${Date.now()}-${idCounter}`, productId: '', quantity: '1' }
}

export default function NewSalePage() {
  const navigate = useNavigate()
  const { businesses } = useBusinesses()

  const [businessId, setBusinessId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerSubmitting, setCustomerSubmitting] = useState(false)

  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [staffId, setStaffId] = useState('')
  const [saleDate, setSaleDate] = useState(todayInputValue())
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to first business when loaded
  useEffect(() => {
    if (!businessId && businesses.length > 0) {
      setBusinessId(businesses[0].id)
    }
  }, [businesses, businessId])

  useEffect(() => {
    let active = true
    if (businessId) {
      void fetchProductsByBusiness(businessId).then((p) => active && setProducts(p))
      void fetchStaff().then((s) => active && setStaff(s.filter((x) => x.business_id === businessId)))
    }
    return () => {
      active = false
    }
  }, [businessId])

  useEffect(() => {
    void fetchCustomers().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const selectedBusiness = businesses.find((b) => b.id === businessId)

  const lines = useMemo(() => {
    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const qty = parseAmount(item.quantity || '0') ?? 0
      const subtotal = product && qty > 0 ? Math.round(qty * product.price * 100) / 100 : 0
      return { ...item, product, qty, subtotal }
    })
  }, [items, products])

  const total = useMemo(() => Math.round(lines.reduce((acc, l) => acc + l.subtotal, 0) * 100) / 100, [lines])
  const paid = parseAmount(amountPaid) ?? 0
  const outstanding = Math.max(Math.round((total - paid) * 100) / 100, 0)
  const status: 'paid' | 'partial' | 'credit' =
    total > 0 && paid >= total ? 'paid' : paid > 0 ? 'partial' : 'credit'

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const filteredCustomers = customerQuery.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
          (c.business_name ?? '').toLowerCase().includes(customerQuery.toLowerCase()) ||
          (c.phone ?? '').toLowerCase().includes(customerQuery.toLowerCase()),
      )
    : customers

  const changeItem = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.key !== key)))
  }

  const handleCreateCustomer = async (values: CustomerFormValues) => {
    setCustomerSubmitting(true)
    const { id, error: err } = await createCustomer({
      name: values.name.trim(),
      customer_type: values.customer_type,
      business_name: values.business_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
    })
    setCustomerSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    if (id) {
      setCustomerId(id)
      setCustomers((prev) => [...prev, { id, name: values.name.trim(), customer_type: values.customer_type, business_name: values.business_name.trim() || null, phone: values.phone.trim() || null, email: values.email.trim() || null, address: values.address.trim() || null, notes: values.notes.trim() || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    }
    setCustomerModalOpen(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!businessId) {
      setError('Please select a business.')
      return
    }
    if (!customerId) {
      setError('Please select a customer (or create a new one).')
      return
    }
    const validLines = lines.filter((l) => l.product && l.qty > 0)
    if (validLines.length === 0) {
      setError('Add at least one product with a quantity greater than zero.')
      return
    }
    if (paid < 0 || (amountPaid.trim() && Number.isNaN(paid))) {
      setError('Amount paid is invalid.')
      return
    }
    if (paid > 0 && !paymentMethod) {
      setError('Select a payment method (cash or bank transfer).')
      return
    }

    setSubmitting(true)
    const result = await recordSale({
      business_id: businessId,
      customer_id: customerId,
      items: validLines.map((l) => ({ product_id: l.product!.id, quantity: l.qty })),
      amount_paid: paid,
      payment_method: paid > 0 ? (paymentMethod as PaymentMethod) : null,
      staff_id: staffId || null,
      sale_date: saleDate ? new Date(`${saleDate}T12:00:00`).toISOString() : null,
      notes: notes.trim() || null,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    navigate('/sales?created=1')
  }

  const productPriceLabel = (price: number) => formatNaira(price)

  return (
    <div className="mx-auto max-w-5xl animate-fadeUp space-y-6">
      <PageHeader
        title="New sale"
        subtitle="Record a sale for either business — with support for credit and partial payments."
        actions={
          <Link to="/sales" className="btn-outline">
            Cancel
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Business *</label>
              <select className="input" value={businessId} onChange={(e) => { setBusinessId(e.target.value); setItems([newItem()]) }}>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {selectedBusiness && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-faint">
                  {selectedBusiness.name.includes('Bakery') ? <Wheat className="h-3.5 w-3.5" /> : <GlassWater className="h-3.5 w-3.5" />}
                  {selectedBusiness.description}
                </p>
              )}
            </div>
            <div>
              <label className="label">Sale date *</label>
              <input type="date" className="input" value={saleDate} max={todayInputValue()} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Customer */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-900">Customer</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(true)}>
              <UserPlus className="h-4 w-4" /> New customer
            </Button>
          </div>

          {selectedCustomer ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div>
                <p className="font-semibold text-emerald-900">{selectedCustomer.name}</p>
                <p className="text-xs text-emerald-700">
                  {selectedCustomer.customer_type === 'business'
                    ? selectedCustomer.business_name ?? selectedCustomer.name
                    : 'Individual customer'}
                  {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <button type="button" className="text-xs font-semibold text-emerald-700 underline" onClick={() => setCustomerId('')}>
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  className="input pl-10"
                  placeholder="Search customers by name, business or phone…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-brand-100 scrollbar-thin">
                {filteredCustomers.length === 0 ? (
                  <p className="p-4 text-sm text-ink-faint">
                    No customers found. Create one with the button above.
                  </p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomerId(c.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {c.customer_type === 'business' && c.business_name ? `${c.business_name} · ` : ''}
                          {c.phone ?? 'no phone'}
                        </p>
                      </div>
                      <Badge tone={c.customer_type === 'business' ? 'gold' : 'gray'}>{c.customer_type}</Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Products */}
        <Card>
          <h3 className="mb-3 text-base font-bold text-brand-900">Products</h3>
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.key} className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-cream-50/50 p-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <select
                    className="input"
                    value={line.productId}
                    onChange={(e) => changeItem(line.key, { productId: e.target.value })}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {productPriceLabel(p.price)} / {p.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="input"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => changeItem(line.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="w-28 text-right text-sm font-bold text-brand-950">
                    {formatNaira(line.subtotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(line.key)}
                    className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, newItem()])}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
            <div className="text-right">
              <p className="text-xs text-ink-faint">Total</p>
              <p className="font-display text-2xl font-extrabold text-brand-950">{formatNaira(total)}</p>
            </div>
          </div>
        </Card>

        {/* Payment + staff */}
        <Card>
          <h3 className="mb-3 text-base font-bold text-brand-900">Payment</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Amount paid (₦)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Payment method</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}>
                <option value="">— none —</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Responsible worker</label>
              <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">— none —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-cream-100/70 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryRow label="Total" value={formatNaira(total)} />
              <SummaryRow label="Paid" value={formatNaira(paid)} />
              <SummaryRow label="Outstanding" value={formatNaira(outstanding)} tone={outstanding > 0 ? 'red' : 'green'} />
              <div>
                <p className="text-xs font-semibold text-ink-faint">Status</p>
                <div className="mt-1"><PaymentStatusBadge status={status} /></div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to="/sales" className="btn-outline">
            Cancel
          </Link>
          <Button type="submit" loading={submitting}>
            <ShoppingCart className="h-4 w-4" /> Save sale
          </Button>
        </div>
      </form>

      {/* New customer modal */}
      <Modal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Add customer"
        subtitle="Individuals do not need a business name."
        size="lg"
      >
        <CustomerForm
          initial={emptyCustomerValues()}
          submitting={customerSubmitting}
          onSubmit={(values) => void handleCreateCustomer(values)}
        />
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-faint">{label}</p>
      <p className={`text-lg font-extrabold ${tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-700' : 'text-brand-950'}`}>
        {value}
      </p>
    </div>
  )
}

export { formatQuantity }
