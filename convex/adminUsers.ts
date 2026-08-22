import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { userRoleValidator, userValidator } from "./lib/profile";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    role: v.optional(userRoleValidator),
  },
  returns: paginationResultValidator(userValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["super_admin"]);
    if (args.role !== undefined) {
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role))
        .order("asc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("users").order("asc").paginate(args.paginationOpts);
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["super_admin"]);
    return await ctx.db.get("users", args.userId);
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(userRoleValidator, v.null()),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, ["super_admin"]);
    if (currentUser._id === args.userId) {
      throw new Error("Super admins cannot change or remove their own role");
    }

    const target = await ctx.db.get("users", args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    await ctx.db.patch("users", target._id, {
      role: args.role === null ? undefined : args.role,
    });
    const updated = await ctx.db.get("users", target._id);
    if (!updated) {
      throw new Error("Could not update user role");
    }
    return updated;
  },
});

export const removeRole = mutation({
  args: { userId: v.id("users") },
  returns: userValidator,
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, ["super_admin"]);
    if (currentUser._id === args.userId) {
      throw new Error("Super admins cannot remove their own role");
    }

    const target = await ctx.db.get("users", args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    await ctx.db.patch("users", target._id, { role: undefined });
    const updated = await ctx.db.get("users", target._id);
    if (!updated) {
      throw new Error("Could not remove user role");
    }
    return updated;
  },
});
