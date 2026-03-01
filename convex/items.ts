import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { auth } from './auth'

const clothingStatus = v.union(
  v.literal('clean'),
  v.literal('dirty'),
  v.literal('washing'),
  v.literal('drying'),
)

export const upsert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const now = new Date().toISOString()
    const existing = await ctx.db
      .query('items')
      .withIndex('by_user_localId', (q) => q.eq('userId', userId).eq('localId', args.localId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, userId, serverUpdatedAt: now, deletedAt: undefined })
    } else {
      await ctx.db.insert('items', { ...args, userId, serverUpdatedAt: now })
    }
  },
})

export const markDeleted = mutation({
  args: { localId: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const now = new Date().toISOString()
    const existing = await ctx.db
      .query('items')
      .withIndex('by_user_localId', (q) => q.eq('userId', userId).eq('localId', args.localId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { deletedAt: now, serverUpdatedAt: now })
    }
  },
})

export const pullSince = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const limit = args.limit ?? 200
    const rows = await ctx.db
      .query('items')
      .withIndex('by_user_serverUpdatedAt', (q) =>
        args.cursor
          ? q.eq('userId', userId).gt('serverUpdatedAt', args.cursor)
          : q.eq('userId', userId),
      )
      .order('asc')
      .take(limit)

    return rows
  },
})
