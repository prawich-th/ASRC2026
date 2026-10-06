/// <reference types="vite/client" />

import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const page = { numItems: 50, cursor: null };

async function setup() {
  const t = convexTest(schema, modules);
  resendTest.register(t);
  const ids = await t.run(async (ctx) => {
    const affiliation = await ctx.db.insert("affiliations", {
      faculty: "Faculty of Medicine",
      university: "Thammasat University",
      province: "Pathum Thani",
      country: "Thailand",
      normalizedKey: "thammasat",
      status: "verified",
      updatedAt: 1,
    });
    const admin = await ctx.db.insert("users", {
      name: "Admin",
      email: "admin@example.com",
      role: "super_admin",
      claimedAt: 1,
    });
    const academic = await ctx.db.insert("users", {
      name: "Academic",
      email: "academic@example.com",
      role: "academic_staff",
      claimedAt: 1,
    });
    const resident = await ctx.db.insert("users", {
      name: "Rin Resident",
      email: "rin@example.com",
      participantCategory: "Resident",
      affiliationId: affiliation,
      profileComplete: true,
      wantsNotifications: true,
      claimedAt: 1,
    });
    const invited = await ctx.db.insert("users", {
      name: "Ina Invited",
      email: "ina@example.com",
      participantCategory: "Medical Student",
      profileComplete: true,
      preRegisteredAt: 1,
    });
    const newcomer = await ctx.db.insert("users", {
      email: "new@example.com",
      profileComplete: false,
      claimedAt: 1,
    });
    return { affiliation, admin, academic, resident, invited, newcomer };
  });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    academic: t.withIdentity({ subject: ids.academic }),
  };
}

describe("admin user filters", () => {
  test("combines role, category, status, and affiliation filters", async () => {
    const { ids, admin } = await setup();
    const emails = async (filters: object) =>
      (
        await admin.query(api.adminUsers.list, {
          paginationOpts: page,
          ...filters,
        })
      ).page
        .map((user) => user.email)
        .sort();

    expect(await emails({ role: "none" })).toEqual([
      "ina@example.com",
      "new@example.com",
      "rin@example.com",
    ]);
    expect(await emails({ role: "academic_staff" })).toEqual([
      "academic@example.com",
    ]);
    expect(await emails({ participantCategory: "Resident" })).toEqual([
      "rin@example.com",
    ]);
    expect(await emails({ account: "awaiting_signup" })).toEqual([
      "ina@example.com",
    ]);
    expect(await emails({ role: "none", profile: "incomplete" })).toEqual([
      "new@example.com",
    ]);
    expect(await emails({ notifications: "subscribed" })).toEqual([
      "rin@example.com",
    ]);
    expect(
      await emails({ affiliationId: ids.affiliation, role: "none" }),
    ).toEqual(["rin@example.com"]);
  });

  test("newest-first is the default order", async () => {
    const { admin } = await setup();
    const newest = await admin.query(api.adminUsers.list, {
      paginationOpts: page,
    });
    const oldest = await admin.query(api.adminUsers.list, {
      paginationOpts: page,
      order: "oldest",
    });
    expect(newest.page[0].email).toBe("new@example.com");
    expect(oldest.page[0].email).toBe("admin@example.com");
  });

  test("backfill indexes affiliation details and profile fields", async () => {
    const { t, ids, admin } = await setup();
    await t.mutation(internal.adminUsers.backfillUserSearchFields, {
      cursor: null,
    });
    const user = await t.run((ctx) => ctx.db.get("users", ids.resident));
    expect(user?.searchText).toContain("pathum thani");
    expect(user?.searchText).toContain("resident");
    const result = await admin.query(api.adminUsers.list, {
      paginationOpts: page,
      search: "Thammasat",
      participantCategory: "Resident",
    });
    expect(result.page.map((item) => item.email)).toEqual(["rin@example.com"]);
    const participants = await admin.query(api.adminUsers.list, {
      paginationOpts: page,
      search: "Ina",
      role: "none",
      account: "awaiting_signup",
    });
    expect(participants.page.map((item) => item.email)).toEqual([
      "ina@example.com",
    ]);
  });
});

describe("admin abstract filters", () => {
  async function seedAbstracts() {
    const context = await setup();
    const { t, ids } = context;
    await t.run(async (ctx) => {
      const base = {
        ownerId: ids.resident,
        body: "Body",
        affiliationDeclared: true,
        updatedAt: 1,
      };
      await ctx.db.insert("abstracts", {
        ...base,
        code: "100001",
        title: "Sleep and memory",
        keywords: ["sleep"],
        authorList: [
          {
            name: "Somchai Author",
            affiliationId: ids.affiliation,
            presenting: true,
          },
        ],
        status: "submitted",
        submittedAt: 1_000,
      });
      await ctx.db.insert("abstracts", {
        ...base,
        code: "100002",
        title: "Cardiac outcomes",
        keywords: ["heart"],
        category: "poster",
        status: "selected",
        submittedAt: 2_000,
        reviewedAt: 2_500,
      });
      await ctx.db.insert("abstracts", {
        ...base,
        code: "100003",
        title: "Unsent draft",
        keywords: [],
        status: "draft",
      });
    });
    await t.mutation(internal.abstracts.backfillAbstractSearchText, {
      cursor: null,
    });
    return context;
  }

  test("searches authors, keywords, affiliations, and submitters", async () => {
    const { academic } = await seedAbstracts();
    const codes = async (search: string) =>
      (
        await academic.query(api.abstracts.listForReview, {
          paginationOpts: page,
          search,
        })
      ).page.map((item) => item.abstract.code);

    expect(await codes("Somchai")).toEqual(["100001"]);
    expect(await codes("heart")).toEqual(["100002"]);
    expect(await codes("Thammasat")).toEqual(["100001"]);
    expect((await codes("rin@example.com")).sort()).toEqual([
      "100001",
      "100002",
    ]);
    expect(await codes("100002")).toEqual(["100002"]);
    expect(await codes("draft")).toEqual([]);
  });

  test("filters by category, review state, and submission dates", async () => {
    const { academic } = await seedAbstracts();
    const codes = async (filters: object) =>
      (
        await academic.query(api.abstracts.listForReview, {
          paginationOpts: page,
          ...filters,
        })
      ).page.map((item) => item.abstract.code);

    expect(await codes({})).toEqual(["100002", "100001"]);
    expect(await codes({ order: "oldest" })).toEqual(["100001", "100002"]);
    expect(await codes({ category: "none" })).toEqual(["100001"]);
    expect(await codes({ reviewed: "reviewed" })).toEqual(["100002"]);
    expect(await codes({ submittedFrom: 1_500 })).toEqual(["100002"]);
    expect(await codes({ submittedTo: 1_500 })).toEqual(["100001"]);
    expect(
      await codes({ status: "selected", submittedFrom: 0, submittedTo: 1_500 }),
    ).toEqual([]);
  });
});

describe("affiliation CSV import", () => {
  test("adds new rows, skips existing ones, and reports invalid rows", async () => {
    const { t, ids } = await setup();
    await t.run((ctx) => ctx.db.patch("users", ids.admin, { role: "staff" }));
    const staff = t.withIdentity({ subject: ids.admin });
    const result = await staff.mutation(api.affiliations.importBatch, {
      affiliations: [
        { university: "Mahidol University", country: "Thailand" },
        { university: "  mahidol   university ", country: "thailand" },
        { university: "", country: "Thailand" },
      ],
    });
    expect(result).toEqual({
      added: 1,
      skipped: 1,
      errors: [{ index: 2, message: "University / office name is required" }],
    });
    const verified = await staff.query(api.affiliations.listAdmin, {
      status: "verified",
    });
    expect(verified.map((row) => row.affiliation.university)).toContain(
      "Mahidol University",
    );
  });

  test("participants cannot import", async () => {
    const { t, ids } = await setup();
    const participant = t.withIdentity({ subject: ids.resident });
    await expect(
      participant.mutation(api.affiliations.importBatch, {
        affiliations: [{ university: "X", country: "Y" }],
      }),
    ).rejects.toThrow("Unauthorized");
  });
});
