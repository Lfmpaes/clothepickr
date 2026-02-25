import type { ClothePickrDb } from '@/lib/db/schema'
import type {
  SyncCursor,
  SyncMeta,
  SyncQueueEntry,
  SyncQueueOperation,
  SyncTableName,
} from '@/lib/types'
import { isSyncMuted } from '@/lib/cloud/sync-muted'
import { SYNC_TABLES } from '@/lib/cloud/types'
import { nowIso } from '@/lib/utils'

export const CLOUD_SYNC_META_KEY = 'cloud' as const

const hookedDatabases = new WeakSet<ClothePickrDb>()
export const SYNC_QUEUE_CHANGED_EVENT = 'clothepickr:sync-queue-changed'

function emitQueueChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGED_EVENT))
}

function createDefaultSyncMeta(): SyncMeta {
  return {
    key: CLOUD_SYNC_META_KEY,
    enabled: false,
    deviceId: crypto.randomUUID(),
    linkedUserId: undefined,
    lastSyncedAt: undefined,
    lastError: undefined,
    cursors: {},
  }
}

export async function getOrCreateSyncMeta(db: ClothePickrDb) {
  const existing = await db.syncMeta.get(CLOUD_SYNC_META_KEY)
  if (existing) {
    return existing
  }

  const initial = createDefaultSyncMeta()
  await db.syncMeta.put(initial)
  return initial
}

export async function updateSyncMeta(
  db: ClothePickrDb,
  patch: Partial<Omit<SyncMeta, 'key' | 'cursors'>> & { cursors?: SyncMeta['cursors'] },
) {
  const current = await getOrCreateSyncMeta(db)
  const next: SyncMeta = {
    ...current,
    ...patch,
    cursors: patch.cursors ? { ...current.cursors, ...patch.cursors } : current.cursors,
  }
  await db.syncMeta.put(next)
  return next
}

export async function setSyncCursor(
  db: ClothePickrDb,
  table: SyncTableName,
  cursor: SyncCursor | undefined,
) {
  const current = await getOrCreateSyncMeta(db)
  const nextCursors = { ...current.cursors }
  if (cursor) {
    nextCursors[table] = cursor
  } else {
    delete nextCursors[table]
  }

  return updateSyncMeta(db, { cursors: nextCursors })
}

export async function getPendingQueueCount(db: ClothePickrDb) {
  return db.syncQueue.count()
}

export async function hasPendingEntryForRecord(
  db: ClothePickrDb,
  table: SyncTableName,
  entityId: string,
) {
  const count = await db.syncQueue.where('[table+entityId]').equals([table, entityId]).count()
  return count > 0
}

function collapseOperation(
  current: SyncQueueOperation,
  next: SyncQueueOperation,
): SyncQueueOperation {
  if (next === 'delete') {
    return 'delete'
  }

  if (current === 'delete' && next === 'upsert') {
    return 'upsert'
  }

  return next
}

export async function enqueueSyncChange(
  db: ClothePickrDb,
  table: SyncTableName,
  entityId: string,
  op: SyncQueueOperation,
  changedAt = nowIso(),
) {
  const existingEntries = await db.syncQueue
    .where('[table+entityId]')
    .equals([table, entityId])
    .sortBy('createdAt')

  const newest = existingEntries.at(-1)
  if (!newest) {
    const createdAt = nowIso()
    const entry: SyncQueueEntry = {
      id: crypto.randomUUID(),
      table,
      entityId,
      op,
      changedAt,
      retryCount: 0,
      nextRetryAt: undefined,
      lastError: undefined,
      createdAt,
    }
    await db.syncQueue.add(entry)
    emitQueueChanged()
    return entry
  }

  if (existingEntries.length > 1) {
    const duplicateIds = existingEntries
      .slice(0, Math.max(existingEntries.length - 1, 0))
      .map((entry) => entry.id)
    if (duplicateIds.length > 0) {
      await db.syncQueue.bulkDelete(duplicateIds)
    }
  }

  const updated: SyncQueueEntry = {
    ...newest,
    op: collapseOperation(newest.op, op),
    changedAt,
    retryCount: 0,
    nextRetryAt: undefined,
    lastError: undefined,
  }

  await db.syncQueue.put(updated)
  emitQueueChanged()
  return updated
}

export async function enqueueSyncDelete(
  db: ClothePickrDb,
  table: SyncTableName,
  entityId: string,
  changedAt = nowIso(),
) {
  return enqueueSyncChange(db, table, entityId, 'delete', changedAt)
}

export async function enqueueSyncUpsert(
  db: ClothePickrDb,
  table: SyncTableName,
  entityId: string,
  changedAt = nowIso(),
) {
  return enqueueSyncChange(db, table, entityId, 'upsert', changedAt)
}

export async function listDueQueueEntries(db: ClothePickrDb, limit: number, now = nowIso()) {
  const rows = await db.syncQueue
    .filter((entry) => !entry.nextRetryAt || entry.nextRetryAt <= now)
    .sortBy('createdAt')

  return rows.slice(0, limit)
}

export async function removeQueueEntries(db: ClothePickrDb, entryIds: string[]) {
  if (entryIds.length === 0) {
    return
  }
  await db.syncQueue.bulkDelete(entryIds)
  emitQueueChanged()
}

export async function markQueueEntryRetry(
  db: ClothePickrDb,
  entryId: string,
  errorMessage: string,
  retryCount: number,
  nextRetryAt: string,
) {
  const entry = await db.syncQueue.get(entryId)
  if (!entry) {
    return
  }

  await db.syncQueue.put({
    ...entry,
    retryCount,
    nextRetryAt,
    lastError: errorMessage,
  })
  emitQueueChanged()
}

export async function clearSyncQueue(db: ClothePickrDb) {
  await db.syncQueue.clear()
  emitQueueChanged()
}

export async function seedQueueFromLocalData(db: ClothePickrDb) {
  const [categories, items, outfits, laundryLogs, photos] = await Promise.all([
    db.categories.toArray(),
    db.items.toArray(),
    db.outfits.toArray(),
    db.laundryLogs.toArray(),
    db.photos.toArray(),
  ])

  const queuePromises: Promise<unknown>[] = []
  for (const category of categories) {
    queuePromises.push(enqueueSyncUpsert(db, 'categories', category.id, category.updatedAt))
  }
  for (const item of items) {
    queuePromises.push(enqueueSyncUpsert(db, 'items', item.id, item.updatedAt))
  }
  for (const outfit of outfits) {
    queuePromises.push(enqueueSyncUpsert(db, 'outfits', outfit.id, outfit.updatedAt))
  }
  for (const log of laundryLogs) {
    queuePromises.push(enqueueSyncUpsert(db, 'laundry_logs', log.id, log.changedAt))
  }
  for (const photo of photos) {
    queuePromises.push(enqueueSyncUpsert(db, 'photos', photo.id, photo.createdAt))
  }

  await Promise.all(queuePromises)
}

function extractId(primaryKey: unknown, obj: { id?: string } | undefined) {
  if (obj?.id) {
    return obj.id
  }

  if (typeof primaryKey === 'string') {
    return primaryKey
  }

  return undefined
}

function shouldEnqueue(meta: SyncMeta) {
  return meta.enabled && Boolean(meta.linkedUserId)
}

async function maybeEnqueueFromHook(
  db: ClothePickrDb,
  table: SyncTableName,
  entityId: string | undefined,
  op: SyncQueueOperation,
) {
  try {
    if (!entityId || isSyncMuted()) {
      return
    }

    const meta = await getOrCreateSyncMeta(db)
    if (!shouldEnqueue(meta)) {
      return
    }

    await enqueueSyncChange(db, table, entityId, op)
  } catch (error) {
    const errorName = (error as { name?: string }).name
    if (
      errorName === 'DatabaseClosedError' ||
      errorName === 'NotFoundError' ||
      errorName === 'InvalidStateError'
    ) {
      return
    }
    throw error
  }
}

export function registerSyncHooks(db: ClothePickrDb) {
  if (hookedDatabases.has(db)) {
    return
  }
  hookedDatabases.add(db)

  const registerHooks = <TRecord extends { id: string }>(
    tableName: SyncTableName,
    table: {
      hook(
        eventName: 'creating',
        subscriber: (
          primaryKey: unknown,
          obj: TRecord,
        ) => void,
      ): void
      hook(
        eventName: 'updating',
        subscriber: (
          modifications: Partial<TRecord>,
          primaryKey: unknown,
          obj: TRecord,
        ) => void,
      ): void
      hook(
        eventName: 'deleting',
        subscriber: (primaryKey: unknown, obj: TRecord | undefined) => void,
      ): void
    },
  ) => {
    table.hook('creating', (primaryKey, obj) => {
      const entityId = extractId(primaryKey, obj)
      void maybeEnqueueFromHook(db, tableName, entityId, 'upsert').catch(() => undefined)
    })

    table.hook('updating', (_modifications, primaryKey, obj) => {
      const entityId = extractId(primaryKey, obj)
      void maybeEnqueueFromHook(db, tableName, entityId, 'upsert').catch(() => undefined)
    })

    table.hook('deleting', (primaryKey, obj) => {
      const entityId = extractId(primaryKey, obj)
      void maybeEnqueueFromHook(db, tableName, entityId, 'delete').catch(() => undefined)
    })
  }

  registerHooks('categories', db.categories)
  registerHooks('items', db.items)
  registerHooks('outfits', db.outfits)
  registerHooks('laundry_logs', db.laundryLogs)
  registerHooks('photos', db.photos)

  void getOrCreateSyncMeta(db)
}

export function assertSyncTableName(value: string): SyncTableName | undefined {
  return SYNC_TABLES.find((name) => name === value)
}
