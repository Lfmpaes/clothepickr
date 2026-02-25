import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/cloud/supabase-client'

export async function sendMagicLink(email: string, redirectTo: string) {
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

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw new Error(error.message)
  }

  return data.session
}
