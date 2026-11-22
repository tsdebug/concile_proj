import { v } from "@concile/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function getDisplayName(ctx: any, userId: string) {
  const [profile] = await ctx.db
    .query("profiles", "by_user")
    .eq("userId", userId)
    .take(1)
    .collect();
  return profile && typeof profile.displayName === "string"
    ? profile.displayName
    : "A Concile user";
}

async function logActivity(
  ctx: any,
  boardId: Id<"boards">,
  userId: string,
  action: "created" | "edited" | "moved" | "deleted",
  entityName: string,
  summary: string,
) {
  await ctx.db.insert("boardActivity", {
    boardId,
    userId,
    displayName: await getDisplayName(ctx, userId),
    action,
    entityType: "card",
    entityName,
    summary,
    createdAt: Date.now(),
  });
}

const cardShape = v.object({
  _id: v.id("cards"),
  _creationTime: v.number(),
  boardId: v.id("boards"),
  columnId: v.id("columns"),
  ownerId: v.string(),
  title: v.string(),
  description: v.string(),
  position: v.number(),
});

// All cards of a board (the screen groups them by column).
export const list = query({
  args: {
    boardId: v.id("boards"),
    shareToken: v.optional(v.string()),
  },
  returns: v.array(cardShape),
  handler: async (ctx, { boardId, shareToken }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) return [];
    const board = await ctx.db.get(boardId);
    if (!board) return [];
    if (board.ownerId !== userId) {
      if (!shareToken) return [];
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
      if (!share || share.boardId !== boardId) return [];
    }
    const cards = await ctx.db
      .query("cards", "by_board_position")
      .eq("boardId", boardId)
      .collect();
    if (board.ownerId === userId) return cards;
    return cards.map((card) => ({
      _id: card._id,
      _creationTime: card._creationTime,
      boardId: card.boardId,
      columnId: card.columnId,
      ownerId: card.ownerId,
      title: card.title,
      description: card.description,
      position: card.position,
    }));
  },
});

// Adds a card to a column. If no position is given, it goes at the bottom of that column.
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    columnId: v.id("columns"),
    title: v.string(),
    description: v.optional(v.string()),
    position: v.optional(v.number()),
    shareToken: v.optional(v.string()),
  },
  returns: v.id("cards"),
  handler: async (ctx, { boardId, columnId, title, description, position, shareToken }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("You must be signed in.");
    const board = await ctx.db.get(boardId);
    const column = await ctx.db.get(columnId);
    let canEdit = board?.ownerId === userId;
    if (!canEdit && shareToken) {
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
      canEdit = Boolean(share && share.boardId === boardId && share.role === "editor");
    }
    if (
      !canEdit ||
      !board ||
      !column || column.boardId !== boardId
    ) {
      throw new Error("Column not found.");
    }

    let finalPosition = position ?? 1024;
    if (position === undefined) {
      const [last] = await ctx.db
        .query("cards", "by_column_position")
        .eq("columnId", columnId)
        .order("desc")
        .take(1)
        .collect();
      if (last) {
        if (typeof last.position !== "number") {
          throw new Error("Card position is invalid.");
        }
        finalPosition = last.position + 1024;
      }
    }
    const cardId = await ctx.db.insert("cards", {
      boardId,
      columnId,
      ownerId: userId,
      title,
      description: description ?? "",
      position: finalPosition,
    });
    await logActivity(ctx, boardId, userId, "created", title, `Created card “${title}” in “${column.name}”`);
    return cardId;
  },
});

// Edits the title and description.
export const update = mutation({
  args: {
    cardId: v.id("cards"),
    title: v.string(),
    description: v.string(),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { cardId, title, description, shareToken }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    if (!card) return null;
    if (typeof card.boardId !== "string") return null;
    const board = await ctx.db.get(card.boardId);
    let canEdit = board?.ownerId === userId;
    if (!canEdit && shareToken) {
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
      canEdit = Boolean(share && share.boardId === card.boardId && share.role === "editor");
    }
    if (!canEdit) return null;
    await ctx.db.replace(cardId as Id<"cards">, {
      boardId: card.boardId,
      columnId: card.columnId,
      ownerId: card.ownerId,
      title,
      description,
      position: card.position,
    });
    const changes: string[] = [];
    if (card.title !== title) changes.push(`title from “${card.title}” to “${title}”`);
    if (card.description !== description) changes.push("description");
    const summary = changes.length
      ? `Edited card “${title}”: changed ${changes.join(" and ")}`
      : `Opened card “${title}” without changes`;
    await logActivity(ctx, card.boardId, userId, "edited", title, summary);
    return null;
  },
});

// Moves a card to a column and position (this is what drag and drop will call).
export const move = mutation({
  args: {
    cardId: v.id("cards"),
    columnId: v.id("columns"),
    position: v.number(),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { cardId, columnId, position, shareToken }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    const column = await ctx.db.get(columnId as Id<"columns">);
    if (!card || !column) return null;
    if (typeof card.boardId !== "string" || typeof column.boardId !== "string") return null;
    const board = await ctx.db.get(card.boardId);
    let canEdit = board?.ownerId === userId;
    if (!canEdit && shareToken) {
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
      canEdit = Boolean(share && share.boardId === card.boardId && share.role === "editor");
    }
    if (
      !canEdit || column.boardId !== card.boardId
    ) {
      return null; // card or column vanished or isn't yours: do nothing
    }
    const sourceColumn = await ctx.db.get(card.columnId);
    const sourceName = sourceColumn?.name ?? "an unknown column";
    const targetName = column.name;
    await ctx.db.replace(cardId as Id<"cards">, {
      boardId: card.boardId,
      columnId,
      ownerId: card.ownerId,
      title: card.title,
      description: card.description,
      position,
    });
    await logActivity(
      ctx,
      card.boardId,
      userId,
      "moved",
      card.title,
      `Moved card “${card.title}” from “${sourceName}” to “${targetName}”`,
    );
    return null;
  },
});

// Deletes a card.
export const remove = mutation({
  args: {
    cardId: v.id("cards"),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { cardId, shareToken }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    if (!card) return null;
    if (typeof card.boardId !== "string") return null;
    const board = await ctx.db.get(card.boardId);
    let canEdit = board?.ownerId === userId;
    if (!canEdit && shareToken) {
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
      canEdit = Boolean(share && share.boardId === card.boardId && share.role === "editor");
    }
    if (!canEdit) return null;
    await logActivity(ctx, card.boardId, userId, "deleted", card.title, `Deleted card “${card.title}”`);
    await ctx.db.delete(cardId as Id<"cards">);
    return null;
  },
});