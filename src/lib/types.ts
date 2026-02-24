export type ID = string

export type ClothingStatus = 'clean' | 'dirty' | 'washing' | 'drying'

export interface Category {
  id: ID
  name: string
  isDefault: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ClothingItem {
  id: ID
  name: string
  categoryId: ID
  status: ClothingStatus
  color: string
  brand: string
  size: string
  notes: string
  seasonTags: string[]
  photoIds: ID[]
  createdAt: string
  updatedAt: string
}

export interface PhotoAsset {
  id: ID
  itemId: ID
  blob: Blob
  mimeType: string
  width: number
  height: number
  createdAt: string
}

export interface Outfit {
  id: ID
  name: string
  itemIds: ID[]
  occasion: string
  notes: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface LaundryLog {
  id: ID
  itemId: ID
  fromStatus: ClothingStatus
  toStatus: ClothingStatus
  changedAt: string
  reason: 'manual' | 'cycle'
}

export interface CategoryCreateInput {
  name: string
}

export interface CategoryUpdateInput {
  name: string
}

export interface ClothingItemCreateInput {
  name: string
  categoryId: ID
  status?: ClothingStatus
  color?: string
  brand?: string
  size?: string
  notes?: string
  seasonTags?: string[]
}

export interface ClothingItemUpdateInput {
  name: string
  categoryId: ID
  status: ClothingStatus
  color?: string
  brand?: string
  size?: string
  notes?: string
  seasonTags?: string[]
}

export interface OutfitCreateInput {
  name: string
  itemIds: ID[]
  occasion?: string
  notes?: string
  isFavorite?: boolean
}

export interface OutfitUpdateInput extends OutfitCreateInput {}

export interface PhotoUploadInput {
  blob: Blob
  mimeType: string
  width: number
  height: number
}

