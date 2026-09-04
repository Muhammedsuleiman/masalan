import { supabase } from '../lib/supabase'
import { getFriendlyError } from './authService'
import type { Sale, SaleItemInput, SaleItem, Payment, Expense, AuditLog, PaymentMethod } from '../types'

// -----------------------------------------------------------------------------
// Sales
// -----------------------------------------------------------------------------
export interface RecordSaleInput {
  business_id: string
  customer_id: string
  items: SaleItemInput[]
  amount_paid: number
  payment_method: PaymentMethod | null
  staff_id?: string | null
  sale_date?: string | null
  notes?: string | null
}

export async function recordSale(input: RecordSaleInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('record_sale', {
    p_business_id: input.business_id,
    p_customer_id: input.customer_id,
    p_items: input.items as unknown as Record<string, unknown>[],
    p_amount_paid: input.amount_paid,
    p_payment_method: input.payment_method,
    p_staff_id: input.staff_id ?? null,
    p_sale_date: input.sale_date ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) return { id: null, error: getFriendlyError(error) }
  return { id: (data as string) ?? null, error: null }
}

export async function fetchSales(opts: {
  from?: string
  to?: string
  businessId?: string | null
  search?: string
  status?: string
  customerId?: string | null
  limit?: number
}): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select(
      '*, customer:customers(id, name, customer_type), business:businesses(id, name), staff:staff(id, name), creator:profiles(id, full_name)',
    )
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts.from) query = query.gte('sale_date', opts.from)
  if (opts.to) query = query.lte('sale_date', opts.to)
  if (opts.businessId) query = query.eq('business_id', opts.businessId)
  if (opts.status) query = query.eq('payment_status', opts.status)
  if (opts.customerId) query = query.eq('customer_id', opts.customerId)
  if (opts.search && opts.search.trim()) {
    query = query.or(`customer.name.ilike.%${opts.search.trim()}%`)
  }
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return normaliseSales(data ?? [])
}

export async function fetchSale(id: string): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      '*, customer:customers(id, name, customer_type), business:businesses(id, name), staff:staff(id, name), creator:profiles(id, full_name)',
    )
    .eq('id', id)
    .single()
  if (error) return null
  return normaliseSale(data)
}

export async function fetchSaleItems(saleId: string): Promise<SaleItem[]> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('*, product:products(id, name, unit)')
    .eq('sale_id', saleId)
    .order('created_at')
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    subtotal: Number(row.subtotal),
  })) as SaleItem[]
}

export async function deleteSale(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (userId) {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'sale.deleted',
      entity_type: 'sale',
      entity_id: id,
    })
  }
  return { error: null }
}

function normaliseSale(row: Record<string, unknown>): Sale {
  const s = row as unknown as Sale
  return {
    ...s,
    subtotal: Number(s.subtotal),
    total_amount: Number(s.total_amount),
    amount_paid: Number(s.amount_paid),
    amount_outstanding: Number(s.amount_outstanding),
  }
}

function normaliseSales(rows: unknown[]): Sale[] {
  return rows.map((r) => normaliseSale(r as Record<string, unknown>))
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------
export async function recordPayment(input: {
  sale_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date?: string | null
  notes?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_sale_id: input.sale_id,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_payment_date: input.payment_date ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) return { id: null, error: getFriendlyError(error) }
  return { id: (data as string) ?? null, error: null }
}

export async function fetchPayments(opts: {
  from?: string
  to?: string
  businessId?: string | null
  saleId?: string | null
  method?: string
  limit?: number
}): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select(
      '*, sale:sales(id, business_id, customer_id, total_amount, amount_outstanding, customer:customers(id, name), business:businesses(id, name)), recorder:profiles(id, full_name)',
    )
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts.from) query = query.gte('payment_date', opts.from)
  if (opts.to) query = query.lte('payment_date', opts.to)
  if (opts.businessId) query = query.eq('sale.business_id', opts.businessId)
  if (opts.saleId) query = query.eq('sale_id', opts.saleId)
  if (opts.method) query = query.eq('payment_method', opts.method)
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
    sale: {
      ...row.sale,
      total_amount: Number(row.sale.total_amount),
      amount_outstanding: Number(row.sale.amount_outstanding),
    },
  })) as unknown as Payment[]
}

// -----------------------------------------------------------------------------
// Expenses
// -----------------------------------------------------------------------------
export async function recordExpense(input: {
  business_id: string
  category: string
  description: string
  amount: number
  expense_date?: string | null
  notes?: string | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('record_expense', {
    p_business_id: input.business_id,
    p_category: input.category,
    p_description: input.description,
    p_amount: input.amount,
    p_expense_date: input.expense_date ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) return { id: null, error: getFriendlyError(error) }
  return { id: (data as string) ?? null, error: null }
}

export async function fetchExpenses(opts: {
  from?: string
  to?: string
  businessId?: string | null
  category?: string
  limit?: number
}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*, business:businesses(id, name), recorder:profiles(id, full_name)')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts.from) query = query.gte('expense_date', opts.from)
  if (opts.to) query = query.lte('expense_date', opts.to)
  if (opts.businessId) query = query.eq('business_id', opts.businessId)
  if (opts.category) query = query.eq('category', opts.category)
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as unknown as Expense[]
}

export async function updateExpense(
  id: string,
  patch: { category?: string; description?: string; amount?: number; expense_date?: string | null; notes?: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('expenses').update(patch).eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

export async function deleteExpense(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

// -----------------------------------------------------------------------------
// Audit logs
// -----------------------------------------------------------------------------
export async function fetchAuditLogs(opts: {
  limit?: number
  action?: string
  search?: string
}): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, user:profiles(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (opts.action && opts.action !== 'all') query = query.eq('action', opts.action)
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []) as unknown as AuditLog[]
}

// -----------------------------------------------------------------------------
// Credit (outstanding) view
// -----------------------------------------------------------------------------
export async function fetchCreditSales(opts: { businessId?: string | null; search?: string }): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select(
      '*, customer:customers(id, name, customer_type, phone), business:businesses(id, name), staff:staff(id, name)',
    )
    .in('payment_status', ['credit', 'partial'])
    .order('sale_date', { ascending: false })

  if (opts.businessId) query = query.eq('business_id', opts.businessId)
  if (opts.search && opts.search.trim()) {
    query = query.or(`customer.name.ilike.%${opts.search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return normaliseSales(data ?? [])
}
