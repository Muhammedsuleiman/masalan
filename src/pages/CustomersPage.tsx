import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Users, Search, Pencil, Trash2, Eye, CheckCircle2, Download } from 'lucide-react'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/dataService'
import { fetchSales, fetchPayments } from '../services/financeService'
import type { Customer, Payment, Sale } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { formatNaira, formatDateTime } from '../lib/money'
import { toCsv, downloadCsv, makeFilename } from '../lib/csv'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge, PaymentStatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { CustomerForm, customerToValues, emptyCustomerValues, type CustomerFormValues } from '../components/customers/CustomerForm'

const PAGE_SIZE = 12

export default function CustomersPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(Boolean(searchParams.get('quick')))
  const [editing, setEditing] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [viewSales, setViewSales] = useState<Sale[]>([])
  const [viewPayments, setViewPayments] = useState<Payment[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers(search || undefined)
      const filtered = typeFilter ? data.filter((c) => c.customer_type === typeFilter) : data
      setCustomers(filtered)
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
  }, [search, typeFilter])

  const pageCount = Math.max(1, Math.ceil(customers.length / PAGE_SIZE))
  const visible = useMemo(() => customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [customers, page])

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setModalOpen(true)
    setSearchParams({ quick: '1' })
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSearchParams({})
  }

  const submit = async (values: CustomerFormValues) => {
    setSubmitting(true)
    const payload = {
      name: values.name.trim(),
      customer_type: values.customer_type,
      business_name: values.business_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
    }
    let result: { id: string | null; error: string | null }
    if (editing) {
      const r = await updateCustomer(editing.id, payload)
      result = { id: editing.id, error: r.error }
    } else {
      result = await createCustomer(payload)
    }
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(editing ? 'Customer updated.' : `${payload.name} added as a customer.`)
    closeModal()
    void load()
  }

  const viewCustomerDetail = async (c: Customer) => {
    setViewCustomer(c)
    setViewLoading(true)
    const [sales, payments] = await Promise.all([
      fetchSales({ customerId: c.id }),
      fetchPayments({ customerId: c.id }),
    ])
    setViewSales(sales)
    setViewPayments(payments)
    setViewLoading(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: err } = await deleteCustomer(deleteTarget.id)
    setDeleting(false)
    if (err) {
      setError(err)
    } else {
      setDeleteTarget(null)
      setSuccess('Customer deleted.')
      void load()
    }
  }

  const totalOutstanding = viewSales.reduce((acc, s) => acc + s.amount_outstanding, 0)

  const exportCsv = () => {
    const csv = toCsv(
      ['Name', 'Type', 'Business name', 'Phone', 'Email', 'Address', 'Notes', 'Added'],
      customers.map((c) => [
        c.name,
        c.customer_type,
        c.business_name ?? '',
        c.phone ?? '',
        c.email ?? '',
        c.address ?? '',
        c.notes ?? '',
        formatDateTime(c.created_at),
      ]),
    )
    downloadCsv(makeFilename('masalan-customers'), csv)
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Individuals and businesses. A business name is optional for individual customers."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={customers.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add customer
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
        <div className="flex flex-col gap-2 border-b border-brand-100 dark:border-brand-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint dark:text-cream-400/50" />
            <input className="input pl-10" placeholder="Search by name, business or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600 dark:text-gold-300">
            <Spinner className="h-6 w-6" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add your first customer to start recording sales."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add customer
              </Button>
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Business name</th>
                    <th>Phone</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-ink dark:text-cream-100">{c.name}</td>
                      <td><Badge tone={c.customer_type === 'business' ? 'gold' : 'gray'}>{c.customer_type}</Badge></td>
                      <td className="text-ink-soft dark:text-cream-300">{c.business_name || '—'}</td>
                      <td className="text-ink-soft dark:text-cream-300">{c.phone || '—'}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => void viewCustomerDetail(c)} className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50 dark:text-gold-300 dark:hover:bg-white/10" aria-label="View customer">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEdit(c)} className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50 dark:text-gold-300 dark:hover:bg-white/10" aria-label="Edit customer">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {isOwner && (
                            <button type="button" onClick={() => setDeleteTarget(c)} className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:text-cream-400/70 dark:hover:bg-red-500/15 dark:hover:text-red-400" aria-label="Delete customer">
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
            <Pagination page={page} pageCount={pageCount} total={customers.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit customer' : 'Add customer'}
        subtitle="Business name is optional for individual customers."
        size="lg"
      >
        <CustomerForm
          key={editing?.id ?? 'new'}
          initial={editing ? customerToValues(editing) : emptyCustomerValues()}
          submitting={submitting}
          onSubmit={(values) => void submit(values)}
        />
      </Modal>

      {/* View detail modal */}
      <Modal
        open={Boolean(viewCustomer)}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer?.name ?? 'Customer'}
        subtitle={
          viewCustomer
            ? `${viewCustomer.customer_type === 'business' ? viewCustomer.business_name ?? 'Business' : 'Individual'}${viewCustomer.phone ? ` · ${viewCustomer.phone}` : ''}`
            : undefined
        }
        size="lg"
      >
        {viewLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-brand-600" /></div>
        ) : viewCustomer ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-cream-100/70 p-3 text-center dark:bg-white/5">
                <p className="text-xs font-semibold text-ink-faint dark:text-cream-400/70">Sales</p>
                <p className="text-xl font-extrabold text-brand-950 dark:text-cream-50">{viewSales.length}</p>
              </div>
              <div className="rounded-xl bg-cream-100/70 p-3 text-center dark:bg-white/5">
                <p className="text-xs font-semibold text-ink-faint dark:text-cream-400/70">Payments</p>
                <p className="text-xl font-extrabold text-brand-950 dark:text-cream-50">{viewPayments.length}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-xs font-semibold text-red-400">Outstanding</p>
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400">{formatNaira(totalOutstanding)}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-brand-900 dark:text-cream-100">Sales history</h4>
              {viewSales.length === 0 ? (
                <p className="text-sm text-ink-faint dark:text-cream-400/70">No sales for this customer yet.</p>
              ) : (
                <div className="table-wrap rounded-xl border border-brand-100 dark:border-brand-800">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="!text-right">Total</th>
                        <th className="!text-right">Outstanding</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewSales.slice(0, 8).map((s) => (
                        <tr key={s.id}>
                          <td className="text-ink-soft dark:text-cream-300">{formatDateTime(s.sale_date)}</td>
                          <td className="!text-right font-semibold">{formatNaira(s.total_amount)}</td>
                          <td className="!text-right text-red-600 dark:text-red-400">{formatNaira(s.amount_outstanding)}</td>
                          <td><PaymentStatusBadge status={s.payment_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-brand-900 dark:text-cream-100">Payment history</h4>
              {viewPayments.length === 0 ? (
                <p className="text-sm text-ink-faint dark:text-cream-400/70">No payments for this customer yet.</p>
              ) : (
                <ul className="divide-y divide-brand-50 dark:divide-brand-800 rounded-xl border border-brand-100 dark:border-brand-800">
                  {viewPayments.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm font-medium text-ink dark:text-cream-100">
                        {p.payment_method === 'cash' ? 'Cash' : 'Bank transfer'} · {formatDateTime(p.payment_date)}
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatNaira(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete customer"
        message={`Delete ${deleteTarget?.name ?? 'this customer'}? This does not delete their historical sales.`}
        confirmLabel="Delete customer"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
