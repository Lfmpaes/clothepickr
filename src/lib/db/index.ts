import { DEFAULT_CATEGORIES } from '@/lib/constants'
import { ClothingStatusMachine } from '@/lib/domain/statusMachine'
import {
  DexieCategoryRepository,
  DexieItemRepository,
  DexieLaundryRepository,
  DexieOutfitRepository,
} from '@/lib/db/repositories'
import { ClothePickrDb } from '@/lib/db/schema'

export const db = new ClothePickrDb()

export const categoryRepository = new DexieCategoryRepository(db)
export const itemRepository = new DexieItemRepository(db)
export const outfitRepository = new DexieOutfitRepository(db)
export const laundryRepository = new DexieLaundryRepository(db)

export const statusMachine = new ClothingStatusMachine(itemRepository, laundryRepository)

let initialized = false

export async function initializeDatabase() {
  if (initialized) {
    return
  }

  initialized = true
  const categoryCount = await db.categories.count()
  if (categoryCount > 0) {
    return
  }

  const now = new Date().toISOString()
  await db.categories.bulkAdd(
    DEFAULT_CATEGORIES.map((name) => ({
      id: crypto.randomUUID(),
      name,
      isDefault: true,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })),
  )
}

export async function resetDatabase() {
  await db.delete()
  await db.open()
  initialized = false
  await initializeDatabase()
}
