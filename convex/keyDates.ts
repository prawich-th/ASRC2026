import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { keyDateToneValidator, keyDateValidator } from "./lib/content";
import { keyDateEmail } from "./lib/emailTemplates";
import {
  createBroadcastCampaign,
  getSiteUrl,
} from "./notifications";

const MAX_KEY_DATES = 100;

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
      .take(MAX_KEY_DATES);
  },
});

export const listAdmin = query({
  args: {},
  returns: v.array(keyDateValidator),
  handler: async (ctx) => {
    await requireRole(ctx, ["staff"]);
    return await ctx.db
      .query("keyDates")
      .withIndex("by_sortOrder")
      .order("asc")
      .take(MAX_KEY_DATES);
  },
});

export const create = mutation({
  args: {
    displayDate: v.string(),
    title: v.string(),
    tone: keyDateToneValidator,
    sortOrder: v.optional(v.number()),
    published: v.boolean(),
  },
  returns: keyDateValidator,
  handler: async (ctx, args) => {
    const author = await requireRole(ctx, ["staff"]);
    const content = normalizeKeyDate(args);
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const last = await ctx.db
        .query("keyDates")
        .withIndex("by_sortOrder")
        .order("desc")
        .first();
      sortOrder = last ? last.sortOrder + 1 : 0;
    }
    const id = await ctx.db.insert("keyDates", {
      ...content,
      tone: args.tone,
      sortOrder,
      published: args.published,
      authorId: author._id,
      updatedAt: Date.now(),
    });
    const keyDate = await ctx.db.get("keyDates", id);
    if (!keyDate) {
      throw new Error("Could not create key date");
    }
    if (keyDate.published) {
      await createBroadcastCampaign(ctx, {
        kind: "key_date",
        content: keyDateEmail({
          title: keyDate.title,
          displayDate: keyDate.displayDate,
          url: getSiteUrl("/"),
        }),
      });
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
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("keyDates", keyDate._id);
    if (!updated) {
      throw new Error("Could not update key date");
    }
    const titleChanged = keyDate.title !== updated.title;
    const displayDateChanged =
      keyDate.displayDate !== updated.displayDate;
    if (keyDate.published && (titleChanged || displayDateChanged)) {
      await createBroadcastCampaign(ctx, {
        kind: "key_date",
        content: keyDateEmail({
          title: updated.title,
          displayDate: updated.displayDate,
          previousTitle: titleChanged ? keyDate.title : undefined,
          previousDisplayDate: displayDateChanged
            ? keyDate.displayDate
            : undefined,
          url: getSiteUrl("/"),
        }),
      });
    }
    return updated;
  },
});

export const reorder = mutation({
  args: { keyDateIds: v.array(v.id("keyDates")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    if (args.keyDateIds.length > MAX_KEY_DATES) {
      throw new Error(
        `At most ${MAX_KEY_DATES} key dates can be reordered at once`,
      );
    }
    if (new Set(args.keyDateIds).size !== args.keyDateIds.length) {
      throw new Error("Each key date can only appear once");
    }
    const now = Date.now();
    for (const [index, keyDateId] of args.keyDateIds.entries()) {
      const keyDate = await ctx.db.get("keyDates", keyDateId);
      if (!keyDate) {
        throw new Error("Key date not found");
      }
      if (keyDate.sortOrder !== index) {
        await ctx.db.patch("keyDates", keyDate._id, {
          sortOrder: index,
          updatedAt: now,
        });
      }
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
    if (args.published && !keyDate.published) {
      await createBroadcastCampaign(ctx, {
        kind: "key_date",
        content: keyDateEmail({
          title: updated.title,
          displayDate: updated.displayDate,
          url: getSiteUrl("/"),
        }),
      });
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
