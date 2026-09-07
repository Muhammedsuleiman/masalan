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
  customerId?: string | null
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
  if (opts.customerId) query = query.eq('sale.customer_id', opts.customerId)
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
  payment_method?: PaymentMethod | null
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('record_expense', {
    p_business_id: input.business_id,
    p_category: input.category,
    p_description: input.description,
    p_amount: input.amount,
    p_expense_date: input.expense_date ?? null,
    p_notes: input.notes ?? null,
    p_payment_method: input.payment_method ?? null,
  })
  if (error) return { id: null, error: getFriendlyError(error) }
  return { id: (data as string) ?? null, error: null }
}

export async function fetchExpenses(opts: {
  from?: string
  to?: string
  businessId?: string | null
  category?: string
  status?: string
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
  if (opts.status && opts.status !== 'all') query = query.eq('status', opts.status)
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as unknown as Expense[]
}

export async function updateExpense(
  id: string,
  patch: {
    category?: string
    description?: string
    amount?: number
    expense_date?: string | null
    notes?: string | null
    payment_method?: PaymentMethod | null
    status?: 'active' | 'voided' | 'archived'
    receipt_url?: string | null
  },
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

// -----------------------------------------------------------------------------
// Transaction ledger (combined feed)
// -----------------------------------------------------------------------------
export interface TransactionEntry {
  id: string
  type: 'sale' | 'payment' | 'expense'
  date: string
  business_id: string
  business_name?: string
  customer_name?: string
  description: string
  amount: number
  payment_method: string | null
  recorded_by?: string | null
  status: string
  source_id: string
}

export async function fetchTransactions(opts: {
  from?: string
  to?: string
  businessId?: string | null
  type?: string
  search?: string
  limit?: number
}): Promise<TransactionEntry[]> {
  const [salesRes, paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, sale_date, business_id, total_amount, payment_status, customer:customers(name), business:businesses(name), creator:profiles(full_name)')
      .gte('sale_date', opts.from ?? '1900-01-01')
      .lte('sale_date', opts.to ?? '2999-12-31')
      .order('sale_date', { ascending: false }),
    supabase
      .from('payments')
      .select('id, payment_date, payment_method, amount, sale:sales(id, business_id, customer:customers(name), business:businesses(name)), recorder:profiles(full_name)')
      .gte('payment_date', opts.from ?? '1900-01-01')
      .lte('payment_date', opts.to ?? '2999-12-31')
      .order('payment_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, expense_date, business_id, category, description, amount, payment_method, status, business:businesses(name), recorder:profiles(full_name)')
      .gte('expense_date', opts.from ?? '1900-01-01')
      .lte('expense_date', opts.to ?? '2999-12-31')
      .order('expense_date', { ascending: false }),
  ])

  if (opts.businessId) {
    // Filter in JS since we use join relationships
  }

  const entries: TransactionEntry[] = []

  for (const s of salesRes.data ?? []) {
    const row = s as unknown as {
      id: string
      sale_date: string
      business_id: string
      total_amount: string | number
      payment_status: string
      customer?: { name: string } | null
      business?: { name: string } | null
      creator?: { full_name: string } | null
    }
    if (opts.businessId && row.business_id !== opts.businessId) continue
    entries.push({
      id: `sale-${row.id}`,
      type: 'sale',
      date: row.sale_date,
      business_id: row.business_id,
      business_name: row.business?.name,
      customer_name: row.customer?.name,
      description: `Sale to ${row.customer?.name ?? 'customer'}`,
      amount: Number(row.total_amount),
      payment_method: null,
      recorded_by: row.creator?.full_name,
      status: row.payment_status,
      source_id: row.id,
    })
  }

  for (const p of paymentsRes.data ?? []) {
    const row = p as unknown as {
      id: string
      payment_date: string
      payment_method: string
      amount: string | number
      sale?: { id: string; business_id: string; customer?: { name: string } | null; business?: { name: string } | null } | null
      recorder?: { full_name: string } | null
    }
    if (opts.businessId && row.sale?.business_id !== opts.businessId) continue
    entries.push({
      id: `payment-${row.id}`,
      type: 'payment',
      date: row.payment_date,
      business_id: row.sale?.business_id ?? '',
      business_name: row.sale?.business?.name,
      customer_name: row.sale?.customer?.name,
      description: `Payment from ${row.sale?.customer?.name ?? 'customer'}`,
      amount: Number(row.amount),
      payment_method: row.payment_method,
      recorded_by: row.recorder?.full_name,
      status: 'paid',
      source_id: row.id,
    })
  }

  for (const e of expensesRes.data ?? []) {
    const row = e as unknown as {
      id: string
      expense_date: string
      business_id: string
      category: string
      description: string
      amount: string | number
      payment_method: string | null
      status: string
      business?: { name: string } | null
      recorder?: { full_name: string } | null
    }
    if (opts.businessId && row.business_id !== opts.businessId) continue
    entries.push({
      id: `expense-${row.id}`,
      type: 'expense',
      date: row.expense_date,
      business_id: row.business_id,
      business_name: row.business?.name,
      customer_name: undefined,
      description: row.description,
      amount: Number(row.amount),
      payment_method: row.payment_method,
      recorded_by: row.recorder?.full_name,
      status: row.status,
      source_id: row.id,
    })
  }

  if (opts.type && opts.type !== 'all') {
    return entries
      .filter((e) => e.type === opts.type)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, opts.limit ?? 200)
  }

  if (opts.search && opts.search.trim()) {
    const q = opts.search.toLowerCase()
    return entries
      .filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.customer_name ?? '').toLowerCase().includes(q) ||
          (e.business_name ?? '').toLowerCase().includes(q) ||
          (e.payment_method ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, opts.limit ?? 200)
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, opts.limit ?? 200)
}

// -----------------------------------------------------------------------------
// Customer credit summary (aggregated by customer)
// -----------------------------------------------------------------------------
export interface CustomerCreditSummary {
  customer_id: string
  customer_name: string
  customer_phone: string | null
  total_outstanding: number
  open_sale_count: number
}

export async function fetchCustomerCreditSummaries(search?: string): Promise<CustomerCreditSummary[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, customer_id, amount_outstanding, payment_status, customer:customers(id, name, phone)',
    )
    .gt('amount_outstanding', 0)
    .order('customer.name', { ascending: true })

  if (error) throw new Error(getFriendlyError(error))

  const map = new Map<string, CustomerCreditSummary>()
  for (const row of data ?? []) {
    const r = row as unknown as {
      customer_id: string
      amount_outstanding: string | number
      customer?: { id: string; name: string; phone: string | null } | null
    }
    if (!r.customer) continue
    const current = map.get(r.customer_id) ?? {
      customer_id: r.customer_id,
      customer_name: r.customer.name,
      customer_phone: r.customer.phone,
      total_outstanding: 0,
      open_sale_count: 0,
    }
    current.total_outstanding += Number(r.amount_outstanding)
    current.open_sale_count += 1
    map.set(r.customer_id, current)
  }

  let result = [...map.values()].sort((a, b) => b.total_outstanding - a.total_outstanding)

  if (search && search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.customer_phone ?? '').toLowerCase().includes(q),
    )
  }

  return result
}
