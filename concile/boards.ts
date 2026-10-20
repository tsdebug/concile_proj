import { v } from "@concile/values";
import { mutation, query } from "./_generated/server";

// Gives the signed-in user a board with 3 starter columns, if they don't have one yet.
// Safe to call many times: if the board exists, it just returns it.
export const ensureDefault = mutation({
  args: {},
  returns: v.id("boards"),
  handler: async (ctx) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) throw new Error("You must be signed in.");

    const [existing] = await ctx.db
      .query("boards", "by_owner")
      .eq("ownerId", ownerId)
      .take(1)
      .collect();
    if (existing) return existing._id;

    const boardId = await ctx.db.insert("boards", { ownerId, name: "My Board" });
    await ctx.db.insert("columns", { boardId, ownerId, name: "To Do", position: 1024 });
    await ctx.db.insert("columns", { boardId, ownerId, name: "Doing", position: 2048 });
    await ctx.db.insert("columns", { boardId, ownerId, name: "Done", position: 3072 });
    return boardId;
  },
});

// Returns the signed-in user's board, or null if there isn't one (or nobody is signed in).
export const getMine = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("boards"),
      _creationTime: v.number(),
      ownerId: v.string(),
      name: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) return null;
    const [board] = await ctx.db
      .query("boards", "by_owner")
      .eq("ownerId", ownerId)
      .take(1)
      .collect();
    return board ?? null;
  },
});