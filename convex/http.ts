import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { verifyWebhookSignature } from "./lib/webhookSignature";

const http = httpRouter();

auth.addHttpRoutes(http);

/** Resend inbox events; each one refreshes the affected thread in the cache. */
http.route({
  path: "/resend/inbox-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.RESEND_INBOX_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RESEND_INBOX_WEBHOOK_SECRET is not configured");
      return new Response("Webhook not configured", { status: 500 });
    }

    const body = await req.text();
    const svixId = req.headers.get("svix-id");
    const valid = await verifyWebhookSignature({
      secret,
      id: svixId,
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
      body,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    if (!valid || !svixId) {
      return new Response("Invalid signature", { status: 401 });
    }

    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (typeof event !== "object" || event === null) {
      return new Response("Invalid payload", { status: 400 });
    }
    const { type, data } = event as { type?: unknown; data?: unknown };
    if (typeof type !== "string" || typeof data !== "object" || data === null) {
      return new Response("Invalid payload", { status: 400 });
    }
    const { inbox_id: inboxId, thread_id: threadId } = data as {
      inbox_id?: unknown;
      thread_id?: unknown;
    };
    if (
      !type.startsWith("inbox.") ||
      typeof inboxId !== "string" ||
      typeof threadId !== "string"
    ) {
      // Not a thread event; acknowledge so Resend doesn't retry.
      return new Response("Ignored", { status: 200 });
    }

    const isNew = await ctx.runMutation(internal.mail.recordWebhookEvent, {
      svixId,
    });
    if (isNew) {
      await ctx.scheduler.runAfter(0, internal.mailActions.syncThread, {
        resendInboxId: inboxId,
        resendThreadId: threadId,
      });
    }
    return new Response("OK", { status: 200 });
  }),
});

export default http;
