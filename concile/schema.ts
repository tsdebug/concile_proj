import { defineSchema, defineTable, v } from "@concile/values"

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
  }).index("by_user", ["userId"]),

  boards: defineTable({
    ownerId: v.string(),
    name: v.string(),
  }).index("by_owner", ["ownerId"]),

  boardShares: defineTable({
    boardId: v.id("boards"),
    token: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  })
    .index("by_board", ["boardId"])
    .index("by_token", ["token"]),

  columns: defineTable({
    boardId: v.id("boards"),
    ownerId: v.string(),
    name: v.string(),
    position: v.number(),
  }).index("by_board_position", ["boardId", "position"]),

  cards: defineTable({
    boardId: v.id("boards"),
    columnId: v.id("columns"),
    ownerId: v.string(),
    title: v.string(),
    description: v.string(),
    position: v.number(),
  })
    .index("by_board_position", ["boardId", "position"])
    .index("by_column_position", ["columnId", "position"]),

  boardPresence: defineTable({
    boardId: v.id("boards"),
    userId: v.string(),
    displayName: v.string(),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
    lastSeenAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_user", ["boardId", "userId"]),

  boardActivity: defineTable({
    boardId: v.id("boards"),
    userId: v.string(),
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
  })
    .index("by_board", ["boardId"])
    .index("by_board_time", ["boardId", "createdAt"]),
})