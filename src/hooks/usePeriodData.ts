import { useEffect, useState } from 'react'
import { getDateRange, type DatePeriod } from '../lib/dates'
import { fetchPeriodData, type PeriodData } from '../services/reportService'

export function usePeriodData(opts: {
  period: DatePeriod
  customFrom?: string
  customTo?: string
  businessId?: string
}): { data: PeriodData | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<PeriodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    const range = getDateRange(opts.period, opts.customFrom, opts.customTo)

    fetchPeriodData({
      from: range.from,
      to: range.to,
      businessId: opts.businessId || null,
    })
      .then((d) => {
        if (!active) return
        setData(d)
        setError(null)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [opts.period, opts.customFrom, opts.customTo, opts.businessId])

  return { data, loading, error }
}
