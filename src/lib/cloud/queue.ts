import { db } from '@/lib/db'
import type {
  SyncMeta,
  SyncOperation,
  SyncQueueEntry,
  SyncTableName,
} from '@/lib/types'
import { nowIso } from '@/lib/utils'

const SYNC_META_KEY: SyncMeta['key'] = 'cloud'

let hooksRegistered = false
let queueCaptureEnabled = false
let syncMutedDepth = 0
let queueChangeListener: (() => void) | undefined

function notifyQueueChanged() {
  queueChangeListener?.()
}

function shouldCaptureQueue() {
  return queueCaptureEnabled && syncMutedDepth === 0
}

function createEmptyMeta(): SyncMeta {
  const now = nowIso()

  return {
    key: SYNC_META_KEY,
    enabled: false,
    deviceId: '',
    linkedUserId: '',
    lastSyncedAt: '',
    lastError: '',
    cursors: {},
    createdAt: now,
    updatedAt: now,
  }
}

export function setQueueChangeListener(listener: (() => void) | undefined) {
  queueChangeListener = listener
}

export function setQueueCaptureEnabled(enabled: boolean) {
  queueCaptureEnabled = enabled
}

export function registerSyncQueueHooks() {
  if (hooksRegistered) {
    return
  }

  hooksRegistered = true

  const enqueue = (table: SyncTableName, entityId: string, op: SyncOperation) => {
    if (!shouldCaptureQueue()) {
      return
    }

    void enqueueSyncOperation(table, entityId, op)
  }

  db.categories.hook('creating', (primaryKey, obj) => {
    enqueue('categories', String(primaryKey ?? obj.id), 'upsert')
  })
  db.categories.hook('updating', (_, primaryKey) => {
    enqueue('categories', String(primaryKey), 'upsert')
  })
  db.categories.hook('deleting', (primaryKey) => {
    enqueue('categories', String(primaryKey), 'delete')
  })

  db.items.hook('creating', (primaryKey, obj) => {
    enqueue('items', String(primaryKey ?? obj.id), 'upsert')
  })
  db.items.hook('updating', (_, primaryKey) => {
    enqueue('items', String(primaryKey), 'upsert')
  })
  db.items.hook('deleting', (primaryKey) => {
    enqueue('items', String(primaryKey), 'delete')
  })

  db.outfits.hook('creating', (primaryKey, obj) => {
    enqueue('outfits', String(primaryKey ?? obj.id), 'upsert')
  })
  db.outfits.hook('updating', (_, primaryKey) => {
    enqueue('outfits', String(primaryKey), 'upsert')
  })
  db.outfits.hook('deleting', (primaryKey) => {
    enqueue('outfits', String(primaryKey), 'delete')
  })

  db.laundryLogs.hook('creating', (primaryKey, obj) => {
    enqueue('laundryLogs', String(primaryKey ?? obj.id), 'upsert')
  })
  db.laundryLogs.hook('updating', (_, primaryKey) => {
    enqueue('laundryLogs', String(primaryKey), 'upsert')
  })
  db.laundryLogs.hook('deleting', (primaryKey) => {
    enqueue('laundryLogs', String(primaryKey), 'delete')
  })

  db.photos.hook('creating', (primaryKey, obj) => {
    enqueue('photos', String(primaryKey ?? obj.id), 'upsert')
  })
  db.photos.hook('updating', (_, primaryKey) => {
    enqueue('photos', String(primaryKey), 'upsert')
  })
  db.photos.hook('deleting', (primaryKey) => {
    enqueue('photos', String(primaryKey), 'delete')
  })
}

export async function runWithSyncMuted<T>(callback: () => Promise<T>) {
  syncMutedDepth += 1
  try {
    return await callback()
  } finally {
    syncMutedDepth -= 1
  }
}

export async function getSyncMeta() {
  return db.syncMeta.get(SYNC_META_KEY)
}

export async function ensureSyncMeta() {
  const existing = await getSyncMeta()
  if (existing) {
    return existing
  }

  const fresh = createEmptyMeta()
  await db.syncMeta.put(fresh)
  return fresh
}

export async function patchSyncMeta(patch: Partial<Omit<SyncMeta, 'key' | 'createdAt'>>) {
  const existing = await ensureSyncMeta()
  const updated: SyncMeta = {
    ...existing,
    ...patch,
    key: SYNC_META_KEY,
    updatedAt: nowIso(),
  }

  await db.syncMeta.put(updated)
  return updated
}

interface EnqueueOptions {
  silent?: boolean
  changedAt?: string
}

export async function enqueueSyncOperation(
  table: SyncTableName,
  entityId: string,
  op: SyncOperation,
  options: EnqueueOptions = {},
) {
  const changedAt = options.changedAt ?? nowIso()
  const existing = await db.syncQueue
    .where('[table+entityId]')
    .equals([table, entityId])
    .first()

  if (!existing) {
    const entry: SyncQueueEntry = {
      id: crypto.randomUUID(),
      table,
      entityId,
      op,
      changedAt,
      retryCount: 0,
      nextRetryAt: changedAt,
      lastError: '',
      createdAt: changedAt,
    }

    await db.syncQueue.add(entry)
    if (!options.silent) {
      notifyQueueChanged()
    }
    return entry
  }

  const resolvedOp: SyncOperation = op === 'delete' ? 'delete' : 'upsert'
  const updated: SyncQueueEntry = {
    ...existing,
    op: resolvedOp,
    changedAt,
    retryCount: 0,
    nextRetryAt: changedAt,
    lastError: '',
  }

  await db.syncQueue.put(updated)
  if (!options.silent) {
    notifyQueueChanged()
  }
  return updated
}

export async function removeSyncQueueEntry(id: string) {
  await db.syncQueue.delete(id)
  notifyQueueChanged()
}

export async function markSyncQueueEntryFailure(id: string, errorMessage: string) {
  const existing = await db.syncQueue.get(id)
  if (!existing) {
    return
  }

  const retryCount = existing.retryCount + 1
  const delayMs = Math.min(2 ** retryCount * 1000, 5 * 60 * 1000)
  const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

  await db.syncQueue.put({
    ...existing,
    retryCount,
    nextRetryAt,
    lastError: errorMessage,
  })

  notifyQueueChanged()
}

export async function listPendingQueueEntries(limit = 100) {
  const now = nowIso()
  const rows = await db.syncQueue.where('nextRetryAt').belowOrEqual(now).toArray()

  return rows
    .sort((a, b) => a.nextRetryAt.localeCompare(b.nextRetryAt))
    .slice(0, limit)
}

export async function getPendingEntityIdsByTable(table: SyncTableName) {
  const rows = await db.syncQueue.where('table').equals(table).toArray()
  return new Set(rows.map((row) => row.entityId))
}

export async function getPendingQueueCount() {
  return db.syncQueue.count()
}

export async function clearSyncQueue() {
  await db.syncQueue.clear()
  notifyQueueChanged()
}

export async function seedSyncQueueFromLocalData() {
  const changedAt = nowIso()
  const [categories, items, outfits, laundryLogs, photos] = await Promise.all([
    db.categories.toArray(),
    db.items.toArray(),
    db.outfits.toArray(),
    db.laundryLogs.toArray(),
    db.photos.toArray(),
  ])

  for (const row of categories) {
    await enqueueSyncOperation('categories', row.id, 'upsert', { silent: true, changedAt })
  }
  for (const row of items) {
    await enqueueSyncOperation('items', row.id, 'upsert', { silent: true, changedAt })
  }
  for (const row of outfits) {
    await enqueueSyncOperation('outfits', row.id, 'upsert', { silent: true, changedAt })
  }
  for (const row of laundryLogs) {
    await enqueueSyncOperation('laundryLogs', row.id, 'upsert', { silent: true, changedAt })
  }
  for (const row of photos) {
    await enqueueSyncOperation('photos', row.id, 'upsert', { silent: true, changedAt })
  }

  notifyQueueChanged()
}
