import Dexie, { type Table } from 'dexie'
import type { Category, ClothingItem, LaundryLog, Outfit, PhotoAsset } from '@/lib/types'

export class ClothePickrDb extends Dexie {
  categories!: Table<Category, string>
  items!: Table<ClothingItem, string>
  photos!: Table<PhotoAsset, string>
  outfits!: Table<Outfit, string>
  laundryLogs!: Table<LaundryLog, string>

  constructor(name = 'clothepickr-db') {
    super(name)

    this.version(1).stores({
      categories: '&id, name, archived, isDefault, updatedAt',
      items: '&id, name, categoryId, status, updatedAt, *seasonTags, *photoIds',
      photos: '&id, itemId, createdAt',
      outfits: '&id, name, isFavorite, updatedAt, *itemIds',
      laundryLogs: '&id, itemId, changedAt, fromStatus, toStatus',
    })
  }
}
