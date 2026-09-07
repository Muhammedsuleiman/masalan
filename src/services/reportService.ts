import { supabase } from '../lib/supabase'
import { toKobo, sumKobo, fromKobo, formatNaira } from '../lib/money'
import { getFriendlyError } from './authService'
import type { Sale, Payment, Expense, SaleItem } from '../types'

export interface PeriodData {
  sales: Sale[]
  payments: Payment[]
  expenses: Expense[]
  items: SaleItem[]
  outstandingCredit: number
  outstandingCreditCount: number
}

export interface Stats {
  salesCount: number
  revenue: number
  paymentsCount: number
  paymentsReceived: number
  cashReceived: number
  bankReceived: number
  creditExtended: number
  creditSalesCount: number
  partialSalesCount: number
  expenseCount: number
  expensesTotal: number
  netPosition: number
  outstandingCredit: number
  outstandingCreditCount: number
  productQuantities: Record<string, { quantity: number; unit: string }>
}

export async function fetchPeriodData(opts: {
  from: string
  to: string
  businessId?: string | null
}): Promise<PeriodData> {
  const businessId = opts.businessId ?? null
  const results = await Promise.allSettled([
    fetchSalesForPeriod(opts.from, opts.to, businessId),
    fetchPaymentsForPeriod(opts.from, opts.to, businessId),
    fetchExpensesForPeriod(opts.from, opts.to, businessId),
    fetchItemsForPeriod(opts.from, opts.to, businessId),
    fetchLiveOutstanding(businessId),
  ])

  const get = <T>(index: number, fallback: T): T =>
    results[index].status === 'fulfilled' ? ((results[index] as PromiseFulfilledResult<T>).value as T) : fallback

  const [sales, payments, expenses, items, outstanding] = [
    get<Sale[]>(0, []),
    get<Payment[]>(1, []),
    get<Expense[]>(2, []),
    get<SaleItem[]>(3, []),
    get<{ total: number; count: number }>(4, { total: 0, count: 0 }),
  ]

  return {
    sales,
    payments,
    expenses,
    items,
    outstandingCredit: outstanding.total,
    outstandingCreditCount: outstanding.count,
  }
}

async function fetchSalesForPeriod(from: string, to: string, businessId: string | null): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select(
      '*, customer:customers(id, name, customer_type), business:businesses(id, name), staff:staff(id, name), creator:profiles(id, full_name)',
    )
    .gte('sale_date', from)
    .lte('sale_date', to)
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    subtotal: Number(row.subtotal),
    total_amount: Number(row.total_amount),
    amount_paid: Number(row.amount_paid),
    amount_outstanding: Number(row.amount_outstanding),
  })) as unknown as Sale[]
}

async function fetchPaymentsForPeriod(from: string, to: string, businessId: string | null): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select('*, sale:sales(id, business_id)')
    .gte('payment_date', from)
    .lte('payment_date', to)
  if (businessId) query = query.eq('sale.business_id', businessId)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as unknown as Payment[]
}

async function fetchExpensesForPeriod(from: string, to: string, businessId: string | null): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('status', 'active')
    .gte('expense_date', from)
    .lte('expense_date', to)
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as unknown as Expense[]
}

async function fetchItemsForPeriod(from: string, to: string, businessId: string | null): Promise<SaleItem[]> {
  let query = supabase
    .from('sale_items')
    .select('sale_id, product_id, quantity, unit_price, subtotal, product:products(id, name, unit, business_id)')
    .gte('sales.sale_date', from)
    .lte('sales.sale_date', to)
  if (businessId) query = query.eq('product.business_id', businessId)
  const { data, error } = await query
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []).map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    subtotal: Number(row.subtotal),
  })) as unknown as SaleItem[]
}

async function fetchLiveOutstanding(businessId: string | null): Promise<{ total: number; count: number }> {
  let query = supabase
    .from('sales')
    .select('amount_outstanding')
    .gt('amount_outstanding', 0)
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) return { total: 0, count: 0 }
  const rows = (data ?? []) as Array<{ amount_outstanding: string | number }>
  return {
    total: fromKobo(rows.reduce((acc, r) => acc + toKobo(r.amount_outstanding), 0)),
    count: rows.length,
  }
}

export async function fetchOutstandingByBusiness(): Promise<Map<string, { total: number; count: number }>> {
  const { data, error } = await supabase
    .from('sales')
    .select('business_id, amount_outstanding')
    .gt('amount_outstanding', 0)
  if (error) return new Map()
  const map = new Map<string, { total: number; count: number }>()
  for (const row of data ?? []) {
    const r = row as unknown as { business_id: string; amount_outstanding: string | number }
    const current = map.get(r.business_id) ?? { total: 0, count: 0 }
    current.total += toKobo(r.amount_outstanding)
    current.count += 1
    map.set(r.business_id, current)
  }
  const result = new Map<string, { total: number; count: number }>()
  for (const [id, v] of map) result.set(id, { total: fromKobo(v.total), count: v.count })
  return result
}

export function computeStats(data: PeriodData): Stats {
  const sales = data.sales
  const payments = data.payments
  const expenses = data.expenses

  const revenue = sumKobo(...sales.map((s) => s.total_amount))
  const paymentsReceived = sumKobo(...payments.map((p) => p.amount))
  const cashReceived = sumKobo(...payments.filter((p) => p.payment_method === 'cash').map((p) => p.amount))
  const bankReceived = sumKobo(...payments.filter((p) => p.payment_method === 'bank_transfer').map((p) => p.amount))

  const creditSales = sales.filter((s) => s.payment_status === 'credit' || s.payment_status === 'partial')
  const creditExtended = sumKobo(...creditSales.map((s) => s.total_amount))

  const expensesTotal = sumKobo(...expenses.map((e) => e.amount))

  const productQuantities: Record<string, { quantity: number; unit: string }> = {}
  for (const item of data.items) {
    const name = item.product?.name ?? 'Unknown'
    const unit = item.product?.unit ?? 'unit'
    const current = productQuantities[name]
    productQuantities[name] = {
      quantity: (current?.quantity ?? 0) + item.quantity,
      unit,
    }
  }

  return {
    salesCount: sales.length,
    revenue: fromKobo(revenue),
    paymentsCount: payments.length,
    paymentsReceived: fromKobo(paymentsReceived),
    cashReceived: fromKobo(cashReceived),
    bankReceived: fromKobo(bankReceived),
    creditExtended: fromKobo(creditExtended),
    creditSalesCount: creditSales.length,
    partialSalesCount: sales.filter((s) => s.payment_status === 'partial').length,
    expenseCount: expenses.length,
    expensesTotal: fromKobo(expensesTotal),
    netPosition: fromKobo(paymentsReceived - expensesTotal),
    outstandingCredit: data.outstandingCredit,
    outstandingCreditCount: data.outstandingCreditCount,
    productQuantities,
  }
}

export interface DayPoint {
  date: string
  label: string
  revenue: number
  payments: number
  expenses: number
}

export function buildDaySeries(sales: Sale[], payments: Payment[], expenses: Expense[]): DayPoint[] {
  const map = new Map<string, DayPoint>()
  const key = (d: string) => {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return 'unknown'
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  for (const s of sales) {
    const k = key(s.sale_date)
    const point = map.get(k) ?? { date: k, label: k, revenue: 0, payments: 0, expenses: 0 }
    point.revenue += toKobo(s.total_amount)
    map.set(k, point)
  }
  for (const p of payments) {
    const k = key(p.payment_date)
    const point = map.get(k) ?? { date: k, label: k, revenue: 0, payments: 0, expenses: 0 }
    point.payments += toKobo(p.amount)
    map.set(k, point)
  }
  for (const e of expenses) {
    const k = key(e.expense_date)
    const point = map.get(k) ?? { date: k, label: k, revenue: 0, payments: 0, expenses: 0 }
    point.expenses += toKobo(e.amount)
    map.set(k, point)
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, p]) => ({
      ...p,
      label: formatShortDay(date),
      revenue: fromKobo(p.revenue),
      payments: fromKobo(p.payments),
      expenses: fromKobo(p.expenses),
    }))
}

export interface BusinessComparePoint {
  name: string
  revenue: number
  payments: number
  expenses: number
}

export function buildBusinessComparison(
  businessNames: Map<string, string>,
  sales: Sale[],
  payments: Payment[],
  expenses: Expense[],
): BusinessComparePoint[] {
  const byId = new Map<string, BusinessComparePoint>()

  for (const s of sales) {
    const name = businessNames.get(s.business_id) ?? 'Unknown'
    const point = byId.get(s.business_id) ?? { name, revenue: 0, payments: 0, expenses: 0 }
    point.revenue += toKobo(s.total_amount)
    byId.set(s.business_id, point)
  }
  for (const p of payments) {
    const bid = (p as unknown as { sale?: { business_id?: string } }).sale?.business_id
    if (!bid) continue
    const name = businessNames.get(bid) ?? 'Unknown'
    const point = byId.get(bid) ?? { name, revenue: 0, payments: 0, expenses: 0 }
    point.payments += toKobo(p.amount)
    byId.set(bid, point)
  }
  for (const e of expenses) {
    const name = businessNames.get(e.business_id) ?? 'Unknown'
    const point = byId.get(e.business_id) ?? { name, revenue: 0, payments: 0, expenses: 0 }
    point.expenses += toKobo(e.amount)
    byId.set(e.business_id, point)
  }

  return [...byId.values()].map((p) => ({
    ...p,
    revenue: fromKobo(p.revenue),
    payments: fromKobo(p.payments),
    expenses: fromKobo(p.expenses),
  }))
}

function formatShortDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export { formatNaira }
