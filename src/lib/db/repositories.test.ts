import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DexieCategoryRepository,
  DexieItemRepository,
  DexieLaundryRepository,
  DexieOutfitRepository,
} from '@/lib/db/repositories'
import { ClothePickrDb } from '@/lib/db/schema'

describe('dexie repositories', () => {
  let db: ClothePickrDb
  let categories: DexieCategoryRepository
  let items: DexieItemRepository
  let outfits: DexieOutfitRepository
  let laundry: DexieLaundryRepository

  beforeEach(() => {
    db = new ClothePickrDb(`test-db-${crypto.randomUUID()}`)
    categories = new DexieCategoryRepository(db)
    items = new DexieItemRepository(db)
    outfits = new DexieOutfitRepository(db)
    laundry = new DexieLaundryRepository(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates and lists categories', async () => {
    await categories.create({ name: 'Formal' })
    const list = await categories.list()

    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Formal')
  })

  it('prevents archiving categories that still have items', async () => {
    const category = await categories.create({ name: 'Shoes' })
    await items.create({
      name: 'Sneakers',
      categoryId: category.id,
      status: 'clean',
    })

    await expect(categories.archive(category.id)).rejects.toThrow(
      'Cannot archive a category with linked items.',
    )
  })

  it('supports item filters and outfit favorites', async () => {
    const category = await categories.create({ name: 'Tops' })
    const item = await items.create({
      name: 'Plain Tee',
      categoryId: category.id,
      status: 'dirty',
    })
    await outfits.create({
      name: 'Casual',
      itemIds: [item.id],
      isFavorite: true,
    })

    const filtered = await items.list({
      status: 'dirty',
      favoriteOnly: true,
    })

    expect(filtered.map((row) => row.id)).toEqual([item.id])
  })

  it('writes and reads laundry logs', async () => {
    const log = await laundry.appendLog({
      itemId: 'item-1',
      fromStatus: 'clean',
      toStatus: 'dirty',
      reason: 'manual',
    })

    const recent = await laundry.listRecent(10)
    expect(recent[0].id).toBe(log.id)
  })
})

