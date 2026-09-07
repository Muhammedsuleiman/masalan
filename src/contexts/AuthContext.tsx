import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import {
  signIn as doSignIn,
  signOut as doSignOut,
  getCurrentUserProfile,
  fetchProfile,
  userHasVerifiedTotp,
} from '../services/authService'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** True when the signed-in user has a verified TOTP factor but the session is still AAL1. */
  mfaRequired: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; mfaRequired: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Called after a successful MFA challenge to let the user into the app. */
  completeMfa: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)

  const loadProfile = async (userId: string) => {
    const prof = await fetchProfile(userId)
    setProfile(prof)
  }

  const checkMfaRequired = async (s: Session | null) => {
    if (!s) {
      setMfaRequired(false)
      return
    }
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        setMfaRequired(false)
        return
      }
      setMfaRequired(await userHasVerifiedTotp())
    } catch {
      setMfaRequired(false)
    }
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        void loadProfile(data.session.user.id)
        void checkMfaRequired(data.session)
      }
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return
      setSession(newSession)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setMfaRequired(false)
        setLoading(false)
      } else if (newSession) {
        void loadProfile(newSession.user.id)
        void checkMfaRequired(newSession)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      mfaRequired,
      signIn: async (email, password) => {
        const result = await doSignIn(email, password)
        if (!result.error) {
          const verified = await userHasVerifiedTotp()
          if (verified) {
            setMfaRequired(true)
            return { error: null, mfaRequired: true }
          }
          const { profile: p } = await getCurrentUserProfile()
          setProfile(p)
          return { error: null, mfaRequired: false }
        }
        return { error: result.error, mfaRequired: false }
      },
      signOut: async () => {
        await doSignOut()
        setProfile(null)
        setSession(null)
        setMfaRequired(false)
      },
      refreshProfile: async () => {
        if (session?.user.id) {
          await loadProfile(session.user.id)
        }
      },
      completeMfa: async () => {
        setMfaRequired(false)
        const { profile: p } = await getCurrentUserProfile()
        setProfile(p)
      },
    }),
    [session, profile, loading, mfaRequired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
