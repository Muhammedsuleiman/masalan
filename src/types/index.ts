export type Role = 'owner' | 'manager' | 'developer'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  price: number
  unit: string
  active: boolean
  created_at: string
  updated_at: string
  business_name?: string
}

export type CustomerType = 'individual' | 'business'

export interface Customer {
  id: string
  name: string
  customer_type: CustomerType
  business_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  business_id: string | null
  name: string
  phone: string | null
  position: string | null
  active: boolean
  created_at: string
  updated_at: string
  business_name?: string
}

export type PaymentStatus = 'paid' | 'partial' | 'credit'
export type PaymentMethod = 'cash' | 'bank_transfer'

export interface Sale {
  id: string
  business_id: string
  customer_id: string
  created_by: string | null
  staff_id: string | null
  sale_date: string
  subtotal: number
  total_amount: number
  amount_paid: number
  amount_outstanding: number
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; customer_type: string }
  business?: { id: string; name: string }
  staff?: { id: string; name: string } | null
  creator?: { id: string; full_name: string } | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  product?: { id: string; name: string; unit: string; business_id: string }
}

export interface Payment {
  id: string
  sale_id: string
  amount: number
  payment_method: PaymentMethod
  recorded_by: string | null
  payment_date: string
  notes: string | null
  created_at: string
  sale?: {
    id: string
    business_id: string
    customer_id: string
    total_amount: number
    amount_outstanding: number
    customer?: { id: string; name: string }
    business?: { id: string; name: string }
  }
  recorder?: { id: string; full_name: string } | null
}

export interface Expense {
  id: string
  business_id: string
  category: string
  description: string
  amount: number
  expense_date: string
  recorded_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  business?: { id: string; name: string }
  recorder?: { id: string; full_name: string } | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user?: { id: string; full_name: string; email: string } | null
}

export interface SaleItemInput {
  product_id: string
  quantity: number
}

export interface ConfigDiagnostics {
  urlConfigured: boolean
  keyConfigured: boolean
  url: string
  keyPrefix: string
}
