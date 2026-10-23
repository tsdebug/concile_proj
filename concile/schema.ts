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
})