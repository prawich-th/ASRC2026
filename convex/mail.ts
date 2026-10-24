import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
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
  MAIL_SCHEDULE_MAX_AHEAD_MS,
  MAIL_SCHEDULE_STUCK_MS,
  mailFolderValidator,
  mailScheduledKindValidator,
  mailScheduledStatusValidator,
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
    if (!upload || upload.uploadedBy !== user._id || upload.scheduledEmailId) {
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
        upload.inboxId !== args.inboxId ||
        upload.scheduledEmailId
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

/** Also the upload TTL, which leaves files on a scheduled email alone. */
export const deleteUploads = internalMutation({
  args: {
    uploadIds: v.array(v.id("mailUploads")),
    includeScheduled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await deleteUploadRows(ctx, args.uploadIds, args.includeScheduled ?? false);
    return null;
  },
});

async function deleteUploadRows(
  ctx: MutationCtx,
  uploadIds: Id<"mailUploads">[],
  includeScheduled: boolean,
) {
  for (const uploadId of uploadIds) {
    const upload = await ctx.db.get("mailUploads", uploadId);
    if (upload && (includeScheduled || !upload.scheduledEmailId)) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete("mailUploads", upload._id);
    }
  }
}

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

// ---------------------------------------------------------------------------
// Scheduled send

const SCHEDULED_LIST_LIMIT = 100;

function assertSendAt(sendAt: number) {
  const now = Date.now();
  if (!Number.isFinite(sendAt) || sendAt <= now) {
    throw new Error("Pick a time in the future");
  }
  if (sendAt > now + MAIL_SCHEDULE_MAX_AHEAD_MS) {
    throw new Error("Emails can be scheduled at most 60 days ahead");
  }
}

/** A "sending" row whose action died counts as failed so it can be retried. */
function effectiveStatus(row: Doc<"mailScheduledEmails">) {
  if (
    row.status === "sending" &&
    Date.now() - (row.sendingSince ?? 0) > MAIL_SCHEDULE_STUCK_MS
  ) {
    return "failed" as const;
  }
  return row.status;
}

async function requireEditableScheduled(
  ctx: MutationCtx,
  scheduledId: Id<"mailScheduledEmails">,
) {
  const row = await ctx.db.get("mailScheduledEmails", scheduledId);
  if (!row) {
    throw new Error("This email has already been sent or cancelled");
  }
  await requireInboxAccess(ctx, row.inboxId);
  if (effectiveStatus(row) === "sending") {
    throw new Error("This email is being sent right now");
  }
  return row;
}

const scheduledSummaryValidator = v.object({
  _id: v.id("mailScheduledEmails"),
  kind: mailScheduledKindValidator,
  threadId: v.optional(v.id("mailThreads")),
  to: v.array(v.string()),
  cc: v.array(v.string()),
  subject: v.string(),
  snippet: v.optional(v.string()),
  attachmentCount: v.number(),
  sendAt: v.number(),
  status: mailScheduledStatusValidator,
  error: v.optional(v.string()),
  createdByName: v.string(),
});

/** Emails waiting to go out from an inbox, soonest first. */
export const listScheduled = query({
  args: { inboxId: v.id("mailInboxes") },
  returns: v.array(scheduledSummaryValidator),
  handler: async (ctx, args) => {
    await requireInboxAccess(ctx, args.inboxId);
    const rows = await ctx.db
      .query("mailScheduledEmails")
      .withIndex("by_inboxId_and_sendAt", (q) => q.eq("inboxId", args.inboxId))
      .take(SCHEDULED_LIST_LIMIT);
    const result = [];
    for (const row of rows) {
      const author = await ctx.db.get("users", row.createdBy);
      result.push({
        _id: row._id,
        kind: row.kind,
        threadId: row.threadId,
        to: row.to,
        cc: row.cc,
        subject: row.subject,
        snippet: row.snippet,
        attachmentCount: row.uploadIds.length,
        sendAt: row.sendAt,
        status: effectiveStatus(row),
        error: row.error,
        createdByName: author ? senderOf(author).name : "Former staff member",
      });
    }
    return result;
  },
});

export const cancelScheduled = mutation({
  args: { scheduledId: v.id("mailScheduledEmails") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await requireEditableScheduled(ctx, args.scheduledId);
    if (row.jobId) {
      await ctx.scheduler.cancel(row.jobId);
    }
    await deleteUploadRows(ctx, row.uploadIds, true);
    await ctx.db.delete("mailScheduledEmails", row._id);
    return null;
  },
});

/** Changes the send time; also retries a failed email. */
export const rescheduleScheduled = mutation({
  args: {
    scheduledId: v.id("mailScheduledEmails"),
    /** Omit to send straight away. */
    sendAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await requireEditableScheduled(ctx, args.scheduledId);
    const sendAt = args.sendAt ?? Date.now();
    if (args.sendAt !== undefined) {
      assertSendAt(sendAt);
    }
    if (row.jobId) {
      await ctx.scheduler.cancel(row.jobId);
    }
    const jobId = await ctx.scheduler.runAt(
      sendAt,
      internal.mailActions.sendScheduledEmail,
      { scheduledId: row._id },
    );
    await ctx.db.patch("mailScheduledEmails", row._id, {
      sendAt,
      status: "scheduled",
      attempt: row.attempt + 1,
      jobId,
      sendingSince: undefined,
      error: undefined,
    });
    return null;
  },
});

/** Runs as the calling user from the compose, reply and forward actions. */
export const createScheduled = internalMutation({
  args: {
    inboxId: v.id("mailInboxes"),
    kind: mailScheduledKindValidator,
    threadId: v.optional(v.id("mailThreads")),
    emailId: v.optional(v.string()),
    replyAll: v.optional(v.boolean()),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    subject: v.string(),
    html: v.optional(v.string()),
    text: v.optional(v.string()),
    snippet: v.optional(v.string()),
    uploadIds: v.array(v.id("mailUploads")),
    sendAt: v.number(),
  },
  returns: v.id("mailScheduledEmails"),
  handler: async (ctx, args) => {
    const { user } = await requireInboxAccess(ctx, args.inboxId);
    assertSendAt(args.sendAt);
    if (args.threadId) {
      const thread = await ctx.db.get("mailThreads", args.threadId);
      if (!thread || thread.inboxId !== args.inboxId) {
        throw new Error("Thread not found");
      }
    }
    let total = 0;
    for (const uploadId of args.uploadIds) {
      const upload = await ctx.db.get("mailUploads", uploadId);
      if (
        !upload ||
        upload.uploadedBy !== user._id ||
        upload.inboxId !== args.inboxId ||
        upload.scheduledEmailId
      ) {
        throw new Error("Attachment not found. Please attach the file again.");
      }
      total += upload.size;
    }
    if (total > MAIL_ATTACHMENT_LIMIT_BYTES) {
      throw new Error("Attachments can be at most 25 MB in total");
    }
    const scheduledId = await ctx.db.insert("mailScheduledEmails", {
      ...args,
      createdBy: user._id,
      status: "scheduled",
      attempt: 0,
    });
    for (const uploadId of args.uploadIds) {
      await ctx.db.patch("mailUploads", uploadId, { scheduledEmailId: scheduledId });
    }
    const jobId = await ctx.scheduler.runAt(
      args.sendAt,
      internal.mailActions.sendScheduledEmail,
      { scheduledId },
    );
    await ctx.db.patch("mailScheduledEmails", scheduledId, { jobId });
    return scheduledId;
  },
});

/**
 * Marks a due email as sending and returns what the action needs, or null
 * when it was cancelled or rescheduled in the meantime.
 */
export const claimScheduled = internalMutation({
  args: { scheduledId: v.id("mailScheduledEmails") },
  returns: v.union(
    v.null(),
    v.object({
      scheduled: schema.doc("mailScheduledEmails"),
      inbox: schema.doc("mailInboxes"),
      resendThreadId: v.optional(v.string()),
      uploads: v.array(schema.doc("mailUploads")),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("mailScheduledEmails", args.scheduledId);
    if (!row || row.status !== "scheduled" || row.sendAt > Date.now()) {
      return null;
    }
    const fail = async (error: string) => {
      await ctx.db.patch("mailScheduledEmails", row._id, {
        status: "failed",
        error,
        jobId: undefined,
      });
      return null;
    };
    const inbox = await ctx.db.get("mailInboxes", row.inboxId);
    if (!inbox) {
      return await fail("The inbox no longer exists");
    }
    let resendThreadId: string | undefined;
    if (row.threadId) {
      const thread = await ctx.db.get("mailThreads", row.threadId);
      if (!thread) {
        return await fail("The conversation no longer exists");
      }
      resendThreadId = thread.resendThreadId;
    }
    const uploads = [];
    for (const uploadId of row.uploadIds) {
      const upload = await ctx.db.get("mailUploads", uploadId);
      if (!upload) {
        return await fail("An attachment is missing");
      }
      uploads.push(upload);
    }
    await ctx.db.patch("mailScheduledEmails", row._id, {
      status: "sending",
      sendingSince: Date.now(),
      jobId: undefined,
    });
    const scheduled = { ...row, status: "sending" as const };
    return { scheduled, inbox, resendThreadId, uploads };
  },
});

export const finishScheduled = internalMutation({
  args: { scheduledId: v.id("mailScheduledEmails") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("mailScheduledEmails", args.scheduledId);
    if (row) {
      await deleteUploadRows(ctx, row.uploadIds, true);
      await ctx.db.delete("mailScheduledEmails", row._id);
    }
    return null;
  },
});

export const failScheduled = internalMutation({
  args: { scheduledId: v.id("mailScheduledEmails"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("mailScheduledEmails", args.scheduledId);
    if (row && row.status === "sending") {
      await ctx.db.patch("mailScheduledEmails", row._id, {
        status: "failed",
        error: args.error.slice(0, 500),
        sendingSince: undefined,
      });
    }
    return null;
  },
});
