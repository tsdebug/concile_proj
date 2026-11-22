import { v } from "@concile/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

async function getAccess(ctx: any, boardId: Id<"boards">, shareToken?: string) {
  const userId = await ctx.auth.getUserId()
  if (!userId) return null

  const board = await ctx.db.get(boardId)
  if (!board) return null

  if (board.ownerId === userId) {
    return { userId, board, role: "owner" as const }
  }

  if (!shareToken) return null
  const [share] = await ctx.db
    .query("boardShares", "by_token")
    .eq("token", shareToken)
    .take(1)
    .collect()

  if (!share || share.boardId !== boardId) return null
  return {
    userId,
    board,
    role: share.role as "editor" | "viewer",
  }
}

async function getDisplayName(ctx: any, userId: string) {
  const [profile] = await ctx.db
    .query("profiles", "by_user")
    .eq("userId", userId)
    .take(1)
    .collect()
  return profile && typeof profile.displayName === "string"
    ? profile.displayName
    : "A Concile user"
}

export const join = mutation({
  args: {
    boardId: v.id("boards"),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { boardId, shareToken }) => {
    const access = await getAccess(ctx, boardId, shareToken)
    if (!access) return null

    const now = Date.now()
    const displayName = await getDisplayName(ctx, access.userId)
    const [existing] = await ctx.db
      .query("boardPresence", "by_board_user")
      .eq("boardId", boardId)
      .eq("userId", access.userId)
      .take(1)
      .collect()

    if (existing) {
      await ctx.db.replace(existing._id as Id<"boardPresence">, {
        boardId,
        userId: access.userId,
        displayName,
        role: access.role,
        lastSeenAt: now,
      })
    } else {
      await ctx.db.insert("boardPresence", {
        boardId,
        userId: access.userId,
        displayName,
        role: access.role,
        lastSeenAt: now,
      })
    }
    return null
  },
})

export const heartbeat = mutation({
  args: {
    boardId: v.id("boards"),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { boardId, shareToken }) => {
    const access = await getAccess(ctx, boardId, shareToken)
    if (!access) return null

    const now = Date.now()
    const displayName = await getDisplayName(ctx, access.userId)
    const [existing] = await ctx.db
      .query("boardPresence", "by_board_user")
      .eq("boardId", boardId)
      .eq("userId", access.userId)
      .take(1)
      .collect()

    if (existing) {
      await ctx.db.replace(existing._id as Id<"boardPresence">, {
        boardId,
        userId: access.userId,
        displayName,
        role: access.role,
        lastSeenAt: now,
      })
    } else {
      await ctx.db.insert("boardPresence", {
        boardId,
        userId: access.userId,
        displayName,
        role: access.role,
        lastSeenAt: now,
      })
    }
    return null
  },
})

export const leave = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, { boardId }) => {
    const userId = await ctx.auth.getUserId()
    if (!userId) return null

    const presence = await ctx.db
      .query("boardPresence", "by_board_user")
      .eq("boardId", boardId)
      .eq("userId", userId)
      .collect()

    for (const record of presence) {
      await ctx.db.delete(record._id as Id<"boardPresence">)
    }
    return null
  },
})

export const list = query({
  args: {
    boardId: v.id("boards"),
    shareToken: v.optional(v.string()),
  },
  returns: v.array(v.object({
    userId: v.string(),
    displayName: v.string(),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
  })),
  handler: async (ctx, { boardId, shareToken }) => {
    const access = await getAccess(ctx, boardId, shareToken)
    if (!access) return []

    const cutoff = Date.now() - 60_000
    const records = await ctx.db
      .query("boardPresence", "by_board")
      .eq("boardId", boardId)
      .collect()

    return records
      .filter((record) => record.lastSeenAt >= cutoff)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((record) => ({
        userId: record.userId,
        displayName: record.displayName,
        role: record.role,
      }))
  },
})
