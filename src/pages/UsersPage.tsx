import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Users, Search, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react'
import { fetchAllUsers, createUserAccount, changeUserRole, updateUserFullName } from '../services/authService'
import type { Profile, Role } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../lib/money'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RoleBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  developer: 'Developer',
}

export default function UsersPage() {
  const { profile: currentUser } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<Role>('manager')
  const [submitting, setSubmitting] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchAllUsers())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  const openCreate = () => {
    setError(null)
    setSuccess(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('manager')
    setNeedsConfirmation(false)
    setModalOpen(true)
  }

  const submitCreate = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      setError('Fill in name, email and password.')
      return
    }
    if (formPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    const result = await createUserAccount({
      email: formEmail.trim(),
      password: formPassword,
      fullName: formName.trim(),
      role: formRole,
    })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNeedsConfirmation(result.needsConfirmation)
    setSuccess(
      `${formName.trim()} created as ${ROLE_LABELS[formRole]}.${result.needsConfirmation ? ' They must confirm their email before first login.' : ' They can sign in now.'}`,
    )
    setModalOpen(false)
    void load()
  }

  const changeRole = async (user: Profile, role: Role) => {
    if (user.id === currentUser?.id) {
      setError('You cannot change your own role.')
      return
    }
    const { error: err } = await changeUserRole(user.id, role)
    if (err) {
      setError(err)
      return
    }
    setSuccess(`${user.full_name || user.email} is now ${ROLE_LABELS[role]}.`)
    void load()
  }

  const rename = async (user: Profile, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error: err } = await updateUserFullName(user.id, trimmed)
    if (err) {
      setError(err)
      return
    }
    setSuccess('Display name updated.')
    void load()
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Users"
        subtitle="Authorize manager and developer accounts. Only the Owner manages all roles."
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Create user
          </Button>
        }
      />

      <Alert tone="info">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Managers and developers cannot change their own roles. Only the Owner can change a user's role.
        </span>
      </Alert>

      {success && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span>
        </Alert>
      )}

      <Card padded={false}>
        <div className="flex items-center gap-3 border-b border-brand-100 p-4 dark:border-brand-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint dark:text-cream-400/50" />
            <input className="input pl-10" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} size="sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600 dark:text-gold-300">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Create manager or developer accounts to let them sign in." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <NameCell name={u.full_name} onSave={(name) => void rename(u, name)} isSelf={u.id === currentUser?.id} />
                    </td>
                    <td className="text-ink-soft dark:text-cream-300">{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="whitespace-nowrap text-ink-soft dark:text-cream-300">{formatDateTime(u.created_at)}</td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span className="text-xs text-ink-faint dark:text-cream-400/70">Current user</span>
                      ) : (
                        <select
                          className="input !w-auto !py-1.5"
                          value={u.role}
                          onChange={(e) => void changeRole(u, e.target.value as Role)}
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="developer">Developer</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create user account"
        subtitle="Sets up a Supabase Auth account and assigns a role."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {needsConfirmation && (
            <Alert tone="warning">
              Email confirmation is enabled on this project. The new user must click the confirmation link in their inbox before signing in.
            </Alert>
          )}
          <div>
            <label className="label">Full name *</label>
            <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Abubakar" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="label">Temporary password *</label>
            <input type="text" className="input" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={formRole} onChange={(e) => setFormRole(e.target.value as Role)}>
              <option value="manager">Manager</option>
              <option value="developer">Developer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitCreate()} loading={submitting}>
              <UserPlus className="h-4 w-4" /> Create user
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function NameCell({ name, onSave, isSelf }: { name: string; onSave: (name: string) => void; isSelf?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input className="input !w-44 !py-1.5" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <Button size="sm" variant="gold" onClick={() => { onSave(value); setEditing(false); }}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setValue(name); setEditing(true); }}
      className="group flex items-center gap-1.5 font-semibold text-ink dark:text-cream-100"
      title="Click to rename"
    >
      {name || '—'}
      {isSelf && <span className="badge-gray !text-[10px]">you</span>}
      <span className="text-xs text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 dark:text-cream-400/70">✎</span>
    </button>
  )
}
