export type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface DateRange {
  from: string
  to: string
  label: string
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export function getDateRange(period: DatePeriod, customFrom?: string, customTo?: string): DateRange {
  const now = new Date()

  switch (period) {
    case 'today': {
      const from = startOfDay(now)
      // End of day (23:59:59.999 local) so morning sales are included
      const to = new Date(from)
      to.setHours(23, 59, 59, 999)
      return { from: from.toISOString(), to: to.toISOString(), label: 'Today' }
    }
    case 'yesterday': {
      const day = new Date(now)
      day.setDate(day.getDate() - 1)
      const from = startOfDay(day)
      const to = new Date(from)
      to.setHours(23, 59, 59, 999)
      return { from: from.toISOString(), to: to.toISOString(), label: 'Yesterday' }
    }
    case 'week': {
      const from = startOfWeek(now)
      const to = new Date(from)
      to.setDate(to.getDate() + 6)
      to.setHours(23, 59, 59, 999)
      return { from: from.toISOString(), to: to.toISOString(), label: 'This week' }
    }
    case 'month': {
      const from = startOfMonth(now)
      const to = new Date(from)
      to.setMonth(to.getMonth() + 1)
      to.setDate(0)
      to.setHours(23, 59, 59, 999)
      return { from: from.toISOString(), to: to.toISOString(), label: 'This month' }
    }
    case 'custom': {
      const fromDate = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfWeek(now)
      const toDate = customTo ? new Date(`${customTo}T23:59:59.999`) : now
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return { from: startOfWeek(now).toISOString(), to: now.toISOString(), label: 'Custom range' }
      }
      return { from: fromDate.toISOString(), to: toDate.toISOString(), label: 'Custom range' }
    }
  }
}

export function dateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayInputValue(): string {
  return dateInputValue(new Date())
}

export function toLocalDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return dateInputValue(d)
}
