import { supabase } from '../lib/supabase'
import { getFriendlyError } from './authService'
import { toNumber } from '../lib/money'
import type { Business, Customer, InventoryStock, Product, Staff, ExpenseCategory } from '../types'

// -----------------------------------------------------------------------------
// Businesses
// -----------------------------------------------------------------------------
export async function fetchBusinesses(includeInactive = false): Promise<Business[]> {
  let query = supabase.from('businesses').select('*').order('name')
  if (!includeInactive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []) as Business[]
}

export async function updateBusiness(
  id: string,
  patch: { name?: string; description?: string | null; active?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('businesses').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('business.updated', 'business', id, patch)
  return { error: null }
}

export async function createBusiness(patch: {
  name: string
  description?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('businesses').insert(patch).select('id').single()
  if (error) return { id: null, error: getFriendlyError(error) }
  await logAudit('business.created', 'business', data.id, patch)
  return { id: data.id, error: null }
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------
export async function fetchProducts(includeInactive = false): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, business:businesses(name)')
    .order('name')
  if (!includeInactive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
    cost_price: row.cost_price !== null && row.cost_price !== undefined ? Number(row.cost_price) : null,
    opening_stock: toNumber(row.opening_stock ?? 0),
    reorder_level: toNumber(row.reorder_level ?? 0),
    business_name: (row as unknown as { business: { name: string } }).business?.name,
  })) as Product[]
}

export async function fetchStockSummary(businessId?: string): Promise<InventoryStock[]> {
  let query = supabase
    .from('inventory_stock')
    .select('*')
    .order('name')
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
    opening_stock: toNumber(row.opening_stock),
    reorder_level: toNumber(row.reorder_level),
    sold_quantity: toNumber(row.sold_quantity),
    available: toNumber(row.available),
  })) as InventoryStock[]
}

export async function fetchProductsByBusiness(businessId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('price')
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
    cost_price: row.cost_price !== null && row.cost_price !== undefined ? Number(row.cost_price) : null,
    opening_stock: toNumber(row.opening_stock ?? 0),
    reorder_level: toNumber(row.reorder_level ?? 0),
  })) as Product[]
}

export async function createProduct(patch: {
  business_id: string
  name: string
  price: number
  unit: string
  category?: string | null
  cost_price?: number | null
  description?: string | null
  opening_stock?: number
  reorder_level?: number
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('products').insert(patch).select('id').single()
  if (error) return { id: null, error: getFriendlyError(error) }
  await logAudit('product.created', 'product', data.id, patch)
  return { id: data.id, error: null }
}

export async function updateProduct(
  id: string,
  patch: {
    name?: string
    price?: number
    unit?: string
    active?: boolean
    category?: string | null
    cost_price?: number | null
    description?: string | null
    opening_stock?: number
    reorder_level?: number
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('product.updated', 'product', id, patch)
  return { error: null }
}

// -----------------------------------------------------------------------------
// Customers
// -----------------------------------------------------------------------------
export async function fetchCustomers(search?: string): Promise<Customer[]> {
  let query = supabase.from('customers').select('*').order('name')
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,business_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`)
  }
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []) as Customer[]
}

export async function createCustomer(patch: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<{
  id: string | null
  error: string | null
}> {
  const { data, error } = await supabase.from('customers').insert(patch).select('id').single()
  if (error) return { id: null, error: getFriendlyError(error) }
  await logAudit('customer.created', 'customer', data.id, { name: patch.name })
  return { id: data.id, error: null }
}

export async function updateCustomer(
  id: string,
  patch: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('customers').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('customer.updated', 'customer', id, { name: patch.name })
  return { error: null }
}

export async function deleteCustomer(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('customer.deleted', 'customer', id)
  return { error: null }
}

// -----------------------------------------------------------------------------
// Staff
// -----------------------------------------------------------------------------
export async function fetchStaff(search?: string): Promise<Staff[]> {
  let query = supabase
    .from('staff')
    .select('*, business:businesses(name)')
    .order('name')
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,position.ilike.%${search.trim()}%`)
  }
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    business_name: (row as unknown as { business: { name: string } }).business?.name,
  })) as Staff[]
}

export async function createStaff(patch: {
  business_id: string | null
  name: string
  phone?: string | null
  position?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('staff').insert(patch).select('id').single()
  if (error) return { id: null, error: getFriendlyError(error) }
  await logAudit('staff.created', 'staff', data.id, { name: patch.name })
  return { id: data.id, error: null }
}

export async function updateStaff(
  id: string,
  patch: {
    business_id?: string | null
    name?: string
    phone?: string | null
    position?: string | null
    active?: boolean
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('staff').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('staff.updated', 'staff', id, { name: patch.name })
  return { error: null }
}

export async function deleteStaff(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('staff.deleted', 'staff', id)
  return { error: null }
}

// -----------------------------------------------------------------------------
// Expense Categories
// -----------------------------------------------------------------------------
export async function fetchExpenseCategories(includeInactive = false): Promise<ExpenseCategory[]> {
  let query = supabase.from('expense_categories').select('*').order('sort_order').order('name')
  if (!includeInactive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []) as ExpenseCategory[]
}

export async function createExpenseCategory(name: string, sortOrder = 0): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('expense_categories').insert({ name, sort_order: sortOrder }).select('id').single()
  if (error) return { id: null, error: getFriendlyError(error) }
  await logAudit('expense_category.created', 'expense_category', data.id, { name })
  return { id: data.id, error: null }
}

export async function updateExpenseCategory(
  id: string,
  patch: { name?: string; sort_order?: number; active?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('expense_categories').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  await logAudit('expense_category.updated', 'expense_category', id, patch)
  return { error: null }
}

// -----------------------------------------------------------------------------
// Audit log helper (shared)
// -----------------------------------------------------------------------------
async function logAudit(action: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
  })
}
