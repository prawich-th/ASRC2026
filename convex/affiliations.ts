import { v } from "convex/values";
import {
  affiliationKey,
  normalizeAffiliationInput,
} from "../lib/affiliation";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query } from "./_generated/server";
import {
  affiliationInputFields,
  affiliationStatusValidator,
  affiliationValidator,
  requireAffiliation,
  resolveAffiliation,
  userAffiliationPatch,
} from "./lib/affiliation";
import { getCurrentUser, requireRole } from "./lib/auth";

const MANAGER_ROLES = ["staff", "academic_staff"] as const;
const MAX_LISTED = 2000;
const MAX_PENDING_PER_USER = 10;
const MAX_USERS_SYNCED = 1000;

async function findByKey(ctx: MutationCtx, normalizedKey: string) {
  return await ctx.db
    .query("affiliations")
    .withIndex("by_normalizedKey", (q) => q.eq("normalizedKey", normalizedKey))
    .first();
}

/** Re-points users of `from` at `to` and refreshes their denormalized fields. */
async function syncUsers(
  ctx: MutationCtx,
  from: Id<"affiliations">,
  to: Doc<"affiliations">,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_affiliationId", (q) => q.eq("affiliationId", from))
    .take(MAX_USERS_SYNCED);
  for (const user of users) {
    await ctx.db.patch("users", user._id, userAffiliationPatch(user, to));
  }
}

/** Options for the affiliation picker: verified entries plus the caller's own pending ones. */
export const listForSelection = query({
  args: {},
  returns: v.array(affiliationValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const verified = await ctx.db
      .query("affiliations")
      .withIndex("by_status_and_university", (q) => q.eq("status", "verified"))
      .take(MAX_LISTED);
    const ownPending = await ctx.db
      .query("affiliations")
      .withIndex("by_createdBy_and_status", (q) =>
        q.eq("createdBy", user._id).eq("status", "pending"),
      )
      .take(MAX_PENDING_PER_USER);
    return [...ownPending, ...verified];
  },
});

export const getById = query({
  args: { affiliationId: v.id("affiliations") },
  returns: v.union(affiliationValidator, v.null()),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await resolveAffiliation(ctx, args.affiliationId);
  },
});

/**
 * Lets any signed-in user add a missing affiliation. It is usable by them
 * immediately and appears in the staff dashboard for verification.
 */
export const propose = mutation({
  args: affiliationInputFields,
  returns: affiliationValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const input = normalizeAffiliationInput(args);
    const normalizedKey = affiliationKey(input);
    const existing = await findByKey(ctx, normalizedKey);
    if (existing) {
      const resolved = await requireAffiliation(ctx, existing._id);
      if (resolved.status === "archived") {
        throw new Error(
          "This affiliation has been retired. Please choose another one from the list.",
        );
      }
      return resolved;
    }

    const isManager =
      user.role === "super_admin" ||
      MANAGER_ROLES.some((role) => role === user.role);
    if (!isManager) {
      const pending = await ctx.db
        .query("affiliations")
        .withIndex("by_createdBy_and_status", (q) =>
          q.eq("createdBy", user._id).eq("status", "pending"),
        )
        .take(MAX_PENDING_PER_USER);
      if (pending.length >= MAX_PENDING_PER_USER) {
        throw new Error(
          "You have added several affiliations awaiting review. Please choose one of them or wait for the organisers to verify them.",
        );
      }
    }

    const affiliationId = await ctx.db.insert("affiliations", {
      ...input,
      normalizedKey,
      status: isManager ? "verified" : "pending",
      createdBy: user._id,
      updatedAt: Date.now(),
    });
    const created = await ctx.db.get("affiliations", affiliationId);
    if (!created) {
      throw new Error("Could not create affiliation");
    }
    return created;
  },
});

const adminAffiliationValidator = v.object({
  affiliation: affiliationValidator,
  createdByName: v.optional(v.string()),
  mergedIntoLabel: v.optional(v.string()),
});

export const listAdmin = query({
  args: { status: affiliationStatusValidator },
  returns: v.array(adminAffiliationValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const affiliations = await ctx.db
      .query("affiliations")
      .withIndex("by_status_and_university", (q) => q.eq("status", args.status))
      .take(MAX_LISTED);
    return await Promise.all(
      affiliations.map(async (affiliation) => {
        const creator = affiliation.createdBy
          ? await ctx.db.get("users", affiliation.createdBy)
          : null;
        const target = affiliation.mergedInto
          ? await resolveAffiliation(ctx, affiliation.mergedInto)
          : null;
        return {
          affiliation,
          createdByName: creator?.name || creator?.email || undefined,
          mergedIntoLabel: target?.university,
        };
      }),
    );
  },
});

export const counts = query({
  args: {},
  returns: v.object({ verified: v.number(), pending: v.number() }),
  handler: async (ctx) => {
    await requireRole(ctx, MANAGER_ROLES);
    const pending = await ctx.db
      .query("affiliations")
      .withIndex("by_status_and_university", (q) => q.eq("status", "pending"))
      .take(MAX_LISTED);
    const verified = await ctx.db
      .query("affiliations")
      .withIndex("by_status_and_university", (q) => q.eq("status", "verified"))
      .take(MAX_LISTED);
    return { verified: verified.length, pending: pending.length };
  },
});

export const create = mutation({
  args: affiliationInputFields,
  returns: affiliationValidator,
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, MANAGER_ROLES);
    const input = normalizeAffiliationInput(args);
    const normalizedKey = affiliationKey(input);
    if (await findByKey(ctx, normalizedKey)) {
      throw new Error("An identical affiliation already exists");
    }
    const affiliationId = await ctx.db.insert("affiliations", {
      ...input,
      normalizedKey,
      status: "verified",
      createdBy: manager._id,
      updatedAt: Date.now(),
    });
    const created = await ctx.db.get("affiliations", affiliationId);
    if (!created) {
      throw new Error("Could not create affiliation");
    }
    return created;
  },
});

export const update = mutation({
  args: { affiliationId: v.id("affiliations"), ...affiliationInputFields },
  returns: affiliationValidator,
  handler: async (ctx, { affiliationId, ...fields }) => {
    await requireRole(ctx, MANAGER_ROLES);
    const affiliation = await ctx.db.get("affiliations", affiliationId);
    if (!affiliation) {
      throw new Error("Affiliation not found");
    }
    if (affiliation.mergedInto) {
      throw new Error("Merged affiliations cannot be edited");
    }
    const input = normalizeAffiliationInput(fields);
    const normalizedKey = affiliationKey(input);
    const duplicate = await findByKey(ctx, normalizedKey);
    if (duplicate && duplicate._id !== affiliation._id) {
      throw new Error(
        "An identical affiliation already exists. Merge the two instead.",
      );
    }
    await ctx.db.patch("affiliations", affiliation._id, {
      ...input,
      normalizedKey,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("affiliations", affiliation._id);
    if (!updated) {
      throw new Error("Could not update affiliation");
    }
    await syncUsers(ctx, updated._id, updated);
    return updated;
  },
});

export const setStatus = mutation({
  args: {
    affiliationId: v.id("affiliations"),
    status: affiliationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const affiliation = await ctx.db.get("affiliations", args.affiliationId);
    if (!affiliation) {
      throw new Error("Affiliation not found");
    }
    if (affiliation.mergedInto) {
      throw new Error("Merged affiliations cannot change status");
    }
    await ctx.db.patch("affiliations", affiliation._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Folds a duplicate into another affiliation. Existing references keep
 * working because reads follow `mergedInto` to the surviving record.
 */
export const merge = mutation({
  args: {
    sourceId: v.id("affiliations"),
    targetId: v.id("affiliations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const source = await ctx.db.get("affiliations", args.sourceId);
    if (!source || source.mergedInto) {
      throw new Error("Affiliation not found");
    }
    const target = await requireAffiliation(ctx, args.targetId);
    if (target._id === source._id) {
      throw new Error("Choose a different affiliation to merge into");
    }
    if (target.status === "archived") {
      throw new Error("Restore the target affiliation before merging into it");
    }
    await ctx.db.patch("affiliations", source._id, {
      status: "archived",
      mergedInto: target._id,
      updatedAt: Date.now(),
    });
    await syncUsers(ctx, source._id, target);
    return null;
  },
});

const MAX_IMPORT_BATCH = 200;

/**
 * Adds verified affiliations from an uploaded CSV, one batch at a time.
 * Rows matching an existing entry (in any status) are skipped.
 */
export const importBatch = mutation({
  args: {
    affiliations: v.array(v.object(affiliationInputFields)),
  },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
    errors: v.array(v.object({ index: v.number(), message: v.string() })),
  }),
  handler: async (ctx, args) => {
    const manager = await requireRole(ctx, MANAGER_ROLES);
    if (
      args.affiliations.length === 0 ||
      args.affiliations.length > MAX_IMPORT_BATCH
    ) {
      throw new Error(
        `Import batches must contain between 1 and ${MAX_IMPORT_BATCH} affiliations`,
      );
    }
    let added = 0;
    let skipped = 0;
    const errors: Array<{ index: number; message: string }> = [];
    for (const [index, entry] of args.affiliations.entries()) {
      let input;
      try {
        input = normalizeAffiliationInput(entry);
      } catch (caught) {
        errors.push({
          index,
          message: caught instanceof Error ? caught.message : "Invalid row",
        });
        continue;
      }
      const normalizedKey = affiliationKey(input);
      if (await findByKey(ctx, normalizedKey)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("affiliations", {
        ...input,
        normalizedKey,
        status: "verified",
        createdBy: manager._id,
        updatedAt: Date.now(),
      });
      added++;
    }
    return { added, skipped, errors };
  },
});
