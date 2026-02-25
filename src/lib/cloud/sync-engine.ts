import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import {
  fromRemoteCategory,
  fromRemoteItem,
  fromRemoteLaundryLog,
  fromRemoteOutfit,
  fromRemotePhoto,
  toRemoteCategory,
  toRemoteItem,
  toRemoteLaundryLog,
  toRemoteOutfit,
  toRemotePhoto,
  buildPhotoStoragePath,
} from '@/lib/cloud/mappers'
import {
  SYNC_TABLES,
  type RemoteCategoryRow,
  type RemoteItemRow,
  type RemoteLaundryLogRow,
  type RemoteOutfitRow,
  type RemotePhotoRow,
  type RemotePullResult,
  type RemoteRowMap,
  REMOTE_TABLE_BY_SYNC_TABLE,
} from '@/lib/cloud/types'
import { getCloudUser, onCloudAuthStateChange } from '@/lib/cloud/auth'
import { getSupabaseClient } from '@/lib/cloud/supabase-client'
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
import type {
  CloudSyncStatus,
  SyncCursor,
  SyncQueueEntry,
  SyncTableName,
} from '@/lib/types'
import { nowIso } from '@/lib/utils'

const SYNC_INTERVAL_MS = 2 * 60 * 1000
const SYNC_BATCH_SIZE = 100
const PULL_BATCH_SIZE = 200
const STORAGE_REMOVE_BATCH_SIZE = 100
const CLOUD_WIPE_DELETE_ORDER: SyncTableName[] = [
  'photos',
  'laundryLogs',
  'outfits',
  'items',
  'categories',
]

type SyncReason = 'startup' | 'manual' | 'queue' | 'realtime' | 'focus' | 'online' | 'enable' | 'auth'

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

async function assertSupabaseClient() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Cloud sync is not configured.')
  }

  return supabase
}

async function removeLocalPhoto(photoId: string, fallbackItemId?: string) {
  await db.transaction('rw', db.photos, db.items, async () => {
    const current = await db.photos.get(photoId)
    const itemId = current?.itemId ?? fallbackItemId

    await db.photos.delete(photoId)

    if (!itemId) {
      return
    }

    const linkedItem = await db.items.get(itemId)
    if (!linkedItem) {
      return
    }

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

class SupabaseCloudSyncEngine implements CloudSyncEngine {
  private started = false
  private intervalId?: number
  private channel?: RealtimeChannel
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
    if (this.started) {
      return
    }

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
      throw new Error('This device is already linked to another cloud account. Reset local data before switching accounts.')
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
    const supabase = await assertSupabaseClient()
    const user = await getCloudUser()
    if (!user) {
      throw new Error('Sign in to erase cloud data.')
    }

    if (this.syncPromise) {
      await this.syncPromise
    }

    patchCloudSyncState({
      status: 'syncing',
      lastError: undefined,
    })
    this.teardownRuntime()
    setQueueCaptureEnabled(false)

    try {
      await this.removeAllRemotePhotoObjects(supabase, user.id)

      for (const table of CLOUD_WIPE_DELETE_ORDER) {
        const remoteTable = REMOTE_TABLE_BY_SYNC_TABLE[table]
        const { error } = await supabase.from(remoteTable).delete().eq('user_id', user.id)
        if (error) {
          throw new Error(error.message)
        }
      }

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
      patchCloudSyncState({
        status: 'error',
        lastError: message,
      })
      throw error
    }
  }

  subscribe(listener: () => void) {
    return subscribeCloudSyncState(listener)
  }

  async syncNow(reason: string = 'manual') {
    if (!this.started) {
      return
    }

    if (!this.shouldSyncRun()) {
      return
    }

    if (this.syncPromise) {
      await this.syncPromise
      return
    }

    this.syncPromise = this.runSync(reason as SyncReason)
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Sync failed.'
        await patchSyncMeta({ lastError: message })

        patchCloudSyncState({
          status: 'error',
          lastError: message,
        })

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
    this.setupRuntime(user.id)

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

  private setupRuntime(userId: string) {
    this.attachDomListeners()

    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        void this.syncNow('focus')
      }, SYNC_INTERVAL_MS)
    }

    if (!this.channel) {
      void this.subscribeRealtime(userId)
    }
  }

  private teardownRuntime() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    if (this.channel) {
      void this.channel.unsubscribe()
      this.channel = undefined
    }

    this.detachDomListeners()
  }

  private attachDomListeners() {
    if (this.listenersAttached) {
      return
    }

    this.listenersAttached = true
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('focus', this.handleFocus)
    document.addEventListener('visibilitychange', this.handleVisibility)
  }

  private detachDomListeners() {
    if (!this.listenersAttached) {
      return
    }

    this.listenersAttached = false
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('focus', this.handleFocus)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  private async subscribeRealtime(userId: string) {
    const supabase = await assertSupabaseClient()

    const channel = supabase.channel(`cloud-sync-${userId}`)
    for (const table of SYNC_TABLES) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: REMOTE_TABLE_BY_SYNC_TABLE[table],
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void this.syncNow('realtime')
        },
      )
    }

    channel.subscribe()
    this.channel = channel
  }

  private async runSync(reason: SyncReason) {
    if (!this.shouldSyncRun()) {
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      patchCloudSyncState({ status: 'offline' })
      return
    }

    const supabase = await assertSupabaseClient()
    const user = await getCloudUser()
    if (!user) {
      return
    }

    patchCloudSyncState({ status: 'syncing', lastError: undefined })

    await this.pushQueue(supabase, user.id)
    await this.pullRemoteChanges(supabase, user.id)
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

  private async pushQueue(supabase: SupabaseClient, userId: string) {
    for (let turn = 0; turn < 40; turn += 1) {
      const batch = await listPendingQueueEntries(SYNC_BATCH_SIZE)
      if (batch.length === 0) {
        return
      }

      for (const entry of batch) {
        try {
          await this.pushEntry(entry, supabase, userId)
          await removeSyncQueueEntry(entry.id)
        } catch (error) {
          if (isAuthError(error)) {
            throw error
          }

          const message = error instanceof Error ? error.message : 'Could not sync entry.'
          await markSyncQueueEntryFailure(entry.id, message)
        }
      }
    }
  }

  private async pushEntry(entry: SyncQueueEntry, supabase: SupabaseClient, userId: string) {
    if (entry.op === 'delete') {
      await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
      return
    }

    if (entry.table === 'categories') {
      const row = await db.categories.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
        return
      }

      await this.upsertRemoteRow(entry.table, toRemoteCategory(row, userId), supabase)
      return
    }

    if (entry.table === 'items') {
      const row = await db.items.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
        return
      }

      await this.upsertRemoteRow(entry.table, toRemoteItem(row, userId), supabase)
      return
    }

    if (entry.table === 'outfits') {
      const row = await db.outfits.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
        return
      }

      await this.upsertRemoteRow(entry.table, toRemoteOutfit(row, userId), supabase)
      return
    }

    if (entry.table === 'laundryLogs') {
      const row = await db.laundryLogs.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
        return
      }

      await this.upsertRemoteRow(entry.table, toRemoteLaundryLog(row, userId), supabase)
      return
    }

    if (entry.table === 'photos') {
      const row = await db.photos.get(entry.entityId)
      if (!row) {
        await this.markRemoteDeleted(entry.table, entry.entityId, supabase, userId)
        return
      }

      const storagePath = buildPhotoStoragePath(userId, row.itemId, row.id, row.mimeType)
      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(storagePath, row.blob, {
          upsert: true,
          contentType: row.mimeType,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      await this.upsertRemoteRow(entry.table, toRemotePhoto(row, userId, storagePath), supabase)
      return
    }

    throw new Error(`Unsupported sync table: ${entry.table}`)
  }

  private async upsertRemoteRow(
    table: SyncTableName,
    payload:
      | RemoteCategoryRow
      | RemoteItemRow
      | RemoteOutfitRow
      | RemoteLaundryLogRow
      | RemotePhotoRow,
    supabase: SupabaseClient,
  ) {
    const remoteTable = REMOTE_TABLE_BY_SYNC_TABLE[table]
    const { error } = await supabase.from(remoteTable).upsert(payload as never, {
      onConflict: 'user_id,id',
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  private async markRemoteDeleted(
    table: SyncTableName,
    entityId: string,
    supabase: SupabaseClient,
    userId: string,
  ) {
    const remoteTable = REMOTE_TABLE_BY_SYNC_TABLE[table]

    if (table === 'photos') {
      const { data, error } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('user_id', userId)
        .eq('id', entityId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (data?.storage_path) {
        const { error: removeError } = await supabase.storage
          .from('item-photos')
          .remove([data.storage_path])

        if (removeError) {
          throw new Error(removeError.message)
        }
      }
    }

    const { error } = await supabase
      .from(remoteTable)
      .update({ deleted_at: nowIso() } as never)
      .eq('user_id', userId)
      .eq('id', entityId)

    if (error) {
      throw new Error(error.message)
    }
  }

  private async removeAllRemotePhotoObjects(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('user_id', userId)
      .not('storage_path', 'is', null)

    if (error) {
      throw new Error(error.message)
    }

    const storagePaths = [...new Set((data ?? []).map((row) => row.storage_path).filter(Boolean))]
    for (let start = 0; start < storagePaths.length; start += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = storagePaths.slice(start, start + STORAGE_REMOVE_BATCH_SIZE)
      const { error: removeError } = await supabase.storage.from('item-photos').remove(batch)
      if (removeError) {
        throw new Error(removeError.message)
      }
    }
  }

  private async pullRemoteChanges(supabase: SupabaseClient, userId: string) {
    const meta = await ensureSyncMeta()
    const cursors = {
      ...meta.cursors,
    }

    for (const table of SYNC_TABLES) {
      const pendingIds = await getPendingEntityIdsByTable(table)
      const result = await this.pullTableChanges(table, supabase, userId, cursors[table], pendingIds)
      if (result.cursor) {
        cursors[table] = result.cursor
      }
    }

    await patchSyncMeta({ cursors })
  }

  private async pullTableChanges<TableName extends SyncTableName>(
    table: TableName,
    supabase: SupabaseClient,
    userId: string,
    cursor: SyncCursor | undefined,
    pendingIds: Set<string>,
  ): Promise<RemotePullResult<RemoteRowMap[TableName]>> {
    let currentCursor = cursor

    for (let page = 0; page < 30; page += 1) {
      const batch = await this.fetchRemoteBatch(table, supabase, userId, currentCursor)
      if (batch.rows.length === 0) {
        return {
          rows: [],
          cursor: currentCursor,
        }
      }

      for (const row of batch.rows) {
        currentCursor = {
          serverUpdatedAt: row.server_updated_at,
          id: row.id,
        }

        if (pendingIds.has(row.id)) {
          continue
        }

        await runWithSyncMuted(async () => {
          await this.applyRemoteRow(table, row, supabase)
        })
      }

      if (batch.rows.length < PULL_BATCH_SIZE) {
        return {
          rows: batch.rows,
          cursor: currentCursor,
        }
      }
    }

    return {
      rows: [],
      cursor: currentCursor,
    }
  }

  private async fetchRemoteBatch<TableName extends SyncTableName>(
    table: TableName,
    supabase: SupabaseClient,
    userId: string,
    cursor: SyncCursor | undefined,
  ): Promise<RemotePullResult<RemoteRowMap[TableName]>> {
    const remoteTable = REMOTE_TABLE_BY_SYNC_TABLE[table]

    let query = supabase
      .from(remoteTable)
      .select('*')
      .eq('user_id', userId)
      .order('server_updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_BATCH_SIZE)

    if (cursor) {
      query = query.or(
        `server_updated_at.gt.${cursor.serverUpdatedAt},and(server_updated_at.eq.${cursor.serverUpdatedAt},id.gt.${cursor.id})`,
      )
    }

    const { data, error } = await query
    if (error) {
      throw new Error(error.message)
    }

    const rows = (data ?? []) as RemoteRowMap[TableName][]

    return {
      rows,
      cursor:
        rows.length > 0
          ? {
              serverUpdatedAt: rows[rows.length - 1].server_updated_at,
              id: rows[rows.length - 1].id,
            }
          : cursor,
    }
  }

  private async applyRemoteRow<TableName extends SyncTableName>(
    table: TableName,
    row: RemoteRowMap[TableName],
    supabase: SupabaseClient,
  ) {
    if (table === 'categories') {
      const typed = row as RemoteCategoryRow
      if (typed.deleted_at) {
        await db.categories.delete(typed.id)
        return
      }

      await db.categories.put(fromRemoteCategory(typed))
      return
    }

    if (table === 'items') {
      const typed = row as RemoteItemRow
      if (typed.deleted_at) {
        await itemRepository.remove(typed.id)
        return
      }

      await db.items.put(fromRemoteItem(typed))
      return
    }

    if (table === 'outfits') {
      const typed = row as RemoteOutfitRow
      if (typed.deleted_at) {
        await db.outfits.delete(typed.id)
        return
      }

      await db.outfits.put(fromRemoteOutfit(typed))
      return
    }

    if (table === 'laundryLogs') {
      const typed = row as RemoteLaundryLogRow
      if (typed.deleted_at) {
        await db.laundryLogs.delete(typed.id)
        return
      }

      await db.laundryLogs.put(fromRemoteLaundryLog(typed))
      return
    }

    if (table === 'photos') {
      const typed = row as RemotePhotoRow

      if (typed.deleted_at) {
        await removeLocalPhoto(typed.id, typed.item_id)
        return
      }

      const { data, error } = await supabase.storage
        .from('item-photos')
        .download(typed.storage_path)

      if (error) {
        throw new Error(error.message)
      }

      const localPhoto = fromRemotePhoto(typed, data)
      await db.transaction('rw', db.photos, db.items, async () => {
        await db.photos.put(localPhoto)

        const linkedItem = await db.items.get(localPhoto.itemId)
        if (!linkedItem) {
          return
        }

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

export const cloudSyncEngine: CloudSyncEngine = new SupabaseCloudSyncEngine()
