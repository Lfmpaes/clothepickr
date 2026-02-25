import { getSupabaseClient } from '@/lib/cloud/supabase-client'
import type {
  RemoteCategoryRow,
  RemoteItemRow,
  RemoteLaundryLogRow,
  RemoteOutfitRow,
  RemotePhotoRow,
  RemotePullResult,
  RemoteRowFor,
  RemoteSyncRepository,
  SyncTableName,
} from '@/lib/cloud/types'
import type { SyncCursor } from '@/lib/types'
import { nowIso } from '@/lib/utils'

function afterCursorFilter(cursor: SyncCursor) {
  return `server_updated_at.gt.${cursor.serverUpdatedAt},and(server_updated_at.eq.${cursor.serverUpdatedAt},id.gt.${cursor.id})`
}

async function pullRows<TTable extends SyncTableName>(
  table: TTable,
  cursor: SyncCursor | undefined,
  limit: number,
): Promise<RemotePullResult<TTable>> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from(table)
    .select('*')
    .order('server_updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit)

  if (cursor) {
    query = query.or(afterCursorFilter(cursor))
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const rows = (data ?? []) as RemoteRowFor<TTable>[]
  const lastRow = rows.at(-1)
  const nextCursor = lastRow
    ? {
        serverUpdatedAt: lastRow.server_updated_at,
        id: lastRow.id,
      }
    : cursor

  return { rows, cursor: nextCursor }
}

async function upsertRow<TTable extends SyncTableName, TRow extends RemoteRowFor<TTable>>(
  table: TTable,
  row: TRow,
) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from(table).upsert(row, {
    onConflict: 'user_id,id',
  })
  if (error) {
    throw error
  }
}

export class SupabaseRemoteSyncRepository implements RemoteSyncRepository {
  async pullSince<TTable extends SyncTableName>(
    table: TTable,
    cursor: SyncCursor | undefined,
    limit: number,
  ) {
    return pullRows(table, cursor, limit)
  }

  async upsertCategory(row: RemoteCategoryRow) {
    await upsertRow('categories', row)
  }

  async upsertItem(row: RemoteItemRow) {
    await upsertRow('items', row)
  }

  async upsertOutfit(row: RemoteOutfitRow) {
    await upsertRow('outfits', row)
  }

  async upsertLaundryLog(row: RemoteLaundryLogRow) {
    await upsertRow('laundry_logs', row)
  }

  async upsertPhoto(row: RemotePhotoRow, photoBlob?: Blob) {
    const supabase = getSupabaseClient()
    if (photoBlob) {
      const { error: uploadError } = await supabase.storage.from('item-photos').upload(
        row.storage_path,
        photoBlob,
        {
          upsert: true,
          contentType: row.mime_type,
        },
      )
      if (uploadError) {
        throw uploadError
      }
    }

    await upsertRow('photos', row)
  }

  async markDeleted(table: SyncTableName, id: string) {
    const supabase = getSupabaseClient()
    if (table === 'photos') {
      const { data, error: selectError } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', id)
        .maybeSingle()
      if (selectError) {
        throw selectError
      }

      const { error: updateError } = await supabase
        .from('photos')
        .update({
          deleted_at: nowIso(),
        })
        .eq('id', id)
      if (updateError) {
        throw updateError
      }

      if (data?.storage_path) {
        const { error: removeError } = await supabase
          .storage
          .from('item-photos')
          .remove([data.storage_path])
        if (removeError) {
          throw removeError
        }
      }

      return
    }

    const { error } = await supabase
      .from(table)
      .update({
        deleted_at: nowIso(),
      })
      .eq('id', id)
    if (error) {
      throw error
    }
  }

  async downloadPhotoBlob(storagePath: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.storage.from('item-photos').download(storagePath)
    if (error) {
      throw error
    }
    return data
  }
}
