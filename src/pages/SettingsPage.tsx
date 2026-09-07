import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Package, UserPlus, Settings as SettingsIcon, CheckCircle2, Pencil, Server, Tags, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchBusinesses, updateBusiness, createBusiness, fetchExpenseCategories, createExpenseCategory, updateExpenseCategory } from '../services/dataService'
import { updateOwnProfileFullName } from '../services/authService'
import type { Business, ExpenseCategory } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { MfaSection } from '../components/settings/MfaSection'
import { formatDateTime } from '../lib/money'

export default function SettingsPage() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'manager'

  if (role === 'owner') return <OwnerSettings />
  if (role === 'developer') return <DeveloperSettings />
  return <ManagerSettings />
}

// -----------------------------------------------------------------------------
// Owner settings
// -----------------------------------------------------------------------------
function OwnerSettings() {
  const { profile, refreshProfile } = useAuth()
  const { businesses } = useBusinesses()
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState(profile?.full_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)

  const [editBusiness, setEditBusiness] = useState<Business | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [catName, setCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  useEffect(() => {
    void fetchBusinesses(true).then(setAllBusinesses).catch(() => setAllBusinesses([])).finally(() => setLoading(false))
  }, [businesses])

  useEffect(() => {
    void fetchExpenseCategories(true).then(setExpenseCategories).catch(() => setExpenseCategories([]))
  }, [])

  const loadCategories = async () => {
    try {
      const data = await fetchExpenseCategories(true)
      setExpenseCategories(data)
    } catch {
      /* ignore */
    }
  }

  const saveCategory = async () => {
    if (!catName.trim()) {
      setError('Category name is required.')
      return
    }
    setCatSaving(true)
    const { error: err } = await createExpenseCategory(catName.trim())
    setCatSaving(false)
    if (err) { setError(err); return }
    setSuccess(`${catName.trim()} added as an expense category.`)
    setCatName('')
    await loadCategories()
  }

  const toggleCategory = async (c: ExpenseCategory) => {
    const { error: err } = await updateExpenseCategory(c.id, { active: !c.active })
    if (err) { setError(err); return }
    setSuccess(c.active ? `Category "${c.name}" deactivated.` : `Category "${c.name}" re-activated.`)
    await loadCategories()
  }

  useEffect(() => {
    void fetchBusinesses(true).then(setAllBusinesses).catch(() => setAllBusinesses([])).finally(() => setLoading(false))
  }, [businesses])

  const saveName = async () => {
    setNameSaving(true)
    const { error: err } = await updateOwnProfileFullName(name)
    setNameSaving(false)
    if (err) {
      setError(err)
      return
    }
    setSuccess('Profile name updated.')
    await refreshProfile()
  }

  const saveBusiness = async () => {
    if (!formName.trim()) {
      setError('Business name is required.')
      return
    }
    setSubmitting(true)
    if (editBusiness) {
      const { error: err } = await updateBusiness(editBusiness.id, { name: formName.trim(), description: formDesc.trim() || null })
      setSubmitting(false)
      if (err) { setError(err); return }
    } else {
      const { id, error: err } = await createBusiness({ name: formName.trim(), description: formDesc.trim() || null })
      setSubmitting(false)
      if (err || !id) { setError(err ?? 'Failed to create business.'); return }
    }
    setSuccess(editBusiness ? 'Business updated.' : 'Business created.')
    setEditBusiness(null)
    setCreateOpen(false)
    const data = await fetchBusinesses(true)
    setAllBusinesses(data)
  }

  const toggleActive = async (b: Business) => {
    const { error: err } = await updateBusiness(b.id, { active: !b.active })
    if (err) { setError(err); return }
    setSuccess(`${b.name} ${b.active ? 'deactivated' : 'activated'}.`)
    const data = await fetchBusinesses(true)
    setAllBusinesses(data)
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader title="Settings" subtitle="Business settings, profile and user management (Owner)." />

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span></Alert>}

      <Card>
        <CardHeader title="Businesses" subtitle="Manage your business operations and their descriptions." action={
          <Button size="sm" onClick={() => { setCreateOpen(true); setEditBusiness(null); setFormName(''); setFormDesc(''); }}>
            <Building2 className="h-4 w-4" /> Add business
          </Button>
        } />
        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="h-5 w-5 text-brand-600" /></div>
        ) : allBusinesses.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">No businesses configured.</p>
        ) : (
          <div className="space-y-3">
            {allBusinesses.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 p-4">
                <div>
                  <p className="font-semibold text-ink">{b.name}</p>
                  <p className="text-xs text-ink-faint">{b.description || 'No description'} · created {formatDateTime(b.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.active ? 'green' : 'gray'}>{b.active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { setEditBusiness(b); setFormName(b.name); setFormDesc(b.description ?? ''); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleActive(b)}>
                    {b.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Expense categories" subtitle="Categories available when recording expenses. Deactivated categories are hidden from new entries but keep their history." />
        <div className="flex flex-col gap-3">
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-ink-faint">No expense categories configured.</p>
          ) : (
            <ul className="divide-y divide-brand-50 rounded-xl border border-brand-100">
              {expenseCategories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Tags className={`h-4 w-4 ${c.active ? 'text-brand-700' : 'text-ink-faint'}`} />
                    <span className={`text-sm font-medium ${c.active ? 'text-ink' : 'text-ink-faint'}`}>{c.name}</span>
                    <span className="text-xs text-ink-faint">order {c.sort_order}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void toggleCategory(c)}>
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="input flex-1" placeholder="New category name…" value={catName} onChange={(e) => setCatName(e.target.value)} />
            <Button onClick={() => void saveCategory()} loading={catSaving}>
              <Plus className="h-4 w-4" /> Add category
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Quick links" subtitle="Manage products, users and more." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link to="/products" className="flex items-center gap-3 rounded-xl border border-brand-100 p-4 transition-colors hover:bg-brand-50">
              <div className="rounded-xl bg-brand-100 p-2.5 text-brand-800"><Package className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold text-brand-950">Products</p><p className="text-xs text-ink-faint">Prices & units</p></div>
            </Link>
            <Link to="/users" className="flex items-center gap-3 rounded-xl border border-brand-100 p-4 transition-colors hover:bg-brand-50">
              <div className="rounded-xl bg-gold-100 p-2.5 text-gold-700"><UserPlus className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold text-brand-950">Users</p><p className="text-xs text-ink-faint">Roles & accounts</p></div>
            </Link>
            <Link to="/activity" className="flex items-center gap-3 rounded-xl border border-brand-100 p-4 transition-colors hover:bg-brand-50">
              <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><SettingsIcon className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold text-brand-950">Activity</p><p className="text-xs text-ink-faint">Audit trail</p></div>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="My profile" subtitle="Your display name used across the system." />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label">Full name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={() => void saveName()} loading={nameSaving}>Save name</Button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Role: <span className="font-semibold text-gold-700">Owner</span> · {profile?.email}
          </p>
        </Card>
      </div>

      <MfaSection />

      <Modal
        open={createOpen || Boolean(editBusiness)}
        onClose={() => { setCreateOpen(false); setEditBusiness(null); }}
        title={editBusiness ? 'Edit business' : 'Add business'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Business name *</label>
            <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditBusiness(null); }}>Cancel</Button>
            <Button onClick={() => void saveBusiness()} loading={submitting}>
              {editBusiness ? 'Save changes' : 'Add business'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Manager settings
// -----------------------------------------------------------------------------
function ManagerSettings() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    const { error: err } = await updateOwnProfileFullName(name)
    setSaving(false)
    if (err) { setError(err); return }
    setSuccess('Profile name updated.')
    await refreshProfile()
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader title="Settings" subtitle="Personal profile and operational settings (Manager)." />
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span></Alert>}
      <Card>
        <CardHeader title="My profile" subtitle="You cannot change your own role or permissions." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => void save()} loading={saving}>Save name</Button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Role: <span className="font-semibold text-brand-800">Manager</span> · {profile?.email}
        </p>
      </Card>

      <MfaSection />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Developer settings
// -----------------------------------------------------------------------------
function DeveloperSettings() {
  const { profile } = useAuth()
  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader title="Settings" subtitle="Technical/system configuration (Developer)." />
      <Card>
        <CardHeader title="System configuration" action={<Server className="h-5 w-5 text-brand-700" />} />
        <p className="text-sm text-ink-soft">
          Technical diagnostics and system status are available on your dashboard. This application never
          stores or exposes service-role keys, database passwords or secret credentials in the browser.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-cream-100/70 p-4">
            <dt className="text-xs font-semibold text-ink-faint">Role</dt>
            <dd className="font-bold text-brand-950">Developer / System Admin</dd>
          </div>
          <div className="rounded-xl bg-cream-100/70 p-4">
            <dt className="text-xs font-semibold text-ink-faint">Email</dt>
            <dd className="truncate font-bold text-brand-950">{profile?.email}</dd>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <dt className="text-xs font-semibold text-emerald-700">Security boundary</dt>
            <dd className="text-sm text-emerald-900">No unrestricted financial access. Business financial data is separate from technical permissions.</dd>
          </div>
          <div className="rounded-xl bg-cream-100/70 p-4">
            <dt className="text-xs font-semibold text-ink-faint">Key handling</dt>
            <dd className="text-sm text-ink-soft">Only the publishable (client) key is used — never a service-role key.</dd>
          </div>
        </dl>
      </Card>

      <MfaSection />
    </div>
  )
}
