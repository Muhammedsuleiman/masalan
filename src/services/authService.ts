import { supabase } from '../lib/supabase'
import type { Profile, Role } from '../types'

export function getFriendlyError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'
  const e = error as { message?: string; code?: string; hint?: string; name?: string }
  const msg = e.message ?? String(error)
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (lower.includes('email not confirmed')) {
    return 'This email address has not been verified yet. Check your inbox for a confirmation link.'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account already exists for this email address.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach the server. Check your internet connection and try again.'
  }
  if (lower.includes('jwt') || lower.includes('expired')) {
    return 'Your session has expired. Please sign in again.'
  }
  if (lower.includes('duplicate') || lower.includes('already exists')) {
    return 'That record already exists.'
  }
  if (lower.includes('payment amount exceeds')) {
    return 'The payment amount is more than the outstanding balance for this sale.'
  }
  if (lower.includes('invalid code') || lower.includes('mfa verification failed') || lower.includes('invalid totp')) {
    return 'The authentication code is invalid or has expired. Please try again.'
  }
  if (lower.includes('too many enrolled')) {
    return 'Too many authenticator devices are enrolled. Remove an existing one first.'
  }
  if (lower.includes('insufficient_aal') || lower.includes('insufficient')) {
    return 'Verify with your authentication code before completing this action.'
  }
  if (lower.includes('quantity must be greater than zero')) {
    return 'Quantity must be greater than zero.'
  }
  if (lower.includes('not authorized')) {
    return 'You are not authorized to perform this action.'
  }
  return msg
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

export async function getCurrentUserProfile(): Promise<{ profile: Profile | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return { profile: null, error: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) return { profile: null, error: getFriendlyError(error) }
  return { profile: data as Profile, error: null }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, updated_at')
    .eq('id', userId)
    .single()
  return (data as Profile) ?? null
}

export async function updateOwnProfileFullName(fullName: string): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return { error: 'No active session.' }

  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) return { error: getFriendlyError(error) }

  await supabase.auth.updateUser({ data: { full_name: fullName } })
  return { error: null }
}

// -----------------------------------------------------------------------------
// Owner-managed user administration
// -----------------------------------------------------------------------------
export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(getFriendlyError(error))
  return (data ?? []) as Profile[]
}

export async function createUserAccount(input: {
  email: string
  password: string
  fullName: string
  role: Role
}): Promise<{ userId: string | null; needsConfirmation: boolean; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  })

  if (error) return { userId: null, needsConfirmation: false, error: getFriendlyError(error) }

  const userId = data.user?.id
  if (!userId) return { userId: null, needsConfirmation: false, error: 'Could not create the user account.' }

  const needsConfirmation = !data.session

  // Assign the requested role (owner permission). RLS allows the owner to update profiles.
  const { error: roleError } = await supabase
    .from('profiles')
    .update({ full_name: input.fullName, role: input.role })
    .eq('id', userId)

  if (roleError) {
    return { userId, needsConfirmation, error: getFriendlyError(roleError) }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const currentUserId = sessionData.session?.user.id
  if (currentUserId) {
    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      action: 'user.created',
      entity_type: 'user',
      entity_id: userId,
      metadata: { email: input.email, role: input.role },
    })
  }

  return { userId, needsConfirmation, error: null }
}

export async function changeUserRole(userId: string, role: Role): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: getFriendlyError(error) }

  const { data: sessionData } = await supabase.auth.getSession()
  const currentUserId = sessionData.session?.user.id
  if (currentUserId) {
    await supabase.from('audit_logs').insert({
      user_id: currentUserId,
      action: 'user.role_changed',
      entity_type: 'user',
      entity_id: userId,
      metadata: { role },
    })
  }
  return { error: null }
}

export async function updateUserFullName(userId: string, fullName: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

// -----------------------------------------------------------------------------
// MFA (TOTP) — two-factor authentication
//
// Enrollment permissions are enabled on the Supabase project (mfa_totp_enroll_enabled).
// We use the AAL1 -> AAL2 upgrade flow: sign-in always issues an AAL1 session, then
// the app checks for verified TOTP factors and forces a challenge to reach AAL2.
// -----------------------------------------------------------------------------
export interface MfaStatus {
  /** ID of the user's verified TOTP factor, if any. */
  totpFactorId: string | null
  /** Total number of enrolled factors (any type). */
  factorCount: number
  /** 'aal1' | 'aal2' | null for the active session. */
  aalLevel: string | null
}

/** True when the signed-in user has at least one verified TOTP factor. */
export async function userHasVerifiedTotp(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.listFactors()
  return (data?.totp?.length ?? 0) > 0
}

/** Current MFA status for the active session. */
export async function getMfaStatus(): Promise<MfaStatus> {
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp ?? []
  return {
    totpFactorId: totp.length > 0 ? totp[0].id : null,
    factorCount: factors?.all?.length ?? 0,
    aalLevel: aalData?.currentLevel ?? null,
  }
}

/** Start TOTP enrollment: returns the QR code + otpauth URI for the authenticator app. */
export async function enrollTotp(): Promise<{
  factorId: string
  qrCode: string
  secret: string
  uri: string
  error: string | null
}> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error || !data || data.type !== 'totp' || !data.totp) {
    return { factorId: '', qrCode: '', secret: '', uri: '', error: getFriendlyError(error) }
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code ?? '',
    secret: data.totp.secret ?? '',
    uri: data.totp.uri ?? '',
    error: null,
  }
}

/** Verify a TOTP code for a factor (a single challenge-and-verify). */
export async function verifyTotp(factorId: string, code: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}

/** Unenroll (remove) an MFA factor. Requires an AAL2 session. */
export async function unenrollTotp(factorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: getFriendlyError(error) }
  return { error: null }
}
