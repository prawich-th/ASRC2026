import { v } from "convex/values";
import { ABSTRACT_CATEGORIES, ABSTRACT_STATUSES } from "../../lib/formOptions";

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

export const abstractStatusValidator = v.union(
  ...(abstractStatusLiterals as [
    (typeof abstractStatusLiterals)[number],
    ...(typeof abstractStatusLiterals)[number][],
  ]),
);

export const abstractFields = {
  ownerId: v.id("users"),
  title: v.string(),
  body: v.string(),
  keywords: v.array(v.string()),
  category: abstractCategoryValidator,
  affiliation: v.string(),
  affiliationDeclared: v.boolean(),
  status: abstractStatusValidator,
  submittedAt: v.optional(v.number()),
  updatedAt: v.number(),
  privateNotes: v.optional(v.string()),
  submitterFeedback: v.optional(v.string()),
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
};

export const abstractValidator = v.object({
  _id: v.id("abstracts"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  title: v.string(),
  body: v.string(),
  keywords: v.array(v.string()),
  category: abstractCategoryValidator,
  affiliation: v.string(),
  affiliationDeclared: v.boolean(),
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
  title: v.string(),
  keywords: v.array(v.string()),
  category: abstractCategoryValidator,
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
    title: v.string(),
    category: abstractCategoryValidator,
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
  files: v.array(abstractFileWithUrlValidator),
});
