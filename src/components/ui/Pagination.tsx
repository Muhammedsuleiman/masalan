import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageCount, total, pageSize, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 sm:flex-row">
      <p className="text-xs text-ink-soft">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-lg border border-brand-200 p-1.5 text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 text-sm font-semibold text-brand-800">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className={cn(
            'rounded-lg border border-brand-200 p-1.5 text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
