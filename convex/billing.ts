"use node";

import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action, env } from "./_generated/server";
import { REGISTRATION_FEE_PURPOSE } from "./lib/registrationPayment";

const stripeClient = new StripeSubscriptions(components.stripe, {
  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
});

type CheckoutUser = {
  userId: string;
  email?: string;
  name?: string;
  registrationFeeWaived: boolean;
};

export const createRegistrationCheckout = action({
  args: {},
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx): Promise<{
    sessionId: string;
    url: string | null;
  }> => {
    const user: CheckoutUser = await ctx.runQuery(
      internal.billingQueries.getCheckoutUser,
      {},
    );
    if (user.registrationFeeWaived) {
      throw new Error("Your registration fee has already been waived");
    }

    const priceId = env.STRIPE_REGISTRATION_PRICE_ID;
    const siteUrl = env.SITE_URL;
    if (
      !env.STRIPE_SECRET_KEY ||
      !env.STRIPE_WEBHOOK_SECRET ||
      !priceId ||
      !siteUrl
    ) {
      throw new Error("Registration payment is not configured yet");
    }

    const payments = await ctx.runQuery(
      components.stripe.public.listPaymentsByUserId,
      { userId: user.userId },
    );
    const alreadyPaid = payments.some((payment) => {
      const metadata = payment.metadata;
      return (
        payment.status === "succeeded" &&
        typeof metadata === "object" &&
        metadata !== null &&
        "purpose" in metadata &&
        metadata.purpose === REGISTRATION_FEE_PURPOSE
      );
    });
    if (alreadyPaid) {
      throw new Error("Your registration fee has already been paid");
    }

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: user.userId,
      email: user.email,
      name: user.name,
    });
    const baseUrl = siteUrl.replace(/\/+$/, "");
    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId: customer.customerId,
      mode: "payment",
      successUrl: `${baseUrl}/abstracts/submit?payment=success`,
      cancelUrl: `${baseUrl}/abstracts/submit?payment=canceled`,
      metadata: {
        purpose: REGISTRATION_FEE_PURPOSE,
        userId: user.userId,
      },
      paymentIntentMetadata: {
        purpose: REGISTRATION_FEE_PURPOSE,
        userId: user.userId,
      },
    });
  },
});
