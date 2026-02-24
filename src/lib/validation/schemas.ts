import { z } from 'zod'

const statusSchema = z.enum(['clean', 'dirty', 'washing', 'drying'])

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(50),
})

export const categoryUpdateSchema = categoryCreateSchema

export const clothingItemCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid(),
  status: statusSchema.default('clean'),
  color: z.string().trim().max(40).optional().default(''),
  brand: z.string().trim().max(40).optional().default(''),
  size: z.string().trim().max(20).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  seasonTags: z.array(z.string().trim().min(1).max(20)).max(8).optional().default([]),
})

export const clothingItemUpdateSchema = clothingItemCreateSchema.extend({
  status: statusSchema,
})

export const outfitCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  itemIds: z.array(z.string().uuid()).min(1),
  occasion: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  isFavorite: z.boolean().optional().default(false),
})

export const outfitUpdateSchema = outfitCreateSchema

export const photoUploadSchema = z.object({
  blob: z.instanceof(Blob),
  mimeType: z.string().trim().min(1),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
})

export const transitionReasonSchema = z.enum(['manual', 'cycle'])

