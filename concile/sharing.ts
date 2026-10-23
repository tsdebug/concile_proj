import { v } from "@concile/values"
import { mutation, query } from "./_generated/server"

const sharedColumnShape = v.object({
  _id: v.id("columns"),
  name: v.string(),
  position: v.number(),
})

const sharedCardShape = v.object({
  _id: v.id("cards"),
  columnId: v.id("columns"),
  title: v.string(),
  description: v.string(),
  position: v.number(),
})

export const getMine = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.union(
    v.object({
      token: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { boardId }) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) return null

    const board = await ctx.db.get(boardId)

    if (!board || board.ownerId !== userId) {
      return null
    }

    const [share] = await ctx.db
      .query("boardShares", "by_board")
      .eq("boardId", boardId)
      .take(1)
      .collect()

    if (!share || typeof share.token !== "string") {
      return null
    }

    return {
      token: share.token,
    }
  },
})

export const enable = mutation({
  args: {
    boardId: v.id("boards"),
    token: v.string(),
    replace: v.boolean(),
  },
  returns: v.string(),
  handler: async (ctx, { boardId, token, replace }) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) {
      throw new Error("You must be signed in.")
    }

    const board = await ctx.db.get(boardId)

    if (!board || board.ownerId !== userId) {
      throw new Error("Board not found.")
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new Error("Invalid share token.")
    }

    const [existing] = await ctx.db
      .query("boardShares", "by_board")
      .eq("boardId", boardId)
      .take(1)
      .collect()

    if (existing && !replace) {
      if (typeof existing.token !== "string") {
        throw new Error("The existing share link is invalid.")
      }

      return existing.token
    }

    const [collision] = await ctx.db
      .query("boardShares", "by_token")
      .eq("token", token)
      .take(1)
      .collect()

    if (collision) {
      throw new Error("Please try generating the link again.")
    }

    if (existing) {
      const shareId = existing._id

      if (typeof shareId !== "string") {
        throw new Error("The existing share record has an invalid ID.")
      }

      await ctx.db.replace(shareId, {
        boardId,
        token,
      })
    } else {
      await ctx.db.insert("boardShares", {
        boardId,
        token,
      })
    }

    return token
  },
})

export const disable = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, { boardId }) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) {
      throw new Error("You must be signed in.")
    }

    const board = await ctx.db.get(boardId)

    if (!board || board.ownerId !== userId) {
      throw new Error("Board not found.")
    }

    const shares = await ctx.db
      .query("boardShares", "by_board")
      .eq("boardId", boardId)
      .collect()

    for (const share of shares) {
      const shareId = share._id

      if (typeof shareId !== "string") {
        throw new Error("A share record has an invalid ID.")
      }

      await ctx.db.delete(shareId)
    }

    return null
  },
})

export const getBoard = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      name: v.string(),
      ownerName: v.string(),
      columns: v.array(sharedColumnShape),
      cards: v.array(sharedCardShape),
    }),
    v.null(),
  ),
  handler: async (ctx, { token }) => {
    const userId = await ctx.auth.getUserId()

    // A valid link alone is not enough: sign-in is required.
    if (!userId) return null

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return null
    }

    const [share] = await ctx.db
      .query("boardShares", "by_token")
      .eq("token", token)
      .take(1)
      .collect()

    if (!share) return null

    const boardId = share.boardId

    if (typeof boardId !== "string") {
      return null
    }

    const board = await ctx.db.get(boardId)

    if (!board) return null

    const [profile] = await ctx.db
      .query("profiles", "by_user")
      .eq("userId", board.ownerId)
      .take(1)
      .collect()

    const columns = await ctx.db
      .query("columns", "by_board_position")
      .eq("boardId", boardId)
      .collect()

    const cards = await ctx.db
      .query("cards", "by_board_position")
      .eq("boardId", boardId)
      .collect()

    return {
      name: board.name,
      ownerName:
        profile && typeof profile.displayName === "string"
          ? profile.displayName
          : "A Concile user",
      columns: columns.map((column) => ({
        _id: column._id,
        name: column.name,
        position: column.position,
      })),
      cards: cards.map((card) => ({
        _id: card._id,
        columnId: card.columnId,
        title: card.title,
        description: card.description,
        position: card.position,
      })),
    }
  },
})