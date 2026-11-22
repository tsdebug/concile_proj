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
        entityType: "column",
        entityName,
        summary,
        createdAt: Date.now(),
    });
}

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
    args: {
        boardId: v.id("boards"),
        shareToken: v.optional(v.string()),
    },
    returns: v.array(columnShape),
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
        const columns = await ctx.db
            .query("columns", "by_board_position")
            .eq("boardId", boardId)
            .collect();
        if (board.ownerId === userId) return columns;
        return columns.map((column) => ({
            _id: column._id,
            _creationTime: column._creationTime,
            boardId: column.boardId,
            ownerId: column.ownerId,
            name: column.name,
            position: column.position,
        }));
    },
});

// Adds a column. If no position is given, it goes at the end.
export const create = mutation({
    args: {
        boardId: v.id("boards"),
        name: v.string(),
        position: v.optional(v.number()),
        shareToken: v.optional(v.string()),
    },
    returns: v.id("columns"),
    handler: async (ctx, { boardId, name, position, shareToken }) => {
        const userId = await ctx.auth.getUserId();
        if (!userId) throw new Error("You must be signed in.");

        const board = await ctx.db.get(boardId);
        let canEdit = board?.ownerId === userId;
        if (!canEdit && shareToken) {
            const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
            canEdit = Boolean(share && share.boardId === boardId && share.role === "editor");
        }
        if (!board || !canEdit) {
            throw new Error("Board not found.");
        }

        if (position !== undefined) {
            const columnId = await ctx.db.insert("columns", {
                boardId,
                ownerId: userId,
                name,
                position,
            });
            await logActivity(ctx, boardId, userId, "created", name, `Created column “${name}”`);
            return columnId;
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
        
        const columnId = await ctx.db.insert("columns", {
            boardId,
            ownerId: userId,
            name,
            position: nextPosition,
        });
        await logActivity(ctx, boardId, userId, "created", name, `Created column “${name}”`);
        return columnId;
    },
});

// Renames a column. If it doesn't exist or isn't yours, quietly does nothing.
export const rename = mutation({
    args: {
        columnId: v.id("columns"),
        name: v.string(),
        shareToken: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, { columnId, name, shareToken }) => {
        const userId = await ctx.auth.getUserId();
        if (!userId) throw new Error("You must be signed in.");
        const column = await ctx.db.get(columnId);
        if (!column) return null;
        if (typeof column.boardId !== "string") return null;
        const board = await ctx.db.get(column.boardId);
        let canEdit = board?.ownerId === userId;
        if (!canEdit && shareToken) {
            const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
            canEdit = Boolean(share && share.boardId === column.boardId && share.role === "editor");
        }
        if (!canEdit) return null;
        // Concile has no "update one field" command, so we write back the whole row.
        await ctx.db.replace(columnId as Id<"columns">, {
            boardId: column.boardId,
            ownerId: column.ownerId,
            name,
            position: column.position,
        });
        const summary = column.name === name
            ? `Opened column “${name}” without changes`
            : `Renamed column “${column.name}” to “${name}”`;
        await logActivity(ctx, column.boardId, userId, "edited", name, summary);
        return null;
    },
});

// Deletes a column AND all the cards inside it, in one all-or-nothing step.
export const remove = mutation({
    args: {
        columnId: v.id("columns"),
        shareToken: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, { columnId, shareToken }) => {
        const userId = await ctx.auth.getUserId();
        if (!userId) throw new Error("You must be signed in.");
        const column = await ctx.db.get(columnId);
        if (!column) return null;
        if (typeof column.boardId !== "string") return null;
        const board = await ctx.db.get(column.boardId);
        let canEdit = board?.ownerId === userId;
        if (!canEdit && shareToken) {
            const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect();
            canEdit = Boolean(share && share.boardId === column.boardId && share.role === "editor");
        }
        if (!canEdit) return null;

        await logActivity(ctx, column.boardId, userId, "deleted", column.name, `Deleted column “${column.name}” and its cards`);
        const cards = await ctx.db
            .query("cards", "by_column_position")
            .eq("columnId", columnId as Id<"columns">)
            .collect();
        const displayName = await getDisplayName(ctx, userId);
        for (const card of cards) {
            await ctx.db.insert("boardActivity", {
                boardId: column.boardId,
                userId,
                displayName,
                action: "deleted",
                entityType: "card",
                entityName: card.title,
                summary: `Deleted card “${card.title}” with column “${column.name}”`,
                createdAt: Date.now(),
            });
            await ctx.db.delete(card._id as Id<"cards">);
        }
        await ctx.db.delete(columnId as Id<"columns">);
        return null;
    },
});

export const move = mutation({
  args: {
    columnId: v.id("columns"),
    position: v.number(),
    shareToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { columnId, position, shareToken }) => {
    const userId = await ctx.auth.getUserId()

    if (!userId) {
      throw new Error("You must be signed in.")
    }

    if (!Number.isFinite(position)) {
      throw new Error("Invalid column position.")
    }

    const column = await ctx.db.get(columnId)

    if (!column) {
      throw new Error("Column not found.")
    }
    if (typeof column.boardId !== "string") {
      throw new Error("Column not found.")
    }
    const board = await ctx.db.get(column.boardId)
    let canEdit = board?.ownerId === userId
    if (!canEdit && shareToken) {
      const [share] = await ctx.db.query("boardShares", "by_token").eq("token", shareToken).take(1).collect()
      canEdit = Boolean(share && share.boardId === column.boardId && share.role === "editor")
    }
    if (!canEdit) throw new Error("Column not found.")

    await ctx.db.replace(columnId as Id<"columns">, {
      boardId: column.boardId,
      ownerId: column.ownerId,
      name: column.name,
      position,
    })
    await logActivity(ctx, column.boardId, userId, "moved", column.name, `Moved column “${column.name}”`)

    return null
  },
})