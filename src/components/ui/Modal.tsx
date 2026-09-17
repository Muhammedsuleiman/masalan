import { X } from 'lucide-react'
import { useEffect, type ReactNode, type Ref } from 'react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  bodyRef?: Ref<HTMLDivElement>
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', bodyRef }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 m-3 w-full rounded-2xl bg-white shadow-lift animate-fadeUp sm:m-4 dark:bg-brand-900',
          sizeClasses[size],
          'max-h-[calc(100dvh_-_2rem)] flex flex-col',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-50 px-5 py-4 sm:px-6 dark:border-brand-800">
          <div>
            <h3 className="text-lg font-bold text-brand-950 dark:text-cream-50">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft dark:text-cream-300">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-cream-100 hover:text-ink dark:text-cream-400/70 dark:hover:bg-white/10 dark:hover:text-cream-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-brand-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-brand-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
