import { v } from "convex/values";
import { env, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { canSubmitAbstract } from "./lib/registrationPayment";

const registrationStatusValidator = v.object({
  eligible: v.boolean(),
  paid: v.boolean(),
  waived: v.boolean(),
  configured: v.boolean(),
});

export const getRegistrationStatus = query({
  args: {},
  returns: registrationStatusValidator,
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const eligibility = await canSubmitAbstract(ctx, user);
    return {
      ...eligibility,
      configured: Boolean(
        env.STRIPE_SECRET_KEY &&
          env.STRIPE_WEBHOOK_SECRET &&
          env.STRIPE_REGISTRATION_PRICE_ID &&
          env.SITE_URL,
      ),
    };
  },
});

export const getCheckoutUser = internalQuery({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    registrationFeeWaived: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      registrationFeeWaived: user.registrationFeeWaived === true,
    };
  },
});
