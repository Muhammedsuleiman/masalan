import { useState, type FormEvent } from 'react'
import type { Customer, CustomerType } from '../../types'
import { parseAmount } from '../../lib/money'

export interface CustomerFormValues {
  name: string
  customer_type: CustomerType
  business_name: string
  phone: string
  email: string
  address: string
  notes: string
}

export function emptyCustomerValues(): CustomerFormValues {
  return {
    name: '',
    customer_type: 'individual',
    business_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  }
}

export function customerToValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    customer_type: customer.customer_type,
    business_name: customer.business_name ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  }
}

export function CustomerForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial: CustomerFormValues
  onSubmit: (values: CustomerFormValues) => void
  submitting: boolean
}) {
  const [values, setValues] = useState<CustomerFormValues>(initial)

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) return
    onSubmit(values)
  }

  const isBusiness = values.customer_type === 'business'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Customer type</label>
          <select
            className="input"
            value={values.customer_type}
            onChange={(e) => set('customer_type', e.target.value as CustomerType)}
          >
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={isBusiness ? 'e.g. Ahmed' : 'e.g. Musa Ibrahim'}
            required
          />
        </div>
        <div>
          <label className="label">Business name {isBusiness ? '*' : '(optional)'}</label>
          <input
            className="input"
            value={values.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            placeholder="e.g. Ahmed Stores"
            required={isBusiness}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="0803 000 0000"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address</label>
          <input
            className="input"
            value={values.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Address (optional)"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[72px]"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional notes (optional)"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">* required</p>
        <button type="submit" className="btn-primary" disabled={submitting || !values.name.trim()}>
          {submitting ? 'Saving…' : 'Save customer'}
        </button>
      </div>
    </form>
  )
}

export { parseAmount }
