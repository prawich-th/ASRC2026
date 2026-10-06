import { v } from "convex/values";
import {
  AFFILIATION_STATUSES,
  affiliationUnit,
  formatAffiliation,
} from "../../lib/affiliation";
import { buildUserSearchText } from "../../lib/userData";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

const affiliationStatusLiterals = AFFILIATION_STATUSES.map((status) =>
  v.literal(status),
);

export const affiliationStatusValidator = v.union(
  ...(affiliationStatusLiterals as [
    (typeof affiliationStatusLiterals)[number],
    ...(typeof affiliationStatusLiterals)[number][],
  ]),
);

export const affiliationInputFields = {
  department: v.optional(v.string()),
  faculty: v.optional(v.string()),
  university: v.string(),
  district: v.optional(v.string()),
  province: v.optional(v.string()),
  country: v.string(),
};

export const affiliationFields = {
  ...affiliationInputFields,
  status: affiliationStatusValidator,
  normalizedKey: v.string(),
  /** Set when staff merge a duplicate into another affiliation. */
  mergedInto: v.optional(v.id("affiliations")),
  createdBy: v.optional(v.id("users")),
  updatedAt: v.number(),
};

export const affiliationValidator = v.object({
  _id: v.id("affiliations"),
  _creationTime: v.number(),
  ...affiliationFields,
});

const MAX_MERGE_DEPTH = 10;

/** Follows merge links so stale references land on the surviving record. */
export async function resolveAffiliation(
  ctx: QueryCtx | MutationCtx,
  affiliationId: Id<"affiliations">,
): Promise<Doc<"affiliations"> | null> {
  let current = await ctx.db.get("affiliations", affiliationId);
  for (let depth = 0; current?.mergedInto && depth < MAX_MERGE_DEPTH; depth++) {
    current = await ctx.db.get("affiliations", current.mergedInto);
  }
  return current;
}

export async function requireAffiliation(
  ctx: QueryCtx | MutationCtx,
  affiliationId: Id<"affiliations">,
): Promise<Doc<"affiliations">> {
  const affiliation = await resolveAffiliation(ctx, affiliationId);
  if (!affiliation) {
    throw new Error("The selected affiliation no longer exists");
  }
  return affiliation;
}

/** Fields copied onto a user so search and imports keep working. */
export function userAffiliationPatch(
  user: Doc<"users">,
  affiliation: Doc<"affiliations">,
) {
  const institution = affiliation.university;
  const department = affiliationUnit(affiliation);
  return {
    affiliationId: affiliation._id,
    institution,
    department,
    searchText: buildUserSearchText({
      name: user.name,
      email: user.normalizedEmail ?? user.email,
      phone: user.phone,
      institution,
      department,
      specialty: user.specialty,
      position: user.position,
      city: user.city,
      participantCategory: user.participantCategory,
      affiliation: formatAffiliation(affiliation),
    }),
  };
}
