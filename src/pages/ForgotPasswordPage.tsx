import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, KeyRound, Landmark, ArrowLeft } from 'lucide-react'
import { sendPasswordResetEmail } from '../services/authService'
import { Alert } from '../components/ui/Alert'
import { isConfigValid } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter the email address for your account.')
      return
    }
    setSubmitting(true)
    const result = await sendPasswordResetEmail(email.trim())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      <div className="hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 lg:flex lg:flex-col lg:justify-between">
        <div className="relative p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 font-display text-xl font-bold text-brand-950">
              M
            </div>
            <div>
              <p className="font-display text-lg font-bold text-cream-50">Masalan</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
                Business Enterprise
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500 font-display text-lg font-bold text-brand-950">
              M
            </div>
            <div>
              <p className="font-display text-base font-bold text-brand-950">Masalan</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                Business Enterprise
              </p>
            </div>
          </div>

          {!isConfigValid() && (
            <Alert tone="warning" className="mb-4">
              Supabase configuration is missing. Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> to your <code className="font-mono">.env</code> file.
            </Alert>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-brand-950">Check your inbox</h2>
                    <p className="text-sm text-ink-soft">
                      If an account exists for <span className="font-semibold text-ink">{email}</span>, a password reset
                      link has been sent. Follow the link to choose a new password.
                    </p>
                  </div>
                </div>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-gold-600" />
                  <h2 className="font-display text-2xl font-bold text-brand-950">Reset your password</h2>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Enter your account email and we'll send you a link to set a new password.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn-gold w-full !py-3">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>

              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </form>
          )}

          <div className="mt-8 rounded-xl border border-brand-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <Landmark className="h-4 w-4 text-gold-600" /> Authorized personnel only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
