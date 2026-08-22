import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import {
  abstractCategoryValidator,
  abstractDetailValidator,
  abstractFileValidator,
  abstractFileWithUrlValidator,
  abstractSummaryValidator,
  abstractValidator,
  adminAbstractDetailValidator,
  adminAbstractSummaryValidator,
  adminAbstractValidator,
} from "./lib/abstract";
import { getCurrentUser, requireRole } from "./lib/auth";
import {
  abstractDecisionEmail,
  abstractSubmissionEmail,
} from "./lib/emailTemplates";
import {
  getSiteUrl,
  queueTransactionalEmail,
} from "./notifications";

type StorageMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
};

const ABSTRACT_CODE_PATTERN = /^\d{6}$/;
const ABSTRACT_CODE_ATTEMPTS = 20;

function isAbstractCode(value: string | undefined): value is string {
  return typeof value === "string" && ABSTRACT_CODE_PATTERN.test(value);
}

async function allocateAbstractCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < ABSTRACT_CODE_ATTEMPTS; attempt++) {
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const existing = await ctx.db
      .query("abstracts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) {
      return code;
    }
  }
  throw new Error("Could not allocate a unique abstract code");
}

async function ensureAbstractCode(
  ctx: MutationCtx,
  abstract: Doc<"abstracts">,
): Promise<string> {
  if (isAbstractCode(abstract.code)) {
    return abstract.code;
  }
  const code = await allocateAbstractCode(ctx);
  await ctx.db.patch("abstracts", abstract._id, { code });
  return code;
}

function toOwnerAbstract(abstract: Doc<"abstracts">) {
  return {
    _id: abstract._id,
    _creationTime: abstract._creationTime,
    ownerId: abstract.ownerId,
    code: abstract.code ?? "",
    title: abstract.title,
    body: abstract.body,
    keywords: abstract.keywords,
    category: abstract.category,
    affiliation: abstract.affiliation,
    affiliationDeclared: abstract.affiliationDeclared,
    status: abstract.status,
    submittedAt: abstract.submittedAt,
    updatedAt: abstract.updatedAt,
    submitterFeedback: abstract.submitterFeedback,
    reviewedAt: abstract.reviewedAt,
  };
}

function toAbstractOwner(user: Doc<"users">) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    institution: user.institution,
  };
}

function normalizeKeywords(keywords: string[]): string[] {
  return keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .slice(0, 20);
}

function canOwnerEdit(status: Doc<"abstracts">["status"]): boolean {
  return status === "draft" || status === "revision_requested";
}

async function getOwnedAbstractOrThrow(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  abstractId: Id<"abstracts">,
) {
  const abstract = await ctx.db.get("abstracts", abstractId);
  if (!abstract || abstract.ownerId !== userId) {
    throw new Error("Abstract not found");
  }
  return abstract;
}

async function getAbstractFilesWithUrls(
  ctx: QueryCtx,
  abstractId: Id<"abstracts">,
) {
  const files = await ctx.db
    .query("abstractFiles")
    .withIndex("by_abstractId", (q) => q.eq("abstractId", abstractId))
    .order("desc")
    .take(100);

  return await Promise.all(
    files.map(async (file) => ({
      ...file,
      url: await ctx.storage.getUrl(file.storageId),
    })),
  );
}

export const listMine = query({
  args: {},
  returns: v.array(abstractSummaryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const abstracts = await ctx.db
      .query("abstracts")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(100);

    return abstracts.map((item) => ({
      _id: item._id,
      _creationTime: item._creationTime,
      code: item.code ?? "",
      title: item.title,
      keywords: item.keywords,
      category: item.category,
      status: item.status,
      updatedAt: item.updatedAt,
      submittedAt: item.submittedAt,
      submitterFeedback: item.submitterFeedback,
      reviewedAt: item.reviewedAt,
    }));
  },
});

export const getMineById = query({
  args: { abstractId: v.id("abstracts") },
  returns: v.union(abstractDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await ctx.db.get("abstracts", args.abstractId);
    if (!abstract || abstract.ownerId !== user._id) {
      return null;
    }

    const files = await getAbstractFilesWithUrls(ctx, abstract._id);
    return { abstract: toOwnerAbstract(abstract), files };
  },
});

export const listFilesForAbstract = query({
  args: { abstractId: v.id("abstracts") },
  returns: v.array(abstractFileWithUrlValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);
    return await getAbstractFilesWithUrls(ctx, args.abstractId);
  },
});

export const createDraft = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    keywords: v.array(v.string()),
    category: abstractCategoryValidator,
    affiliation: v.string(),
    affiliationDeclared: v.boolean(),
  },
  returns: abstractValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const keywords = normalizeKeywords(args.keywords);
    const now = Date.now();
    const abstractId = await ctx.db.insert("abstracts", {
      ownerId: user._id,
      code: await allocateAbstractCode(ctx),
      title: args.title.trim(),
      body: args.body.trim(),
      keywords,
      category: args.category,
      affiliation: args.affiliation.trim(),
      affiliationDeclared: args.affiliationDeclared,
      status: "draft",
      updatedAt: now,
    });

    const abstract = await ctx.db.get("abstracts", abstractId);
    if (!abstract) {
      throw new Error("Could not create abstract");
    }

    return toOwnerAbstract(abstract);
  },
});

export const updateDraft = mutation({
  args: {
    abstractId: v.id("abstracts"),
    title: v.string(),
    body: v.string(),
    keywords: v.array(v.string()),
    category: abstractCategoryValidator,
    affiliation: v.string(),
    affiliationDeclared: v.boolean(),
  },
  returns: abstractValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);
    if (!canOwnerEdit(abstract.status)) {
      throw new Error("Only drafts or revision requests can be edited");
    }

    await ctx.db.patch("abstracts", abstract._id, {
      title: args.title.trim(),
      body: args.body.trim(),
      keywords: normalizeKeywords(args.keywords),
      category: args.category,
      affiliation: args.affiliation.trim(),
      affiliationDeclared: args.affiliationDeclared,
      updatedAt: Date.now(),
    });

    const updatedAbstract = await ctx.db.get("abstracts", abstract._id);
    if (!updatedAbstract) {
      throw new Error("Could not update abstract");
    }

    return toOwnerAbstract(updatedAbstract);
  },
});

export const submitDraft = mutation({
  args: { abstractId: v.id("abstracts") },
  returns: abstractValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);

    if (!canOwnerEdit(abstract.status)) {
      throw new Error("Only drafts or revision requests can be submitted");
    }
    if (!abstract.title.trim() || !abstract.body.trim()) {
      throw new Error("Please complete all required abstract fields");
    }
    if (!abstract.affiliationDeclared) {
      throw new Error("Please declare your affiliation before submission");
    }

    const now = Date.now();
    const code = await ensureAbstractCode(ctx, abstract);
    await ctx.db.patch("abstracts", abstract._id, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });

    const submittedAbstract = await ctx.db.get("abstracts", abstract._id);
    if (!submittedAbstract) {
      throw new Error("Could not submit abstract");
    }
    await queueTransactionalEmail(
      ctx,
      user.email,
      abstractSubmissionEmail({
        title: submittedAbstract.title,
        submissionId: code,
        submittedAt: now,
        resubmission: abstract.status === "revision_requested",
        url: getSiteUrl(`/abstracts/${submittedAbstract._id}`),
      }),
    );
    return toOwnerAbstract(submittedAbstract);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachUploadedFile = mutation({
  args: {
    abstractId: v.id("abstracts"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: abstractFileValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);
    if (!canOwnerEdit(abstract.status)) {
      throw new Error("Files can only be uploaded while an abstract is editable");
    }

    const metadata = await ctx.db.system.get(
      "_storage",
      args.storageId,
    ) as StorageMetadata | null;
    if (!metadata) {
      throw new Error("Uploaded file was not found");
    }

    const fileId = await ctx.db.insert("abstractFiles", {
      ownerId: user._id,
      abstractId: args.abstractId,
      storageId: args.storageId,
      fileName: args.fileName.trim(),
      contentType: metadata.contentType,
      size: metadata.size,
      uploadedAt: Date.now(),
    });

    const file = await ctx.db.get("abstractFiles", fileId);
    if (!file) {
      throw new Error("Could not save file");
    }
    return file;
  },
});

export const removeFile = mutation({
  args: { fileId: v.id("abstractFiles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const file = await ctx.db.get("abstractFiles", args.fileId);
    if (!file || file.ownerId !== user._id) {
      throw new Error("File not found");
    }

    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, file.abstractId);
    if (!canOwnerEdit(abstract.status)) {
      throw new Error("Files can only be removed while an abstract is editable");
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete("abstractFiles", file._id);
    return null;
  },
});

export const listForReview = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("submitted"),
        v.literal("revision_requested"),
        v.literal("selected"),
        v.literal("rejected"),
      ),
    ),
  },
  returns: paginationResultValidator(adminAbstractSummaryValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academic_staff"]);
    const status = args.status;
    const result =
      status === undefined
        ? await ctx.db
            .query("abstracts")
            .withIndex("by_status_and_submittedAt", (q) =>
              q.gt("status", "draft"),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("abstracts")
            .withIndex("by_status_and_submittedAt", (q) =>
              q.eq("status", status),
            )
            .order("desc")
            .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (abstract) => {
        const owner = await ctx.db.get("users", abstract.ownerId);
        if (!owner) {
          throw new Error("Abstract owner not found");
        }
        return {
          abstract: {
            _id: abstract._id,
            _creationTime: abstract._creationTime,
            code: abstract.code ?? "",
            title: abstract.title,
            category: abstract.category,
            status: abstract.status,
            submittedAt: abstract.submittedAt,
            updatedAt: abstract.updatedAt,
            reviewedAt: abstract.reviewedAt,
          },
          owner: toAbstractOwner(owner),
        };
      }),
    );
    return { ...result, page };
  },
});

export const getForReview = query({
  args: { abstractId: v.id("abstracts") },
  returns: v.union(adminAbstractDetailValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academic_staff"]);
    const abstract = await ctx.db.get("abstracts", args.abstractId);
    if (!abstract || abstract.status === "draft") {
      return null;
    }
    const owner = await ctx.db.get("users", abstract.ownerId);
    if (!owner) {
      throw new Error("Abstract owner not found");
    }
    const files = await getAbstractFilesWithUrls(ctx, abstract._id);
    return { abstract, owner: toAbstractOwner(owner), files };
  },
});

export const saveReview = mutation({
  args: {
    abstractId: v.id("abstracts"),
    privateNotes: v.optional(v.string()),
    submitterFeedback: v.optional(v.string()),
    decision: v.optional(
      v.union(
        v.literal("selected"),
        v.literal("rejected"),
        v.literal("revision_requested"),
      ),
    ),
  },
  returns: adminAbstractValidator,
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["academic_staff"]);
    const abstract = await ctx.db.get("abstracts", args.abstractId);
    if (!abstract) {
      throw new Error("Abstract not found");
    }
    if (abstract.status === "draft") {
      throw new Error("Draft abstracts cannot be reviewed");
    }
    if (args.decision !== undefined && abstract.status !== "submitted") {
      throw new Error("Only submitted abstracts can receive a review decision");
    }

    const privateNotes = args.privateNotes?.trim() || undefined;
    const submitterFeedback = args.submitterFeedback?.trim() || undefined;
    if (args.decision === "revision_requested" && !submitterFeedback) {
      throw new Error("Submitter feedback is required when requesting revisions");
    }
    const now = Date.now();
    const code = await ensureAbstractCode(ctx, abstract);
    await ctx.db.patch("abstracts", abstract._id, {
      privateNotes,
      submitterFeedback,
      status: args.decision ?? abstract.status,
      reviewedBy: reviewer._id,
      reviewedAt: now,
      updatedAt: now,
    });
    const updated = await ctx.db.get("abstracts", abstract._id);
    if (!updated) {
      throw new Error("Could not save abstract review");
    }
    if (args.decision !== undefined) {
      const owner = await ctx.db.get("users", abstract.ownerId);
      await queueTransactionalEmail(
        ctx,
        owner?.email,
        abstractDecisionEmail({
          decision: args.decision,
          title: updated.title,
          submissionId: code,
          feedback: updated.submitterFeedback,
          url: getSiteUrl(`/abstracts/${updated._id}`),
        }),
      );
    }
    return updated;
  },
});

export const backfillAbstractCodes = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("abstracts").paginate({
      cursor: args.cursor,
      numItems: 100,
    });
    for (const abstract of page.page) {
      if (isAbstractCode(abstract.code)) {
        continue;
      }
      await ctx.db.patch("abstracts", abstract._id, {
        code: await allocateAbstractCode(ctx),
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.abstracts.backfillAbstractCodes, {
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
