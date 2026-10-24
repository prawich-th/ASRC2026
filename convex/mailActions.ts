import { v } from "convex/values";
import { Resend } from "resend";
import type { InboxMessage, InboxThread } from "resend";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, ActionCtx, internalAction } from "./_generated/server";
import {
  RICH_DOCUMENT_MAX_OPS,
  RichDocumentOp,
  richDocumentToEmailHtml,
  richDocumentToPlainText,
  sanitizeRichDocument,
} from "../lib/richDocument";
import { richDocumentOpValidator } from "./lib/content";
import {
  MAIL_FOLDERS,
  MAIL_INBOXES,
  MailFolder,
  mailMoveFolderValidator,
  makeSnippet,
} from "./lib/mail";
import { withSignature } from "./lib/mailSignature";
import { getResendApiKey } from "./lib/resendKey";

const signatureValidator = v.optional(
  v.union(v.literal("full"), v.literal("compact"), v.literal("none")),
);

const MAX_THREAD_EMAIL_PAGES = 5;

function getResend(): Resend {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured");
  }
  return new Resend(apiKey);
}

type ResendResult<T> = {
  data: T | null;
  error: { message: string; statusCode?: number | null } | null;
};

function unwrap<T>(result: ResendResult<T>, what: string): T {
  if (result.error || result.data === null) {
    console.error(`Resend ${what} failed`, result.error);
    throw new Error(`Could not ${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function toTimestamp(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/**
 * Outgoing bodies arrive as Quill ops and are rendered here, so clients can
 * never send raw HTML from a shared inbox.
 */
function renderBody(ops: RichDocumentOp[]): { html: string; text: string } | null {
  const clean = sanitizeRichDocument(ops);
  if (clean.length > RICH_DOCUMENT_MAX_OPS) {
    throw new Error("This message is too long");
  }
  const text = richDocumentToPlainText(clean);
  if (!text) {
    return null;
  }
  return {
    html: `<div style="font-family:Arial,sans-serif;">${richDocumentToEmailHtml(clean)}</div>`,
    text,
  };
}

function cleanAddresses(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

async function listAllThreadEmails(
  resend: Resend,
  inboxId: string,
  threadId: string,
): Promise<InboxMessage[]> {
  const emails: InboxMessage[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_THREAD_EMAIL_PAGES; page += 1) {
    const result = unwrap(
      await resend.inboxes.threads.emails.list({
        inboxId,
        threadId,
        limit: 100,
        ...(after ? { after } : {}),
      }),
      "list thread emails",
    );
    emails.push(...result.data);
    if (!result.has_more || result.data.length === 0) {
      break;
    }
    after = result.data[result.data.length - 1].id;
  }
  return emails;
}

function snapshotFromEmails(
  summary: { subject: string | null; folder: MailFolder; read: boolean },
  emails: InboxMessage[],
) {
  const last = emails[emails.length - 1];
  const lastInbound = [...emails].reverse().find((e) => e.direction === "inbound");
  return {
    subject: summary.subject || last?.subject || "(no subject)",
    from: lastInbound?.from ?? last?.from ?? "",
    to: last?.to ?? [],
    snippet: makeSnippet(last?.text),
    folder: summary.folder,
    read: summary.read,
    hasAttachment: emails.some((e) => e.attachments.length > 0),
    emailCount: emails.length,
    lastActivityAt: toTimestamp(last?.received_at),
  };
}

/** Pulls one thread from Resend into the cache. */
async function syncThreadFromResend(
  ctx: ActionCtx,
  resend: Resend,
  resendInboxId: string,
  resendThreadId: string,
): Promise<Id<"mailThreads"> | null> {
  const summary = await resend.inboxes.threads.get({
    inboxId: resendInboxId,
    threadId: resendThreadId,
  });
  if (summary.error?.statusCode === 404) {
    return null;
  }
  const thread = unwrap(summary, "get thread");
  const emails = await listAllThreadEmails(resend, resendInboxId, resendThreadId);
  return await ctx.runMutation(internal.mail.upsertThread, {
    resendInboxId,
    resendThreadId,
    snapshot: snapshotFromEmails(thread, emails),
  });
}

function snapshotFromListItem(thread: InboxThread) {
  return {
    subject: thread.subject || "(no subject)",
    from: thread.from ?? "",
    to: thread.to,
    folder: thread.folder,
    read: thread.read,
    hasAttachment: thread.has_attachment,
    emailCount: thread.email_count,
    lastActivityAt: toTimestamp(thread.received_at),
  };
}

/**
 * Pulls the most recently active threads (all folders) into the cache, so
 * lists stay right even when a webhook is missed or not configured.
 */
async function syncRecentThreads(
  ctx: ActionCtx,
  resend: Resend,
  resendInboxId: string,
  limit: number,
): Promise<number> {
  const page = unwrap(
    await resend.inboxes.threads.list({
      inboxId: resendInboxId,
      folders: [...MAIL_FOLDERS],
      limit,
    }),
    "list threads",
  );
  for (const thread of page.data) {
    await ctx.runMutation(internal.mail.upsertThread, {
      resendInboxId,
      resendThreadId: thread.id,
      snapshot: snapshotFromListItem(thread),
    });
  }
  return page.data.length;
}

async function loadAttachments(
  ctx: ActionCtx,
  inboxId: Id<"mailInboxes">,
  uploadIds: Id<"mailUploads">[] | undefined,
) {
  if (!uploadIds || uploadIds.length === 0) {
    return { uploads: [] as Doc<"mailUploads">[], files: [] };
  }
  const uploads = await ctx.runQuery(internal.mail.getUploadsForAction, {
    inboxId,
    uploadIds,
  });
  return { uploads, files: await readUploads(ctx, uploads) };
}

async function readUploads(ctx: ActionCtx, uploads: Doc<"mailUploads">[]) {
  const files = [];
  for (const upload of uploads) {
    const blob = await ctx.storage.get(upload.storageId);
    if (!blob) {
      throw new Error(`Attachment ${upload.filename} is missing. Attach it again.`);
    }
    files.push({
      filename: upload.filename,
      content: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      contentType: upload.contentType,
    });
  }
  return files;
}

async function cleanupUploads(ctx: ActionCtx, uploads: Doc<"mailUploads">[]) {
  if (uploads.length > 0) {
    await ctx.runMutation(internal.mail.deleteUploads, {
      uploadIds: uploads.map((upload) => upload._id),
    });
  }
}

type OutgoingFile = { filename: string; content: string; contentType: string };
type RenderedBody = { html: string; text: string };

async function deliverReply(
  resend: Resend,
  resendInboxId: string,
  resendThreadId: string,
  message: {
    emailId: string;
    body: RenderedBody;
    replyAll: boolean;
    cc: string[];
    files: OutgoingFile[];
  },
  idempotencyKey: string,
) {
  unwrap(
    await resend.inboxes.threads.emails.reply(
      {
        inboxId: resendInboxId,
        threadId: resendThreadId,
        emailId: message.emailId,
        ...message.body,
        replyAll: message.replyAll,
        ...(message.cc.length > 0 ? { cc: message.cc } : {}),
        ...(message.files.length > 0 ? { attachments: message.files } : {}),
      },
      { idempotencyKey },
    ),
    "send reply",
  );
}

async function deliverForward(
  resend: Resend,
  resendInboxId: string,
  resendThreadId: string,
  message: {
    emailId: string;
    to: string[];
    cc: string[];
    body: RenderedBody | null;
    files: OutgoingFile[];
  },
  idempotencyKey: string,
) {
  unwrap(
    await resend.inboxes.threads.emails.forward(
      {
        inboxId: resendInboxId,
        threadId: resendThreadId,
        emailId: message.emailId,
        to: message.to,
        ...(message.cc.length > 0 ? { cc: message.cc } : {}),
        ...(message.body ?? {}),
        ...(message.files.length > 0 ? { attachments: message.files } : {}),
      },
      { idempotencyKey },
    ),
    "forward email",
  );
}

/** Sends a new email through a draft and returns its Resend thread id. */
async function deliverNew(
  resend: Resend,
  resendInboxId: string,
  message: {
    to: string[];
    cc: string[];
    subject: string;
    body: RenderedBody;
    files: OutgoingFile[];
  },
  idempotencyKey: string,
): Promise<string | null> {
  const draft = unwrap(
    await resend.inboxes.drafts.create(
      {
        inboxId: resendInboxId,
        to: message.to,
        ...(message.cc.length > 0 ? { cc: message.cc } : {}),
        subject: message.subject,
        ...message.body,
        ...(message.files.length > 0 ? { attachments: message.files } : {}),
      },
      { idempotencyKey: `mail-draft/${idempotencyKey}` },
    ),
    "create draft",
  );
  unwrap(
    await resend.inboxes.drafts.send(
      { inboxId: resendInboxId, draftId: draft.id },
      { idempotencyKey: `mail-draft-send/${idempotencyKey}` },
    ),
    "send email",
  );
  const sent = await resend.inboxes.drafts.get({
    inboxId: resendInboxId,
    draftId: draft.id,
  });
  return sent.data?.thread_id ?? null;
}

/** Shows the new thread in Sent straight away rather than waiting for the webhook. */
async function syncAfterNew(
  ctx: ActionCtx,
  resend: Resend,
  resendInboxId: string,
  resendThreadId: string | null,
) {
  if (resendThreadId) {
    await syncThreadFromResend(ctx, resend, resendInboxId, resendThreadId);
  } else {
    await syncRecentThreads(ctx, resend, resendInboxId, 10);
  }
}

/** Stores the email for later; attachments stay staged until it goes out. */
async function scheduleEmail(
  ctx: ActionCtx,
  email: {
    inboxId: Id<"mailInboxes">;
    kind: "compose" | "reply" | "forward";
    threadId?: Id<"mailThreads">;
    emailId?: string;
    replyAll?: boolean;
    to: string[];
    cc: string[];
    subject: string;
    body: RenderedBody | null;
    uploadIds: Id<"mailUploads">[] | undefined;
    sendAt: number;
  },
): Promise<Id<"mailScheduledEmails">> {
  const { body, uploadIds, ...rest } = email;
  return await ctx.runMutation(internal.mail.createScheduled, {
    ...rest,
    ...(body ? { html: body.html, text: body.text, snippet: makeSnippet(body.text) } : {}),
    uploadIds: uploadIds ?? [],
  });
}

// ---------------------------------------------------------------------------
// Setup (run with `npx convex run`)

/** Creates the three shared inboxes in Resend if missing and records them. */
export const ensureInboxes = internalAction({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const resend = getResend();
    const ensured: string[] = [];
    for (const definition of MAIL_INBOXES) {
      const existing = await resend.inboxes.get(definition.address);
      let resendInboxId: string;
      if (existing.data) {
        resendInboxId = existing.data.id;
      } else if (existing.error?.statusCode === 404) {
        const created = unwrap(
          await resend.inboxes.create({
            emailAddress: definition.address,
            name: definition.name,
            fromName: definition.fromName,
          }),
          `create inbox ${definition.address}`,
        );
        resendInboxId = created.id;
      } else {
        unwrap(existing, `get inbox ${definition.address}`);
        continue;
      }
      await ctx.runMutation(internal.mail.upsertInbox, {
        address: definition.address,
        name: definition.name,
        fromName: definition.fromName,
        resendInboxId,
      });
      ensured.push(`${definition.address} → ${resendInboxId}`);
    }
    return ensured;
  },
});

/** Copies every existing thread from Resend into the cache. */
export const backfillThreads = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const resend = getResend();
    const inboxes = await ctx.runQuery(internal.mail.listInboxesInternal, {});
    let count = 0;
    for (const inbox of inboxes) {
      let after: string | undefined;
      for (;;) {
        const page = unwrap(
          await resend.inboxes.threads.list({
            inboxId: inbox.resendInboxId,
            folders: [...MAIL_FOLDERS],
            limit: 100,
            ...(after ? { after } : {}),
          }),
          "list threads",
        );
        for (const thread of page.data) {
          await ctx.runMutation(internal.mail.upsertThread, {
            resendInboxId: inbox.resendInboxId,
            resendThreadId: thread.id,
            snapshot: snapshotFromListItem(thread),
          });
          count += 1;
        }
        if (!page.has_more || page.data.length === 0) {
          break;
        }
        after = page.data[page.data.length - 1].id;
      }
    }
    return count;
  },
});

/** Scheduled by the webhook for every inbox thread or email event. */
export const syncThread = internalAction({
  args: { resendInboxId: v.string(), resendThreadId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await syncThreadFromResend(
      ctx,
      getResend(),
      args.resendInboxId,
      args.resendThreadId,
    );
    return null;
  },
});

// ---------------------------------------------------------------------------
// Staff-facing actions

const messageValidator = v.object({
  id: v.string(),
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  from: v.string(),
  to: v.array(v.string()),
  cc: v.array(v.string()),
  replyTo: v.array(v.string()),
  subject: v.union(v.string(), v.null()),
  html: v.union(v.string(), v.null()),
  text: v.union(v.string(), v.null()),
  receivedAt: v.string(),
  attachments: v.array(
    v.object({
      id: v.string(),
      filename: v.union(v.string(), v.null()),
      size: v.union(v.number(), v.null()),
    }),
  ),
});

/** Loads every message of a thread and marks it read. */
export const loadThread = action({
  args: { threadId: v.id("mailThreads") },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const { thread, inbox } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      args,
    );
    const resend = getResend();
    const emails = await listAllThreadEmails(
      resend,
      inbox.resendInboxId,
      thread.resendThreadId,
    );
    if (!thread.read) {
      unwrap(
        await resend.inboxes.threads.update({
          inboxId: inbox.resendInboxId,
          threadId: thread.resendThreadId,
          read: true,
        }),
        "mark thread read",
      );
      await ctx.runMutation(internal.mail.patchThread, {
        threadId: thread._id,
        read: true,
      });
    }
    return emails.map((email) => ({
      id: email.id,
      direction: email.direction,
      from: email.from,
      to: email.to,
      cc: email.cc,
      replyTo: email.reply_to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      receivedAt: email.received_at,
      attachments: email.attachments.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        size: attachment.size,
      })),
    }));
  },
});

/** Fresh signed download URL; these expire, so fetch one per click. */
export const getAttachmentUrl = action({
  args: {
    threadId: v.id("mailThreads"),
    emailId: v.string(),
    attachmentId: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { thread, inbox } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      { threadId: args.threadId },
    );
    const resend = getResend();
    // Only hand out URLs for emails that really belong to this thread.
    const emails = await listAllThreadEmails(
      resend,
      inbox.resendInboxId,
      thread.resendThreadId,
    );
    const email = emails.find((e) => e.id === args.emailId);
    if (!email || !email.attachments.some((a) => a.id === args.attachmentId)) {
      throw new Error("Attachment not found");
    }
    const options = { emailId: args.emailId, id: args.attachmentId };
    const attachment = unwrap(
      email.direction === "inbound"
        ? await resend.emails.receiving.attachments.get(options)
        : await resend.emails.attachments.get(options),
      "get attachment",
    );
    return attachment.download_url;
  },
});

const sendAtValidator = v.optional(v.number());

export const reply = action({
  args: {
    threadId: v.id("mailThreads"),
    emailId: v.string(),
    body: v.array(richDocumentOpValidator),
    replyAll: v.boolean(),
    cc: v.optional(v.array(v.string())),
    uploadIds: v.optional(v.array(v.id("mailUploads"))),
    signature: signatureValidator,
    requestId: v.string(),
    /** Send later at this time instead of now. */
    sendAt: sendAtValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { thread, inbox, sender } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      { threadId: args.threadId },
    );
    const message = renderBody(args.body);
    if (!message) {
      throw new Error("Write a message before sending");
    }
    const body = withSignature(
      message,
      { ...sender, email: inbox.address },
      args.signature ?? "compact",
    );
    const cc = cleanAddresses(args.cc ?? []);
    if (args.sendAt !== undefined) {
      await scheduleEmail(ctx, {
        inboxId: inbox._id,
        kind: "reply",
        threadId: thread._id,
        emailId: args.emailId,
        replyAll: args.replyAll,
        to: [],
        cc,
        subject: thread.subject,
        body,
        uploadIds: args.uploadIds,
        sendAt: args.sendAt,
      });
      return null;
    }
    const { uploads, files } = await loadAttachments(ctx, inbox._id, args.uploadIds);
    const resend = getResend();
    await deliverReply(
      resend,
      inbox.resendInboxId,
      thread.resendThreadId,
      { emailId: args.emailId, body, replyAll: args.replyAll, cc, files },
      `mail-reply/${args.requestId}`,
    );
    await cleanupUploads(ctx, uploads);
    await syncThreadFromResend(ctx, resend, inbox.resendInboxId, thread.resendThreadId);
    return null;
  },
});

export const forward = action({
  args: {
    threadId: v.id("mailThreads"),
    emailId: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    body: v.array(richDocumentOpValidator),
    uploadIds: v.optional(v.array(v.id("mailUploads"))),
    signature: signatureValidator,
    requestId: v.string(),
    sendAt: sendAtValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { thread, inbox, sender } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      { threadId: args.threadId },
    );
    const body = withSignature(
      renderBody(args.body),
      { ...sender, email: inbox.address },
      args.signature ?? "full",
    );
    const to = cleanAddresses(args.to);
    if (to.length === 0) {
      throw new Error("Add at least one recipient");
    }
    const cc = cleanAddresses(args.cc ?? []);
    if (args.sendAt !== undefined) {
      await scheduleEmail(ctx, {
        inboxId: inbox._id,
        kind: "forward",
        threadId: thread._id,
        emailId: args.emailId,
        to,
        cc,
        subject: thread.subject,
        body,
        uploadIds: args.uploadIds,
        sendAt: args.sendAt,
      });
      return null;
    }
    const { uploads, files } = await loadAttachments(ctx, inbox._id, args.uploadIds);
    const resend = getResend();
    await deliverForward(
      resend,
      inbox.resendInboxId,
      thread.resendThreadId,
      { emailId: args.emailId, to, cc, body, files },
      `mail-forward/${args.requestId}`,
    );
    await cleanupUploads(ctx, uploads);
    await syncThreadFromResend(ctx, resend, inbox.resendInboxId, thread.resendThreadId);
    return null;
  },
});

/** Starts a new thread. The cache row arrives via the webhook. */
export const compose = action({
  args: {
    inboxId: v.id("mailInboxes"),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.array(richDocumentOpValidator),
    uploadIds: v.optional(v.array(v.id("mailUploads"))),
    signature: signatureValidator,
    requestId: v.string(),
    sendAt: sendAtValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { inbox, sender } = await ctx.runQuery(
      internal.mail.getInboxForAction,
      { inboxId: args.inboxId },
    );
    const to = cleanAddresses(args.to);
    if (to.length === 0) {
      throw new Error("Add at least one recipient");
    }
    const message = renderBody(args.body);
    const subject = args.subject.trim();
    if (!subject || !message) {
      throw new Error("Add a subject and a message");
    }
    const body = withSignature(
      message,
      { ...sender, email: inbox.address },
      args.signature ?? "full",
    );
    const cc = cleanAddresses(args.cc ?? []);
    if (args.sendAt !== undefined) {
      await scheduleEmail(ctx, {
        inboxId: inbox._id,
        kind: "compose",
        to,
        cc,
        subject,
        body,
        uploadIds: args.uploadIds,
        sendAt: args.sendAt,
      });
      return null;
    }
    const { uploads, files } = await loadAttachments(ctx, inbox._id, args.uploadIds);
    const resend = getResend();
    const resendThreadId = await deliverNew(
      resend,
      inbox.resendInboxId,
      { to, cc, subject, body, files },
      args.requestId,
    );
    await cleanupUploads(ctx, uploads);
    await syncAfterNew(ctx, resend, inbox.resendInboxId, resendThreadId);
    return null;
  },
});

/** Runs at the scheduled time; failures are kept on the row for staff to retry. */
export const sendScheduledEmail = internalAction({
  args: { scheduledId: v.id("mailScheduledEmails") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.mail.claimScheduled, args);
    if (!claimed) {
      return null;
    }
    const { scheduled, inbox, resendThreadId, uploads } = claimed;
    const key = `mail-scheduled/${scheduled._id}/${scheduled.attempt}`;
    const body =
      scheduled.html !== undefined && scheduled.text !== undefined
        ? { html: scheduled.html, text: scheduled.text }
        : null;
    // Once finishScheduled has run, a later error can't mark the row failed.
    try {
      const resend = getResend();
      const files = await readUploads(ctx, uploads);
      if (scheduled.kind === "compose") {
        if (!body) {
          throw new Error("The message is empty");
        }
        const threadId = await deliverNew(
          resend,
          inbox.resendInboxId,
          { to: scheduled.to, cc: scheduled.cc, subject: scheduled.subject, body, files },
          key,
        );
        await ctx.runMutation(internal.mail.finishScheduled, args);
        await syncAfterNew(ctx, resend, inbox.resendInboxId, threadId);
        return null;
      }
      if (!resendThreadId || !scheduled.emailId) {
        throw new Error("The conversation no longer exists");
      }
      if (scheduled.kind === "reply") {
        if (!body) {
          throw new Error("The message is empty");
        }
        await deliverReply(
          resend,
          inbox.resendInboxId,
          resendThreadId,
          {
            emailId: scheduled.emailId,
            body,
            replyAll: scheduled.replyAll ?? false,
            cc: scheduled.cc,
            files,
          },
          key,
        );
      } else {
        await deliverForward(
          resend,
          inbox.resendInboxId,
          resendThreadId,
          { emailId: scheduled.emailId, to: scheduled.to, cc: scheduled.cc, body, files },
          key,
        );
      }
      await ctx.runMutation(internal.mail.finishScheduled, args);
      await syncThreadFromResend(ctx, resend, inbox.resendInboxId, resendThreadId);
    } catch (caught) {
      await ctx.runMutation(internal.mail.failScheduled, {
        scheduledId: scheduled._id,
        error: caught instanceof Error ? caught.message : "Could not send the email",
      });
    }
    return null;
  },
});

/** Refreshes the cache for an inbox from Resend; the mail page calls this on open. */
export const refreshInbox = action({
  args: { inboxId: v.id("mailInboxes") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const { inbox } = await ctx.runQuery(internal.mail.getInboxForAction, args);
    return await syncRecentThreads(ctx, getResend(), inbox.resendInboxId, 50);
  },
});

export const moveThread = action({
  args: { threadId: v.id("mailThreads"), folder: mailMoveFolderValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { thread, inbox } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      { threadId: args.threadId },
    );
    unwrap(
      await getResend().inboxes.threads.update({
        inboxId: inbox.resendInboxId,
        threadId: thread.resendThreadId,
        folder: args.folder,
      }),
      "move thread",
    );
    await ctx.runMutation(internal.mail.patchThread, {
      threadId: thread._id,
      folder: args.folder,
    });
    return null;
  },
});

export const setRead = action({
  args: { threadId: v.id("mailThreads"), read: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { thread, inbox } = await ctx.runQuery(
      internal.mail.getThreadForAction,
      { threadId: args.threadId },
    );
    unwrap(
      await getResend().inboxes.threads.update({
        inboxId: inbox.resendInboxId,
        threadId: thread.resendThreadId,
        read: args.read,
      }),
      "update read state",
    );
    await ctx.runMutation(internal.mail.patchThread, {
      threadId: thread._id,
      read: args.read,
    });
    return null;
  },
});
