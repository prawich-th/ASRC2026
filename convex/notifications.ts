import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalMutation, MutationCtx } from "./_generated/server";
import { EmailContent } from "./lib/emailTemplates";

const TEST_API_KEY = "re_test_notifications";
const TEST_FROM = "ASRC 2027 <notifications@example.com>";
const BATCH_SIZE = 25;

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

function getApiKey(): string | undefined {
  return (
    process.env.RESEND_API_KEY ??
    process.env.AUTH_RESEND_KEY ??
    (isTestEnvironment() ? TEST_API_KEY : undefined)
  );
}

function getFromAddress(): string {
  const from = process.env.AUTH_EMAIL_FROM;
  if (from) {
    return from;
  }
  if (isTestEnvironment()) {
    return TEST_FROM;
  }
  throw new Error("AUTH_EMAIL_FROM must be configured");
}

export function getSiteUrl(path: string): string {
  const siteUrl =
    process.env.SITE_URL ??
    (isTestEnvironment() ? "http://localhost:3000" : undefined);
  if (!siteUrl) {
    throw new Error("SITE_URL must be configured");
  }
  return new URL(path, `${siteUrl.replace(/\/+$/, "")}/`).toString();
}

function isDeliverableEmail(email: string | undefined): email is string {
  return (
    email !== undefined &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

const resend = new Resend(components.resend, {
  apiKey: getApiKey(),
  testMode: process.env.RESEND_TEST_MODE === "true",
});

export async function queueTransactionalEmail(
  ctx: MutationCtx,
  recipient: string | undefined,
  content: EmailContent,
): Promise<boolean> {
  if (!isDeliverableEmail(recipient)) {
    return false;
  }
  await resend.sendEmail(ctx, {
    from: getFromAddress(),
    to: recipient,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  return true;
}

export async function createBroadcastCampaign(
  ctx: MutationCtx,
  args: {
    kind: "announcement" | "key_date";
    content: EmailContent;
  },
): Promise<Id<"notificationCampaigns">> {
  const campaignId = await ctx.db.insert("notificationCampaigns", {
    kind: args.kind,
    subject: args.content.subject,
    html: args.content.html,
    text: args.content.text,
    status: "pending",
    queuedCount: 0,
    createdAt: Date.now(),
  });
  await ctx.scheduler.runAfter(
    0,
    internal.notifications.processBroadcastCampaign,
    { campaignId },
  );
  return campaignId;
}

export const processBroadcastCampaign = internalMutation({
  args: { campaignId: v.id("notificationCampaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(
      "notificationCampaigns",
      args.campaignId,
    );
    if (!campaign || campaign.status === "completed") {
      return null;
    }

    const page = await ctx.db
      .query("users")
      .withIndex("by_wantsNotifications", (q) =>
        q.eq("wantsNotifications", true),
      )
      .paginate({
        cursor: campaign.cursor ?? null,
        numItems: BATCH_SIZE,
      });

    let queuedCount = campaign.queuedCount;
    for (const user of page.page) {
      if (!isDeliverableEmail(user.email)) {
        continue;
      }
      await resend.sendEmail(ctx, {
        from: getFromAddress(),
        to: user.email,
        subject: campaign.subject,
        html: campaign.html,
        text: campaign.text,
      });
      queuedCount += 1;
    }

    if (page.isDone) {
      await ctx.db.patch("notificationCampaigns", campaign._id, {
        status: "completed",
        cursor: undefined,
        queuedCount,
        completedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.patch("notificationCampaigns", campaign._id, {
      cursor: page.continueCursor,
      queuedCount,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.processBroadcastCampaign,
      { campaignId: campaign._id },
    );
    return null;
  },
});
