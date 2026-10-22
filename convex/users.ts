import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MIN_PASSWORD_LENGTH } from "../lib/formOptions";
import { normalizeEmail } from "../lib/userData";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { buildProfilePatch, profileInputFields } from "./lib/profileInput";
import { userValidator } from "./lib/profile";

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
  args: profileInputFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch("users", user._id, await buildProfilePatch(ctx, user, args));
    return null;
  },
});

/** The participant's own profile edit; same rules as registration. */
export const updateProfile = mutation({
  args: profileInputFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch("users", user._id, await buildProfilePatch(ctx, user, args));
    return null;
  },
});

export const updateNotificationPreference = mutation({
  args: { wantsNotifications: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch("users", user._id, {
      wantsNotifications: args.wantsNotifications,
    });
    return null;
  },
});

export const currentAccountEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    return user?.email ? normalizeEmail(user.email) : null;
  },
});

/**
 * Changes the signed-in user's password after checking the current one, then
 * signs out their other sessions.
 */
export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    if (args.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }
    if (args.newPassword === args.currentPassword) {
      throw new Error("New password must be different from the current one");
    }
    const email: string | null = await ctx.runQuery(
      internal.users.currentAccountEmail,
      { userId },
    );
    if (!email) {
      throw new Error("This account has no email address");
    }

    let accountUserId: Id<"users">;
    try {
      const { user } = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.currentPassword },
      });
      accountUserId = user._id;
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes("TooManyFailedAttempts")) {
        throw new Error(
          "Too many failed attempts. Please wait a few minutes and try again.",
        );
      }
      throw new Error("Current password is incorrect");
    }
    if (accountUserId !== userId) {
      throw new Error("Current password is incorrect");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.newPassword },
    });
    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, {
      userId,
      except: sessionId ? [sessionId] : [],
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
