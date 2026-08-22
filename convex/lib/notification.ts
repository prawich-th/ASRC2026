import { v } from "convex/values";

export const notificationCampaignKindValidator = v.union(
  v.literal("announcement"),
  v.literal("key_date"),
);

export const notificationCampaignFields = {
  kind: notificationCampaignKindValidator,
  subject: v.string(),
  html: v.string(),
  text: v.string(),
  status: v.union(v.literal("pending"), v.literal("completed")),
  cursor: v.optional(v.string()),
  queuedCount: v.number(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
};
