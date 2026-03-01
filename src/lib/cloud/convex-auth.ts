import { isConvexConfigured } from '@/lib/cloud/convex-client'

export type CloudUser = { id: string; email?: string }
type AuthListener = () => void

let currentUser: CloudUser | null = null
let signInFn: ((provider: string, args: Record<string, string>) => Promise<void>) | null = null
let signOutFn: (() => Promise<void>) | null = null
const listeners = new Set<AuthListener>()

export function setConvexAuthActions(
  signIn: (provider: string, args: Record<string, string>) => Promise<void>,
  signOut: () => Promise<void>,
) {
  signInFn = signIn
  signOutFn = signOut
}

export function setConvexUser(user: CloudUser | null) {
  currentUser = user
  listeners.forEach((l) => l())
}

export async function getCloudUser(): Promise<CloudUser | null> {
  return currentUser
}

export async function sendEmailOtp(email: string) {
  if (!isConvexConfigured()) throw new Error('Cloud sync is not configured.')
  if (!signInFn) throw new Error('Auth not initialized.')
  await signInFn('resend-otp', { email })
}

export async function verifyEmailOtp(email: string, code: string) {
  if (!isConvexConfigured()) throw new Error('Cloud sync is not configured.')
  if (!signInFn) throw new Error('Auth not initialized.')
  await signInFn('resend-otp', { email, code })
}

export async function signOutCloud() {
  if (!signOutFn) throw new Error('Auth not initialized.')
  await signOutFn()
}

export function onCloudAuthStateChange(callback: () => void): () => void {
  if (!isConvexConfigured()) return () => undefined
  listeners.add(callback)
  return () => listeners.delete(callback)
}
