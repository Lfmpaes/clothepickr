import type {
  Category,
  ClothingItem,
  LaundryLog,
  Outfit,
  PhotoAsset,
} from '@/lib/types'
import type {
  RemoteCategoryRow,
  RemoteItemRow,
  RemoteLaundryLogRow,
  RemoteOutfitRow,
  RemotePhotoRow,
} from '@/lib/cloud/types'

function extensionFromMimeType(mimeType: string) {
  if (mimeType.includes('png')) {
    return 'png'
  }
  if (mimeType.includes('webp')) {
    return 'webp'
  }
  if (mimeType.includes('gif')) {
    return 'gif'
  }
  return 'jpg'
}

export function buildPhotoStoragePath(userId: string, itemId: string, photoId: string, mimeType: string) {
  const extension = extensionFromMimeType(mimeType)
  return `${userId}/${itemId}/${photoId}.${extension}`
}

export function toRemoteCategory(category: Category, userId: string): RemoteCategoryRow {
  return {
    user_id: userId,
    id: category.id,
    name: category.name,
    is_default: category.isDefault,
    archived: category.archived,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
    deleted_at: null,
    server_updated_at: category.updatedAt,
  }
}

export function fromRemoteCategory(row: RemoteCategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toRemoteItem(item: ClothingItem, userId: string): RemoteItemRow {
  return {
    user_id: userId,
    id: item.id,
    name: item.name,
    category_id: item.categoryId,
    status: item.status,
    color: item.color,
    brand: item.brand,
    size: item.size,
    notes: item.notes,
    season_tags: item.seasonTags,
    photo_ids: item.photoIds,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: null,
    server_updated_at: item.updatedAt,
  }
}

export function fromRemoteItem(row: RemoteItemRow): ClothingItem {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    status: row.status,
    color: row.color,
    brand: row.brand,
    size: row.size,
    notes: row.notes,
    seasonTags: row.season_tags,
    photoIds: row.photo_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toRemoteOutfit(outfit: Outfit, userId: string): RemoteOutfitRow {
  return {
    user_id: userId,
    id: outfit.id,
    name: outfit.name,
    item_ids: outfit.itemIds,
    occasion: outfit.occasion,
    notes: outfit.notes,
    is_favorite: outfit.isFavorite,
    created_at: outfit.createdAt,
    updated_at: outfit.updatedAt,
    deleted_at: null,
    server_updated_at: outfit.updatedAt,
  }
}

export function fromRemoteOutfit(row: RemoteOutfitRow): Outfit {
  return {
    id: row.id,
    name: row.name,
    itemIds: row.item_ids,
    occasion: row.occasion,
    notes: row.notes,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toRemoteLaundryLog(log: LaundryLog, userId: string): RemoteLaundryLogRow {
  return {
    user_id: userId,
    id: log.id,
    item_id: log.itemId,
    from_status: log.fromStatus,
    to_status: log.toStatus,
    changed_at: log.changedAt,
    reason: log.reason,
    deleted_at: null,
    server_updated_at: log.changedAt,
  }
}

export function fromRemoteLaundryLog(row: RemoteLaundryLogRow): LaundryLog {
  return {
    id: row.id,
    itemId: row.item_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
    reason: row.reason,
  }
}

export function toRemotePhoto(
  photo: PhotoAsset,
  userId: string,
  storagePath: string,
): RemotePhotoRow {
  return {
    user_id: userId,
    id: photo.id,
    item_id: photo.itemId,
    storage_path: storagePath,
    mime_type: photo.mimeType,
    width: photo.width,
    height: photo.height,
    created_at: photo.createdAt,
    deleted_at: null,
    server_updated_at: photo.createdAt,
  }
}

export function fromRemotePhoto(row: RemotePhotoRow, blob: Blob): PhotoAsset {
  return {
    id: row.id,
    itemId: row.item_id,
    blob,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  }
}
