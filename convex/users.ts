import { v } from "convex/values";
import {
  buildDisplayName,
  buildUserSearchText,
  normalizeEmail,
} from "../lib/userData";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import {
  participantCategoryValidator,
  prefixValidator,
  userValidator,
} from "./lib/profile";

type StorageMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
};

export const me = query({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    if (!user.profileImageId) {
      return user;
    }
    const profileImageUrl = await ctx.storage.getUrl(user.profileImageId);
    return {
      ...user,
      image: profileImageUrl ?? user.image ?? undefined,
    };
  },
});

export const completeProfile = mutation({
  args: {
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = buildDisplayName([
      args.prefix,
      args.firstName,
      args.otherName,
      args.lastName,
      args.suffix,
    ]);
    const normalizedEmail = user.email
      ? normalizeEmail(user.email)
      : undefined;
    const phone = args.phone.trim();
    const institution = args.institution.trim();
    const department = args.department?.trim() || undefined;

    await ctx.db.patch("users", user._id, {
      prefix: args.prefix,
      firstName: args.firstName.trim(),
      otherName: args.otherName?.trim() || undefined,
      lastName: args.lastName.trim(),
      suffix: args.suffix?.trim() || undefined,
      specialty: args.specialty?.trim() || undefined,
      phone,
      institution,
      position: args.position?.trim() || undefined,
      department,
      participantCategory: args.participantCategory,
      city: args.city?.trim() || undefined,
      name,
      normalizedEmail,
      searchText: buildUserSearchText({
        name,
        email: normalizedEmail,
        phone,
        institution,
        department,
      }),
      profileComplete: true,
    });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    prefix: prefixValidator,
    firstName: v.string(),
    otherName: v.optional(v.string()),
    lastName: v.string(),
    suffix: v.optional(v.string()),
    institution: v.string(),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = buildDisplayName([
      args.prefix,
      args.firstName,
      args.otherName,
      args.lastName,
      args.suffix,
    ]);
    const normalizedEmail = user.email
      ? normalizeEmail(user.email)
      : undefined;
    const institution = args.institution.trim();
    const department = args.department?.trim() || undefined;

    await ctx.db.patch("users", user._id, {
      prefix: args.prefix,
      firstName: args.firstName.trim(),
      otherName: args.otherName?.trim() || undefined,
      lastName: args.lastName.trim(),
      suffix: args.suffix?.trim() || undefined,
      institution,
      position: args.position?.trim() || undefined,
      department,
      name,
      normalizedEmail,
      searchText: buildUserSearchText({
        name,
        email: normalizedEmail,
        phone: user.phone,
        institution,
        department,
      }),
    });

    return null;
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const metadata = await ctx.db.system.get(
      "_storage",
      args.storageId,
    ) as StorageMetadata | null;

    if (!metadata) {
      throw new Error("Uploaded image was not found.");
    }

    if (!metadata.contentType?.startsWith("image/")) {
      throw new Error("Please upload an image file.");
    }

    if (metadata.size > 5 * 1024 * 1024) {
      throw new Error("Please upload an image smaller than 5MB.");
    }

    if (user.profileImageId && user.profileImageId !== args.storageId) {
      await ctx.storage.delete(user.profileImageId);
    }

    await ctx.db.patch("users", user._id, {
      profileImageId: args.storageId,
    });

    return await ctx.storage.getUrl(args.storageId);
  },
});

export const removeProfileImage = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.profileImageId) {
      await ctx.storage.delete(user.profileImageId);
      await ctx.db.patch("users", user._id, {
        profileImageId: undefined,
      });
    }
    return null;
  },
});
