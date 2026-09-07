import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { getMfaStatus, enrollTotp, verifyTotp, unenrollTotp, type MfaStatus } from '../../services/authService'
import { Card, CardHeader } from '../ui/Card'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { Badge } from '../ui/Badge'

export function MfaSection() {
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [uri, setUri] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [confirming, setConfirming] = useState(false)

  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeCode, setRemoveCode] = useState('')
  const [removing, setRemoving] = useState(false)

  const [secret, setSecret] = useState('')

  const loadStatus = async () => {
    try {
      setStatus(await getMfaStatus())
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const openEnroll = async () => {
    setError(null)
    setNotice(null)
    setCode('')
    setEnrollOpen(true)
    setEnrolling(true)
    const result = await enrollTotp()
    setEnrolling(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setFactorId(result.factorId)
    setQrCode(result.qrCode)
    setUri(result.uri)
    setSecret(result.secret)
  }

  const confirmEnroll = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setConfirming(true)
    const result = await verifyTotp(factorId, code.trim())
    setConfirming(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setEnrollOpen(false)
    setQrCode('')
    setUri('')
    setSecret('')
    setFactorId('')
    setCode('')
    setNotice('Two-factor authentication is now enabled.')
    await loadStatus()
  }

  const closeEnroll = () => {
    setEnrollOpen(false)
    if (!status?.totpFactorId && factorId && !code) {
      void unenrollTotp(factorId)
    }
    setQrCode('')
    setUri('')
    setSecret('')
    setFactorId('')
    setCode('')
    setError(null)
  }

  const openRemove = () => {
    setError(null)
    setRemoveCode('')
    setRemoveOpen(true)
  }

  const confirmRemove = async () => {
    const targetFactorId = status?.totpFactorId
    if (!targetFactorId) return
    setRemoving(true)
    if (status?.aalLevel !== 'aal2') {
      // Reach AAL2 first so unenroll (which requires it) is authorised.
      if (!/^\d{6}$/.test(removeCode.trim())) {
        setRemoving(false)
        setError('Enter the 6-digit code from your authenticator app.')
        return
      }
      const verifyResult = await verifyTotp(targetFactorId, removeCode.trim())
      if (verifyResult.error) {
        setRemoving(false)
        setError(verifyResult.error)
        return
      }
    }
    const result = await unenrollTotp(targetFactorId)
    setRemoving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setRemoveOpen(false)
    setRemoveCode('')
    setNotice('Two-factor authentication has been turned off.')
    await loadStatus()
  }

  const factorEnabled = Boolean(status?.totpFactorId)

  return (
    <Card>
      <CardHeader
        title="Two-factor authentication"
        subtitle="An extra login step using an authenticator app."
        action={factorEnabled ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-brand-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {notice && (
            <Alert tone="success">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {notice}
              </span>
            </Alert>
          )}
          {error && <Alert tone="error">{error}</Alert>}

          {factorEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">2FA is protecting this account</p>
                  <p className="text-xs text-ink-soft">
                    Your authenticator app is required at every sign-in.
                  </p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={openRemove}>
                <ShieldOff className="h-4 w-4" /> Turn off
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand-100 p-2.5 text-brand-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Add an extra layer of security</p>
                  <p className="text-xs text-ink-soft">
                    Each sign-in will ask for a code from your authenticator app.
                  </p>
                </div>
              </div>
              <Button size="sm" loading={enrolling} onClick={() => void openEnroll()}>
                Enable 2FA
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Enroll modal: scan QR, then confirm with a code from the app */}
      <Modal open={enrollOpen} onClose={closeEnroll} title="Set up authenticator app" subtitle="Step 1 — scan, Step 2 — enter a code.">
        {enrolling ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-brand-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            <div className="rounded-2xl bg-emerald-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <ShieldCheck className="h-4 w-4" /> Keep a recovery copy
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                If you lose your authenticator device, your account cannot recover itself. Write down{' '}
                <span className="font-mono text-xs text-ink">{secret}</span> (under "Enter manually") and keep it safe
                before continuing.
              </p>
            </div>

            {qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={qrCode}
                  alt="Scan with your authenticator app"
                  className="h-48 w-48 rounded-xl border border-brand-100 bg-white p-2"
                />
                <p className="text-sm text-ink-soft">Scan this QR code in your authenticator app.</p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Could not generate a QR code. Try again.</p>
            )}

            {uri && (
              <details className="rounded-xl border border-brand-100 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">Enter manually</summary>
                <p className="mt-2 break-all font-mono text-xs text-ink-soft">{uri}</p>
              </details>
            )}

            <div>
              <label className="label" htmlFor="mfa-confirm-code">
                Step 2 — enter the 6-digit code from your authenticator app
              </label>
              <input
                id="mfa-confirm-code"
                inputMode="numeric"
                maxLength={6}
                className="input text-center font-mono !text-xl tracking-[0.4em]"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEnroll}>Cancel</Button>
              <Button loading={confirming} disabled={!factorId} onClick={() => void confirmEnroll()}>
                Verify & enable
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Turn-off modal: if the session is AAL1 we ask for a code to reach AAL2 first */}
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Turn off two-factor authentication"
        subtitle="This removes the authenticator requirement from every sign-in."
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {status?.aalLevel !== 'aal2' && (
            <div>
              <label className="label" htmlFor="mfa-remove-code">
                Enter your current authentication code to confirm
              </label>
              <input
                id="mfa-remove-code"
                inputMode="numeric"
                maxLength={6}
                className="input text-center font-mono !text-xl tracking-[0.4em]"
                placeholder="••••••"
                value={removeCode}
                onChange={(e) => setRemoveCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
          <Alert tone="warning">
            Without 2FA, a password alone will be enough to access this account. Only turn this off if you are sure.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={removing} onClick={() => void confirmRemove()}>
              Turn off 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}