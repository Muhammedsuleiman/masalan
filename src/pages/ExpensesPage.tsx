import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, TrendingDown, Search, Pencil, Trash2, CheckCircle2, Download } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchExpenses, recordExpense, updateExpense, deleteExpense } from '../services/financeService'
import { fetchExpenseCategories } from '../services/dataService'
import type { Expense, ExpenseCategory, PaymentMethod } from '../types'
import { useAuth } from '../contexts/AuthContext'
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
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const PAGE_SIZE = 12

export default function ExpensesPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const { businesses } = useBusinesses()
  const [searchParams, setSearchParams] = useSearchParams()

  const [businessId, setBusinessId] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(Boolean(searchParams.get('quick')))
  const [editing, setEditing] = useState<Expense | null>(null)
  const [formBusiness, setFormBusiness] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(todayInputValue())
  const [formNotes, setFormNotes] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void fetchExpenseCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchExpenses({
        businessId: businessId || null,
        category: category || undefined,
        status: statusFilter || undefined,
      })
      const filtered = search.trim()
        ? data.filter((e) => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()))
        : data
      setExpenses(filtered)
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
  }, [businessId, category, statusFilter, search])

  const activeExpenses = useMemo(() => expenses.filter((e) => e.status === 'active'), [expenses])
  const total = useMemo(() => activeExpenses.reduce((acc, e) => acc + e.amount, 0), [activeExpenses])
  const pageCount = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const visible = useMemo(() => expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [expenses, page])

  const exportCsv = () => {
    const csv = toCsv(
      ['Date', 'Business', 'Category', 'Description', 'Amount', 'Method', 'Status', 'Notes', 'Recorded by'],
      expenses.map((e) => [
        formatDateTime(e.expense_date),
        e.business?.name ?? '',
        e.category,
        e.description,
        formatNaira(e.amount),
        e.payment_method === 'cash' ? 'Cash' : e.payment_method === 'bank_transfer' ? 'Bank transfer' : '',
        e.status,
        e.notes ?? '',
        e.recorder?.full_name ?? '',
      ]),
    )
    downloadCsv(makeFilename('masalan-expenses'), csv)
  }

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setFormBusiness(businesses[0]?.id ?? '')
    setFormCategory(categories[0]?.name ?? '')
    setFormDescription('')
    setFormAmount('')
    setFormDate(todayInputValue())
    setFormNotes('')
    setFormPaymentMethod('')
    setModalOpen(true)
    setSearchParams({ quick: '1' })
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setError(null)
    setFormBusiness(expense.business_id)
    setFormCategory(expense.category)
    setFormDescription(expense.description)
    setFormAmount(String(expense.amount))
    const d = new Date(expense.expense_date)
    setFormDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    setFormNotes(expense.notes ?? '')
    setFormPaymentMethod(expense.payment_method ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSearchParams({})
  }

  const submit = async () => {
    const amount = parseAmount(formAmount)
    if (!formBusiness) {
      setError('Select a business.')
      return
    }
    if (!formDescription.trim()) {
      setError('Enter a description.')
      return
    }
    if (amount === null || amount <= 0) {
      setError('Expense amount must be greater than zero.')
      return
    }
    setSubmitting(true)
    const payload = {
      business_id: formBusiness,
      category: formCategory,
      description: formDescription.trim(),
      amount,
      expense_date: formDate ? new Date(`${formDate}T12:00:00`).toISOString() : null,
      notes: formNotes.trim() || null,
      payment_method: formPaymentMethod || null,
    }
    let result: { id: string | null; error: string | null }
    if (editing) {
      const r = await updateExpense(editing.id, payload)
      result = { id: editing.id, error: r.error }
    } else {
      result = await recordExpense(payload)
    }
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(editing ? 'Expense updated.' : `Expense of ${formatNaira(amount)} recorded.`)
    closeModal()
    void load()
  }

  const voidExpense = async (expense: Expense) => {
    const { error: err } = await updateExpense(expense.id, { status: 'voided' })
    if (err) {
      setError(err)
      return
    }
    setSuccess('Expense voided. It is excluded from reports.')
    void load()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: err } = await deleteExpense(deleteTarget.id)
    setDeleting(false)
    if (err) {
      setError(err)
    } else {
      setDeleteTarget(null)
      setSuccess('Expense permanently deleted.')
      void load()
    }
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Outgoing business money / debits. Amounts must always be greater than zero."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={activeExpenses.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Record expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-red-400/20 bg-gradient-to-br from-red-950/70 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Total (active)</p>
          <p className="mt-1 text-2xl font-extrabold text-red-300">{formatNaira(total)}</p>
        </Card>
        <Card className="border-white/10 bg-gradient-to-br from-brand-800/90 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-300">Expense entries</p>
          <p className="mt-1 text-2xl font-extrabold text-cream-50">{expenses.length}</p>
        </Card>
        <Card className="border-gold-400/20 bg-gradient-to-br from-gold-800/50 to-brand-950/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-300">Average (active)</p>
          <p className="mt-1 text-2xl font-extrabold text-cream-50">
            {activeExpenses.length ? formatNaira(total / activeExpenses.length) : '₦0.00'}
          </p>
        </Card>
      </div>

      {success && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span>
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search description or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">All businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="input !w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="voided">Voided</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expenses found"
            description="Record an expense to track outgoing business money."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Record expense
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
                    <th>Business</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="!text-right">Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Recorded by</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap text-ink-soft">{formatDateTime(e.expense_date)}</td>
                      <td className="text-ink-soft">{e.business?.name ?? '—'}</td>
                      <td><Badge tone="brown">{e.category}</Badge></td>
                      <td className="max-w-[200px]">
                        <p className="truncate font-medium text-ink">{e.description}</p>
                        {e.notes && <p className="truncate text-xs text-ink-faint">{e.notes}</p>}
                      </td>
                      <td className="!text-right font-bold text-red-600">{formatNaira(e.amount)}</td>
                      <td>
                        <Badge tone={e.payment_method === 'cash' ? 'brown' : 'gray'}>
                          {e.payment_method === 'cash' ? 'Cash' : e.payment_method === 'bank_transfer' ? 'Bank' : '—'}
                        </Badge>
                      </td>
                      <td>
                        {e.status === 'active' ? (
                          <Badge tone="green">Active</Badge>
                        ) : e.status === 'voided' ? (
                          <Badge tone="red">Voided</Badge>
                        ) : (
                          <Badge tone="gray">Archived</Badge>
                        )}
                      </td>
                      <td className="text-ink-soft">{e.recorder?.full_name || '—'}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(e)}
                                className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50"
                                aria-label="Edit expense"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {e.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => void voidExpense(e)}
                                  className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50"
                                  aria-label="Void expense"
                                  title="Void expense (excludes from reports)"
                                >
                                  <TrendingDown className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(e)}
                                className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={expenses.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit expense' : 'Record expense'}
        subtitle="Expenses are outgoing debits and must be greater than zero."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Business *</label>
              <select className="input" value={formBusiness} onChange={(e) => setFormBusiness(e.target.value)}>
                <option value="">Select…</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <input className="input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="e.g. Flour for bread production" />
            </div>
            <div>
              <label className="label">Amount (₦) *</label>
              <input type="number" min="0.01" step="0.01" className="input" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={formDate} max={todayInputValue()} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Payment method</label>
              <select className="input" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod | '')}>
                <option value="">— none —</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => void submit()} loading={submitting}>
              {editing ? 'Save changes' : 'Record expense'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete expense"
        message={`Delete the ${deleteTarget?.category ?? ''} expense of ${deleteTarget ? formatNaira(deleteTarget.amount) : ''} permanently? Consider voiding instead to preserve financial history.`}
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
