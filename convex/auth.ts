import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { buildUserSearchText, normalizeEmail } from "../lib/userData";
import { DataModel, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { claimPreRegisteredUser } from "./lib/preRegistration";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      verify: ResendOTP,
      profile(params) {
        const email = normalizeEmail(String(params.email ?? ""));
        if (params.flow === "signUp") {
          return {
            email,
            normalizedEmail: email,
            searchText: buildUserSearchText({ email }),
            agreedToTerms: params.agreedToTerms === "true",
            wantsNotifications: params.wantsNotifications === "true",
            profileComplete: false,
          };
        }
        return { email };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const typedCtx = ctx as unknown as MutationCtx;
      const email =
        typeof args.profile.email === "string"
          ? normalizeEmail(args.profile.email)
          : undefined;

      if (
        args.type === "verification" &&
        email &&
        args.existingUserId !== null
      ) {
        const claimedUserId = await claimPreRegisteredUser(
          typedCtx,
          args.existingUserId as Id<"users">,
          email,
        );
        if (claimedUserId) {
          return claimedUserId;
        }
      }

      const profileData = {
        ...(email
          ? {
              email,
              normalizedEmail: email,
              searchText: buildUserSearchText({ email }),
            }
          : {}),
        ...(typeof args.profile.agreedToTerms === "boolean"
          ? { agreedToTerms: args.profile.agreedToTerms }
          : {}),
        ...(typeof args.profile.wantsNotifications === "boolean"
          ? { wantsNotifications: args.profile.wantsNotifications }
          : {}),
        ...(typeof args.profile.profileComplete === "boolean"
          ? { profileComplete: args.profile.profileComplete }
          : {}),
        ...(args.profile.emailVerified === true
          ? { emailVerificationTime: Date.now() }
          : {}),
      };

      if (args.existingUserId !== null) {
        const existing = await typedCtx.db.get(
          "users",
          args.existingUserId as Id<"users">,
        );
        if (!existing) {
          throw new Error("Authentication user was not found");
        }
        await typedCtx.db.patch("users", existing._id, {
          ...profileData,
          ...(email
            ? {
                searchText: buildUserSearchText({
                  name: existing.name,
                  email,
                  phone: existing.phone,
                  institution: existing.institution,
                  department: existing.department,
                  specialty: existing.specialty,
                  position: existing.position,
                  city: existing.city,
                  participantCategory: existing.participantCategory,
                }),
              }
            : {}),
          ...(args.type === "verification" && existing.claimedAt === undefined
            ? { claimedAt: Date.now() }
            : {}),
        });
        return existing._id;
      }

      return await typedCtx.db.insert("users", profileData);
    },
  },
});
