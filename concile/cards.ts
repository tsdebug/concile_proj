import { v } from "@concile/values";
import { mutation, query } from "./_generated/server";

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
  args: { boardId: v.id("boards") },
  returns: v.array(cardShape),
  handler: async (ctx, { boardId }) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) return [];
    const board = await ctx.db.get(boardId);
    if (!board || board.ownerId !== ownerId) return [];
    return ctx.db.query("cards", "by_board_position").eq("boardId", boardId).collect();
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
  },
  returns: v.id("cards"),
  handler: async (ctx, { boardId, columnId, title, description, position }) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) throw new Error("You must be signed in.");
    const board = await ctx.db.get(boardId);
    const column = await ctx.db.get(columnId);
    if (
      !board || board.ownerId !== ownerId ||
      !column || column.ownerId !== ownerId || column.boardId !== boardId
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
    return ctx.db.insert("cards", {
      boardId,
      columnId,
      ownerId,
      title,
      description: description ?? "",
      position: finalPosition,
    });
  },
});

// Edits the title and description.
export const update = mutation({
  args: { cardId: v.id("cards"), title: v.string(), description: v.string() },
  returns: v.null(),
  handler: async (ctx, { cardId, title, description }) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    if (!card || card.ownerId !== ownerId) return null;
    await ctx.db.replace(cardId, {
      boardId: card.boardId,
      columnId: card.columnId,
      ownerId: card.ownerId,
      title,
      description,
      position: card.position,
    });
    return null;
  },
});

// Moves a card to a column and position (this is what drag and drop will call).
export const move = mutation({
  args: { cardId: v.id("cards"), columnId: v.id("columns"), position: v.number() },
  returns: v.null(),
  handler: async (ctx, { cardId, columnId, position }) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    const column = await ctx.db.get(columnId);
    if (
      !card || card.ownerId !== ownerId ||
      !column || column.ownerId !== ownerId || column.boardId !== card.boardId
    ) {
      return null; // card or column vanished or isn't yours: do nothing
    }
    await ctx.db.replace(cardId, {
      boardId: card.boardId,
      columnId,
      ownerId: card.ownerId,
      title: card.title,
      description: card.description,
      position,
    });
    return null;
  },
});

// Deletes a card.
export const remove = mutation({
  args: { cardId: v.id("cards") },
  returns: v.null(),
  handler: async (ctx, { cardId }) => {
    const ownerId = await ctx.auth.getUserId();
    if (!ownerId) throw new Error("You must be signed in.");
    const card = await ctx.db.get(cardId);
    if (!card || card.ownerId !== ownerId) return null;
    await ctx.db.delete(cardId);
    return null;
  },
});