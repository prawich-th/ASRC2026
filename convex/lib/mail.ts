import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "./auth";

/** The shared staff mailboxes. Run `mailActions:ensureInboxes` after editing. */
export const MAIL_INBOXES = [
  {
    address: "academics@cicmasrc.org",
    name: "Academics",
    fromName: "ASRC 2027 Academics",
  },
  { address: "pr@cicmasrc.org", name: "Public Relations", fromName: "ASRC 2027" },
  {
    address: "external@cicmasrc.org",
    name: "External Affairs",
    fromName: "ASRC 2027 External Affairs",
  },
] as const;

export const MAIL_FOLDERS = [
  "inbox",
  "archive",
  "sent",
  "spam",
  "trash",
] as const;
export type MailFolder = (typeof MAIL_FOLDERS)[number];

/** Folders a thread can be moved to; Resend sets "sent" itself. */
export const MAIL_MOVE_FOLDERS = ["inbox", "archive", "spam", "trash"] as const;

/** Resend's limit on the base64 content of all attachments on one email. */
export const MAIL_ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024;

export const mailFolderValidator = v.union(
  v.literal("inbox"),
  v.literal("archive"),
  v.literal("sent"),
  v.literal("spam"),
  v.literal("trash"),
);

export const mailMoveFolderValidator = v.union(
  v.literal("inbox"),
  v.literal("archive"),
  v.literal("spam"),
  v.literal("trash"),
);

export const mailInboxFields = {
  address: v.string(),
  name: v.string(),
  fromName: v.string(),
  resendInboxId: v.string(),
};

export const mailInboxMemberFields = {
  inboxId: v.id("mailInboxes"),
  userId: v.id("users"),
  addedBy: v.id("users"),
  addedAt: v.number(),
};

/** Thread list cache. Resend is the source of truth; webhooks refresh rows. */
export const mailThreadFields = {
  inboxId: v.id("mailInboxes"),
  resendThreadId: v.string(),
  subject: v.string(),
  from: v.string(),
  to: v.array(v.string()),
  snippet: v.optional(v.string()),
  folder: mailFolderValidator,
  read: v.boolean(),
  hasAttachment: v.boolean(),
  emailCount: v.number(),
  lastActivityAt: v.number(),
};

/**
 * Files staged for an outgoing email; deleted once sent or after a day.
 * Files on a scheduled email are kept until it is sent or cancelled.
 */
export const mailUploadFields = {
  storageId: v.id("_storage"),
  inboxId: v.id("mailInboxes"),
  uploadedBy: v.id("users"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  scheduledEmailId: v.optional(v.id("mailScheduledEmails")),
};

/** Scheduled emails can be sent at most this far ahead. */
export const MAIL_SCHEDULE_MAX_AHEAD_MS = 60 * 24 * 60 * 60 * 1000;

/** A "sending" row older than this is treated as failed (the action died). */
export const MAIL_SCHEDULE_STUCK_MS = 15 * 60 * 1000;

export const mailScheduledKindValidator = v.union(
  v.literal("compose"),
  v.literal("reply"),
  v.literal("forward"),
);

export const mailScheduledStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("sending"),
  v.literal("failed"),
);

/**
 * Emails waiting to be sent later. The body is rendered (with signature)
 * when scheduled; the row is deleted once Resend accepts the email.
 */
export const mailScheduledEmailFields = {
  inboxId: v.id("mailInboxes"),
  createdBy: v.id("users"),
  kind: mailScheduledKindValidator,
  /** Reply and forward only. */
  threadId: v.optional(v.id("mailThreads")),
  emailId: v.optional(v.string()),
  replyAll: v.optional(v.boolean()),
  to: v.array(v.string()),
  cc: v.array(v.string()),
  /** The new email's subject, or the thread's for replies and forwards. */
  subject: v.string(),
  html: v.optional(v.string()),
  text: v.optional(v.string()),
  snippet: v.optional(v.string()),
  uploadIds: v.array(v.id("mailUploads")),
  sendAt: v.number(),
  status: mailScheduledStatusValidator,
  /** Bumped on every reschedule so Resend idempotency keys stay unique. */
  attempt: v.number(),
  jobId: v.optional(v.id("_scheduled_functions")),
  sendingSince: v.optional(v.number()),
  error: v.optional(v.string()),
};

export const mailWebhookEventFields = {
  svixId: v.string(),
  receivedAt: v.number(),
};

export const mailThreadSnapshotValidator = v.object({
  subject: v.string(),
  from: v.string(),
  to: v.array(v.string()),
  snippet: v.optional(v.string()),
  folder: mailFolderValidator,
  read: v.boolean(),
  hasAttachment: v.boolean(),
  emailCount: v.number(),
  lastActivityAt: v.number(),
});

const STAFF_ROLES = new Set(["staff", "academic_staff", "super_admin"]);

export function isStaffUser(user: Doc<"users">): boolean {
  return user.role !== undefined && STAFF_ROLES.has(user.role);
}

export async function isInboxMember(
  ctx: QueryCtx | MutationCtx,
  inboxId: Id<"mailInboxes">,
  userId: Id<"users">,
): Promise<boolean> {
  const membership = await ctx.db
    .query("mailInboxMembers")
    .withIndex("by_inboxId_and_userId", (q) =>
      q.eq("inboxId", inboxId).eq("userId", userId),
    )
    .unique();
  return membership !== null;
}

export async function canAccessInbox(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  inboxId: Id<"mailInboxes">,
): Promise<boolean> {
  if (user.role === "super_admin") {
    return true;
  }
  return isStaffUser(user) && (await isInboxMember(ctx, inboxId, user._id));
}

/** Super admins open every inbox; other staff need a membership row. */
export async function requireInboxAccess(
  ctx: QueryCtx | MutationCtx,
  inboxId: Id<"mailInboxes">,
): Promise<{ user: Doc<"users">; inbox: Doc<"mailInboxes"> }> {
  const user = await getCurrentUser(ctx);
  const inbox = await ctx.db.get("mailInboxes", inboxId);
  if (!inbox || !(await canAccessInbox(ctx, user, inboxId))) {
    throw new Error("Unauthorized: no access to this inbox");
  }
  return { user, inbox };
}

export async function removeInboxMemberships(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const memberships = await ctx.db
    .query("mailInboxMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(MAIL_INBOXES.length * 4);
  for (const membership of memberships) {
    await ctx.db.delete("mailInboxMembers", membership._id);
  }
}

export function makeSnippet(text: string | null | undefined): string | undefined {
  if (!text) {
    return undefined;
  }
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > 160 ? `${collapsed.slice(0, 157)}…` : collapsed;
}
