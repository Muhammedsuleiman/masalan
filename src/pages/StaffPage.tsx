import { useEffect, useMemo, useState } from 'react'
import { UserCog, Search, Pencil, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchStaff, createStaff, updateStaff, deleteStaff } from '../services/dataService'
import type { Staff } from '../types'
import { useAuth } from '../contexts/AuthContext'
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

export default function StaffPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const { businesses } = useBusinesses()

  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [formBusiness, setFormBusiness] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPosition, setFormPosition] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStaff(search || undefined)
      const filtered = businessFilter ? data.filter((s) => s.business_id === businessFilter) : data
      setStaff(filtered)
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
  }, [search, businessFilter])

  const pageCount = Math.max(1, Math.ceil(staff.length / PAGE_SIZE))
  const visible = useMemo(() => staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [staff, page])

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setFormBusiness(businesses[0]?.id ?? '')
    setFormName('')
    setFormPhone('')
    setFormPosition('')
    setModalOpen(true)
  }

  const openEdit = (s: Staff) => {
    setEditing(s)
    setError(null)
    setFormBusiness(s.business_id ?? '')
    setFormName(s.name)
    setFormPhone(s.phone ?? '')
    setFormPosition(s.position ?? '')
    setModalOpen(true)
  }

  const submit = async () => {
    if (!formName.trim()) {
      setError("Enter the worker's name.")
      return
    }
    setSubmitting(true)
    const payload = {
      business_id: formBusiness || null,
      name: formName.trim(),
      phone: formPhone.trim() || null,
      position: formPosition.trim() || null,
    }
    let result: { id: string | null; error: string | null }
    if (editing) {
      const r = await updateStaff(editing.id, payload)
      result = { id: editing.id, error: r.error }
    } else {
      result = await createStaff(payload)
    }
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(editing ? 'Worker updated.' : `${payload.name} added as a worker.`)
    setModalOpen(false)
    void load()
  }

  const toggleActive = async (s: Staff) => {
    const { error: err } = await updateStaff(s.id, { active: !s.active })
    if (err) {
      setError(err)
      return
    }
    setSuccess(s.active ? `${s.name} deactivated.` : `${s.name} reactivated.`)
    void load()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: err } = await deleteStaff(deleteTarget.id)
    setDeleting(false)
    if (err) {
      setError(err)
    } else {
      setDeleteTarget(null)
      setSuccess('Worker record deleted.')
      void load()
    }
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Staff / Workers"
        subtitle="Workers are records only — they do not log in and have no accounts."
        actions={
          <Button onClick={openCreate}>
            <UserCog className="h-4 w-4" /> Add worker
          </Button>
        }
      />

      <Alert tone="info">
        <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 shrink-0" /> Workers never get login credentials. Assigning a worker to a sale only records who performed the activity.</span>
      </Alert>

      {success && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span>
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search by name or position…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)}>
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
        ) : staff.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No workers yet"
            description="Add workers so you can attribute sales to the person who performed them."
            action={
              <Button onClick={openCreate}>
                <UserCog className="h-4 w-4" /> Add worker
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
                    <th>Business</th>
                    <th>Position</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-ink">{s.name}</td>
                      <td className="text-ink-soft">{s.business_name ?? '—'}</td>
                      <td className="text-ink-soft">{s.position || '—'}</td>
                      <td className="text-ink-soft">{s.phone || '—'}</td>
                      <td>
                        <Badge tone={s.active ? 'green' : 'gray'}>{s.active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openEdit(s)} className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50" aria-label="Edit worker">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => void toggleActive(s)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50">
                            {s.active ? 'Deactivate' : 'Activate'}
                          </button>
                          {isOwner && (
                            <button type="button" onClick={() => setDeleteTarget(s)} className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Delete worker">
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
            <Pagination page={page} pageCount={pageCount} total={staff.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit worker' : 'Add worker'}
        subtitle="Workers do not receive login accounts."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Full name *</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Worker's full name" />
            </div>
            <div>
              <label className="label">Business</label>
              <select className="input" value={formBusiness} onChange={(e) => setFormBusiness(e.target.value)}>
                <option value="">— none —</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Position</label>
              <input className="input" value={formPosition} onChange={(e) => setFormPosition(e.target.value)} placeholder="e.g. Baker, Delivery" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Phone</label>
              <input className="input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} loading={submitting}>
              {editing ? 'Save changes' : 'Add worker'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete worker"
        message={`Delete ${deleteTarget?.name ?? 'this worker'}? Their historical sales will keep the worker reference removed.`}
        confirmLabel="Delete worker"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
