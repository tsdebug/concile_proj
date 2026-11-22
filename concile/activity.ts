import { v } from "@concile/values"
import { query } from "./_generated/server"

export const list = query({
  args: { boardId: v.id("boards") },
  returns: v.array(v.object({
    _id: v.id("boardActivity"),
    displayName: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("edited"),
      v.literal("moved"),
      v.literal("deleted"),
    ),
    entityType: v.union(v.literal("card"), v.literal("column")),
    entityName: v.string(),
    summary: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx, { boardId }) => {
    const userId = await ctx.auth.getUserId()
    if (!userId) return []
    const board = await ctx.db.get(boardId)
    if (!board) return []
    if (board.ownerId !== userId) return []

    const records = await ctx.db
      .query("boardActivity", "by_board_time")
      .eq("boardId", boardId)
      .order("desc")
      .take(50)
      .collect()

    return records.map((record) => ({
      _id: record._id,
      displayName: record.displayName,
      action: record.action,
      entityType: record.entityType,
      entityName: record.entityName,
      summary: record.summary,
      createdAt: record.createdAt,
    }))
  },
})
