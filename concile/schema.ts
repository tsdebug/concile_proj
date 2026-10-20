import { defineSchema, defineTable, v } from "@concile/values";

export default defineSchema({
  boards: defineTable({
    ownerId: v.string(),
    name: v.string(),
  })
    .index("by_owner", ["ownerId"]),

  columns: defineTable({
    boardId: v.id("boards"),
    ownerId: v.string(),
    name: v.string(),
    position: v.number(),
  })
    .index("by_board_position", ["boardId", "position"]),

  cards: defineTable({
    boardId: v.id("boards"),
    columnId: v.id("columns"),
    ownerId: v.string(),
    title: v.string(),
    description: v.string(),
    position: v.number(),
  })
    .index("by_column_position", ["columnId", "position"])
    .index("by_board_position", ["boardId", "position"]),
});