import { v } from "@concile/values"
import { mutation, query } from "./_generated/server"

function validateDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Please enter a valid name.")
  }

  const displayName = value.trim().replace(/\s+/g, " ")

  if (displayName.length < 1) {
    throw new Error("Please enter your name.")
  }

  if (displayName.length > 60) {
    throw new Error("Please keep your name within 60 characters.")
  }

  return displayName
}

export const getMine = query({
  args: {},
  returns: v.union(
    v.object({
      displayName: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) return null

    const [profile] = await ctx.db
      .query("profiles", "by_user")
      .eq("userId", userId)
      .take(1)
      .collect()

    if (!profile || typeof profile.displayName !== "string") {
      return null
    }

    return {
      displayName: profile.displayName,
    }
  },
})

export const save = mutation({
  args: {
    displayName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { displayName }) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) {
      throw new Error("You must be signed in.")
    }

    const cleanName = validateDisplayName(displayName)

    const [existing] = await ctx.db
      .query("profiles", "by_user")
      .eq("userId", userId)
      .take(1)
      .collect()

    if (existing) {
      const profileId = existing._id

      if (typeof profileId !== "string") {
        throw new Error("The existing profile has an invalid ID.")
      }

      await ctx.db.replace(profileId, {
        userId,
        displayName: cleanName,
      })
    } else {
      await ctx.db.insert("profiles", {
        userId,
        displayName: cleanName,
      })
    }

    return null
  },
})