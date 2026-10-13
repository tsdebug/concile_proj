import { defineSchema, defineTable, v } from "@concile/values";

export default defineSchema({
  messages: defineTable({
    author: v.string(),
    body: v.string(),
  }),
});
