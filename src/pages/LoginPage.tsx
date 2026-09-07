import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, Loader2, Landmark, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMfaStatus, verifyTotp } from '../services/authService'
import { Alert } from '../components/ui/Alert'
import { isConfigValid } from '../lib/supabase'

export default function LoginPage() {
  const { session, profile, loading, signIn, signOut, completeMfa, mfaRequired } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // MFA challenge step
  const [mfaActive, setMfaActive] = useState(false)
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Never auto-navigate while an MFA challenge is pending
  useEffect(() => {
    if (mfaActive || mfaRequired) return
    if (!loading && session && profile) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, session, profile, navigate, mfaActive, mfaRequired])

  // A paused AAL1 session (e.g. page reload mid-challenge) still needs verification
  useEffect(() => {
    if (mfaRequired && !mfaActive) {
      getMfaStatus().then((status) => {
        setFactorId(status.totpFactorId ?? '')
        setMfaActive(true)
      })
    }
  }, [mfaRequired, mfaActive])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else if (result.mfaRequired) {
      const status = await getMfaStatus()
      setFactorId(status.totpFactorId ?? '')
      setMfaActive(true)
      setCode('')
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!factorId) {
      setError('No authenticator factor is set up for this account.')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setVerifying(true)
    const result = await verifyTotp(factorId, code.trim())
    setVerifying(false)
    if (result.error) {
      setError(result.error)
      return
    }
    await completeMfa()
    setMfaActive(false)
  }

  const handleCancelMfa = async () => {
    setMfaActive(false)
    await signOut()
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert tone="error" className="animate-fadeUp">
          {error}
        </Alert>
      )}

      {!isConfigValid() && (
        <Alert tone="warning">
          Supabase configuration is missing. Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> to your <code className="font-mono">.env</code> file.
        </Alert>
      )}

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

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input pl-10"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={submitting} className="btn-gold w-full !py-3">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  )

  const renderMfa = () => (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="rounded-2xl bg-emerald-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Two-step verification
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          This account is protected with an authenticator app. Enter the 6-digit code to continue.
        </p>
      </div>

      {error && (
        <Alert tone="error" className="animate-fadeUp">
          {error}
        </Alert>
      )}

      <div>
        <label htmlFor="mfa-code" className="label">
          Authentication code
        </label>
        <input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="input !py-3 text-center font-mono !text-2xl tracking-[0.4em]"
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <button type="submit" disabled={verifying} className="btn-gold w-full !py-3">
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </>
        ) : (
          'Verify & continue'
        )}
      </button>

      <button type="button" onClick={() => void handleCancelMfa()} className="w-full py-2 text-sm font-semibold text-ink-faint hover:text-brand-700">
        Use a different account
      </button>
    </form>
  )

  return (
    <div className="flex min-h-screen bg-cream-50">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />

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

          <div className="mt-20 max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight text-cream-50">
              Run both businesses from <span className="text-gold-400">one place</span>.
            </h1>
            <p className="mt-4 text-cream-200/80">
              Sales, payments, credit, expenses and reports for all of Masalan's businesses — managed together, tracked separately.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-4 p-12">
          <div className="overflow-hidden rounded-2xl">
            <img src="/images/bread.jpg" alt="Masalan Bread" className="h-44 w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-2xl">
            <img src="/images/water.jpg" alt="Pure Water" className="h-44 w-full object-cover" />
          </div>
        </div>
      </div>

      {/* Form panel */}
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

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-brand-950">Welcome back</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {mfaActive ? 'Finish signing in' : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          {mfaActive ? renderMfa() : renderForm()}

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
