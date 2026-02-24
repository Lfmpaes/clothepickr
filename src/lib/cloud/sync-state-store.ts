import { useSyncExternalStore } from 'react'
import type { CloudSyncState } from '@/lib/types'

const DEFAULT_STATE: CloudSyncState = {
  enabled: false,
  authenticated: false,
  status: 'disabled',
  pendingCount: 0,
}

let state: CloudSyncState = { ...DEFAULT_STATE }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function getCloudSyncState() {
  return state
}

export function setCloudSyncState(next: CloudSyncState) {
  state = next
  emit()
}

export function patchCloudSyncState(patch: Partial<CloudSyncState>) {
  state = {
    ...state,
    ...patch,
  }
  emit()
}

export function resetCloudSyncState() {
  state = { ...DEFAULT_STATE }
  emit()
}

export function subscribeCloudSyncState(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCloudSyncState() {
  return useSyncExternalStore(subscribeCloudSyncState, getCloudSyncState, getCloudSyncState)
}
