import { useEffect, useState } from 'react'
import { fetchBusinesses } from '../services/dataService'
import type { Business } from '../types'

export function useBusinesses(): {
  businesses: Business[]
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchBusinesses()
      .then((data) => {
        if (!active) return
        setBusinesses(data)
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
  }, [tick])

  return { businesses, loading, error, reload: () => setTick((t) => t + 1) }
}
