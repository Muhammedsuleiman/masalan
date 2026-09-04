import { AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-brand-950">Page not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          The page you are looking for does not exist or you do not have access to it.
        </p>
        <a href="/dashboard" className="btn-primary mt-6">
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
