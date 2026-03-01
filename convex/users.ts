import { query } from './_generated/server'
import { auth } from './auth'

export const currentUserIdentity = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const identity = await ctx.auth.getUserIdentity()
    return { id: userId, email: identity?.email ?? undefined }
  },
})
