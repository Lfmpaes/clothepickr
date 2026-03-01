import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { auth } from './auth'

export const upsert = mutation({
  args: {
    localId: v.string(),
    name: v.string(),
    itemIds: v.array(v.string()),
    occasion: v.string(),
    notes: v.string(),
    isFavorite: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const now = new Date().toISOString()
    const existing = await ctx.db
      .query('outfits')
      .withIndex('by_user_localId', (q) => q.eq('userId', userId).eq('localId', args.localId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, userId, serverUpdatedAt: now, deletedAt: undefined })
    } else {
      await ctx.db.insert('outfits', { ...args, userId, serverUpdatedAt: now })
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
      .query('outfits')
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
      .query('outfits')
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
