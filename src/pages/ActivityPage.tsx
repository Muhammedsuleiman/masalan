import { useEffect, useMemo, useState } from 'react'
import { ScrollText, Search, RefreshCw } from 'lucide-react'
import { fetchAuditLogs } from '../services/financeService'
import type { AuditLog } from '../types'
import { formatDateTime } from '../lib/money'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import { Button } from '../components/ui/Button'

const PAGE_SIZE = 15
const ACTION_FILTERS = [
  { value: 'all', label: 'All actions' },
  { value: 'sale.created', label: 'Sale created' },
  { value: 'sale.deleted', label: 'Sale deleted' },
  { value: 'payment.recorded', label: 'Payment recorded' },
  { value: 'expense.recorded', label: 'Expense recorded' },
  { value: 'customer.created', label: 'Customer created' },
  { value: 'product.updated', label: 'Product updated' },
  { value: 'user.created', label: 'User created' },
  { value: 'user.role_changed', label: 'User role changed' },
]

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const data = await fetchAuditLogs({ action })
      setLogs(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setPage(1)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(
      (l) =>
        (l.user?.full_name ?? '').toLowerCase().includes(q) ||
        (l.user?.email ?? '').toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.entity_id ?? '').toLowerCase().includes(q),
    )
  }, [logs, search])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const pageRows = useMemo(() => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [visible, page])

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Activity log"
        subtitle="Important business and system actions. Records are written by the system and are difficult for ordinary users to alter."
        actions={
          <Button variant="outline" onClick={() => void load(false)} loading={refreshing}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search user, action or record id…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input !w-auto" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTION_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No activity found" description="Actions like sales, payments and updates will appear here." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Record</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap text-ink-soft">{formatDateTime(log.created_at)}</td>
                      <td className="font-semibold text-ink">{log.user?.full_name || log.user?.email || '—'}</td>
                      <td><Badge tone="brown">{log.action}</Badge></td>
                      <td className="text-ink-soft">{log.entity_type || '—'}</td>
                      <td className="max-w-[120px] truncate font-mono text-xs text-ink-faint">{log.entity_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={visible.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
