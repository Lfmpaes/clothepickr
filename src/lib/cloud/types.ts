import type {
  Category,
  ClothingItem,
  LaundryLog,
  Outfit,
  PhotoAsset,
  SyncCursor,
  SyncCursorMap,
  SyncMeta,
  SyncQueueEntry,
  SyncTableName,
} from '@/lib/types'

export const SYNC_TABLES: SyncTableName[] = [
  'categories',
  'items',
  'outfits',
  'laundry_logs',
  'photos',
]

export type CloudSyncStatus = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error' | 'paused'

export interface CloudSyncState {
  enabled: boolean
  authenticated: boolean
  status: CloudSyncStatus
  pendingCount: number
  lastSyncedAt?: string
  lastError?: string
}

export type SyncReason =
  | 'manual'
  | 'start'
  | 'initial-link'
  | 'local-change'
  | 'online'
  | 'focus'
  | 'interval'
  | 'realtime'

export interface CloudSyncEngine {
  start(): Promise<void>
  stop(): void
  syncNow(reason: SyncReason): Promise<void>
  setEnabled(enabled: boolean): Promise<void>
  subscribe(listener: () => void): () => void
}

interface RemoteSyncBaseRow {
  user_id: string
  id: string
  deleted_at: string | null
  server_updated_at: string
}

export interface RemoteCategoryRow extends RemoteSyncBaseRow {
  name: string
  is_default: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export interface RemoteItemRow extends RemoteSyncBaseRow {
  name: string
  category_id: string
  status: ClothingItem['status']
  color: string
  brand: string
  size: string
  notes: string
  season_tags: string[]
  photo_ids: string[]
  created_at: string
  updated_at: string
}

export interface RemoteOutfitRow extends RemoteSyncBaseRow {
  name: string
  item_ids: string[]
  occasion: string
  notes: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface RemoteLaundryLogRow extends RemoteSyncBaseRow {
  item_id: string
  from_status: LaundryLog['fromStatus']
  to_status: LaundryLog['toStatus']
  changed_at: string
  reason: LaundryLog['reason']
}

export interface RemotePhotoRow extends RemoteSyncBaseRow {
  item_id: string
  storage_path: string
  mime_type: string
  width: number
  height: number
  created_at: string
}

export interface RemoteTableRowMap {
  categories: RemoteCategoryRow
  items: RemoteItemRow
  outfits: RemoteOutfitRow
  laundry_logs: RemoteLaundryLogRow
  photos: RemotePhotoRow
}

export type RemoteRowFor<TTable extends SyncTableName> = RemoteTableRowMap[TTable]

export interface RemotePullResult<TTable extends SyncTableName> {
  rows: RemoteRowFor<TTable>[]
  cursor?: SyncCursor
}

export interface RemoteSyncRepository {
  pullSince<TTable extends SyncTableName>(
    table: TTable,
    cursor: SyncCursor | undefined,
    limit: number,
  ): Promise<RemotePullResult<TTable>>
  upsertCategory(row: RemoteCategoryRow): Promise<void>
  upsertItem(row: RemoteItemRow): Promise<void>
  upsertOutfit(row: RemoteOutfitRow): Promise<void>
  upsertLaundryLog(row: RemoteLaundryLogRow): Promise<void>
  upsertPhoto(row: RemotePhotoRow, photoBlob?: Blob): Promise<void>
  markDeleted(table: SyncTableName, id: string): Promise<void>
  downloadPhotoBlob(storagePath: string): Promise<Blob>
}

export interface CloudSyncSnapshot {
  meta: SyncMeta
  queue: SyncQueueEntry[]
  categories: Category[]
  items: ClothingItem[]
  outfits: Outfit[]
  logs: LaundryLog[]
  photos: PhotoAsset[]
}

export type { SyncCursor, SyncCursorMap, SyncMeta, SyncQueueEntry, SyncTableName }
