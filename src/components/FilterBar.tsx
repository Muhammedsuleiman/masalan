import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { cn } from '../lib/utils'
import { getDateRange, todayInputValue, type DatePeriod } from '../lib/dates'

export interface FilterState {
  period: DatePeriod
  customFrom: string
  customTo: string
  businessId: string
}

export const DEFAULT_FILTERS: FilterState = {
  period: 'month',
  customFrom: '',
  customTo: '',
  businessId: '',
}

export const PERIOD_OPTIONS: { value: DatePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

interface FilterBarProps {
  businesses: Array<{ id: string; name: string }>
  filters: FilterState
  onChange: (filters: FilterState) => void
  showBusiness?: boolean
  className?: string
}

export function FilterBar({ businesses, filters, onChange, showBusiness = true, className }: FilterBarProps) {
  const [showCustom, setShowCustom] = useState(filters.period === 'custom')

  const selectClass =
    'input !py-2 text-sm font-medium'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showBusiness && (
        <select
          className={selectClass + ' w-auto'}
          value={filters.businessId}
          onChange={(e) => onChange({ ...filters, businessId: e.target.value })}
          aria-label="Business"
        >
          <option value="">All Businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <div className="relative">
        <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <select
          className={cn(selectClass, 'w-auto pl-9')}
          value={filters.period}
          onChange={(e) => {
            const period = e.target.value as DatePeriod
            setShowCustom(period === 'custom')
            if (period !== 'custom') {
              onChange({ ...filters, period })
            } else {
              const range = getDateRange('custom', filters.customFrom, filters.customTo)
              onChange({ ...filters, period, customFrom: range.from.slice(0, 10), customTo: range.to.slice(0, 10) })
            }
          }}
          aria-label="Period"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input !w-auto !py-2"
            value={filters.customFrom}
            max={filters.customTo || todayInputValue()}
            onChange={(e) => onChange({ ...filters, customFrom: e.target.value })}
            aria-label="From date"
          />
          <span className="text-ink-faint">to</span>
          <input
            type="date"
            className="input !w-auto !py-2"
            value={filters.customTo}
            min={filters.customFrom}
            max={todayInputValue()}
            onChange={(e) => onChange({ ...filters, customTo: e.target.value })}
            aria-label="To date"
          />
        </div>
      )}
    </div>
  )
}
