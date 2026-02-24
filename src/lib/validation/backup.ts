import { z } from 'zod'

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  isDefault: z.boolean(),
  archived: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const statusSchema = z.enum(['clean', 'dirty', 'washing', 'drying'])

const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  status: statusSchema,
  color: z.string(),
  brand: z.string(),
  size: z.string(),
  notes: z.string(),
  seasonTags: z.array(z.string()),
  photoIds: z.array(z.string().uuid()),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const outfitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  itemIds: z.array(z.string().uuid()),
  occasion: z.string(),
  notes: z.string(),
  isFavorite: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const laundryLogSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  fromStatus: statusSchema,
  toStatus: statusSchema,
  changedAt: z.string().min(1),
  reason: z.enum(['manual', 'cycle']),
})

const serializedPhotoSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  mimeType: z.string().min(1),
  width: z.number().int(),
  height: z.number().int(),
  createdAt: z.string().min(1),
  blobBase64: z.string().min(1),
})

export const backupSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().min(1),
  data: z.object({
    categories: z.array(categorySchema),
    items: z.array(itemSchema),
    photos: z.array(serializedPhotoSchema),
    outfits: z.array(outfitSchema),
    laundryLogs: z.array(laundryLogSchema),
  }),
})

export type BackupSnapshot = z.infer<typeof backupSnapshotSchema>

