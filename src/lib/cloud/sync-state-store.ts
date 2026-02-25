import { useSyncExternalStore } from 'react'
import type { CloudSyncState } from '@/lib/cloud/types'

const listeners = new Set<() => void>()

let state: CloudSyncState = {
  enabled: false,
  authenticated: false,
  status: 'disabled',
  pendingCount: 0,
  lastSyncedAt: undefined,
  lastError: undefined,
}

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function getCloudSyncState() {
  return state
}

export function setCloudSyncState(next: Partial<CloudSyncState>) {
  state = {
    ...state,
    ...next,
  }
  emit()
}

export function replaceCloudSyncState(next: CloudSyncState) {
  state = next
  emit()
}

export function subscribeCloudSyncState(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCloudSyncState() {
  return useSyncExternalStore(subscribeCloudSyncState, getCloudSyncState, getCloudSyncState)
}
