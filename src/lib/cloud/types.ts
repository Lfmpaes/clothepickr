import type { SyncCursor, SyncTableName } from '@/lib/types'

export const SYNC_TABLES: SyncTableName[] = [
  'categories',
  'items',
  'outfits',
  'laundryLogs',
  'photos',
]

export const REMOTE_TABLE_BY_SYNC_TABLE: Record<SyncTableName, string> = {
  categories: 'categories',
  items: 'items',
  outfits: 'outfits',
  laundryLogs: 'laundry_logs',
  photos: 'photos',
}

export interface RemoteCategoryRow {
  user_id: string
  id: string
  name: string
  is_default: boolean
  archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  server_updated_at: string
}

export interface RemoteItemRow {
  user_id: string
  id: string
  name: string
  category_id: string
  status: 'clean' | 'dirty' | 'washing' | 'drying'
  color: string
  brand: string
  size: string
  notes: string
  season_tags: string[]
  photo_ids: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  server_updated_at: string
}

export interface RemoteOutfitRow {
  user_id: string
  id: string
  name: string
  item_ids: string[]
  occasion: string
  notes: string
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  server_updated_at: string
}

export interface RemoteLaundryLogRow {
  user_id: string
  id: string
  item_id: string
  from_status: 'clean' | 'dirty' | 'washing' | 'drying'
  to_status: 'clean' | 'dirty' | 'washing' | 'drying'
  changed_at: string
  reason: 'manual' | 'cycle'
  deleted_at: string | null
  server_updated_at: string
}

export interface RemotePhotoRow {
  user_id: string
  id: string
  item_id: string
  storage_path: string
  mime_type: string
  width: number
  height: number
  created_at: string
  deleted_at: string | null
  server_updated_at: string
}

export interface RemoteRowMap {
  categories: RemoteCategoryRow
  items: RemoteItemRow
  outfits: RemoteOutfitRow
  laundryLogs: RemoteLaundryLogRow
  photos: RemotePhotoRow
}

export interface RemotePullResult<Row> {
  rows: Row[]
  cursor?: SyncCursor
}

export interface RemoteSyncRepository {
  pullSince<TableName extends SyncTableName>(
    table: TableName,
    userId: string,
    cursor?: SyncCursor,
    limit?: number,
  ): Promise<RemotePullResult<RemoteRowMap[TableName]>>
  upsert<TableName extends SyncTableName>(
    table: TableName,
    row: RemoteRowMap[TableName],
  ): Promise<void>
  markDeleted(table: SyncTableName, userId: string, entityId: string): Promise<void>
}
