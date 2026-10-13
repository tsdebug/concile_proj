import { v } from "@concile/values";
import { query, mutation } from "./_generated/server";

// Reads data. Your app subscribes to this and gets live updates.
export const list = query({
  handler: (ctx) => ctx.db.query("messages", "by_creation").collect(),
});

// Writes data. Runs as one transaction.
export const send = mutation({
  args: { author: v.string(), body: v.string() },
  handler: (ctx, args) => ctx.db.insert("messages", args),
});
