import type { Category, ClothingItem, LaundryLog, Outfit, PhotoAsset } from '@/lib/types'

// Convex row types (returned by pullSince queries) — fields mirror the schema
export interface ConvexCategoryRow {
  _id: string
  localId: string
  name: string
  isDefault: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
  serverUpdatedAt: string
}

export interface ConvexItemRow {
  _id: string
  localId: string
  name: string
  categoryId: string
  status: 'clean' | 'dirty' | 'washing' | 'drying'
  color: string
  brand: string
  size: string
  notes: string
  seasonTags: string[]
  photoIds: string[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
  serverUpdatedAt: string
}

export interface ConvexOutfitRow {
  _id: string
  localId: string
  name: string
  itemIds: string[]
  occasion: string
  notes: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
  serverUpdatedAt: string
}

export interface ConvexLaundryLogRow {
  _id: string
  localId: string
  itemId: string
  fromStatus: 'clean' | 'dirty' | 'washing' | 'drying'
  toStatus: 'clean' | 'dirty' | 'washing' | 'drying'
  changedAt: string
  reason: 'manual' | 'cycle'
  deletedAt?: string
  serverUpdatedAt: string
}

export interface ConvexPhotoRow {
  _id: string
  localId: string
  itemId: string
  storageId: string
  mimeType: string
  width: number
  height: number
  createdAt: string
  deletedAt?: string
  serverUpdatedAt: string
}

// toConvex* — local entity → Convex upsert args (drops _id, Convex-specific fields)

export function toConvexCategory(category: Category) {
  return {
    localId: category.id,
    name: category.name,
    isDefault: category.isDefault,
    archived: category.archived,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }
}

export function toConvexItem(item: ClothingItem) {
  return {
    localId: item.id,
    name: item.name,
    categoryId: item.categoryId,
    status: item.status,
    color: item.color,
    brand: item.brand,
    size: item.size,
    notes: item.notes,
    seasonTags: item.seasonTags,
    photoIds: item.photoIds,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function toConvexOutfit(outfit: Outfit) {
  return {
    localId: outfit.id,
    name: outfit.name,
    itemIds: outfit.itemIds,
    occasion: outfit.occasion,
    notes: outfit.notes,
    isFavorite: outfit.isFavorite,
    createdAt: outfit.createdAt,
    updatedAt: outfit.updatedAt,
  }
}

export function toConvexLaundryLog(log: LaundryLog) {
  return {
    localId: log.id,
    itemId: log.itemId,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    changedAt: log.changedAt,
    reason: log.reason,
  }
}

// fromConvex* — Convex row → local entity

export function fromConvexCategory(row: ConvexCategoryRow): Category {
  return {
    id: row.localId,
    name: row.name,
    isDefault: row.isDefault,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function fromConvexItem(row: ConvexItemRow): ClothingItem {
  return {
    id: row.localId,
    name: row.name,
    categoryId: row.categoryId,
    status: row.status,
    color: row.color,
    brand: row.brand,
    size: row.size,
    notes: row.notes,
    seasonTags: row.seasonTags,
    photoIds: row.photoIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function fromConvexOutfit(row: ConvexOutfitRow): Outfit {
  return {
    id: row.localId,
    name: row.name,
    itemIds: row.itemIds,
    occasion: row.occasion,
    notes: row.notes,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function fromConvexLaundryLog(row: ConvexLaundryLogRow): LaundryLog {
  return {
    id: row.localId,
    itemId: row.itemId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    changedAt: row.changedAt,
    reason: row.reason,
  }
}

export function fromConvexPhoto(row: ConvexPhotoRow, blob: Blob): PhotoAsset {
  return {
    id: row.localId,
    itemId: row.itemId,
    blob,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
  }
}
