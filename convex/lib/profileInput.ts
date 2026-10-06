import { v } from "convex/values";
import { buildDisplayName, normalizeEmail } from "../../lib/userData";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { requireAffiliation, userAffiliationPatch } from "./affiliation";
import { participantCategoryValidator, prefixValidator } from "./profile";

/** Everything a participant fills in on the registration profile form. */
export const profileInputFields = {
  prefix: prefixValidator,
  firstName: v.string(),
  otherName: v.optional(v.string()),
  lastName: v.string(),
  suffix: v.optional(v.string()),
  specialty: v.optional(v.string()),
  phone: v.string(),
  affiliationId: v.id("affiliations"),
  position: v.optional(v.string()),
  participantCategory: participantCategoryValidator,
  city: v.optional(v.string()),
};

export const profileInputValidator = v.object(profileInputFields);

export type ProfileInput = typeof profileInputValidator.type;

const MAX_PROFILE_FIELD_LENGTH = 200;

function optional(value: string | undefined): string | undefined {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

/**
 * Validates profile input and returns the user patch it produces, including
 * the display name, denormalized affiliation fields, and search text. Shared
 * by self-registration, admin edits, and the admin profile debugger so all
 * three apply exactly the same rules.
 */
export async function buildProfilePatch(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  input: ProfileInput,
) {
  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  const phone = input.phone.trim();
  if (!firstName || !lastName || !phone) {
    throw new Error("First name, last name, and phone number are required");
  }
  const fields = {
    prefix: input.prefix,
    firstName,
    otherName: optional(input.otherName),
    lastName,
    suffix: optional(input.suffix),
    specialty: optional(input.specialty),
    phone,
    position: optional(input.position),
    participantCategory: input.participantCategory,
    city: optional(input.city),
  };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.length > MAX_PROFILE_FIELD_LENGTH) {
      throw new Error(
        `${key} must be at most ${MAX_PROFILE_FIELD_LENGTH} characters`,
      );
    }
  }
  const affiliation = await requireAffiliation(ctx, input.affiliationId);
  const name = buildDisplayName([
    fields.prefix,
    fields.firstName,
    fields.otherName,
    fields.lastName,
    fields.suffix,
  ]);
  const normalizedEmail = user.email ? normalizeEmail(user.email) : undefined;
  return {
    ...fields,
    name,
    normalizedEmail,
    ...userAffiliationPatch(
      { ...user, ...fields, name, normalizedEmail },
      affiliation,
    ),
    profileComplete: true,
  };
}
