import { v } from "@concile/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const columnShape = v.object({
    _id: v.id("columns"),
    _creationTime: v.number(),
    boardId: v.id("boards"),
    ownerId: v.string(),
    name: v.string(),
    position: v.number(),
});

// All columns of a board, already sorted by position (that's what the index gives us).
export const list = query({
    args: { boardId: v.id("boards") },
    returns: v.array(columnShape),
    handler: async (ctx, { boardId }) => {
        const ownerId = await ctx.auth.getUserId();
        if (!ownerId) return [];
        const board = await ctx.db.get(boardId);
        if (!board || board.ownerId !== ownerId) return []; // not your board: see nothing
        return ctx.db.query("columns", "by_board_position").eq("boardId", boardId).collect();
    },
});

// Adds a column. If no position is given, it goes at the end.
export const create = mutation({
    args: { boardId: v.id("boards"), name: v.string(), position: v.optional(v.number()) },
    returns: v.id("columns"),
    handler: async (ctx, { boardId, name, position }) => {
        const ownerId = await ctx.auth.getUserId();
        if (!ownerId) throw new Error("You must be signed in.");

        const board = await ctx.db.get(boardId);
        if (!board || board.ownerId !== ownerId) {
            throw new Error("Board not found.");
        }

        if (position !== undefined) {
            return ctx.db.insert("columns", {
                boardId,
                ownerId,
                name,
                position,
            });
        }

        const lastColumns = await ctx.db
            .query("columns", "by_board_position")
            .eq("boardId", boardId)
            .order("desc")
            .take(1)
            .collect();

        const last = lastColumns[0];

        const lastPosition =
            last && typeof last.position === "number" ? last.position : null;

        const nextPosition = lastPosition !== null ? lastPosition + 1024 : 1024;
        
        return ctx.db.insert("columns", {
            boardId,
            ownerId,
            name,
            position: nextPosition,
        });
    },
});

// Renames a column. If it doesn't exist or isn't yours, quietly does nothing.
export const rename = mutation({
    args: { columnId: v.id("columns"), name: v.string() },
    returns: v.null(),
    handler: async (ctx, { columnId, name }) => {
        const ownerId = await ctx.auth.getUserId();
        if (!ownerId) throw new Error("You must be signed in.");
        const column = await ctx.db.get(columnId);
        if (!column || column.ownerId !== ownerId) return null;
        // Concile has no "update one field" command, so we write back the whole row.
        await ctx.db.replace(columnId, {
            boardId: column.boardId,
            ownerId: column.ownerId,
            name,
            position: column.position,
        });
        return null;
    },
});

// Deletes a column AND all the cards inside it, in one all-or-nothing step.
export const remove = mutation({
    args: { columnId: v.id("columns") },
    returns: v.null(),
    handler: async (ctx, { columnId }) => {
        const ownerId = await ctx.auth.getUserId();
        if (!ownerId) throw new Error("You must be signed in.");
        const column = await ctx.db.get(columnId);
        if (!column || column.ownerId !== ownerId) return null;

        const cards = await ctx.db
            .query("cards", "by_column_position")
            .eq("columnId", columnId)
            .collect();
        for (const card of cards) {
            await ctx.db.delete(card._id as Id<"cards">);
        }
        await ctx.db.delete(columnId);
        return null;
    },
});