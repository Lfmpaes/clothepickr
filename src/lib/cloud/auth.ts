import type { AuthChangeEvent, EmailOtpType, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/cloud/supabase-client'

export function getCloudAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export async function sendMagicLink(email: string, redirectTo = getCloudAuthCallbackUrl()) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Cloud sync is not configured.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function verifyEmailOtpCode(email: string, token: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Cloud sync is not configured.')
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.session
}

export async function getCloudSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw new Error(error.message)
  }

  return data.session
}

export async function getCloudUser(): Promise<User | null> {
  const session = await getCloudSession()
  return session?.user ?? null
}

export async function signOutCloud() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export function onCloudAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return () => undefined
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => {
    data.subscription.unsubscribe()
  }
}

export async function completeCloudAuthFromUrl() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const searchParams = new URLSearchParams(window.location.search)
  const authCode = searchParams.get('code')
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode)
    if (error) {
      throw new Error(error.message)
    }
  }

  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type')
  if (tokenHash && tokenType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType as EmailOtpType,
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  if (authCode || tokenHash) {
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw new Error(error.message)
  }
  return data.session
}
