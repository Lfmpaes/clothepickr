import type { AuthChangeEvent, EmailOtpType, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/cloud/supabase-client'

export function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export async function sendMagicLink(email: string, redirectTo = getAuthCallbackUrl()) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    throw error
  }
}

export async function verifyEmailOtpCode(email: string, token: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    throw error
  }

  return data.session
}

export async function getCloudSession() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }

  return data.session
}

export async function getCloudUser(): Promise<User | null> {
  const session = await getCloudSession()
  return session?.user ?? null
}

export async function signOutCloud() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export function onCloudAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)

  return () => subscription.unsubscribe()
}

function clearCallbackParamsFromUrl() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState({}, document.title, cleanUrl)
}

export async function completeCloudAuthFromUrl() {
  const supabase = getSupabaseClient()
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  const code = searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      throw error
    }
    clearCallbackParamsFromUrl()
    return getCloudSession()
  }

  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type')
  if (tokenHash && tokenType) {
    const otpType = tokenType as EmailOtpType
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    })
    if (error) {
      throw error
    }
    clearCallbackParamsFromUrl()
    return data.session
  }

  if (hashParams.get('access_token')) {
    clearCallbackParamsFromUrl()
  }

  return getCloudSession()
}
