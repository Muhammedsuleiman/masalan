import { useEffect, useMemo, useState } from 'react'
import { Package, Search, Pencil, CheckCircle2, Info } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchProducts, createProduct, updateProduct } from '../services/dataService'
import type { Product } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { formatNaira } from '../lib/money'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { parseAmount } from '../lib/money'

export default function ProductsPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const { businesses } = useBusinesses()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formBusiness, setFormBusiness] = useState('')
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formUnit, setFormUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts(true)
      setProducts(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => {
    return products.filter((p) => {
      if (businessFilter && p.business_id !== businessFilter) return false
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, search, businessFilter])

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setFormBusiness(businesses[0]?.id ?? '')
    setFormName('')
    setFormPrice('')
    setFormUnit('unit')
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setError(null)
    setFormBusiness(p.business_id)
    setFormName(p.name)
    setFormPrice(String(p.price))
    setFormUnit(p.unit)
    setModalOpen(true)
  }

  const submit = async () => {
    const price = parseAmount(formPrice)
    if (!formBusiness) {
      setError('Select a business.')
      return
    }
    if (!formName.trim()) {
      setError('Enter a product name.')
      return
    }
    if (price === null || price < 0) {
      setError('Enter a valid price (0 or more).')
      return
    }
    setSubmitting(true)
    let result: { id: string | null; error: string | null }
    if (editing) {
      const r = await updateProduct(editing.id, { name: formName.trim(), price, unit: formUnit })
      result = { id: editing.id, error: r.error }
    } else {
      result = await createProduct({ business_id: formBusiness, name: formName.trim(), price, unit: formUnit })
    }
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(editing ? 'Product updated. Historical sales keep their original prices.' : 'Product created.')
    setModalOpen(false)
    void load()
  }

  return (
    <div className="animate-fadeUp space-y-6">
      <PageHeader
        title="Products"
        subtitle="Current prices for both businesses. Past sales always keep their original price."
        actions={
          isOwner ? (
            <Button onClick={openCreate}>
              <Package className="h-4 w-4" /> Add product
            </Button>
          ) : undefined
        }
      />

      {success && (
        <Alert tone="success" className="animate-fadeUp">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</span>
        </Alert>
      )}

      <Alert tone="info" className="!bg-gold-50 !border-gold-200 !text-gold-900">
        <span className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0" /> Changing a product's current price does not change historical transactions — each sale stores the unit price at the time of the sale.</span>
      </Alert>

      <Card padded={false}>
        <div className="flex flex-col gap-2 border-b border-brand-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-10" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        ) : visible.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Products are seeded on first setup (Bread ₦500, Bread ₦1,000, Pure Water ₦400)." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Business</th>
                  <th className="!text-right">Current price</th>
                  <th>Unit</th>
                  <th>Status</th>
                  {isOwner && <th className="!text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-ink">{p.name}</td>
                    <td className="text-ink-soft">{p.business_name ?? '—'}</td>
                    <td className="!text-right font-bold text-brand-950">{formatNaira(p.price)}</td>
                    <td className="text-ink-soft">{p.unit}</td>
                    <td>
                      <Badge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    {isOwner && (
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openEdit(p)} className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50" aria-label="Edit product">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
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
        title={editing ? 'Edit product' : 'Add product'}
        subtitle="Changing a price affects new sales only."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Business *</label>
              <select className="input" value={formBusiness} onChange={(e) => setFormBusiness(e.target.value)}>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Product name *</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Masalan Bread" />
            </div>
            <div>
              <label className="label">Price (₦) *</label>
              <input type="number" min="0" step="0.01" className="input" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="500.00" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="loaf / bag / unit" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} loading={submitting}>
              {editing ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
