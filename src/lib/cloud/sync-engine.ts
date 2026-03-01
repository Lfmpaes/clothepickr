import { api } from '../../../convex/_generated/api'
import type {
  ConvexCategoryRow,
  ConvexItemRow,
  ConvexLaundryLogRow,
  ConvexOutfitRow,
  ConvexPhotoRow,
} from '@/lib/cloud/convex-mappers'
import {
  fromConvexCategory,
  fromConvexItem,
  fromConvexLaundryLog,
  fromConvexOutfit,
  fromConvexPhoto,
  toConvexCategory,
  toConvexItem,
  toConvexLaundryLog,
  toConvexOutfit,
} from '@/lib/cloud/convex-mappers'
import { getCloudUser, onCloudAuthStateChange } from '@/lib/cloud/convex-auth'
import { getConvexReactClient, isConvexConfigured } from '@/lib/cloud/convex-client'
import {
  clearSyncQueue,
  ensureSyncMeta,
  getPendingEntityIdsByTable,
  getPendingQueueCount,
  listPendingQueueEntries,
  markSyncQueueEntryFailure,
  patchSyncMeta,
  registerSyncQueueHooks,
  removeSyncQueueEntry,
  runWithSyncMuted,
  seedSyncQueueFromLocalData,
  setQueueCaptureEnabled,
  setQueueChangeListener,
} from '@/lib/cloud/queue'
import {
  getCloudSyncState,
  patchCloudSyncState,
  resetCloudSyncState,
  subscribeCloudSyncState,
} from '@/lib/cloud/sync-state-store'
import { db, itemRepository, reconcileDefaultCategories } from '@/lib/db'
import type { CloudSyncStatus, SyncCursor, SyncQueueEntry, SyncTableName } from '@/lib/types'
import { nowIso } from '@/lib/utils'

const SYNC_INTERVAL_MS = 2 * 60 * 1000
const SYNC_BATCH_SIZE = 100
const PULL_BATCH_SIZE = 200

const SYNC_TABLES: SyncTableName[] = ['categories', 'items', 'outfits', 'laundryLogs', 'photos']

type SyncReason = 'startup' | 'manual' | 'queue' | 'focus' | 'online' | 'enable' | 'auth'

function statusByConnectivity(defaultStatus: CloudSyncStatus): CloudSyncStatus {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline'
  }
  return defaultStatus
}

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('jwt') ||
    message.includes('auth') ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('401')
  )
}

async function removeLocalPhoto(photoId: string, fallbackItemId?: string) {
  await db.transaction('rw', db.photos, db.items, async () => {
    const current = await db.photos.get(photoId)
    const itemId = current?.itemId ?? fallbackItemId

    await db.photos.delete(photoId)

    if (!itemId) return

    const linkedItem = await db.items.get(itemId)
    if (!linkedItem) return

    await db.items.put({
      ...linkedItem,
      photoIds: linkedItem.photoIds.filter((id) => id !== photoId),
      updatedAt: nowIso(),
    })
  })
}

export interface CloudSyncEngine {
  start(): Promise<void>
  stop(): void
  syncNow(reason?: string): Promise<void>
  setEnabled(enabled: boolean): Promise<void>
  clearQueue(): Promise<void>
  wipeCloudData(): Promise<void>
  subscribe(listener: () => void): () => void
}

class ConvexCloudSyncEngine implements CloudSyncEngine {
  private started = false
  private intervalId?: number
  private syncPromise?: Promise<void>
  private unsubscribeAuth?: () => void
  private listenersAttached = false

  private readonly handleOnline = () => {
    void this.syncNow('online')
  }

  private readonly handleOffline = () => {
    patchCloudSyncState({ status: 'offline' })
  }

  private readonly handleFocus = () => {
    void this.syncNow('focus')
  }

  private readonly handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void this.syncNow('focus')
    }
  }

  async start() {
    if (this.started) return

    this.started = true
    registerSyncQueueHooks()
    setQueueChangeListener(() => {
      void this.refreshPendingCount()
      if (this.shouldSyncRun()) {
        void this.syncNow('queue')
      }
    })

    await ensureSyncMeta()
    await this.refreshPendingCount()

    this.unsubscribeAuth = onCloudAuthStateChange(() => {
      void this.handleAuthStateChange()
    })

    await this.syncRuntimeFromState('startup')
  }

  stop() {
    this.started = false
    this.teardownRuntime()
    setQueueCaptureEnabled(false)
    setQueueChangeListener(undefined)

    if (this.unsubscribeAuth) {
      this.unsubscribeAuth()
      this.unsubscribeAuth = undefined
    }

    resetCloudSyncState()
  }

  async setEnabled(enabled: boolean) {
    const user = await getCloudUser()
    const current = await ensureSyncMeta()

    if (enabled && current.linkedUserId && user && current.linkedUserId !== user.id) {
      throw new Error(
        'This device is already linked to another cloud account. Reset local data before switching accounts.',
      )
    }

    let deviceId = current.deviceId
    if (enabled && !deviceId) {
      deviceId = crypto.randomUUID()
    }

    const linkedUserId = enabled && user ? user.id : current.linkedUserId
    const updated = await patchSyncMeta({
      enabled,
      deviceId,
      linkedUserId,
      lastError: '',
    })

    if (enabled && !updated.lastSyncedAt) {
      await seedSyncQueueFromLocalData()
    }

    await this.syncRuntimeFromState('enable')
  }

  async clearQueue() {
    await clearSyncQueue()
    await this.refreshPendingCount()
  }

  async wipeCloudData() {
    if (!isConvexConfigured()) throw new Error('Cloud sync is not configured.')
    const user = await getCloudUser()
    if (!user) throw new Error('Sign in to erase cloud data.')

    if (this.syncPromise) {
      await this.syncPromise
    }

    patchCloudSyncState({ status: 'syncing', lastError: undefined })
    this.teardownRuntime()
    setQueueCaptureEnabled(false)

    try {
      const client = getConvexReactClient()
      await client.mutation(api.sync.wipeAllUserData, {})

      await clearSyncQueue()
      await patchSyncMeta({
        enabled: false,
        linkedUserId: user.id,
        cursors: {},
        lastSyncedAt: '',
        lastError: '',
      })
      await this.refreshPendingCount()
      await this.syncRuntimeFromState('manual')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not erase cloud data.'
      await patchSyncMeta({ lastError: message })
      patchCloudSyncState({ status: 'error', lastError: message })
      throw error
    }
  }

  subscribe(listener: () => void) {
    return subscribeCloudSyncState(listener)
  }

  async syncNow(reason: string = 'manual') {
    if (!this.started) return
    if (!this.shouldSyncRun()) return

    if (this.syncPromise) {
      await this.syncPromise
      return
    }

    this.syncPromise = this.runSync(reason as SyncReason)
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Sync failed.'
        await patchSyncMeta({ lastError: message })
        patchCloudSyncState({ status: 'error', lastError: message })

        if (isAuthError(error)) {
          setQueueCaptureEnabled(false)
          this.teardownRuntime()
        }
      })
      .finally(() => {
        this.syncPromise = undefined
      })

    await this.syncPromise
  }

  private shouldSyncRun() {
    const state = getCloudSyncState()
    return state.enabled && state.authenticated
  }

  private async refreshPendingCount() {
    const pendingCount = await getPendingQueueCount()
    patchCloudSyncState({ pendingCount })
  }

  private async handleAuthStateChange() {
    await this.syncRuntimeFromState('auth')
  }

  private async syncRuntimeFromState(trigger: SyncReason) {
    const meta = await ensureSyncMeta()
    const user = await getCloudUser()
    const authenticated = Boolean(user)

    if (meta.enabled && meta.linkedUserId && user && meta.linkedUserId !== user.id) {
      patchCloudSyncState({
        enabled: true,
        authenticated: true,
        status: 'error',
        lastError: 'This device is linked to another account. Reset local data before switching accounts.',
        lastSyncedAt: meta.lastSyncedAt || undefined,
      })
      setQueueCaptureEnabled(false)
      this.teardownRuntime()
      return
    }

    if (!meta.enabled) {
      patchCloudSyncState({
        enabled: false,
        authenticated,
        status: 'disabled',
        lastError: undefined,
        lastSyncedAt: meta.lastSyncedAt || undefined,
      })
      setQueueCaptureEnabled(false)
      this.teardownRuntime()
      return
    }

    if (!authenticated || !user) {
      patchCloudSyncState({
        enabled: true,
        authenticated: false,
        status: 'disabled',
        lastError: undefined,
        lastSyncedAt: meta.lastSyncedAt || undefined,
      })
      setQueueCaptureEnabled(false)
      this.teardownRuntime()
      return
    }

    if (!meta.linkedUserId) {
      await patchSyncMeta({ linkedUserId: user.id })
    }

    setQueueCaptureEnabled(true)
    this.setupRuntime()

    patchCloudSyncState({
      enabled: true,
      authenticated: true,
      status: statusByConnectivity('idle'),
      lastError: meta.lastError || undefined,
      lastSyncedAt: meta.lastSyncedAt || undefined,
    })

    if (trigger === 'startup' || trigger === 'auth' || trigger === 'enable') {
      void this.syncNow(trigger)
    }
  }

  private setupRuntime() {
    this.attachDomListeners()

    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        void this.syncNow('focus')
      }, SYNC_INTERVAL_MS)
    }
  }

  private teardownRuntime() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    this.detachDomListeners()
  }

  private attachDomListeners() {
    if (this.listenersAttached) return
    this.listenersAttached = true
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('focus', this.handleFocus)
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  private detachDomListeners() {
    if (!this.listenersAttached) return
    this.listenersAttached = false
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('focus', this.handleFocus)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  private async runSync(reason: SyncReason) {
    if (!this.shouldSyncRun()) return

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      patchCloudSyncState({ status: 'offline' })
      return
    }

    const user = await getCloudUser()
    if (!user) return

    patchCloudSyncState({ status: 'syncing', lastError: undefined })

    await this.pushQueue()
    await this.pullRemoteChanges()
    await reconcileDefaultCategories()

    const syncedAt = nowIso()
    await patchSyncMeta({
      linkedUserId: user.id,
      lastSyncedAt: syncedAt,
      lastError: '',
    })

    await this.refreshPendingCount()

    patchCloudSyncState({
      status: statusByConnectivity('idle'),
      lastSyncedAt: syncedAt,
      lastError: undefined,
    })

    if (reason === 'manual') {
      patchCloudSyncState({ status: statusByConnectivity('idle') })
    }
  }

  private async pushQueue() {
    const client = getConvexReactClient()

    for (let turn = 0; turn < 40; turn += 1) {
      const batch = await listPendingQueueEntries(SYNC_BATCH_SIZE)
      if (batch.length === 0) return

      for (const entry of batch) {
        try {
          await this.pushEntry(entry, client)
          await removeSyncQueueEntry(entry.id)
        } catch (error) {
          if (isAuthError(error)) throw error
          const message = error instanceof Error ? error.message : 'Could not sync entry.'
          await markSyncQueueEntryFailure(entry.id, message)
        }
      }
    }
  }

  private async pushEntry(entry: SyncQueueEntry, client: ReturnType<typeof getConvexReactClient>) {
    if (entry.op === 'delete') {
      await this.markRemoteDeleted(entry.table, entry.entityId, client)
      return
    }

    if (entry.table === 'categories') {
      const row = await db.categories.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, client)
        return
      }
      await client.mutation(api.categories.upsert, toConvexCategory(row))
      return
    }

    if (entry.table === 'items') {
      const row = await db.items.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, client)
        return
      }
      await client.mutation(api.items.upsert, toConvexItem(row))
      return
    }

    if (entry.table === 'outfits') {
      const row = await db.outfits.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, client)
        return
      }
      await client.mutation(api.outfits.upsert, toConvexOutfit(row))
      return
    }

    if (entry.table === 'laundryLogs') {
      const row = await db.laundryLogs.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, client)
        return
      }
      await client.mutation(api.laundryLogs.upsert, toConvexLaundryLog(row))
      return
    }

    if (entry.table === 'photos') {
      const row = await db.photos.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, client)
        return
      }

      // 1. Get presigned upload URL
      const uploadUrl = await client.mutation(api.photos.generateUploadUrl, {})

      // 2. Upload blob
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': row.mimeType },
        body: row.blob,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Photo upload failed: ${uploadResponse.statusText}`)
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: string }

      // 3. Record photo metadata
      await client.mutation(api.photos.upsert, {
        localId: row.id,
        itemId: row.itemId,
        storageId: storageId as never,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        createdAt: row.createdAt,
      })
      return
    }

    throw new Error(`Unsupported sync table: ${entry.table}`)
  }

  private async markRemoteDeleted(
    table: SyncTableName,
    localId: string,
    client: ReturnType<typeof getConvexReactClient>,
  ) {
    if (table === 'categories') {
      await client.mutation(api.categories.markDeleted, { localId })
    } else if (table === 'items') {
      await client.mutation(api.items.markDeleted, { localId })
    } else if (table === 'outfits') {
      await client.mutation(api.outfits.markDeleted, { localId })
    } else if (table === 'laundryLogs') {
      await client.mutation(api.laundryLogs.markDeleted, { localId })
    } else if (table === 'photos') {
      await client.mutation(api.photos.markDeleted, { localId })
    }
  }

  private async pullRemoteChanges() {
    const meta = await ensureSyncMeta()
    const cursors = { ...meta.cursors }

    for (const table of SYNC_TABLES) {
      const pendingIds = await getPendingEntityIdsByTable(table)
      const newCursor = await this.pullTableChanges(table, cursors[table], pendingIds)
      if (newCursor) {
        cursors[table] = newCursor
      }
    }

    await patchSyncMeta({ cursors })
  }

  private async pullTableChanges(
    table: SyncTableName,
    cursor: SyncCursor | undefined,
    pendingIds: Set<string>,
  ): Promise<SyncCursor | undefined> {
    const client = getConvexReactClient()
    let currentCursor = cursor

    for (let page = 0; page < 30; page += 1) {
      const rows = await this.fetchRemoteBatch(table, client, currentCursor)

      if (rows.length === 0) {
        return currentCursor
      }

      for (const row of rows) {
        currentCursor = {
          serverUpdatedAt: row.serverUpdatedAt,
          id: row.localId,
        }

        if (pendingIds.has(row.localId)) continue

        await runWithSyncMuted(async () => {
          await this.applyRemoteRow(table, row, client)
        })
      }

      if (rows.length < PULL_BATCH_SIZE) {
        return currentCursor
      }
    }

    return currentCursor
  }

  private async fetchRemoteBatch(
    table: SyncTableName,
    client: ReturnType<typeof getConvexReactClient>,
    cursor: SyncCursor | undefined,
  ): Promise<
    Array<(ConvexCategoryRow | ConvexItemRow | ConvexOutfitRow | ConvexLaundryLogRow | ConvexPhotoRow) & { localId: string; serverUpdatedAt: string; deletedAt?: string }>
  > {
    const args = { cursor: cursor?.serverUpdatedAt, limit: PULL_BATCH_SIZE }

    if (table === 'categories') return client.query(api.categories.pullSince, args) as never
    if (table === 'items') return client.query(api.items.pullSince, args) as never
    if (table === 'outfits') return client.query(api.outfits.pullSince, args) as never
    if (table === 'laundryLogs') return client.query(api.laundryLogs.pullSince, args) as never
    if (table === 'photos') return client.query(api.photos.pullSince, args) as never

    throw new Error(`Unsupported sync table: ${table}`)
  }

  private async applyRemoteRow(
    table: SyncTableName,
    row: unknown,
    client: ReturnType<typeof getConvexReactClient>,
  ) {
    if (table === 'categories') {
      const typed = row as ConvexCategoryRow
      if (typed.deletedAt) {
        await db.categories.delete(typed.localId)
        return
      }
      await db.categories.put(fromConvexCategory(typed))
      return
    }

    if (table === 'items') {
      const typed = row as ConvexItemRow
      if (typed.deletedAt) {
        await itemRepository.remove(typed.localId)
        return
      }
      await db.items.put(fromConvexItem(typed))
      return
    }

    if (table === 'outfits') {
      const typed = row as ConvexOutfitRow
      if (typed.deletedAt) {
        await db.outfits.delete(typed.localId)
        return
      }
      await db.outfits.put(fromConvexOutfit(typed))
      return
    }

    if (table === 'laundryLogs') {
      const typed = row as ConvexLaundryLogRow
      if (typed.deletedAt) {
        await db.laundryLogs.delete(typed.localId)
        return
      }
      await db.laundryLogs.put(fromConvexLaundryLog(typed))
      return
    }

    if (table === 'photos') {
      const typed = row as ConvexPhotoRow

      if (typed.deletedAt) {
        await removeLocalPhoto(typed.localId, typed.itemId)
        return
      }

      const downloadUrl = await client.query(api.photos.getUrl, {
        storageId: typed.storageId as never,
      })

      if (!downloadUrl) {
        throw new Error(`No download URL for photo ${typed.localId}`)
      }

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error(`Photo download failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const localPhoto = fromConvexPhoto(typed, blob)

      await db.transaction('rw', db.photos, db.items, async () => {
        await db.photos.put(localPhoto)

        const linkedItem = await db.items.get(localPhoto.itemId)
        if (!linkedItem) return

        await db.items.put({
          ...linkedItem,
          photoIds: [...new Set([...linkedItem.photoIds, localPhoto.id])],
        })
      })
      return
    }

    throw new Error(`Unsupported sync table: ${String(table)}`)
  }
}

export const cloudSyncEngine: CloudSyncEngine = new ConvexCloudSyncEngine()
