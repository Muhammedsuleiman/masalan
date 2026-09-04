/**
 * Money helpers.
 *
 * All monetary arithmetic is done in integer kobo (100 kobo = ₦1) to avoid
 * floating-point rounding errors. Postgres `numeric` columns come back from
 * Supabase as strings, so every value is normalised through `toKobo` first.
 */

export function toKobo(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function fromKobo(kobo: number): number {
  return kobo / 100
}

export function sumKobo(...values: Array<number | string | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + toKobo(v), 0)
}

export function toNumber(value: number | string | null | undefined): number {
  return fromKobo(toKobo(value))
}

export function formatNaira(value: number | string | null | undefined): string {
  const k = toKobo(value)
  const sign = k < 0 ? '-' : ''
  const abs = Math.abs(k)
  const whole = Math.floor(abs / 100).toLocaleString('en-NG')
  const fraction = String(abs % 100).padStart(2, '0')
  return `${sign}₦${whole}.${fraction}`
}

export function formatNairaWhole(value: number | string | null | undefined): string {
  const k = toKobo(value)
  const sign = k < 0 ? '-' : ''
  const abs = Math.abs(k)
  const whole = Math.floor(abs / 100).toLocaleString('en-NG')
  return `${sign}₦${whole}`
}

/** Parse a user-entered amount like "1,500" or "1500.5" into a plain number. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, '')
  if (!cleaned || cleaned === '.' || cleaned === '-') return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

export function formatQuantity(value: number | string | null | undefined): string {
  const n = toNumber(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
