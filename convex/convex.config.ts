import resend from "@convex-dev/resend/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    SITE_URL: v.optional(v.string()),
    STRIPE_SECRET_KEY: v.optional(v.string()),
    STRIPE_WEBHOOK_SECRET: v.optional(v.string()),
    STRIPE_REGISTRATION_PRICE_ID: v.optional(v.string()),
  },
});

app.use(resend);
app.use(stripe);

export default app;
