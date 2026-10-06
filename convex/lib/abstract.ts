import { v } from "convex/values";
import { affiliationValidator } from "./affiliation";
import {
  ABSTRACT_CATEGORIES,
  ABSTRACT_STATUSES,
  ABSTRACT_STUDY_TYPES,
} from "../../lib/formOptions";

const abstractCategoryLiterals = ABSTRACT_CATEGORIES.map((category) =>
  v.literal(category),
);
const abstractStatusLiterals = ABSTRACT_STATUSES.map((status) => v.literal(status));

export const abstractCategoryValidator = v.union(
  ...(abstractCategoryLiterals as [
    (typeof abstractCategoryLiterals)[number],
    ...(typeof abstractCategoryLiterals)[number][],
  ]),
);

const abstractStudyTypeLiterals = ABSTRACT_STUDY_TYPES.map((type) =>
  v.literal(type),
);

export const abstractStudyTypeValidator = v.union(
  ...(abstractStudyTypeLiterals as [
    (typeof abstractStudyTypeLiterals)[number],
    ...(typeof abstractStudyTypeLiterals)[number][],
  ]),
);

export const abstractStatusValidator = v.union(
  ...(abstractStatusLiterals as [
    (typeof abstractStatusLiterals)[number],
    ...(typeof abstractStatusLiterals)[number][],
  ]),
);

export const abstractFileKindValidator = v.union(
  v.literal("paper"),
  v.literal("supplementary"),
);

export const richTextOpValidator = v.object({
  insert: v.string(),
  attributes: v.optional(
    v.object({
      bold: v.optional(v.boolean()),
      italic: v.optional(v.boolean()),
      underline: v.optional(v.boolean()),
      script: v.optional(v.union(v.literal("sub"), v.literal("super"))),
    }),
  ),
});

export const abstractAuthorValidator = v.object({
  name: v.string(),
  affiliationId: v.optional(v.id("affiliations")),
  presenting: v.boolean(),
});

export const abstractFields = {
  ownerId: v.id("users"),
  code: v.string(),
  title: v.string(),
  studyType: v.optional(abstractStudyTypeValidator),
  /** Free-text description when `studyType` is "other". */
  studyTypeOther: v.optional(v.string()),
  /** Structured author rows; replaces the legacy free-text `authors`. */
  authorList: v.optional(v.array(abstractAuthorValidator)),
  advisor: v.optional(v.string()),
  advisorAffiliationId: v.optional(v.id("affiliations")),
  /** Formatted abstract text (restricted Quill delta ops). */
  bodyRich: v.optional(v.array(richTextOpValidator)),
  /** Plain-text rendering of the abstract, used for search and email. */
  body: v.string(),
  keywords: v.array(v.string()),
  category: v.optional(abstractCategoryValidator),
  /** Confirms the author, affiliation, and abstract details are accurate. */
  affiliationDeclared: v.boolean(),
  // Legacy free-text fields from the template-upload workflow.
  authors: v.optional(v.string()),
  affiliation: v.optional(v.string()),
  status: abstractStatusValidator,
  submittedAt: v.optional(v.number()),
  updatedAt: v.number(),
  privateNotes: v.optional(v.string()),
  submitterFeedback: v.optional(v.string()),
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
  /**
   * Denormalized title, code, keywords, authors, affiliations, and submitter
   * details for the staff search index.
   */
  searchText: v.optional(v.string()),
};

export const abstractValidator = v.object({
  _id: v.id("abstracts"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  code: v.string(),
  title: v.string(),
  studyType: v.optional(abstractStudyTypeValidator),
  studyTypeOther: v.optional(v.string()),
  authorList: v.optional(v.array(abstractAuthorValidator)),
  advisor: v.optional(v.string()),
  advisorAffiliationId: v.optional(v.id("affiliations")),
  bodyRich: v.optional(v.array(richTextOpValidator)),
  body: v.string(),
  keywords: v.array(v.string()),
  category: v.optional(abstractCategoryValidator),
  affiliationDeclared: v.boolean(),
  authors: v.optional(v.string()),
  affiliation: v.optional(v.string()),
  status: abstractStatusValidator,
  submittedAt: v.optional(v.number()),
  updatedAt: v.number(),
  submitterFeedback: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
});

export const adminAbstractValidator = v.object({
  _id: v.id("abstracts"),
  _creationTime: v.number(),
  ...abstractFields,
});

export const abstractSummaryValidator = v.object({
  _id: v.id("abstracts"),
  _creationTime: v.number(),
  code: v.string(),
  title: v.string(),
  keywords: v.array(v.string()),
  category: v.optional(abstractCategoryValidator),
  status: abstractStatusValidator,
  updatedAt: v.number(),
  submittedAt: v.optional(v.number()),
  submitterFeedback: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
});

export const abstractFileFields = {
  ownerId: v.id("users"),
  abstractId: v.id("abstracts"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  kind: v.optional(abstractFileKindValidator),
  contentType: v.optional(v.string()),
  size: v.number(),
  uploadedAt: v.number(),
};

export const abstractFileValidator = v.object({
  _id: v.id("abstractFiles"),
  _creationTime: v.number(),
  ...abstractFileFields,
});

export const abstractFileWithUrlValidator = v.object({
  _id: v.id("abstractFiles"),
  _creationTime: v.number(),
  ...abstractFileFields,
  url: v.union(v.string(), v.null()),
});

export const abstractDetailValidator = v.object({
  abstract: abstractValidator,
  /** Every affiliation referenced by the authors and advisor. */
  affiliations: v.array(affiliationValidator),
  files: v.array(abstractFileWithUrlValidator),
});

export const abstractOwnerValidator = v.object({
  _id: v.id("users"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  institution: v.optional(v.string()),
});

export const adminAbstractSummaryValidator = v.object({
  abstract: v.object({
    _id: v.id("abstracts"),
    _creationTime: v.number(),
    code: v.string(),
    title: v.string(),
    keywords: v.array(v.string()),
    authorNames: v.array(v.string()),
    studyType: v.optional(abstractStudyTypeValidator),
    studyTypeOther: v.optional(v.string()),
    category: v.optional(abstractCategoryValidator),
    status: abstractStatusValidator,
    submittedAt: v.optional(v.number()),
    updatedAt: v.number(),
    reviewedAt: v.optional(v.number()),
  }),
  owner: abstractOwnerValidator,
});

export const adminAbstractDetailValidator = v.object({
  abstract: adminAbstractValidator,
  owner: abstractOwnerValidator,
  affiliations: v.array(affiliationValidator),
  files: v.array(abstractFileWithUrlValidator),
});

export const abstractListFiltersValidator = v.object({
  search: v.optional(v.string()),
  status: v.optional(
    v.union(
      v.literal("submitted"),
      v.literal("revision_requested"),
      v.literal("selected"),
      v.literal("rejected"),
    ),
  ),
  /** A presentation category, or "none" for abstracts without one yet. */
  category: v.optional(v.union(abstractCategoryValidator, v.literal("none"))),
  /** Inclusive lower and exclusive upper bounds on `submittedAt`. */
  submittedFrom: v.optional(v.number()),
  submittedTo: v.optional(v.number()),
  reviewed: v.optional(v.union(v.literal("reviewed"), v.literal("unreviewed"))),
  studyType: v.optional(abstractStudyTypeValidator),
  order: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
});
