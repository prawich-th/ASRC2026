import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  announcementTagValidator,
  announcementValidator,
} from "./lib/content";
import { announcementEmail } from "./lib/emailTemplates";
import {
  createBroadcastCampaign,
  getSiteUrl,
} from "./notifications";

type AnnouncementTag = {
  name: string;
  tone: "primary" | "secondary" | "tertiary";
};

function normalizeSlug(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized || normalized.length > 120) {
    throw new Error("Slug must contain letters or numbers and be at most 120 characters");
  }
  return normalized;
}

function normalizeTags(tags: AnnouncementTag[]): AnnouncementTag[] {
  if (tags.length > 8) {
    throw new Error("Announcements can have at most 8 tags");
  }
  return tags.map((tag) => {
    const name = tag.name.trim();
    if (!name || name.length > 40) {
      throw new Error("Tag names must be between 1 and 40 characters");
    }
    return { name, tone: tag.tone };
  });
}

function normalizeContent(args: {
  title: string;
  slug: string;
  summary: string;
  body: string;
  tags: AnnouncementTag[];
  authorName: string;
  authorTitle: string;
  departmentName: string;
  departmentEmail: string;
}) {
  const title = args.title.trim();
  const summary = args.summary.trim();
  const body = args.body.trim();
  const authorName = args.authorName.trim();
  const authorTitle = args.authorTitle.trim();
  const departmentName = args.departmentName.trim();
  const departmentEmail = args.departmentEmail.trim().toLowerCase();
  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters");
  }
  if (!summary || summary.length > 500) {
    throw new Error("Summary must be between 1 and 500 characters");
  }
  if (!body) {
    throw new Error("Markdown body is required");
  }
  if (!authorName || authorName.length > 120) {
    throw new Error("Author name must be between 1 and 120 characters");
  }
  if (!authorTitle || authorTitle.length > 160) {
    throw new Error("Author title must be between 1 and 160 characters");
  }
  if (!departmentName || departmentName.length > 160) {
    throw new Error("Department name must be between 1 and 160 characters");
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(departmentEmail) ||
    departmentEmail.length > 254
  ) {
    throw new Error("A valid department contact email is required");
  }
  return {
    title,
    slug: normalizeSlug(args.slug),
    summary,
    body,
    tags: normalizeTags(args.tags),
    authorName,
    authorTitle,
    departmentName,
    departmentEmail,
  };
}

async function assertUniqueSlug(
  ctx: MutationCtx,
  slug: string,
  exceptId?: Id<"announcements">,
): Promise<void> {
  const existing = await ctx.db
    .query("announcements")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== exceptId) {
    throw new Error("Announcement slug is already in use");
  }
}

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(announcementValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 3), 20));
    return await ctx.db
      .query("announcements")
      .withIndex("by_status_and_publishedAt", (q) =>
        q.eq("status", "published"),
      )
      .order("desc")
      .take(limit);
  },
});

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(announcementValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("announcements")
      .withIndex("by_status_and_publishedAt", (q) =>
        q.eq("status", "published"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(announcementValidator, v.null()),
  handler: async (ctx, args) => {
    const announcement = await ctx.db
      .query("announcements")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.trim().toLowerCase()))
      .unique();
    return announcement?.status === "published" ? announcement : null;
  },
});

export const listAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(announcementValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    return await ctx.db
      .query("announcements")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getAdminById = query({
  args: { announcementId: v.id("announcements") },
  returns: v.union(announcementValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    return await ctx.db.get("announcements", args.announcementId);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    summary: v.string(),
    body: v.string(),
    tags: v.array(announcementTagValidator),
    authorName: v.string(),
    authorTitle: v.string(),
    departmentName: v.string(),
    departmentEmail: v.string(),
  },
  returns: announcementValidator,
  handler: async (ctx, args) => {
    const author = await requireRole(ctx, ["staff"]);
    const content = normalizeContent(args);
    await assertUniqueSlug(ctx, content.slug);
    const id = await ctx.db.insert("announcements", {
      ...content,
      status: "draft",
      authorId: author._id,
      updatedAt: Date.now(),
    });
    const announcement = await ctx.db.get("announcements", id);
    if (!announcement) {
      throw new Error("Could not create announcement");
    }
    return announcement;
  },
});

export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    slug: v.string(),
    summary: v.string(),
    body: v.string(),
    tags: v.array(announcementTagValidator),
    authorName: v.string(),
    authorTitle: v.string(),
    departmentName: v.string(),
    departmentEmail: v.string(),
  },
  returns: announcementValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const announcement = await ctx.db.get("announcements", args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    const content = normalizeContent(args);
    await assertUniqueSlug(ctx, content.slug, announcement._id);
    await ctx.db.patch("announcements", announcement._id, {
      ...content,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("announcements", announcement._id);
    if (!updated) {
      throw new Error("Could not update announcement");
    }
    return updated;
  },
});

export const publish = mutation({
  args: { announcementId: v.id("announcements") },
  returns: announcementValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const announcement = await ctx.db.get("announcements", args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    const now = Date.now();
    await ctx.db.patch("announcements", announcement._id, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });
    const updated = await ctx.db.get("announcements", announcement._id);
    if (!updated) {
      throw new Error("Could not publish announcement");
    }
    if (announcement.status !== "published") {
      await createBroadcastCampaign(ctx, {
        kind: "announcement",
        content: announcementEmail({
          title: updated.title,
          summary: updated.summary,
          body: updated.body,
          url: getSiteUrl(`/announcements/${updated.slug}`),
        }),
      });
    }
    return updated;
  },
});

export const unpublish = mutation({
  args: { announcementId: v.id("announcements") },
  returns: announcementValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const announcement = await ctx.db.get("announcements", args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    await ctx.db.patch("announcements", announcement._id, {
      status: "draft",
      publishedAt: undefined,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("announcements", announcement._id);
    if (!updated) {
      throw new Error("Could not unpublish announcement");
    }
    return updated;
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["staff"]);
    const announcement = await ctx.db.get("announcements", args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }
    await ctx.db.delete("announcements", announcement._id);
    return null;
  },
});
