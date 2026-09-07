/**
 * CSV export helpers. Rows are arrays of already-formatted strings; values are
 * escaped for Excel compatibility (quotes doubled, delimiters intact).
 */

const esc = (value: unknown): string => {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(esc).join(',')]
  for (const row of rows) {
    lines.push(row.map(esc).join(','))
  }
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function makeFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `${prefix}-${stamp}.csv`
}