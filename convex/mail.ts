import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import schema from "./schema";
import {
  getCurrentUser,
  getCurrentUserOrNull,
  requireRole,
} from "./lib/auth";
import {
  canAccessInbox,
  isStaffUser,
  MAIL_ATTACHMENT_LIMIT_BYTES,
  mailFolderValidator,
  mailThreadSnapshotValidator,
  requireInboxAccess,
} from "./lib/mail";

const UNREAD_COUNT_CAP = 100;
const UPLOAD_CLAIM_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const RECIPIENT_SUGGESTION_LIMIT = 8;
const RECIPIENT_SUGGESTION_SCAN = 20;

const inboxSummaryValidator = v.object({
  _id: v.id("mailInboxes"),
  address: v.string(),
  name: v.string(),
  unread: v.number(),
});

/** Inboxes the signed-in user can open, with capped unread counts. */
export const listMyInboxes = query({
  args: {},
  returns: v.array(inboxSummaryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user || !isStaffUser(user)) {
      return [];
    }
    const inboxes = await ctx.db.query("mailInboxes").take(20);
    const result = [];
    for (const inbox of inboxes) {
      if (!(await canAccessInbox(ctx, user, inbox._id))) {
        continue;
      }
      const unread = await ctx.db
        .query("mailThreads")
        .withIndex("by_inboxId_and_folder_and_read", (q) =>
          q.eq("inboxId", inbox._id).eq("folder", "inbox").eq("read", false),
        )
        .take(UNREAD_COUNT_CAP);
      result.push({
        _id: inbox._id,
        address: inbox.address,
        name: inbox.name,
        unread: unread.length,
      });
    }
    return result.sort((a, b) => a.address.localeCompare(b.address));
  },
});

export const listThreads = query({
  args: {
    inboxId: v.id("mailInboxes"),
    folder: mailFolderValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireInboxAccess(ctx, args.inboxId);
    return await ctx.db
      .query("mailThreads")
      .withIndex("by_inboxId_and_folder_and_lastActivityAt", (q) =>
        q.eq("inboxId", args.inboxId).eq("folder", args.folder),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getThread = query({
  args: { threadId: v.id("mailThreads") },
  returns: v.union(
    v.object({
      thread: schema.doc("mailThreads"),
      inbox: inboxSummaryValidator.omit("unread"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get("mailThreads", args.threadId);
    if (!thread) {
      return null;
    }
    const { inbox } = await requireInboxAccess(ctx, thread.inboxId);
    return {
      thread,
      inbox: { _id: inbox._id, address: inbox.address, name: inbox.name },
    };
  },
});

export const generateAttachmentUploadUrl = mutation({
  args: { inboxId: v.id("mailInboxes") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireInboxAccess(ctx, args.inboxId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Claims a just-uploaded file for an outgoing email. Storage ids are only
 * accepted fresh and once, so existing files (abstracts, profile images)
 * can't be attached or deleted through mail.
 */
export const registerAttachmentUpload = mutation({
  args: {
    inboxId: v.id("mailInboxes"),
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  returns: v.id("mailUploads"),
  handler: async (ctx, args) => {
    const { user } = await requireInboxAccess(ctx, args.inboxId);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata || Date.now() - metadata._creationTime > UPLOAD_CLAIM_WINDOW_MS) {
      throw new Error("Upload expired. Please attach the file again.");
    }
    const claimed = await ctx.db
      .query("mailUploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (claimed) {
      throw new Error("This file is already attached");
    }
    if (metadata.size > MAIL_ATTACHMENT_LIMIT_BYTES) {
      throw new Error("Attachments can be at most 25 MB in total");
    }
    const filename = args.filename.trim().slice(0, 200) || "attachment";
    const uploadId = await ctx.db.insert("mailUploads", {
      storageId: args.storageId,
      inboxId: args.inboxId,
      uploadedBy: user._id,
      filename,
      contentType: metadata.contentType ?? "application/octet-stream",
      size: metadata.size,
    });
    await ctx.scheduler.runAfter(
      UPLOAD_TTL_MS,
      internal.mail.deleteUploads,
      { uploadIds: [uploadId] },
    );
    return uploadId;
  },
});

export const removeAttachmentUpload = mutation({
  args: { uploadId: v.id("mailUploads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const upload = await ctx.db.get("mailUploads", args.uploadId);
    if (!upload || upload.uploadedBy !== user._id) {
      return null;
    }
    await ctx.storage.delete(upload.storageId);
    await ctx.db.delete("mailUploads", upload._id);
    return null;
  },
});

/** Registered users matching what's typed in a To/Cc field. */
export const suggestRecipients = query({
  args: { inboxId: v.id("mailInboxes"), search: v.string() },
  returns: v.array(v.object({ name: v.string(), email: v.string() })),
  handler: async (ctx, args) => {
    await requireInboxAccess(ctx, args.inboxId);
    const search = args.search.trim().toLowerCase().slice(0, 100);
    if (search.length < 2) {
      return [];
    }
    const users = await ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("searchText", search))
      .take(RECIPIENT_SUGGESTION_SCAN);
    const seen = new Set<string>();
    const suggestions = [];
    for (const user of users) {
      const email = user.email?.trim();
      if (!email || seen.has(email.toLowerCase())) {
        continue;
      }
      seen.add(email.toLowerCase());
      const name =
        [user.prefix, user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.name ||
        "";
      suggestions.push({ name, email });
      if (suggestions.length === RECIPIENT_SUGGESTION_LIMIT) {
        break;
      }
    }
    return suggestions;
  },
});

/** Super admin view of which inboxes a user is assigned to. */
export const listUserInboxes = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("mailInboxes"),
      address: v.string(),
      name: v.string(),
      assigned: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["super_admin"]);
    const inboxes = await ctx.db.query("mailInboxes").take(20);
    const memberships = await ctx.db
      .query("mailInboxMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(20);
    const assigned = new Set(memberships.map((m) => m.inboxId));
    return inboxes
      .map((inbox) => ({
        _id: inbox._id,
        address: inbox.address,
        name: inbox.name,
        assigned: assigned.has(inbox._id),
      }))
      .sort((a, b) => a.address.localeCompare(b.address));
  },
});

export const setInboxMembership = mutation({
  args: {
    userId: v.id("users"),
    inboxId: v.id("mailInboxes"),
    assigned: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["super_admin"]);
    const [target, inbox] = await Promise.all([
      ctx.db.get("users", args.userId),
      ctx.db.get("mailInboxes", args.inboxId),
    ]);
    if (!target || !inbox) {
      throw new Error("User or inbox not found");
    }
    const existing = await ctx.db
      .query("mailInboxMembers")
      .withIndex("by_inboxId_and_userId", (q) =>
        q.eq("inboxId", args.inboxId).eq("userId", args.userId),
      )
      .unique();
    if (!args.assigned) {
      if (existing) {
        await ctx.db.delete("mailInboxMembers", existing._id);
      }
      return null;
    }
    if (!isStaffUser(target)) {
      throw new Error("Only users with a staff role can be assigned to an inbox");
    }
    if (!existing) {
      await ctx.db.insert("mailInboxMembers", {
        inboxId: args.inboxId,
        userId: args.userId,
        addedBy: admin._id,
        addedAt: Date.now(),
      });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal helpers for mailActions and the webhook

const senderValidator = v.object({
  name: v.string(),
  position: v.optional(v.string()),
});

function senderOf(user: Doc<"users">) {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email ||
    "ASRC 2027";
  const position = user.staffPosition?.trim();
  return position ? { name, position } : { name };
}

/** Runs as the calling user, so actions inherit the same access check. */
export const getInboxForAction = internalQuery({
  args: { inboxId: v.id("mailInboxes") },
  returns: v.object({
    inbox: schema.doc("mailInboxes"),
    sender: senderValidator,
  }),
  handler: async (ctx, args) => {
    const { user, inbox } = await requireInboxAccess(ctx, args.inboxId);
    return { inbox, sender: senderOf(user) };
  },
});

export const getThreadForAction = internalQuery({
  args: { threadId: v.id("mailThreads") },
  returns: v.object({
    thread: schema.doc("mailThreads"),
    inbox: schema.doc("mailInboxes"),
    sender: senderValidator,
  }),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get("mailThreads", args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }
    const { user, inbox } = await requireInboxAccess(ctx, thread.inboxId);
    return { thread, inbox, sender: senderOf(user) };
  },
});

export const listInboxesInternal = internalQuery({
  args: {},
  returns: v.array(schema.doc("mailInboxes")),
  handler: async (ctx) => {
    return await ctx.db.query("mailInboxes").take(20);
  },
});

export const upsertInbox = internalMutation({
  args: {
    address: v.string(),
    name: v.string(),
    fromName: v.string(),
    resendInboxId: v.string(),
  },
  returns: v.id("mailInboxes"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mailInboxes")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();
    if (existing) {
      await ctx.db.patch("mailInboxes", existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("mailInboxes", args);
  },
});

export const upsertThread = internalMutation({
  args: {
    resendInboxId: v.string(),
    resendThreadId: v.string(),
    snapshot: mailThreadSnapshotValidator,
  },
  returns: v.union(v.id("mailThreads"), v.null()),
  handler: async (ctx, args) => {
    const inbox = await ctx.db
      .query("mailInboxes")
      .withIndex("by_resendInboxId", (q) =>
        q.eq("resendInboxId", args.resendInboxId),
      )
      .unique();
    if (!inbox) {
      // Mail for an inbox this app doesn't manage.
      return null;
    }
    const existing = await ctx.db
      .query("mailThreads")
      .withIndex("by_resendThreadId", (q) =>
        q.eq("resendThreadId", args.resendThreadId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch("mailThreads", existing._id, args.snapshot);
      return existing._id;
    }
    return await ctx.db.insert("mailThreads", {
      inboxId: inbox._id,
      resendThreadId: args.resendThreadId,
      ...args.snapshot,
    });
  },
});

export const patchThread = internalMutation({
  args: {
    threadId: v.id("mailThreads"),
    folder: v.optional(mailFolderValidator),
    read: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, ...fields } = args;
    await ctx.db.patch("mailThreads", threadId, fields);
    return null;
  },
});

export const getUploadsForAction = internalQuery({
  args: {
    inboxId: v.id("mailInboxes"),
    uploadIds: v.array(v.id("mailUploads")),
  },
  returns: v.array(schema.doc("mailUploads")),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const uploads = [];
    for (const uploadId of args.uploadIds) {
      const upload = await ctx.db.get("mailUploads", uploadId);
      if (
        !upload ||
        upload.uploadedBy !== user._id ||
        upload.inboxId !== args.inboxId
      ) {
        throw new Error("Attachment not found. Please attach the file again.");
      }
      uploads.push(upload);
    }
    const total = uploads.reduce((sum, upload) => sum + upload.size, 0);
    if (total > MAIL_ATTACHMENT_LIMIT_BYTES) {
      throw new Error("Attachments can be at most 25 MB in total");
    }
    return uploads;
  },
});

export const deleteUploads = internalMutation({
  args: { uploadIds: v.array(v.id("mailUploads")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const uploadId of args.uploadIds) {
      const upload = await ctx.db.get("mailUploads", uploadId);
      if (upload) {
        await ctx.storage.delete(upload.storageId);
        await ctx.db.delete("mailUploads", upload._id);
      }
    }
    return null;
  },
});

/** Returns false when this Svix message id was already processed. */
export const recordWebhookEvent = internalMutation({
  args: { svixId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mailWebhookEvents")
      .withIndex("by_svixId", (q) => q.eq("svixId", args.svixId))
      .unique();
    if (existing) {
      return false;
    }
    await ctx.db.insert("mailWebhookEvents", {
      svixId: args.svixId,
      receivedAt: Date.now(),
    });
    return true;
  },
});
