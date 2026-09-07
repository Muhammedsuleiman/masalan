import { useEffect, useMemo, useState } from 'react'
import { Package, Search, Pencil, CheckCircle2, Info, Archive, ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { useBusinesses } from '../hooks/useBusinesses'
import { fetchProducts, createProduct, updateProduct, fetchStockSummary } from '../services/dataService'
import type { Product, InventoryStock } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { formatNaira, formatQuantity } from '../lib/money'
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
  const [stockMap, setStockMap] = useState<Record<string, InventoryStock>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formBusiness, setFormBusiness] = useState('')
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formUnit, setFormUnit] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formCostPrice, setFormCostPrice] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formOpeningStock, setFormOpeningStock] = useState('')
  const [formReorderLevel, setFormReorderLevel] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, stock] = await Promise.all([fetchProducts(true), fetchStockSummary()])
      setProducts(data)
      setStockMap(Object.fromEntries(stock.map((s) => [s.product_id, s])))
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
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [products, search, businessFilter, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setError(null)
    setFormBusiness(businesses[0]?.id ?? '')
    setFormName('')
    setFormPrice('')
    setFormUnit('unit')
    setFormCategory('')
    setFormCostPrice('')
    setFormDescription('')
    setFormOpeningStock('')
    setFormReorderLevel('')
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setError(null)
    setFormBusiness(p.business_id)
    setFormName(p.name)
    setFormPrice(String(p.price))
    setFormUnit(p.unit)
    setFormCategory(p.category ?? '')
    setFormCostPrice(p.cost_price !== null && p.cost_price !== undefined ? String(p.cost_price) : '')
    setFormDescription(p.description ?? '')
    setFormOpeningStock(String(p.opening_stock))
    setFormReorderLevel(String(p.reorder_level))
    setModalOpen(true)
  }

  const toggleActive = async (p: Product) => {
    const { error: err } = await updateProduct(p.id, { active: !p.active })
    if (err) {
      setError(err)
      return
    }
    setSuccess(p.active ? `${p.name} marked unavailable.` : `${p.name} restored.`)
    void load()
  }

  const submit = async () => {
    const price = parseAmount(formPrice)
    const costPrice = formCostPrice.trim() ? parseAmount(formCostPrice) : null
    const openingStock = formOpeningStock.trim() ? parseAmount(formOpeningStock) : null
    const reorderLevel = formReorderLevel.trim() ? parseAmount(formReorderLevel) : null
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
    if (costPrice !== null && costPrice < 0) {
      setError('Cost price must be 0 or more.')
      return
    }
    setSubmitting(true)
    const payload = {
      name: formName.trim(),
      price,
      unit: formUnit,
      category: formCategory.trim() || null,
      cost_price: costPrice,
      description: formDescription.trim() || null,
      opening_stock: openingStock ?? 0,
      reorder_level: reorderLevel ?? 0,
    }
    let result: { id: string | null; error: string | null }
    if (editing) {
      const r = await updateProduct(editing.id, payload)
      result = { id: editing.id, error: r.error }
    } else {
      result = await createProduct({ business_id: formBusiness, ...payload })
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
        subtitle="Current prices across all business operations. Past sales always keep their original price."
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
          <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Available</option>
            <option value="inactive">Unavailable</option>
          </select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-brand-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Products are managed by the owner. Add your first product to start selling." />
        ) : (
          <div className="table-wrap">
<table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Business</th>
                    <th>Category</th>
                    <th className="!text-right">Price</th>
                    <th className="!text-right">Cost</th>
                    <th>Unit</th>
                    <th className="!text-right">In stock</th>
                    <th className="!text-right">Reorder at</th>
                    <th>Status</th>
                    {isOwner && <th className="!text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const stock = stockMap[p.id]
                    const available = stock ? stock.available : p.opening_stock
                    const low = stock ? stock.reorder_level > 0 && stock.available <= stock.reorder_level : false
                    return (
                    <tr key={p.id}>
                      <td className="font-semibold text-ink">
                        {p.name}
                        {p.description && <p className="max-w-[200px] truncate text-xs text-ink-faint">{p.description}</p>}
                      </td>
                      <td className="text-ink-soft">{p.business_name ?? '—'}</td>
                      <td className="text-ink-soft">{p.category ?? '—'}</td>
                      <td className="!text-right font-bold text-brand-950">{formatNaira(p.price)}</td>
                      <td className="!text-right text-ink-soft">{p.cost_price !== null ? formatNaira(p.cost_price) : '—'}</td>
                      <td className="text-ink-soft">{p.unit}</td>
                      <td className="!text-right">
                        <span className={`font-semibold ${low ? 'text-red-600' : available > 0 ? 'text-emerald-700' : 'text-ink-faint'}`}>
                          {formatQuantity(available)}
                        </span>
                        {low && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" aria-label="Low stock" />}
                      </td>
                      <td className="!text-right text-ink-soft">{p.reorder_level > 0 ? formatQuantity(p.reorder_level) : '—'}</td>
                      <td>
                        <Badge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Available' : 'Unavailable'}</Badge>
                      </td>
                      {isOwner && (
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => openEdit(p)} className="rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50" aria-label="Edit product">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleActive(p)}
                              className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-brand-50"
                              aria-label={p.active ? 'Mark unavailable' : 'Restore product'}
                              title={p.active ? 'Mark unavailable' : 'Restore product'}
                            >
                              {p.active ? <Archive className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )})}
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
        size="lg"
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
              <label className="label">Cost price (₦)</label>
              <input type="number" min="0" step="0.01" className="input" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="loaf / bag / unit" />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. Bakery" />
            </div>
            <div>
              <label className="label">Opening stock</label>
              <input type="number" min="0" step="0.01" className="input" value={formOpeningStock} onChange={(e) => setFormOpeningStock(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Reorder at (low-stock alert)</label>
              <input type="number" min="0" step="0.01" className="input" value={formReorderLevel} onChange={(e) => setFormReorderLevel(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input className="input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional" />
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
