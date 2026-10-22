/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    alice: await ctx.db.insert("users", {
      email: "alice@example.com",
      wantsNotifications: false,
      profileComplete: false,
    }),
    bob: await ctx.db.insert("users", {
      email: "bob@example.com",
      wantsNotifications: true,
    }),
    affiliation: await ctx.db.insert("affiliations", {
      university: "Thammasat University",
      faculty: "Faculty of Medicine",
      province: "Pathum Thani",
      country: "Thailand",
      status: "verified",
      normalizedKey: "thammasat university|faculty of medicine",
      updatedAt: 0,
    }),
  }));
  return {
    t,
    ids,
    alice: t.withIdentity({ subject: ids.alice }),
  };
}

describe("participant profile", () => {
  test("updateProfile edits every registration field with the shared rules", async () => {
    const { t, ids, alice } = await setup();
    const profile = {
      prefix: "Ms." as const,
      firstName: "  Alice ",
      lastName: "Author",
      phone: "0800000000",
      affiliationId: ids.affiliation,
      participantCategory: "Medical Student" as const,
      position: "4",
    };
    await alice.mutation(api.users.updateProfile, profile);
    await alice.mutation(api.users.updateProfile, {
      ...profile,
      specialty: "Cardiology",
      phone: "+66 81 234 5678",
      participantCategory: "Resident",
      position: "PGY-2",
      city: "Bangkok",
    });
    const user = await t.run((ctx) => ctx.db.get("users", ids.alice));
    expect(user).toMatchObject({
      name: "Ms. Alice Author",
      firstName: "Alice",
      specialty: "Cardiology",
      phone: "+66 81 234 5678",
      participantCategory: "Resident",
      position: "PGY-2",
      city: "Bangkok",
      profileComplete: true,
    });

    await expect(
      alice.mutation(api.users.updateProfile, { ...profile, phone: " " }),
    ).rejects.toThrow("First name, last name, and phone number are required");
    await expect(
      alice.mutation(api.users.updateProfile, {
        ...profile,
        specialty: "x".repeat(201),
      }),
    ).rejects.toThrow("specialty must be at most 200 characters");
  });

  test("notification preference changes only the caller", async () => {
    const { t, ids, alice } = await setup();
    await alice.mutation(api.users.updateNotificationPreference, {
      wantsNotifications: true,
    });
    const [updatedAlice, bob] = await t.run(async (ctx) => [
      await ctx.db.get("users", ids.alice),
      await ctx.db.get("users", ids.bob),
    ]);
    expect(updatedAlice?.wantsNotifications).toBe(true);
    expect(bob?.wantsNotifications).toBe(true);

    await alice.mutation(api.users.updateNotificationPreference, {
      wantsNotifications: false,
    });
    expect(
      (await t.run((ctx) => ctx.db.get("users", ids.alice)))?.wantsNotifications,
    ).toBe(false);
  });

  test("signed-out callers cannot edit profiles", async () => {
    const { t, ids } = await setup();
    await expect(
      t.mutation(api.users.updateNotificationPreference, {
        wantsNotifications: true,
      }),
    ).rejects.toThrow("Not authenticated");
    await expect(
      t.mutation(api.users.updateProfile, {
        prefix: "Ms.",
        firstName: "A",
        lastName: "B",
        phone: "1",
        affiliationId: ids.affiliation,
        participantCategory: "Faculty",
      }),
    ).rejects.toThrow("Not authenticated");
    await expect(
      t.action(api.users.changePassword, {
        currentPassword: "password1",
        newPassword: "password2",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
