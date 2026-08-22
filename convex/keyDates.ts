import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { keyDateToneValidator, keyDateValidator } from "./lib/content";

function normalizeKeyDate(args: { displayDate: string; title: string }) {
  const displayDate = args.displayDate.trim();
  const title = args.title.trim();
  if (!displayDate || displayDate.length > 100) {
    throw new Error("Display date must be between 1 and 100 characters");
  }
  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters");
  }
  return { displayDate, title };
}

export const listPublished = query({
  args: {},
  returns: v.array(keyDateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("keyDates")
      .withIndex("by_published_and_sortOrder", (q) =>
        q.eq("published", true),
      )
      .order("asc")
      .take(100);
  },
});

export const listAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(keyDateValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    return await ctx.db
      .query("keyDates")
      .withIndex("by_sortOrder")
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: {
    displayDate: v.string(),
    title: v.string(),
    tone: keyDateToneValidator,
    sortOrder: v.number(),
    published: v.boolean(),
  },
  returns: keyDateValidator,
  handler: async (ctx, args) => {
    const author = await requireRole(ctx, ["staff"]);
    const content = normalizeKeyDate(args);
    const id = await ctx.db.insert("keyDates", {
      ...content,
      tone: args.tone,
      sortOrder: args.sortOrder,
      published: args.published,
      authorId: author._id,
      updatedAt: Date.now(),
    });
    const keyDate = await ctx.db.get("keyDates", id);
    if (!keyDate) {
      throw new Error("Could not create key date");
    }
    return keyDate;
  },
});

export const update = mutation({
  args: {
    keyDateId: v.id("keyDates"),
    displayDate: v.string(),
    title: v.string(),
    tone: keyDateToneValidator,
    sortOrder: v.number(),
  },
  returns: keyDateValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const keyDate = await ctx.db.get("keyDates", args.keyDateId);
    if (!keyDate) {
      throw new Error("Key date not found");
    }
    const content = normalizeKeyDate(args);
    await ctx.db.patch("keyDates", keyDate._id, {
      ...content,
      tone: args.tone,
      sortOrder: args.sortOrder,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("keyDates", keyDate._id);
    if (!updated) {
      throw new Error("Could not update key date");
    }
    return updated;
  },
});

export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        keyDateId: v.id("keyDates"),
        sortOrder: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    if (args.items.length > 100) {
      throw new Error("At most 100 key dates can be reordered at once");
    }
    const now = Date.now();
    for (const item of args.items) {
      const keyDate = await ctx.db.get("keyDates", item.keyDateId);
      if (!keyDate) {
        throw new Error("Key date not found");
      }
      await ctx.db.patch("keyDates", keyDate._id, {
        sortOrder: item.sortOrder,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const setPublished = mutation({
  args: {
    keyDateId: v.id("keyDates"),
    published: v.boolean(),
  },
  returns: keyDateValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const keyDate = await ctx.db.get("keyDates", args.keyDateId);
    if (!keyDate) {
      throw new Error("Key date not found");
    }
    await ctx.db.patch("keyDates", keyDate._id, {
      published: args.published,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("keyDates", keyDate._id);
    if (!updated) {
      throw new Error("Could not update key date publication status");
    }
    return updated;
  },
});

export const remove = mutation({
  args: { keyDateId: v.id("keyDates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const keyDate = await ctx.db.get("keyDates", args.keyDateId);
    if (!keyDate) {
      throw new Error("Key date not found");
    }
    await ctx.db.delete("keyDates", keyDate._id);
    return null;
  },
});
