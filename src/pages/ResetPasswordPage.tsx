import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, KeyRound, Landmark, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updatePassword } from '../services/authService'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true

    // Primary signal: the recovery flow fires PASSWORD_RECOVERY (or SIGNED_IN)
    // once Supabase finishes parsing the URL hash and establishing the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasRecoverySession(true)
        setChecking(false)
      }
    })

    // Fallback: after the async hash exchange settles, confirm the URL really is a
    // recovery link before accepting it (avoids accepting a stale pre-existing session).
    const timeout = setTimeout(async () => {
      if (!active) return
      const isRecoveryHash = (window.location.hash || '').toLowerCase().includes('type=recovery')
      if (isRecoveryHash) {
        const { data } = await supabase.auth.getSession()
        if (!active) return
        setHasRecoverySession(Boolean(data.session))
      }
      setChecking(false)
    }, 1500)

    return () => {
      active = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    )
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

          {done ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-brand-950">Password updated</h2>
                    <p className="text-sm text-ink-soft">
                      Your password has been changed. Redirecting you to sign in…
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !hasRecoverySession ? (
            <div className="space-y-4">
              <Alert tone="warning">
                This reset link is invalid or has expired. Request a new password reset link.
              </Alert>
              <button type="button" onClick={() => navigate('/forgot-password', { replace: true })} className="btn-gold w-full !py-3">
                Request a new link
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-gold-600" />
                  <h2 className="font-display text-2xl font-bold text-brand-950">Choose a new password</h2>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Your identity has been verified. Set a new password to continue.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              <div>
                <label htmlFor="password" className="label">
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="input pl-10"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="label">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    className="input pl-10"
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn-gold w-full !py-3">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
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
