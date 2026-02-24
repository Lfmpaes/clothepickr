import type {
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
  ClothingItem,
  ClothingItemCreateInput,
  ClothingItemUpdateInput,
  ClothingStatus,
  LaundryLog,
  Outfit,
  OutfitCreateInput,
  OutfitUpdateInput,
  PhotoUploadInput,
} from '@/lib/types'
import { nowIso } from '@/lib/utils'
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  clothingItemCreateSchema,
  clothingItemUpdateSchema,
  outfitCreateSchema,
  outfitUpdateSchema,
  photoUploadSchema,
} from '@/lib/validation/schemas'
import type { ClothePickrDb } from '@/lib/db/schema'

export interface ItemListFilters {
  categoryId?: string
  status?: ClothingStatus
  color?: string
  search?: string
  favoriteOnly?: boolean
}

export interface OutfitListFilters {
  favoriteOnly?: boolean
}

export interface CategoryRepository {
  list(includeArchived?: boolean): Promise<Category[]>
  create(input: CategoryCreateInput): Promise<Category>
  update(id: string, input: CategoryUpdateInput): Promise<Category>
  archive(id: string): Promise<Category>
  restore(id: string): Promise<Category>
}

export interface ItemRepository {
  list(filters?: ItemListFilters): Promise<ClothingItem[]>
  getById(id: string): Promise<ClothingItem | undefined>
  create(input: ClothingItemCreateInput): Promise<ClothingItem>
  update(id: string, input: ClothingItemUpdateInput): Promise<ClothingItem>
  remove(id: string): Promise<void>
  setStatus(id: string, status: ClothingStatus): Promise<ClothingItem>
  attachPhoto(itemId: string, payload: PhotoUploadInput): Promise<string>
  detachPhoto(itemId: string, photoId: string): Promise<void>
}

export interface OutfitRepository {
  list(filters?: OutfitListFilters): Promise<Outfit[]>
  getById(id: string): Promise<Outfit | undefined>
  create(input: OutfitCreateInput): Promise<Outfit>
  update(id: string, input: OutfitUpdateInput): Promise<Outfit>
  remove(id: string): Promise<void>
  toggleFavorite(id: string): Promise<Outfit>
}

export interface LaundryRepository {
  appendLog(input: Omit<LaundryLog, 'id' | 'changedAt'>): Promise<LaundryLog>
  listByItem(itemId: string): Promise<LaundryLog[]>
  listRecent(limit?: number): Promise<LaundryLog[]>
}

export class DexieCategoryRepository implements CategoryRepository {
  private readonly db: ClothePickrDb

  constructor(db: ClothePickrDb) {
    this.db = db
  }

  async list(includeArchived = false) {
    const categories = includeArchived
      ? await this.db.categories.toArray()
      : await this.db.categories.filter((category) => !category.archived).toArray()

    return categories.sort((a, b) => a.name.localeCompare(b.name))
  }

  async create(input: CategoryCreateInput) {
    const parsed = categoryCreateSchema.parse(input)
    const now = nowIso()

    const category: Category = {
      id: crypto.randomUUID(),
      name: parsed.name,
      isDefault: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    }

    await this.db.categories.add(category)
    return category
  }

  async update(id: string, input: CategoryUpdateInput) {
    const parsed = categoryUpdateSchema.parse(input)
    const existing = await this.db.categories.get(id)
    if (!existing) {
      throw new Error('Category not found.')
    }

    const updated: Category = {
      ...existing,
      name: parsed.name,
      updatedAt: nowIso(),
    }

    await this.db.categories.put(updated)
    return updated
  }

  async archive(id: string) {
    const existing = await this.db.categories.get(id)
    if (!existing) {
      throw new Error('Category not found.')
    }

    const linkedItemCount = await this.db.items.where('categoryId').equals(id).count()
    if (linkedItemCount > 0) {
      throw new Error('Cannot archive a category with linked items.')
    }

    const updated: Category = { ...existing, archived: true, updatedAt: nowIso() }
    await this.db.categories.put(updated)
    return updated
  }

  async restore(id: string) {
    const existing = await this.db.categories.get(id)
    if (!existing) {
      throw new Error('Category not found.')
    }

    const updated: Category = { ...existing, archived: false, updatedAt: nowIso() }
    await this.db.categories.put(updated)
    return updated
  }
}

export class DexieItemRepository implements ItemRepository {
  private readonly db: ClothePickrDb

  constructor(db: ClothePickrDb) {
    this.db = db
  }

  async list(filters: ItemListFilters = {}) {
    const items = await this.db.items.toArray()

    let favoriteIds = new Set<string>()
    if (filters.favoriteOnly) {
      const favoriteOutfits = await this.db.outfits
        .filter((outfit) => outfit.isFavorite)
        .toArray()
      favoriteIds = new Set(favoriteOutfits.flatMap((outfit) => outfit.itemIds))
    }

    const search = filters.search?.trim().toLocaleLowerCase()
    const filtered = items.filter((item) => {
      const matchesCategory = filters.categoryId ? item.categoryId === filters.categoryId : true
      const matchesStatus = filters.status ? item.status === filters.status : true
      const matchesColor =
        filters.color !== undefined ? item.color === filters.color : true
      const matchesSearch = search
        ? [
            item.name,
            item.color,
            item.brand,
            item.size,
            item.notes,
            item.seasonTags.join(' '),
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(search)
        : true
      const matchesFavorite = filters.favoriteOnly ? favoriteIds.has(item.id) : true

      return matchesCategory && matchesStatus && matchesColor && matchesSearch && matchesFavorite
    })

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getById(id: string) {
    return this.db.items.get(id)
  }

  async create(input: ClothingItemCreateInput) {
    const parsed = clothingItemCreateSchema.parse(input)
    const now = nowIso()
    const item: ClothingItem = {
      id: crypto.randomUUID(),
      name: parsed.name,
      categoryId: parsed.categoryId,
      status: parsed.status,
      color: parsed.color,
      brand: parsed.brand,
      size: parsed.size,
      notes: parsed.notes,
      seasonTags: parsed.seasonTags,
      photoIds: [],
      createdAt: now,
      updatedAt: now,
    }

    await this.db.items.add(item)
    return item
  }

  async update(id: string, input: ClothingItemUpdateInput) {
    const parsed = clothingItemUpdateSchema.parse(input)
    const existing = await this.db.items.get(id)
    if (!existing) {
      throw new Error('Item not found.')
    }

    const updated: ClothingItem = {
      ...existing,
      name: parsed.name,
      categoryId: parsed.categoryId,
      status: parsed.status,
      color: parsed.color,
      brand: parsed.brand,
      size: parsed.size,
      notes: parsed.notes,
      seasonTags: parsed.seasonTags,
      updatedAt: nowIso(),
    }

    await this.db.items.put(updated)
    return updated
  }

  async remove(id: string) {
    const existing = await this.db.items.get(id)
    if (!existing) {
      return
    }

    await this.db.transaction(
      'rw',
      this.db.items,
      this.db.photos,
      this.db.outfits,
      this.db.laundryLogs,
      async () => {
        await this.db.photos.where('itemId').equals(id).delete()
        await this.db.laundryLogs.where('itemId').equals(id).delete()
        await this.db.outfits.toCollection().modify((outfit) => {
          outfit.itemIds = outfit.itemIds.filter((itemId) => itemId !== id)
          outfit.updatedAt = nowIso()
        })
        await this.db.items.delete(id)
      },
    )
  }

  async setStatus(id: string, status: ClothingStatus) {
    const existing = await this.db.items.get(id)
    if (!existing) {
      throw new Error('Item not found.')
    }

    const updated: ClothingItem = { ...existing, status, updatedAt: nowIso() }
    await this.db.items.put(updated)
    return updated
  }

  async attachPhoto(itemId: string, payload: PhotoUploadInput) {
    const parsed = photoUploadSchema.parse(payload)
    const existing = await this.db.items.get(itemId)
    if (!existing) {
      throw new Error('Item not found.')
    }

    const photoId = crypto.randomUUID()
    await this.db.transaction('rw', this.db.items, this.db.photos, async () => {
      await this.db.photos.add({
        id: photoId,
        itemId,
        blob: parsed.blob,
        mimeType: parsed.mimeType,
        width: parsed.width,
        height: parsed.height,
        createdAt: nowIso(),
      })

      await this.db.items.put({
        ...existing,
        photoIds: [...new Set([...existing.photoIds, photoId])],
        updatedAt: nowIso(),
      })
    })

    return photoId
  }

  async detachPhoto(itemId: string, photoId: string) {
    const existing = await this.db.items.get(itemId)
    if (!existing) {
      throw new Error('Item not found.')
    }

    await this.db.transaction('rw', this.db.items, this.db.photos, async () => {
      await this.db.photos.delete(photoId)
      await this.db.items.put({
        ...existing,
        photoIds: existing.photoIds.filter((id) => id !== photoId),
        updatedAt: nowIso(),
      })
    })
  }
}

export class DexieOutfitRepository implements OutfitRepository {
  private readonly db: ClothePickrDb

  constructor(db: ClothePickrDb) {
    this.db = db
  }

  async list(filters: OutfitListFilters = {}) {
    const outfits = filters.favoriteOnly
      ? await this.db.outfits.filter((outfit) => outfit.isFavorite).toArray()
      : await this.db.outfits.toArray()

    return outfits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getById(id: string) {
    return this.db.outfits.get(id)
  }

  async create(input: OutfitCreateInput) {
    const parsed = outfitCreateSchema.parse(input)
    const now = nowIso()
    const outfit: Outfit = {
      id: crypto.randomUUID(),
      name: parsed.name,
      itemIds: parsed.itemIds,
      occasion: parsed.occasion,
      notes: parsed.notes,
      isFavorite: parsed.isFavorite,
      createdAt: now,
      updatedAt: now,
    }

    await this.db.outfits.add(outfit)
    return outfit
  }

  async update(id: string, input: OutfitUpdateInput) {
    const parsed = outfitUpdateSchema.parse(input)
    const existing = await this.db.outfits.get(id)
    if (!existing) {
      throw new Error('Outfit not found.')
    }

    const updated: Outfit = {
      ...existing,
      name: parsed.name,
      itemIds: parsed.itemIds,
      occasion: parsed.occasion,
      notes: parsed.notes,
      isFavorite: parsed.isFavorite,
      updatedAt: nowIso(),
    }

    await this.db.outfits.put(updated)
    return updated
  }

  async remove(id: string) {
    await this.db.outfits.delete(id)
  }

  async toggleFavorite(id: string) {
    const existing = await this.db.outfits.get(id)
    if (!existing) {
      throw new Error('Outfit not found.')
    }

    const updated: Outfit = {
      ...existing,
      isFavorite: !existing.isFavorite,
      updatedAt: nowIso(),
    }

    await this.db.outfits.put(updated)
    return updated
  }
}

export class DexieLaundryRepository implements LaundryRepository {
  private readonly db: ClothePickrDb

  constructor(db: ClothePickrDb) {
    this.db = db
  }

  async appendLog(input: Omit<LaundryLog, 'id' | 'changedAt'>) {
    const log: LaundryLog = {
      id: crypto.randomUUID(),
      changedAt: nowIso(),
      ...input,
    }
    await this.db.laundryLogs.add(log)
    return log
  }

  async listByItem(itemId: string) {
    const rows = await this.db.laundryLogs.where('itemId').equals(itemId).toArray()
    return rows.sort((a, b) => b.changedAt.localeCompare(a.changedAt))
  }

  async listRecent(limit = 50) {
    const rows = await this.db.laundryLogs.toArray()
    return rows.sort((a, b) => b.changedAt.localeCompare(a.changedAt)).slice(0, limit)
  }
}
