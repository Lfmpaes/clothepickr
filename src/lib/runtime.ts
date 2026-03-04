import { isTauri } from '@tauri-apps/api/core'

export type AppRuntime = 'web' | 'tauri'

export function getRuntime(): AppRuntime {
  return isTauri() ? 'tauri' : 'web'
}

