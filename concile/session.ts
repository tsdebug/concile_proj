import { v } from "@concile/values";
import { query } from "./_generated/server";

// Returns the signed-in user's id, or null. Because it reads the session row,
// it re-runs when that session is revoked, so other tabs find out instantly.
export const whoami = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => (await ctx.auth.getUserId()) ?? null,
});