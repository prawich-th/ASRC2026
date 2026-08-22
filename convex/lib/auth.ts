import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export type UserRole = NonNullable<Doc<"users">["role"]>;

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  return await ctx.db.get("users", userId);
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export function hasRole(
  user: Doc<"users">,
  allowedRoles: readonly UserRole[],
): boolean {
  return (
    user.role === "super_admin" ||
    (user.role !== undefined && allowedRoles.includes(user.role))
  );
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: readonly UserRole[],
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!hasRole(user, allowedRoles)) {
    throw new Error("Unauthorized: insufficient role");
  }
  return user;
}
