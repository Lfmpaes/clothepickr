let mutedDepth = 0

export function isSyncMuted() {
  return mutedDepth > 0
}

export async function runWithSyncMuted<T>(task: () => Promise<T>) {
  mutedDepth += 1
  try {
    return await task()
  } finally {
    mutedDepth -= 1
  }
}
