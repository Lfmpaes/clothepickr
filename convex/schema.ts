import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

const clothingStatus = v.union(
  v.literal('clean'),
  v.literal('dirty'),
  v.literal('washing'),
  v.literal('drying'),
)

export default defineSchema({
  ...authTables,

  categories: defineTable({
    userId: v.string(),
    localId: v.string(),
    name: v.string(),
    isDefault: v.boolean(),
    archived: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    serverUpdatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_localId', ['userId', 'localId'])
    .index('by_user_serverUpdatedAt', ['userId', 'serverUpdatedAt']),

  items: defineTable({
    userId: v.string(),
    localId: v.string(),
    name: v.string(),
    categoryId: v.string(),
    status: clothingStatus,
    color: v.string(),
    brand: v.string(),
    size: v.string(),
    notes: v.string(),
    seasonTags: v.array(v.string()),
    photoIds: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    serverUpdatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_localId', ['userId', 'localId'])
    .index('by_user_serverUpdatedAt', ['userId', 'serverUpdatedAt']),

  outfits: defineTable({
    userId: v.string(),
    localId: v.string(),
    name: v.string(),
    itemIds: v.array(v.string()),
    occasion: v.string(),
    notes: v.string(),
    isFavorite: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    serverUpdatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_localId', ['userId', 'localId'])
    .index('by_user_serverUpdatedAt', ['userId', 'serverUpdatedAt']),

  laundryLogs: defineTable({
    userId: v.string(),
    localId: v.string(),
    itemId: v.string(),
    fromStatus: clothingStatus,
    toStatus: clothingStatus,
    changedAt: v.string(),
    reason: v.union(v.literal('manual'), v.literal('cycle')),
    deletedAt: v.optional(v.string()),
    serverUpdatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_localId', ['userId', 'localId'])
    .index('by_user_serverUpdatedAt', ['userId', 'serverUpdatedAt']),

  photos: defineTable({
    userId: v.string(),
    localId: v.string(),
    itemId: v.string(),
    storageId: v.id('_storage'),
    mimeType: v.string(),
    width: v.number(),
    height: v.number(),
    createdAt: v.string(),
    deletedAt: v.optional(v.string()),
    serverUpdatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_localId', ['userId', 'localId'])
    .index('by_user_serverUpdatedAt', ['userId', 'serverUpdatedAt']),
})
