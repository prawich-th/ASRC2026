import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { Infer, v } from "convex/values";
import {
  formatStudyType,
  getAbstractProblems,
  isAllowedSupportingFile,
  MAX_STUDY_TYPE_OTHER_LENGTH,
  MAX_SUPPORTING_FILE_BYTES,
  MAX_SUPPORTING_FILES,
  MAX_ABSTRACT_AUTHORS,
  MAX_ABSTRACT_KEYWORDS,
  MAX_ABSTRACT_TITLE_LENGTH,
  normalizeKeywords,
} from "../lib/abstractForm";
import { formatAffiliation } from "../lib/affiliation";
import {
  ABSTRACT_DRAFT_WORD_CEILING,
  ABSTRACT_WORD_LIMIT,
  countWords,
  RICH_TEXT_MAX_OPS,
  richTextToPlainText,
  sanitizeRichTextOps,
} from "../lib/richText";
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
  abstractAuthorValidator,
  abstractCategoryValidator,
  abstractDetailValidator,
  abstractListFiltersValidator,
  abstractStudyTypeValidator,
  abstractSummaryValidator,
  abstractValidator,
  adminAbstractDetailValidator,
  adminAbstractSummaryValidator,
  adminAbstractValidator,
  richTextOpValidator,
} from "./lib/abstract";
import { requireAffiliation, resolveAffiliation } from "./lib/affiliation";
import { getCurrentUser, requireRole } from "./lib/auth";
import {
  abstractDecisionEmail,
  abstractSubmissionEmail,
} from "./lib/emailTemplates";
import {
  getSiteUrl,
  queueTransactionalEmail,
} from "./notifications";

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

/** Rebuilds the denormalized text the staff search index matches against. */
async function refreshSearchText(
  ctx: MutationCtx,
  abstractId: Id<"abstracts">,
) {
  const abstract = await ctx.db.get("abstracts", abstractId);
  if (!abstract) {
    return;
  }
  const owner = await ctx.db.get("users", abstract.ownerId);
  const affiliationIds = new Set(
    [
      ...(abstract.authorList ?? []).map((author) => author.affiliationId),
      abstract.advisorAffiliationId,
    ].filter((id): id is Id<"affiliations"> => id !== undefined),
  );
  const affiliations = await Promise.all(
    [...affiliationIds].map((id) => resolveAffiliation(ctx, id)),
  );
  const searchText = [
    abstract.code,
    abstract.title,
    formatStudyType(abstract.studyType, abstract.studyTypeOther),
    ...abstract.keywords,
    ...(abstract.authorList ?? []).map((author) => author.name),
    abstract.advisor,
    abstract.authors,
    abstract.affiliation,
    ...affiliations.map((affiliation) => formatAffiliation(affiliation)),
    owner?.name,
    owner?.email,
    owner?.institution,
  ]
    .map((value) => value?.replace(/\s+/g, " ").trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
  if (searchText !== abstract.searchText) {
    await ctx.db.patch("abstracts", abstract._id, { searchText });
  }
}

function toOwnerAbstract(abstract: Doc<"abstracts">) {
  return {
    _id: abstract._id,
    _creationTime: abstract._creationTime,
    ownerId: abstract.ownerId,
    code: abstract.code ?? "",
    title: abstract.title,
    studyType: abstract.studyType,
    studyTypeOther: abstract.studyTypeOther,
    authorList: abstract.authorList,
    advisor: abstract.advisor,
    advisorAffiliationId: abstract.advisorAffiliationId,
    bodyRich: abstract.bodyRich,
    body: abstract.body,
    keywords: abstract.keywords,
    category: abstract.category,
    affiliationDeclared: abstract.affiliationDeclared,
    authors: abstract.authors,
    affiliation: abstract.affiliation,
    status: abstract.status,
    submittedAt: abstract.submittedAt,
    updatedAt: abstract.updatedAt,
    submitterFeedback: abstract.submitterFeedback,
    reviewedAt: abstract.reviewedAt,
  };
}

/**
 * Rewrites affiliation references to their surviving (post-merge) records
 * and returns the referenced affiliations for display.
 */
async function withAffiliations(
  ctx: QueryCtx,
  abstract: Doc<"abstracts">,
): Promise<{ abstract: Doc<"abstracts">; affiliations: Doc<"affiliations">[] }> {
  const resolved = new Map<Id<"affiliations">, Doc<"affiliations"> | null>();
  async function resolve(id: Id<"affiliations"> | undefined) {
    if (!id) return undefined;
    if (!resolved.has(id)) {
      resolved.set(id, await resolveAffiliation(ctx, id));
    }
    return resolved.get(id)?._id;
  }

  const authorList = abstract.authorList
    ? await Promise.all(
        abstract.authorList.map(async (author) => ({
          ...author,
          affiliationId: await resolve(author.affiliationId),
        })),
      )
    : undefined;
  const advisorAffiliationId = await resolve(abstract.advisorAffiliationId);

  const affiliations = new Map<Id<"affiliations">, Doc<"affiliations">>();
  for (const affiliation of resolved.values()) {
    if (affiliation) affiliations.set(affiliation._id, affiliation);
  }
  return {
    abstract: { ...abstract, authorList, advisorAffiliationId },
    affiliations: [...affiliations.values()],
  };
}

const draftValidator = v.object({
  title: v.string(),
  studyType: v.optional(abstractStudyTypeValidator),
  studyTypeOther: v.optional(v.string()),
  authorList: v.array(abstractAuthorValidator),
  advisor: v.string(),
  advisorAffiliationId: v.optional(v.id("affiliations")),
  bodyRich: v.array(richTextOpValidator),
  keywords: v.array(v.string()),
  affiliationDeclared: v.boolean(),
});
type DraftArgs = Infer<typeof draftValidator>;

/** Validates and normalizes editor input. Incomplete drafts are allowed. */
async function normalizeDraft(ctx: MutationCtx, args: DraftArgs) {
  const title = args.title.replace(/\s+/g, " ").trim();
  if (title.length > MAX_ABSTRACT_TITLE_LENGTH) {
    throw new Error(
      `The title must be at most ${MAX_ABSTRACT_TITLE_LENGTH} characters`,
    );
  }

  const studyType = args.studyType;
  const studyTypeOther =
    studyType === "other"
      ? args.studyTypeOther?.replace(/\s+/g, " ").trim() || undefined
      : undefined;
  if ((studyTypeOther?.length ?? 0) > MAX_STUDY_TYPE_OTHER_LENGTH) {
    throw new Error(
      `The study type must be at most ${MAX_STUDY_TYPE_OTHER_LENGTH} characters`,
    );
  }

  const rows = args.authorList.filter(
    (author) => author.name.trim() || author.affiliationId,
  );
  if (rows.length > MAX_ABSTRACT_AUTHORS) {
    throw new Error(`An abstract can list at most ${MAX_ABSTRACT_AUTHORS} authors`);
  }
  let presentingAssigned = false;
  const authorList = [];
  for (const author of rows) {
    const name = author.name.replace(/\s+/g, " ").trim();
    if (name.length > 200) {
      throw new Error("Author names must be at most 200 characters");
    }
    const presenting: boolean = author.presenting && !presentingAssigned;
    presentingAssigned ||= presenting;
    authorList.push({
      name,
      affiliationId: author.affiliationId
        ? (await requireAffiliation(ctx, author.affiliationId))._id
        : undefined,
      presenting,
    });
  }

  const advisor = args.advisor.replace(/\s+/g, " ").trim();
  if (advisor.length > 200) {
    throw new Error("The advisor name must be at most 200 characters");
  }
  const advisorAffiliationId = args.advisorAffiliationId
    ? (await requireAffiliation(ctx, args.advisorAffiliationId))._id
    : undefined;

  const bodyRich = sanitizeRichTextOps(args.bodyRich);
  if (bodyRich.length > RICH_TEXT_MAX_OPS) {
    throw new Error("The abstract has too much formatting to save");
  }
  const body = richTextToPlainText(bodyRich);
  if (countWords(body) > ABSTRACT_DRAFT_WORD_CEILING) {
    throw new Error(
      `The abstract is far over the ${ABSTRACT_WORD_LIMIT}-word limit`,
    );
  }

  const keywords = normalizeKeywords(args.keywords);
  if (keywords.length > MAX_ABSTRACT_KEYWORDS) {
    throw new Error(`Use at most ${MAX_ABSTRACT_KEYWORDS} keywords`);
  }
  if (keywords.some((keyword) => keyword.length > 60)) {
    throw new Error("Keywords must be at most 60 characters each");
  }

  return {
    title,
    studyType,
    studyTypeOther,
    authorList,
    advisor,
    advisorAffiliationId,
    bodyRich,
    body,
    keywords,
    affiliationDeclared: args.affiliationDeclared,
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
    const resolved = await withAffiliations(ctx, abstract);
    return {
      abstract: toOwnerAbstract(resolved.abstract),
      affiliations: resolved.affiliations,
      files,
    };
  },
});

export const createDraft = mutation({
  args: draftValidator.fields,
  returns: abstractValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const draft = await normalizeDraft(ctx, args);
    const abstractId = await ctx.db.insert("abstracts", {
      ownerId: user._id,
      code: await allocateAbstractCode(ctx),
      ...draft,
      status: "draft",
      updatedAt: Date.now(),
    });
    await refreshSearchText(ctx, abstractId);

    const abstract = await ctx.db.get("abstracts", abstractId);
    if (!abstract) {
      throw new Error("Could not create abstract");
    }

    return toOwnerAbstract(abstract);
  },
});

export const updateDraft = mutation({
  args: { abstractId: v.id("abstracts"), ...draftValidator.fields },
  returns: abstractValidator,
  handler: async (ctx, { abstractId, ...args }) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, abstractId);
    if (!canOwnerEdit(abstract.status)) {
      throw new Error("Only drafts or revision requests can be edited");
    }

    await ctx.db.patch("abstracts", abstract._id, {
      ...(await normalizeDraft(ctx, args)),
      updatedAt: Date.now(),
    });
    await refreshSearchText(ctx, abstract._id);

    const updatedAbstract = await ctx.db.get("abstracts", abstract._id);
    if (!updatedAbstract) {
      throw new Error("Could not update abstract");
    }

    return toOwnerAbstract(updatedAbstract);
  },
});

export const deleteDraft = mutation({
  args: { abstractId: v.id("abstracts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);
    if (abstract.status !== "draft") {
      throw new Error("Only unsubmitted drafts can be deleted");
    }
    const files = await ctx.db
      .query("abstractFiles")
      .withIndex("by_abstractId", (q) => q.eq("abstractId", abstract._id))
      .take(100);
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete("abstractFiles", file._id);
    }
    await ctx.db.delete("abstracts", abstract._id);
    return null;
  },
});

export const generateSupportingFileUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Attaches an uploaded file as optional supporting material. */
export const addSupportingFile = mutation({
  args: {
    abstractId: v.id("abstracts"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.id("abstractFiles"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const abstract = await getOwnedAbstractOrThrow(ctx, user._id, args.abstractId);
    const discard = async (message: string): Promise<never> => {
      await ctx.storage.delete(args.storageId);
      throw new Error(message);
    };
    if (!canOwnerEdit(abstract.status)) {
      return await discard(
        "Supporting material can only change while the abstract is editable",
      );
    }
    const fileName = args.fileName.trim().slice(0, 200);
    if (!fileName || !isAllowedSupportingFile(fileName)) {
      return await discard("This file type is not accepted");
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded file was not found");
    }
    if (metadata.size > MAX_SUPPORTING_FILE_BYTES) {
      return await discard(
        `Files must be smaller than ${MAX_SUPPORTING_FILE_BYTES / 1024 / 1024} MB`,
      );
    }
    const existing = await ctx.db
      .query("abstractFiles")
      .withIndex("by_abstractId", (q) => q.eq("abstractId", abstract._id))
      .take(100);
    if (
      existing.filter((file) => file.kind === "supplementary").length >=
      MAX_SUPPORTING_FILES
    ) {
      return await discard(
        `You can attach at most ${MAX_SUPPORTING_FILES} supporting files`,
      );
    }
    return await ctx.db.insert("abstractFiles", {
      ownerId: user._id,
      abstractId: abstract._id,
      storageId: args.storageId,
      fileName,
      kind: "supplementary",
      contentType: metadata.contentType,
      size: metadata.size,
      uploadedAt: Date.now(),
    });
  },
});

export const removeSupportingFile = mutation({
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
      throw new Error(
        "Supporting material can only change while the abstract is editable",
      );
    }
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete("abstractFiles", file._id);
    return null;
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
    const authorList = abstract.authorList ?? [];
    const problems = getAbstractProblems({
      title: abstract.title,
      studyType: abstract.studyType,
      studyTypeOther: abstract.studyTypeOther,
      authorList,
      advisor: abstract.advisor ?? "",
      advisorAffiliationId: abstract.advisorAffiliationId,
      bodyText: abstract.body,
      keywords: abstract.keywords,
      affiliationDeclared: abstract.affiliationDeclared,
    });
    if (problems.length > 0) {
      throw new Error(problems.map((problem) => problem.message).join(" "));
    }
    for (const affiliationId of [
      ...authorList.map((author) => author.affiliationId),
      abstract.advisorAffiliationId,
    ]) {
      if (affiliationId) {
        await requireAffiliation(ctx, affiliationId);
      }
    }

    const now = Date.now();
    const code = await ensureAbstractCode(ctx, abstract);
    await ctx.db.patch("abstracts", abstract._id, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });
    // The submitter's profile may have changed since the draft was saved.
    await refreshSearchText(ctx, abstract._id);

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

export const listForReview = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ...abstractListFiltersValidator.fields,
  },
  returns: paginationResultValidator(adminAbstractSummaryValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academic_staff"]);
    const { status, submittedFrom: from, submittedTo: to } = args;
    const category = args.category === "none" ? undefined : args.category;
    const hasCategory = args.category !== undefined;
    const order = args.order === "oldest" ? "asc" : "desc";
    const search = args.search?.trim();

    const abstracts = ctx.db.query("abstracts");
    const indexed =
      search && isAbstractCode(search)
        ? abstracts.withIndex("by_code", (q) => q.eq("code", search))
        : search
          ? abstracts.withSearchIndex("search_text", (q) => {
              let query = q.search("searchText", search);
              if (status !== undefined) query = query.eq("status", status);
              if (category !== undefined) {
                query = query.eq("category", category);
              }
              return query;
            })
          : status !== undefined
            ? abstracts
                .withIndex("by_status_and_submittedAt", (q) => {
                  const byStatus = q.eq("status", status);
                  if (from === undefined) {
                    return to === undefined
                      ? byStatus
                      : byStatus.lt("submittedAt", to);
                  }
                  const lower = byStatus.gte("submittedAt", from);
                  return to === undefined
                    ? lower
                    : lower.lt("submittedAt", to);
                })
                .order(order)
            : hasCategory
              ? abstracts
                  .withIndex("by_category_and_submittedAt", (q) => {
                    const byCategory = q.eq("category", category);
                    if (from === undefined) {
                      return to === undefined
                        ? byCategory
                        : byCategory.lt("submittedAt", to);
                    }
                    const lower = byCategory.gte("submittedAt", from);
                    return to === undefined
                      ? lower
                      : lower.lt("submittedAt", to);
                  })
                  .order(order)
              : abstracts
                  .withIndex("by_submittedAt", (q) => {
                    if (from === undefined) {
                      return to === undefined ? q : q.lt("submittedAt", to);
                    }
                    const lower = q.gte("submittedAt", from);
                    return to === undefined
                      ? lower
                      : lower.lt("submittedAt", to);
                  })
                  .order(order);

    const result = await indexed
      .filter((q) =>
        q.and(
          // Predicates the chosen index could not express. Repeating one the
          // index already applied is harmless.
          q.neq(q.field("status"), "draft"),
          status === undefined ? true : q.eq(q.field("status"), status),
          hasCategory ? q.eq(q.field("category"), category) : true,
          from === undefined ? true : q.gte(q.field("submittedAt"), from),
          to === undefined ? true : q.lt(q.field("submittedAt"), to),
          args.studyType === undefined
            ? true
            : q.eq(q.field("studyType"), args.studyType),
          args.reviewed === undefined
            ? true
            : args.reviewed === "reviewed"
              ? q.neq(q.field("reviewedAt"), undefined)
              : q.eq(q.field("reviewedAt"), undefined),
        ),
      )
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
            keywords: abstract.keywords,
            studyType: abstract.studyType,
            studyTypeOther: abstract.studyTypeOther,
            authorNames: (abstract.authorList ?? [])
              .map((author) => author.name)
              .filter(Boolean),
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
    const resolved = await withAffiliations(ctx, abstract);
    return {
      abstract: resolved.abstract,
      owner: toAbstractOwner(owner),
      affiliations: resolved.affiliations,
      files,
    };
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
    category: v.optional(abstractCategoryValidator),
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
    if (args.decision === "selected" && args.category === undefined) {
      throw new Error("Select an oral or poster presentation category");
    }
    const now = Date.now();
    const code = await ensureAbstractCode(ctx, abstract);
    await ctx.db.patch("abstracts", abstract._id, {
      privateNotes,
      submitterFeedback,
      category: args.decision === "selected" ? args.category : abstract.category,
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

/** Fills `searchText` for abstracts saved before it existed, or after
 * affiliation or profile edits made it stale. */
export const backfillAbstractSearchText = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("abstracts").paginate({
      cursor: args.cursor,
      numItems: 100,
    });
    for (const abstract of page.page) {
      await refreshSearchText(ctx, abstract._id);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.abstracts.backfillAbstractSearchText,
        { cursor: page.continueCursor },
      );
    }
    return null;
  },
});
