import { normalizeEmail } from "../../lib/userData";
import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

export async function claimPreRegisteredUser(
  ctx: MutationCtx,
  existingUserId: Id<"users">,
  rawEmail: string,
): Promise<Id<"users"> | null> {
  const email = normalizeEmail(rawEmail);
  const matches = await ctx.db
    .query("users")
    .withIndex("by_normalizedEmail", (q) => q.eq("normalizedEmail", email))
    .take(3);
  const provisionedMatches = matches.filter(
    (user) =>
      user._id !== existingUserId &&
      user.preRegisteredAt !== undefined &&
      user.claimedAt === undefined,
  );
  if (provisionedMatches.length > 1) {
    throw new Error("Multiple users are registered with this email");
  }

  const provisioned = provisionedMatches[0];
  if (!provisioned) {
    return null;
  }

  const temporaryUser = await ctx.db.get("users", existingUserId);
  if (!temporaryUser) {
    throw new Error("Authentication user was not found");
  }
  const now = Date.now();
  await ctx.db.patch("users", provisioned._id, {
    email,
    normalizedEmail: email,
    emailVerificationTime: now,
    claimedAt: now,
    agreedToTerms: temporaryUser.agreedToTerms,
    wantsNotifications: temporaryUser.wantsNotifications,
  });
  await ctx.db.delete("users", temporaryUser._id);
  return provisioned._id;
}
