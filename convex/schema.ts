import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { abstractFields, abstractFileFields } from "./lib/abstract";
import { announcementFields, keyDateFields } from "./lib/content";
import { notificationCampaignFields } from "./lib/notification";
import { userFields } from "./lib/profile";

export default defineSchema({
  ...authTables,
  users: defineTable(userFields)
    .index("email", ["email"])
    .index("by_normalizedEmail", ["normalizedEmail"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_wantsNotifications", ["wantsNotifications"])
    .searchIndex("search_users", {
      searchField: "searchText",
      filterFields: ["role"],
    }),
  abstracts: defineTable(abstractFields)
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_status", ["ownerId", "status"])
    .index("by_status_and_submittedAt", ["status", "submittedAt"])
    .index("by_code", ["code"]),
  abstractFiles: defineTable(abstractFileFields)
    .index("by_ownerId", ["ownerId"])
    .index("by_abstractId", ["abstractId"])
    .index("by_ownerId_and_abstractId", ["ownerId", "abstractId"]),
  announcements: defineTable(announcementFields)
    .index("by_slug", ["slug"])
    .index("by_status_and_publishedAt", ["status", "publishedAt"]),
  keyDates: defineTable(keyDateFields)
    .index("by_sortOrder", ["sortOrder"])
    .index("by_published_and_sortOrder", ["published", "sortOrder"]),
  notificationCampaigns: defineTable(notificationCampaignFields),
  messages: defineTable({
    body: v.string(),
    user: v.id("users"),
  }),
});
