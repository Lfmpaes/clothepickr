import type { Session, User } from '@supabase/supabase-js'
import { onCloudAuthStateChange, getCloudUser } from '@/lib/cloud/auth'
import {
  buildPhotoStoragePath,
  mapCategoryToRemoteRow,
  mapItemToRemoteRow,
  mapLaundryLogToRemoteRow,
  mapOutfitToRemoteRow,
  mapPhotoToRemoteRow,
  mapRemoteCategoryToLocal,
  mapRemoteItemToLocal,
  mapRemoteLaundryLogToLocal,
  mapRemoteOutfitToLocal,
} from '@/lib/cloud/mappers'
import {
  clearSyncQueue,
  getOrCreateSyncMeta,
  getPendingQueueCount,
  hasPendingEntryForRecord,
  listDueQueueEntries,
  markQueueEntryRetry,
  registerSyncHooks,
  removeQueueEntries,
  seedQueueFromLocalData,
  setSyncCursor,
  SYNC_QUEUE_CHANGED_EVENT,
  updateSyncMeta,
} from '@/lib/cloud/queue'
import { SupabaseRemoteSyncRepository } from '@/lib/cloud/repository'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/cloud/supabase-client'
import { setCloudSyncState, subscribeCloudSyncState } from '@/lib/cloud/sync-state-store'
import { runWithSyncMuted } from '@/lib/cloud/sync-muted'
import { SYNC_TABLES, type CloudSyncEngine, type SyncReason } from '@/lib/cloud/types'
import { db } from '@/lib/db'
import type { RemoteRowFor } from '@/lib/cloud/types'
import { nowIso } from '@/lib/utils'

const PUSH_BATCH_SIZE = 100
const PULL_BATCH_SIZE = 200
const PERIODIC_PULL_MS = 2 * 60 * 1000
const RETRY_BASE_DELAY_MS = 1000
const RETRY_MAX_DELAY_MS = 60 * 1000

function computeRetryDelayMs(retryCount: number) {
  return Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** retryCount)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return 'Cloud sync failed.'
}

function isAuthError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  const status = (error as { status?: number }).status
  return status === 401 || status === 403 || message.includes('jwt') || message.includes('auth')
}

function isNetworkError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout')
  )
}

function isBrowserOnline() {
  if (typeof navigator === 'undefined') {
    return true
  }
  return navigator.onLine
}

class DefaultCloudSyncEngine implements CloudSyncEngine {
  private started = false
  private runtimeActive = false
  private intervalId: ReturnType<typeof setInterval> | undefined
  private authUnsubscribe: (() => void) | undefined
  private realtimeChannelName: string | undefined
  private syncPromise: Promise<void> | undefined
  private lastUserId: string | undefined

  private readonly remoteRepository = new SupabaseRemoteSyncRepository()

  private readonly onQueueChanged = () => {
    void this.syncNow('local-change')
  }

  private readonly onOnline = () => {
    void this.syncNow('online')
  }

  private readonly onOffline = () => {
    setCloudSyncState({ status: 'offline' })
  }

  private readonly onWindowFocus = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void this.syncNow('focus')
    }
  }

  subscribe(listener: () => void) {
    return subscribeCloudSyncState(listener)
  }

  async start() {
    if (this.started) {
      return
    }
    this.started = true

    registerSyncHooks(db)
    const meta = await getOrCreateSyncMeta(db)
    const pendingCount = await getPendingQueueCount(db)

    if (!isSupabaseConfigured()) {
      setCloudSyncState({
        enabled: meta.enabled,
        authenticated: false,
        status: meta.enabled ? 'error' : 'disabled',
        pendingCount,
        lastSyncedAt: meta.lastSyncedAt,
        lastError: meta.enabled ? 'Supabase env vars are missing.' : meta.lastError,
      })
      return
    }

    const user = await this.safeGetCloudUser()
    setCloudSyncState({
      enabled: meta.enabled,
      authenticated: Boolean(user),
      status: this.resolveIdleStatus(meta.enabled, Boolean(user)),
      pendingCount,
      lastSyncedAt: meta.lastSyncedAt,
      lastError: meta.lastError,
    })

    this.authUnsubscribe = onCloudAuthStateChange((_event, session) => {
      void this.handleAuthChange(session)
    })

    try {
      await this.reconcileRuntime(user)
    } catch (error) {
      setCloudSyncState({
        status: 'error',
        lastError: getErrorMessage(error),
      })
    }
  }

  stop() {
    this.started = false
    this.disableRuntime()
    if (this.authUnsubscribe) {
      this.authUnsubscribe()
      this.authUnsubscribe = undefined
    }
  }

  async setEnabled(enabled: boolean) {
    const nextMeta = await updateSyncMeta(db, {
      enabled,
      lastError: undefined,
    })

    const pendingCount = await getPendingQueueCount(db)
    setCloudSyncState({
      enabled: nextMeta.enabled,
      pendingCount,
      lastSyncedAt: nextMeta.lastSyncedAt,
      lastError: nextMeta.lastError,
    })

    if (!enabled) {
      this.disableRuntime()
      setCloudSyncState({
        status: 'disabled',
      })
      return
    }

    if (!isSupabaseConfigured()) {
      const errorMessage = 'Supabase env vars are missing.'
      await updateSyncMeta(db, { lastError: errorMessage })
      setCloudSyncState({
        status: 'error',
        lastError: errorMessage,
      })
      return
    }

    const user = await this.safeGetCloudUser()
    if (!user) {
      setCloudSyncState({
        authenticated: false,
        status: 'paused',
      })
      return
    }

    const needsInitialMerge = await this.ensureLinkedUser(nextMeta, user.id)
    await this.enableRuntime(user.id)

    if (needsInitialMerge) {
      await this.syncNow('initial-link')
      return
    }

    await this.syncNow('manual')
  }

  async syncNow(reason: SyncReason) {
    if (!this.started) {
      return
    }

    if (this.syncPromise) {
      return this.syncPromise
    }

    this.syncPromise = this.runSync(reason).finally(() => {
      this.syncPromise = undefined
    })

    return this.syncPromise
  }

  private async runSync(reason: SyncReason) {
    void reason
    const meta = await getOrCreateSyncMeta(db)
    const pendingCount = await getPendingQueueCount(db)

    if (!meta.enabled) {
      setCloudSyncState({
        enabled: false,
        authenticated: Boolean(this.lastUserId),
        status: 'disabled',
        pendingCount,
      })
      return
    }

    const user = await this.safeGetCloudUser()
    if (!user) {
      setCloudSyncState({
        enabled: true,
        authenticated: false,
        status: 'paused',
        pendingCount,
      })
      return
    }

    if (!isBrowserOnline()) {
      setCloudSyncState({
        enabled: true,
        authenticated: true,
        status: 'offline',
        pendingCount,
      })
      return
    }

    setCloudSyncState({
      enabled: true,
      authenticated: true,
      status: 'syncing',
      pendingCount,
      lastError: undefined,
    })

    try {
      await this.pushCycle(user.id)
      await this.pullCycle()

      const syncedAt = nowIso()
      const updatedMeta = await updateSyncMeta(db, {
        lastSyncedAt: syncedAt,
        lastError: undefined,
      })

      setCloudSyncState({
        enabled: true,
        authenticated: true,
        status: this.resolveIdleStatus(true, true),
        pendingCount: await getPendingQueueCount(db),
        lastSyncedAt: updatedMeta.lastSyncedAt,
        lastError: undefined,
      })
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      await updateSyncMeta(db, {
        lastError: errorMessage,
      })

      if (isAuthError(error)) {
        this.disableRuntime()
        setCloudSyncState({
          enabled: true,
          authenticated: false,
          status: 'paused',
          pendingCount: await getPendingQueueCount(db),
          lastError: errorMessage,
        })
        return
      }

      setCloudSyncState({
        enabled: true,
        authenticated: true,
        status: isBrowserOnline() ? 'error' : 'offline',
        pendingCount: await getPendingQueueCount(db),
        lastError: errorMessage,
      })

      if (isNetworkError(error)) {
        return
      }
      throw error
    }
  }

  private async pushCycle(userId: string) {
    while (true) {
      const queueEntries = await listDueQueueEntries(db, PUSH_BATCH_SIZE)
      if (queueEntries.length === 0) {
        return
      }

      for (const entry of queueEntries) {
        try {
          await this.pushQueueEntry(entry, userId)
          await removeQueueEntries(db, [entry.id])
        } catch (error) {
          if (isAuthError(error)) {
            throw error
          }

          const retryCount = entry.retryCount + 1
          const nextRetryAt = new Date(Date.now() + computeRetryDelayMs(retryCount)).toISOString()
          await markQueueEntryRetry(db, entry.id, getErrorMessage(error), retryCount, nextRetryAt)

          if (isNetworkError(error)) {
            throw error
          }
        }
      }
    }
  }

  private async pushQueueEntry(
    entry: {
      id: string
      table: (typeof SYNC_TABLES)[number]
      entityId: string
      op: 'upsert' | 'delete'
    },
    userId: string,
  ) {
    if (entry.op === 'delete') {
      await this.remoteRepository.markDeleted(entry.table, entry.entityId)
      return
    }

    if (entry.table === 'categories') {
      const category = await db.categories.get(entry.entityId)
      if (!category) {
        await this.remoteRepository.markDeleted(entry.table, entry.entityId)
        return
      }

      await this.remoteRepository.upsertCategory(mapCategoryToRemoteRow(category, userId))
      return
    }

    if (entry.table === 'items') {
      const item = await db.items.get(entry.entityId)
      if (!item) {
        await this.remoteRepository.markDeleted(entry.table, entry.entityId)
        return
      }

      await this.remoteRepository.upsertItem(mapItemToRemoteRow(item, userId))
      return
    }

    if (entry.table === 'outfits') {
      const outfit = await db.outfits.get(entry.entityId)
      if (!outfit) {
        await this.remoteRepository.markDeleted(entry.table, entry.entityId)
        return
      }

      await this.remoteRepository.upsertOutfit(mapOutfitToRemoteRow(outfit, userId))
      return
    }

    if (entry.table === 'laundry_logs') {
      const log = await db.laundryLogs.get(entry.entityId)
      if (!log) {
        await this.remoteRepository.markDeleted(entry.table, entry.entityId)
        return
      }

      await this.remoteRepository.upsertLaundryLog(mapLaundryLogToRemoteRow(log, userId))
      return
    }

    const photo = await db.photos.get(entry.entityId)
    if (!photo) {
      await this.remoteRepository.markDeleted(entry.table, entry.entityId)
      return
    }

    const storagePath = buildPhotoStoragePath(userId, photo.itemId, photo.id, photo.mimeType)
    await this.remoteRepository.upsertPhoto(
      mapPhotoToRemoteRow(photo, userId, storagePath),
      photo.blob,
    )
  }

  private async pullCycle() {
    let meta = await getOrCreateSyncMeta(db)

    for (const table of SYNC_TABLES) {
      let cursor = meta.cursors[table]

      while (true) {
        const { rows } = await this.remoteRepository.pullSince(table, cursor, PULL_BATCH_SIZE)
        if (rows.length === 0) {
          break
        }

        let blockedByPendingLocalEntry = false
        let lastAppliedCursor = cursor

        for (const row of rows) {
          const hasPendingEntry = await hasPendingEntryForRecord(db, table, row.id)
          if (hasPendingEntry) {
            blockedByPendingLocalEntry = true
            break
          }

          await this.applyRemoteRow(table, row)
          lastAppliedCursor = {
            serverUpdatedAt: row.server_updated_at,
            id: row.id,
          }
        }

        if (lastAppliedCursor) {
          const cursorChanged =
            !cursor ||
            cursor.id !== lastAppliedCursor.id ||
            cursor.serverUpdatedAt !== lastAppliedCursor.serverUpdatedAt
          if (cursorChanged) {
            meta = await setSyncCursor(db, table, lastAppliedCursor)
            cursor = meta.cursors[table]
          }
        }

        if (blockedByPendingLocalEntry || rows.length < PULL_BATCH_SIZE) {
          break
        }
      }
    }
  }

  private async applyRemoteRow<TTable extends (typeof SYNC_TABLES)[number]>(
    table: TTable,
    row: RemoteRowFor<TTable>,
  ) {
    await runWithSyncMuted(async () => {
      if (row.deleted_at) {
        await this.applyRemoteDelete(table, row.id)
        return
      }

      if (table === 'categories') {
        await db.categories.put(mapRemoteCategoryToLocal(row as RemoteRowFor<'categories'>))
        return
      }

      if (table === 'items') {
        await db.items.put(mapRemoteItemToLocal(row as RemoteRowFor<'items'>))
        return
      }

      if (table === 'outfits') {
        await db.outfits.put(mapRemoteOutfitToLocal(row as RemoteRowFor<'outfits'>))
        return
      }

      if (table === 'laundry_logs') {
        await db.laundryLogs.put(mapRemoteLaundryLogToLocal(row as RemoteRowFor<'laundry_logs'>))
        return
      }

      const photoRow = row as RemoteRowFor<'photos'>
      const existingPhoto = await db.photos.get(photoRow.id)
      const photoBlob =
        existingPhoto && existingPhoto.mimeType === photoRow.mime_type
          ? existingPhoto.blob
          : await this.remoteRepository.downloadPhotoBlob(photoRow.storage_path)

      await db.transaction('rw', db.photos, db.items, async () => {
        await db.photos.put({
          id: photoRow.id,
          itemId: photoRow.item_id,
          blob: photoBlob,
          mimeType: photoRow.mime_type,
          width: photoRow.width,
          height: photoRow.height,
          createdAt: photoRow.created_at,
        })

        const linkedItem = await db.items.get(photoRow.item_id)
        if (linkedItem && !linkedItem.photoIds.includes(photoRow.id)) {
          await db.items.put({
            ...linkedItem,
            photoIds: [...linkedItem.photoIds, photoRow.id],
          })
        }
      })
    })
  }

  private async applyRemoteDelete(table: (typeof SYNC_TABLES)[number], entityId: string) {
    if (table === 'categories') {
      await db.categories.delete(entityId)
      return
    }

    if (table === 'items') {
      await db.transaction('rw', db.items, db.photos, db.outfits, db.laundryLogs, async () => {
        await db.photos.where('itemId').equals(entityId).delete()
        await db.laundryLogs.where('itemId').equals(entityId).delete()
        await db.outfits.toCollection().modify((outfit) => {
          outfit.itemIds = outfit.itemIds.filter((itemId) => itemId !== entityId)
        })
        await db.items.delete(entityId)
      })
      return
    }

    if (table === 'outfits') {
      await db.outfits.delete(entityId)
      return
    }

    if (table === 'laundry_logs') {
      await db.laundryLogs.delete(entityId)
      return
    }

    await db.transaction('rw', db.photos, db.items, async () => {
      const photo = await db.photos.get(entityId)
      if (!photo) {
        return
      }

      await db.photos.delete(entityId)

      const linkedItem = await db.items.get(photo.itemId)
      if (!linkedItem) {
        return
      }

      if (!linkedItem.photoIds.includes(entityId)) {
        return
      }

      await db.items.put({
        ...linkedItem,
        photoIds: linkedItem.photoIds.filter((id) => id !== entityId),
      })
    })
  }

  private resolveIdleStatus(enabled: boolean, authenticated: boolean) {
    if (!enabled) {
      return 'disabled' as const
    }
    if (!authenticated) {
      return 'paused' as const
    }
    if (!isBrowserOnline()) {
      return 'offline' as const
    }
    return 'idle' as const
  }

  private async handleAuthChange(session: Session | null) {
    const meta = await getOrCreateSyncMeta(db)
    const pendingCount = await getPendingQueueCount(db)
    const user = session?.user ?? null
    this.lastUserId = user?.id

    setCloudSyncState({
      enabled: meta.enabled,
      authenticated: Boolean(user),
      status: this.resolveIdleStatus(meta.enabled, Boolean(user)),
      pendingCount,
      lastSyncedAt: meta.lastSyncedAt,
      lastError: meta.lastError,
    })

    try {
      await this.reconcileRuntime(user)
    } catch (error) {
      setCloudSyncState({
        status: 'error',
        lastError: getErrorMessage(error),
      })
    }
  }

  private async reconcileRuntime(user: User | null) {
    const meta = await getOrCreateSyncMeta(db)
    if (!meta.enabled || !user) {
      this.disableRuntime()
      return
    }

    const needsInitialMerge = await this.ensureLinkedUser(meta, user.id)
    await this.enableRuntime(user.id)
    if (needsInitialMerge) {
      await this.syncNow('initial-link')
      return
    }

    await this.syncNow('start')
  }

  private async ensureLinkedUser(meta: Awaited<ReturnType<typeof getOrCreateSyncMeta>>, userId: string) {
    if (!meta.linkedUserId) {
      await updateSyncMeta(db, {
        linkedUserId: userId,
        cursors: {},
      })
      await clearSyncQueue(db)
      await seedQueueFromLocalData(db)
      return true
    }

    if (meta.linkedUserId !== userId) {
      const message =
        'This device dataset is linked to another account. Reset data before linking a new account.'
      await updateSyncMeta(db, { lastError: message })
      setCloudSyncState({
        status: 'error',
        lastError: message,
      })
      throw new Error(message)
    }

    return false
  }

  private async enableRuntime(userId: string) {
    if (this.runtimeActive) {
      return
    }

    this.runtimeActive = true
    this.lastUserId = userId

    if (typeof window !== 'undefined') {
      window.addEventListener(SYNC_QUEUE_CHANGED_EVENT, this.onQueueChanged as EventListener)
      window.addEventListener('online', this.onOnline)
      window.addEventListener('offline', this.onOffline)
      window.addEventListener('focus', this.onWindowFocus)
      document.addEventListener('visibilitychange', this.onWindowFocus)
    }

    this.intervalId = setInterval(() => {
      void this.syncNow('interval')
    }, PERIODIC_PULL_MS)

    const supabase = getSupabaseClient()
    const channel = supabase.channel(`cloud-sync-${userId}`)
    for (const table of SYNC_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          void this.syncNow('realtime')
        },
      )
    }
    channel.subscribe()
    this.realtimeChannelName = channel.topic
  }

  private disableRuntime() {
    if (!this.runtimeActive) {
      return
    }

    this.runtimeActive = false

    if (typeof window !== 'undefined') {
      window.removeEventListener(SYNC_QUEUE_CHANGED_EVENT, this.onQueueChanged as EventListener)
      window.removeEventListener('online', this.onOnline)
      window.removeEventListener('offline', this.onOffline)
      window.removeEventListener('focus', this.onWindowFocus)
      document.removeEventListener('visibilitychange', this.onWindowFocus)
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    if (this.realtimeChannelName) {
      const supabase = getSupabaseClient()
      const channel = supabase.getChannels().find((candidate) => candidate.topic === this.realtimeChannelName)
      if (channel) {
        void supabase.removeChannel(channel)
      }
      this.realtimeChannelName = undefined
    }
  }

  private async safeGetCloudUser() {
    try {
      const user = await getCloudUser()
      this.lastUserId = user?.id
      return user
    } catch {
      this.lastUserId = undefined
      return null
    }
  }
}

export const cloudSyncEngine: CloudSyncEngine = new DefaultCloudSyncEngine()
