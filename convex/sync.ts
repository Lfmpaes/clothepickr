import { mutation } from './_generated/server'
import { auth } from './auth'

export const wipeAllUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    // Delete photos and their storage files first
    const photos = await ctx.db
      .query('photos')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId)
      await ctx.db.delete(photo._id)
    }

    // Delete remaining tables in dependency order
    for (const table of ['laundryLogs', 'outfits', 'items', 'categories'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()

      for (const row of rows) {
        await ctx.db.delete(row._id)
      }
    }
  },
})
