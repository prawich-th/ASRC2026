import { v } from "convex/values";
import { buildDisplayName, normalizeEmail } from "../lib/userData";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAffiliation, userAffiliationPatch } from "./lib/affiliation";
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
    affiliationId: v.id("affiliations"),
    position: v.optional(v.string()),
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
    if (!args.firstName.trim() || !args.lastName.trim() || !phone) {
      throw new Error("First name, last name, and phone number are required");
    }
    const affiliation = await requireAffiliation(ctx, args.affiliationId);

    await ctx.db.patch("users", user._id, {
      prefix: args.prefix,
      firstName: args.firstName.trim(),
      otherName: args.otherName?.trim() || undefined,
      lastName: args.lastName.trim(),
      suffix: args.suffix?.trim() || undefined,
      specialty: args.specialty?.trim() || undefined,
      phone,
      position: args.position?.trim() || undefined,
      participantCategory: args.participantCategory,
      city: args.city?.trim() || undefined,
      name,
      normalizedEmail,
      ...userAffiliationPatch(
        {
          ...user,
          name,
          normalizedEmail,
          phone,
          specialty: args.specialty?.trim() || undefined,
          position: args.position?.trim() || undefined,
          city: args.city?.trim() || undefined,
          participantCategory: args.participantCategory,
        },
        affiliation,
      ),
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
    affiliationId: v.id("affiliations"),
    position: v.optional(v.string()),
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
    if (!args.firstName.trim() || !args.lastName.trim()) {
      throw new Error("First name and last name are required");
    }
    const affiliation = await requireAffiliation(ctx, args.affiliationId);

    await ctx.db.patch("users", user._id, {
      prefix: args.prefix,
      firstName: args.firstName.trim(),
      otherName: args.otherName?.trim() || undefined,
      lastName: args.lastName.trim(),
      suffix: args.suffix?.trim() || undefined,
      position: args.position?.trim() || undefined,
      name,
      normalizedEmail,
      ...userAffiliationPatch(
        {
          ...user,
          name,
          normalizedEmail,
          position: args.position?.trim() || undefined,
        },
        affiliation,
      ),
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
