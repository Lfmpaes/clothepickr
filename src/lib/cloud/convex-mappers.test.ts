import {
  fromConvexCategory,
  fromConvexItem,
  fromConvexLaundryLog,
  fromConvexOutfit,
  toConvexCategory,
  toConvexItem,
  toConvexLaundryLog,
  toConvexOutfit,
  type ConvexCategoryRow,
  type ConvexItemRow,
  type ConvexLaundryLogRow,
  type ConvexOutfitRow,
} from '@/lib/cloud/convex-mappers'
import type { Category, ClothingItem, LaundryLog, Outfit } from '@/lib/types'

describe('convex mappers', () => {
  it('maps category rows in both directions', () => {
    const category: Category = {
      id: crypto.randomUUID(),
      name: 'Workwear',
      isDefault: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const convexArgs = toConvexCategory(category)
    const row: ConvexCategoryRow = {
      _id: 'row-id',
      ...convexArgs,
      serverUpdatedAt: '2026-01-01T00:00:00.000Z',
    }
    const roundTrip = fromConvexCategory(row)

    expect(roundTrip).toEqual(category)
  })

  it('maps item rows in both directions', () => {
    const item: ClothingItem = {
      id: crypto.randomUUID(),
      name: 'Oxford Shirt',
      categoryId: crypto.randomUUID(),
      status: 'clean',
      color: 'blue',
      brand: 'Brand',
      size: 'M',
      notes: 'note',
      seasonTags: ['summer'],
      photoIds: [crypto.randomUUID()],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const convexArgs = toConvexItem(item)
    const row: ConvexItemRow = {
      _id: 'row-id',
      ...convexArgs,
      serverUpdatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(fromConvexItem(row)).toEqual(item)
  })

  it('maps outfit rows in both directions', () => {
    const outfit: Outfit = {
      id: crypto.randomUUID(),
      name: 'Office',
      itemIds: [crypto.randomUUID()],
      occasion: 'Work',
      notes: '',
      isFavorite: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const convexArgs = toConvexOutfit(outfit)
    const row: ConvexOutfitRow = {
      _id: 'row-id',
      ...convexArgs,
      serverUpdatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(fromConvexOutfit(row)).toEqual(outfit)
  })

  it('maps laundry log rows in both directions', () => {
    const laundry: LaundryLog = {
      id: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      fromStatus: 'clean',
      toStatus: 'dirty',
      changedAt: '2026-01-01T00:00:00.000Z',
      reason: 'manual',
    }

    const convexArgs = toConvexLaundryLog(laundry)
    const row: ConvexLaundryLogRow = {
      _id: 'row-id',
      ...convexArgs,
      serverUpdatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(fromConvexLaundryLog(row)).toEqual(laundry)
  })
})
