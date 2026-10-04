/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { claimPreRegisteredUser } from "./lib/preRegistration";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const importedUser = {
  email: "  Participant@Example.com ",
  prefix: "Dr." as const,
  firstName: "Pat",
  lastName: "Example",
  phone: "+66123456789",
  institution: "Example University",
  participantCategory: "Researcher" as const,
};

async function setupAdmin() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: "admin@example.com",
      searchText: "admin@example.com",
      role: "super_admin",
      claimedAt: 1,
    });
    const participant = await ctx.db.insert("users", {
      email: "member@example.com",
      searchText: "member@example.com",
      claimedAt: 1,
    });
    return { admin, participant };
  });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    participant: t.withIdentity({ subject: ids.participant }),
  };
}

describe("admin user import and search", () => {
  test("only super admins can import pre-registered users", async () => {
    const { participant } = await setupAdmin();
    await expect(
      participant.mutation(api.adminUsers.importPreRegistered, {
        users: [importedUser],
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("normalizes, updates, and protects claimed users", async () => {
    const { t, admin } = await setupAdmin();
    const inserted = await admin.mutation(
      api.adminUsers.importPreRegistered,
      { users: [importedUser] },
    );
    expect(inserted).toMatchObject({
      inserted: 1,
      updated: 0,
      skipped: 0,
      invalid: 0,
    });

    const provisioned = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_normalizedEmail", (q) =>
          q.eq("normalizedEmail", "participant@example.com"),
        )
        .unique();
    });
    expect(provisioned).toMatchObject({
      email: "participant@example.com",
      normalizedEmail: "participant@example.com",
      profileComplete: true,
      institution: "Example University",
    });

    const updated = await admin.mutation(api.adminUsers.importPreRegistered, {
      users: [{ ...importedUser, institution: "Updated University" }],
    });
    expect(updated.updated).toBe(1);

    await t.run(async (ctx) => {
      if (!provisioned) {
        throw new Error("Expected provisioned user");
      }
      await ctx.db.patch("users", provisioned._id, { claimedAt: 10 });
    });
    const skipped = await admin.mutation(api.adminUsers.importPreRegistered, {
      users: [{ ...importedUser, institution: "Should Not Replace" }],
    });
    expect(skipped.skipped).toBe(1);
  });

  test("searches normalized user text", async () => {
    const { t, admin } = await setupAdmin();
    await admin.mutation(api.adminUsers.importPreRegistered, {
      users: [importedUser],
    });
    const result = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withSearchIndex("search_users", (q) =>
          q.search("searchText", "example university"),
        )
        .take(10);
    });
    expect(result.map((user) => user.email)).toContain(
      "participant@example.com",
    );
  });
});

test("verified users claim matching pre-registered profiles", async () => {
  const t = convexTest(schema, modules);
  const result = await t.run(async (ctx) => {
    const provisionedId = await ctx.db.insert("users", {
      email: "person@example.com",
      normalizedEmail: "person@example.com",
      firstName: "Imported",
      profileComplete: true,
      preRegisteredAt: 1,
    });
    const temporaryId = await ctx.db.insert("users", {
      email: "person@example.com",
      normalizedEmail: "person@example.com",
      agreedToTerms: true,
      wantsNotifications: true,
      profileComplete: false,
    });

    const claimedId = await claimPreRegisteredUser(
      ctx,
      temporaryId,
      " PERSON@example.com ",
    );
    const claimed = await ctx.db.get("users", provisionedId);
    const temporary = await ctx.db.get("users", temporaryId);
    return { claimedId, provisionedId, claimed, temporary };
  });

  expect(result.claimedId).toBe(result.provisionedId);
  expect(result.temporary).toBeNull();
  expect(result.claimed).toMatchObject({
    firstName: "Imported",
    profileComplete: true,
    agreedToTerms: true,
    wantsNotifications: true,
  });
  expect(result.claimed?.claimedAt).toEqual(expect.any(Number));
  expect(result.claimed?.emailVerificationTime).toEqual(expect.any(Number));
});
