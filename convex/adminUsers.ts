import {
  PaginationResult,
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { buildDisplayName, buildUserSearchText, normalizeEmail } from "../lib/userData";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { requireRole } from "./lib/auth";
import {
  participantCategoryValidator,
  prefixValidator,
  userRoleValidator,
  userValidator,
} from "./lib/profile";
async function addProfileImages(
  ctx: QueryCtx,
  result: PaginationResult<Doc<"users">>,
) {
  const page = await Promise.all(
    result.page.map(async (user) => {
      const profileImageUrl = user.profileImageId
        ? await ctx.storage.getUrl(user.profileImageId)
        : null;
      return {
        ...user,
        image: profileImageUrl ?? user.image,
      };
    }),
  );
  return { ...result, page };
}

const importUserValidator = v.object({
  email: v.string(),
  prefix: prefixValidator,
  firstName: v.string(),
  otherName: v.optional(v.string()),
  lastName: v.string(),
  suffix: v.optional(v.string()),
  specialty: v.optional(v.string()),
  phone: v.string(),
  institution: v.string(),
  position: v.optional(v.string()),
  department: v.optional(v.string()),
  participantCategory: participantCategoryValidator,
  city: v.optional(v.string()),
  role: v.optional(userRoleValidator),
});

const importResultValidator = v.object({
  row: v.number(),
  email: v.string(),
  status: v.union(
    v.literal("inserted"),
    v.literal("updated"),
    v.literal("skipped"),
    v.literal("invalid"),
  ),
  message: v.optional(v.string()),
});

function optionalTrimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    role: v.optional(userRoleValidator),
    search: v.optional(v.string()),
  },
  returns: paginationResultValidator(userValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["super_admin"]);
    const search = args.search?.trim();
    if (search) {
      if (args.role !== undefined) {
        const result = await ctx.db
          .query("users")
          .withSearchIndex("search_users", (q) =>
            q.search("searchText", search).eq("role", args.role),
          )
          .paginate(args.paginationOpts);
        return await addProfileImages(ctx, result);
      }
      const result = await ctx.db
        .query("users")
        .withSearchIndex("search_users", (q) =>
          q.search("searchText", search),
        )
        .paginate(args.paginationOpts);
      return await addProfileImages(ctx, result);
    }
    if (args.role !== undefined) {
      const result = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role))
        .order("asc")
        .paginate(args.paginationOpts);
      return await addProfileImages(ctx, result);
    }
    const result = await ctx.db
      .query("users")
      .order("asc")
      .paginate(args.paginationOpts);
    return await addProfileImages(ctx, result);
  },
});

export const importPreRegistered = mutation({
  args: { users: v.array(importUserValidator) },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
    invalid: v.number(),
    results: v.array(importResultValidator),
  }),
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, ["super_admin"]);
    if (args.users.length === 0 || args.users.length > 100) {
      throw new Error("Import batches must contain between 1 and 100 users");
    }

    const results: Array<{
      row: number;
      email: string;
      status: "inserted" | "updated" | "skipped" | "invalid";
      message?: string;
    }> = [];
    const seenEmails = new Set<string>();

    for (const [index, row] of args.users.entries()) {
      const normalizedEmail = normalizeEmail(row.email);
      if (!isValidEmail(normalizedEmail)) {
        results.push({
          row: index + 1,
          email: normalizedEmail || row.email,
          status: "invalid",
          message: "Invalid email address",
        });
        continue;
      }
      if (seenEmails.has(normalizedEmail)) {
        results.push({
          row: index + 1,
          email: normalizedEmail,
          status: "invalid",
          message: "Duplicate email in this import batch",
        });
        continue;
      }
      seenEmails.add(normalizedEmail);

      const firstName = row.firstName.trim();
      const lastName = row.lastName.trim();
      const phone = row.phone.trim();
      const institution = row.institution.trim();
      if (!firstName || !lastName || !phone || !institution) {
        results.push({
          row: index + 1,
          email: normalizedEmail,
          status: "invalid",
          message: "First name, last name, phone, and institution are required",
        });
        continue;
      }

      const matches = await ctx.db
        .query("users")
        .withIndex("by_normalizedEmail", (q) =>
          q.eq("normalizedEmail", normalizedEmail),
        )
        .take(2);
      if (matches.length > 1) {
        results.push({
          row: index + 1,
          email: normalizedEmail,
          status: "invalid",
          message: "Multiple users already use this normalized email",
        });
        continue;
      }

      const name = buildDisplayName([
        row.prefix,
        firstName,
        row.otherName,
        lastName,
        row.suffix,
      ]);
      const profile = {
        email: normalizedEmail,
        normalizedEmail,
        prefix: row.prefix,
        firstName,
        otherName: optionalTrimmed(row.otherName),
        lastName,
        suffix: optionalTrimmed(row.suffix),
        specialty: optionalTrimmed(row.specialty),
        phone,
        institution,
        position: optionalTrimmed(row.position),
        department: optionalTrimmed(row.department),
        participantCategory: row.participantCategory,
        city: optionalTrimmed(row.city),
        name,
        profileComplete: true,
        searchText: buildUserSearchText({
          name,
          email: normalizedEmail,
          phone,
          institution,
          department: row.department,
        }),
      };
      const existing = matches[0];
      if (!existing) {
        await ctx.db.insert("users", {
          ...profile,
          role: row.role,
          preRegisteredAt: Date.now(),
          preRegisteredBy: currentUser._id,
        });
        results.push({
          row: index + 1,
          email: normalizedEmail,
          status: "inserted",
        });
        continue;
      }

      if (!existing.preRegisteredAt || existing.claimedAt) {
        results.push({
          row: index + 1,
          email: normalizedEmail,
          status: "skipped",
          message: "An active account already uses this email",
        });
        continue;
      }

      await ctx.db.patch("users", existing._id, {
        ...profile,
        ...(row.role !== undefined ? { role: row.role } : {}),
        preRegisteredAt: Date.now(),
        preRegisteredBy: currentUser._id,
      });
      results.push({
        row: index + 1,
        email: normalizedEmail,
        status: "updated",
      });
    }

    return {
      inserted: results.filter((result) => result.status === "inserted").length,
      updated: results.filter((result) => result.status === "updated").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      invalid: results.filter((result) => result.status === "invalid").length,
      results,
    };
  },
});

export const backfillUserSearchFields = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("users").paginate({
      cursor: args.cursor,
      numItems: 100,
    });
    for (const user of page.page) {
      const normalizedEmail = user.email
        ? normalizeEmail(user.email)
        : undefined;
      await ctx.db.patch("users", user._id, {
        normalizedEmail,
        searchText: buildUserSearchText({
          name: user.name,
          email: normalizedEmail,
          phone: user.phone,
          institution: user.institution,
          department: user.department,
        }),
        claimedAt:
          user.claimedAt ??
          (user.preRegisteredAt === undefined ? user._creationTime : undefined),
      });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.adminUsers.backfillUserSearchFields,
        { cursor: page.continueCursor },
      );
    }
    return null;
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
