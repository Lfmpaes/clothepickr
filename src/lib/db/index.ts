import { DEFAULT_CATEGORIES } from '@/lib/constants'
import { ClothingStatusMachine } from '@/lib/domain/statusMachine'
import {
  DexieCategoryRepository,
  DexieItemRepository,
  DexieLaundryRepository,
  DexieOutfitRepository,
} from '@/lib/db/repositories'
import { ClothePickrDb } from '@/lib/db/schema'
import { backupSnapshotSchema, type BackupSnapshot } from '@/lib/validation/backup'
import type { PhotoAsset } from '@/lib/types'

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

interface SerializedPhotoAsset extends Omit<PhotoAsset, 'blob'> {
  blobBase64: string
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        reject(new Error('Could not encode photo blob.'))
        return
      }
      const base64 = dataUrl.split(',')[1]
      if (!base64) {
        reject(new Error('Could not encode photo blob.'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Could not encode photo blob.'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const decoded = atob(base64)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

export async function createBackupSnapshot(): Promise<BackupSnapshot> {
  const [categories, items, photos, outfits, laundryLogs] = await Promise.all([
    db.categories.toArray(),
    db.items.toArray(),
    db.photos.toArray(),
    db.outfits.toArray(),
    db.laundryLogs.toArray(),
  ])

  const serializedPhotos: SerializedPhotoAsset[] = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      itemId: photo.itemId,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt,
      blobBase64: await blobToBase64(photo.blob),
    })),
  )

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      categories,
      items,
      photos: serializedPhotos,
      outfits,
      laundryLogs,
    },
  }
}

export async function restoreBackupSnapshot(payload: unknown) {
  const snapshot = backupSnapshotSchema.parse(payload)

  await Promise.all([
    db.categories.clear(),
    db.items.clear(),
    db.photos.clear(),
    db.outfits.clear(),
    db.laundryLogs.clear(),
  ])

  if (snapshot.data.categories.length > 0) {
    await db.categories.bulkAdd(snapshot.data.categories)
  }
  if (snapshot.data.items.length > 0) {
    await db.items.bulkAdd(snapshot.data.items)
  }
  if (snapshot.data.outfits.length > 0) {
    await db.outfits.bulkAdd(snapshot.data.outfits)
  }
  if (snapshot.data.laundryLogs.length > 0) {
    await db.laundryLogs.bulkAdd(snapshot.data.laundryLogs)
  }
  if (snapshot.data.photos.length > 0) {
    await db.photos.bulkAdd(
      snapshot.data.photos.map((photo) => ({
        id: photo.id,
        itemId: photo.itemId,
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt,
        blob: base64ToBlob(photo.blobBase64, photo.mimeType),
      })),
    )
  }

  initialized = true
}
