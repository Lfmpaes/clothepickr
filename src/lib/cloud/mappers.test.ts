import {
  buildPhotoStoragePath,
  fromRemoteCategory,
  fromRemoteItem,
  fromRemoteLaundryLog,
  fromRemoteOutfit,
  toRemoteCategory,
  toRemoteItem,
  toRemoteLaundryLog,
  toRemoteOutfit,
} from '@/lib/cloud/mappers'
import type { Category, ClothingItem, LaundryLog, Outfit } from '@/lib/types'

describe('cloud mappers', () => {
  it('maps category rows in both directions', () => {
    const category: Category = {
      id: crypto.randomUUID(),
      name: 'Workwear',
      isDefault: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const remote = toRemoteCategory(category, 'user-1')
    const roundTrip = fromRemoteCategory(remote)

    expect(roundTrip).toEqual(category)
  })

  it('maps item/outfit/laundry rows in both directions', () => {
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

    const outfit: Outfit = {
      id: crypto.randomUUID(),
      name: 'Office',
      itemIds: [item.id],
      occasion: 'Work',
      notes: '',
      isFavorite: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const laundry: LaundryLog = {
      id: crypto.randomUUID(),
      itemId: item.id,
      fromStatus: 'clean',
      toStatus: 'dirty',
      changedAt: '2026-01-01T00:00:00.000Z',
      reason: 'manual',
    }

    expect(fromRemoteItem(toRemoteItem(item, 'user-1'))).toEqual(item)
    expect(fromRemoteOutfit(toRemoteOutfit(outfit, 'user-1'))).toEqual(outfit)
    expect(fromRemoteLaundryLog(toRemoteLaundryLog(laundry, 'user-1'))).toEqual(laundry)
  })

  it('builds stable photo storage paths', () => {
    const path = buildPhotoStoragePath('user-1', 'item-1', 'photo-1', 'image/png')
    expect(path).toBe('user-1/item-1/photo-1.png')
  })
})
