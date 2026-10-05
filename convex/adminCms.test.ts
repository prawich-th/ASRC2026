/// <reference types="vite/client" />

import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUsers() {
  const t = convexTest(schema, modules);
  resendTest.register(t);
  const ids = await t.run(async (ctx) => {
    const participant = await ctx.db.insert("users", {
      name: "Participant",
      email: "delivered+participant@resend.dev",
      wantsNotifications: true,
    });
    const staff = await ctx.db.insert("users", {
      name: "Staff",
      email: "staff@example.com",
      role: "staff",
    });
    const academic = await ctx.db.insert("users", {
      name: "Academic",
      email: "academic@example.com",
      role: "academic_staff",
    });
    const superAdmin = await ctx.db.insert("users", {
      name: "Super Admin",
      email: "admin@example.com",
      role: "super_admin",
    });
    return { participant, staff, academic, superAdmin };
  });
  return { t, ids };
}

describe("tiered administration", () => {
  test("only super admins can assign roles and cannot demote themselves", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });
    const superAdmin = t.withIdentity({ subject: ids.superAdmin });

    await expect(
      staff.mutation(api.adminUsers.setRole, {
        userId: ids.participant,
        role: "staff",
      }),
    ).rejects.toThrow("Unauthorized");

    const updated = await superAdmin.mutation(api.adminUsers.setRole, {
      userId: ids.participant,
      role: "academic_staff",
    });
    expect(updated.role).toBe("academic_staff");

    await expect(
      superAdmin.mutation(api.adminUsers.setRole, {
        userId: ids.superAdmin,
        role: null,
      }),
    ).rejects.toThrow("own role");
  });

  test("staff controls publishing while drafts remain private", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });
    const academic = t.withIdentity({ subject: ids.academic });

    await expect(
      academic.mutation(api.announcements.create, {
        title: "Deadline Extended",
        slug: "deadline-extended",
        summary: "The submission deadline has been extended.",
        body: "## New deadline\n\nPlease submit before the revised date.",
        tags: [{ name: "New", tone: "primary" }],
        authorName: "Conference Office",
        authorTitle: "Public Relations Manager",
        departmentName: "Media and Public Relations",
        departmentEmail: "media@example.com",
      }),
    ).rejects.toThrow("Unauthorized");

    const draft = await staff.mutation(api.announcements.create, {
      title: "Deadline Extended",
      slug: "deadline-extended",
      summary: "The submission deadline has been extended.",
      body: "## New deadline\n\nPlease submit before the revised date.",
      tags: [{ name: "New", tone: "primary" }],
      authorName: "Conference Office",
      authorTitle: "Public Relations Manager",
      departmentName: "Media and Public Relations",
      departmentEmail: "media@example.com",
    });
    expect(await t.query(api.announcements.getBySlug, { slug: draft.slug })).toBeNull();

    await staff.mutation(api.announcements.publish, {
      announcementId: draft._id,
    });
    const published = await t.query(api.announcements.getBySlug, {
      slug: draft.slug,
    });
    expect(published?.status).toBe("published");
    expect(published?.authorName).toBe("Conference Office");
    expect(published?.departmentEmail).toBe("media@example.com");
  });

  test("broadcast campaigns target opted-in users once per content event", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Opted out",
        email: "opted-out@example.com",
        wantsNotifications: false,
      });
    });

    const draft = await staff.mutation(api.announcements.create, {
      title: "Registration is open",
      slug: "registration-open",
      summary: "Registration for ASRC 2027 is now open.",
      body: "Register now.",
      tags: [{ name: "Registration", tone: "primary" }],
      authorName: "Conference Office",
      authorTitle: "Conference Coordinator",
      departmentName: "ASRC Secretariat",
      departmentEmail: "secretariat@example.com",
    });
    await staff.mutation(api.announcements.publish, {
      announcementId: draft._id,
    });
    await staff.mutation(api.announcements.publish, {
      announcementId: draft._id,
    });

    const campaigns = await t.run(async (ctx) => {
      return await ctx.db.query("notificationCampaigns").take(10);
    });
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.kind).toBe("announcement");

    await t.mutation(internal.notifications.processBroadcastCampaign, {
      campaignId: campaigns[0]!._id,
    });
    const completed = await t.run(async (ctx) => {
      return await ctx.db.get(
        "notificationCampaigns",
        campaigns[0]!._id,
      );
    });
    expect(completed?.status).toBe("completed");
    expect(completed?.queuedCount).toBe(1);
  });

  test("academic staff reviews abstracts without leaking private notes", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
        code: "100001",
        title: "A Study",
        body: "Study body",
        keywords: ["research"],
        category: "oral",
        affiliation: "CICM",
        affiliationDeclared: true,
        status: "submitted",
        submittedAt: 100,
        updatedAt: 100,
      });
    });
    const academic = t.withIdentity({ subject: ids.academic });
    const staff = t.withIdentity({ subject: ids.staff });
    const participant = t.withIdentity({ subject: ids.participant });

    await expect(
      staff.mutation(api.abstracts.saveReview, {
        abstractId,
        decision: "selected",
      }),
    ).rejects.toThrow("Unauthorized");

    await expect(
      academic.mutation(api.abstracts.saveReview, {
        abstractId,
        decision: "selected",
      }),
    ).rejects.toThrow("Select an oral or poster presentation category");

    await academic.mutation(api.abstracts.saveReview, {
      abstractId,
      privateNotes: "Internal scoring note",
      submitterFeedback: "Strong submission.",
      decision: "selected",
      category: "oral",
    });

    const ownerView = await participant.query(api.abstracts.getMineById, {
      abstractId,
    });
    expect(ownerView?.abstract.status).toBe("selected");
    expect(ownerView?.abstract.category).toBe("oral");
    expect(ownerView?.abstract.submitterFeedback).toBe("Strong submission.");
    expect(ownerView?.abstract).not.toHaveProperty("privateNotes");
  });

  test("abstract receipts are transactional and do not require broadcast opt-in", async () => {
    const { t, ids } = await seedUsers();
    await t.run(async (ctx) => {
      await ctx.db.patch("users", ids.participant, {
        wantsNotifications: false,
      });
    });
    const participant = t.withIdentity({ subject: ids.participant });
    const affiliationId = await t.run(async (ctx) => {
      return await ctx.db.insert("affiliations", {
        university: "Thammasat University",
        country: "Thailand",
        status: "verified",
        normalizedKey: "||thammasat university|||thailand",
        updatedAt: 0,
      });
    });
    const draft = await participant.mutation(api.abstracts.createDraft, {
      title: "Transactional Receipt Study",
      authorList: [{ name: "Arun Researcher", affiliationId, presenting: true }],
      advisor: "Dr Faculty Advisor",
      advisorAffiliationId: affiliationId,
      bodyRich: [{ insert: "Completed abstract body\n" }],
      keywords: ["email", "notification", "research"],
      affiliationDeclared: true,
    });
    expect(draft.code).toMatch(/^\d{6}$/);

    const submitted = await participant.mutation(
      api.abstracts.submitDraft,
      { abstractId: draft._id },
    );
    expect(submitted.status).toBe("submitted");
  });

  test("notes-only reviews do not decide an abstract", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
        code: "100002",
        title: "Pending Study",
        body: "Study body",
        keywords: ["research"],
        category: "oral",
        affiliation: "CICM",
        affiliationDeclared: true,
        status: "submitted",
        submittedAt: 100,
        updatedAt: 100,
      });
    });
    const academic = t.withIdentity({ subject: ids.academic });

    const reviewed = await academic.mutation(api.abstracts.saveReview, {
      abstractId,
      privateNotes: "Continue reviewing",
    });
    expect(reviewed.status).toBe("submitted");
  });

  test("revision requests require feedback and owners can edit then resubmit", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
        code: "100003",
        title: "Revision Study",
        authors: "Arun Researcher",
        advisor: "Dr Faculty Advisor",
        body: "Original body",
        keywords: ["research"],
        category: "poster",
        affiliation: "CICM",
        affiliationDeclared: true,
        status: "submitted",
        submittedAt: 100,
        updatedAt: 100,
      });
    });
    const academic = t.withIdentity({ subject: ids.academic });
    const participant = t.withIdentity({ subject: ids.participant });

    await expect(
      academic.mutation(api.abstracts.saveReview, {
        abstractId,
        decision: "revision_requested",
      }),
    ).rejects.toThrow("feedback is required");

    await academic.mutation(api.abstracts.saveReview, {
      abstractId,
      privateNotes: "Needs clearer methods",
      submitterFeedback: "Please clarify the methods section.",
      decision: "revision_requested",
    });

    const returned = await participant.query(api.abstracts.getMineById, {
      abstractId,
    });
    expect(returned?.abstract.status).toBe("revision_requested");
    expect(returned?.abstract.submitterFeedback).toContain("clarify");
    expect(returned?.abstract).not.toHaveProperty("privateNotes");

    const affiliationId = await t.run(async (ctx) => {
      return await ctx.db.insert("affiliations", {
        faculty: "CICM",
        university: "Thammasat University",
        country: "Thailand",
        status: "verified",
        normalizedKey: "|cicm|thammasat university|||thailand",
        updatedAt: 0,
      });
    });
    await participant.mutation(api.abstracts.updateDraft, {
      abstractId,
      title: "Revision Study",
      authorList: [{ name: "Arun Researcher", affiliationId, presenting: true }],
      advisor: "Dr Faculty Advisor",
      advisorAffiliationId: affiliationId,
      bodyRich: [{ insert: "Revised body with clearer methods\n" }],
      keywords: ["research", "methods", "revision"],
      affiliationDeclared: true,
    });
    const resubmitted = await participant.mutation(api.abstracts.submitDraft, {
      abstractId,
    });
    expect(resubmitted.status).toBe("submitted");

    const pending = await academic.query(api.abstracts.listForReview, {
      status: "submitted",
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(pending.page.map((item) => item.abstract._id)).toContain(abstractId);
  });

  test("backfill assigns 6-digit codes to abstracts that are missing them", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
        code: "",
        title: "Legacy Study",
        body: "Study body",
        keywords: ["research"],
        category: "oral",
        affiliation: "CICM",
        affiliationDeclared: true,
        status: "submitted",
        submittedAt: 100,
        updatedAt: 100,
      });
    });

    await t.mutation(internal.abstracts.backfillAbstractCodes, { cursor: null });

    const abstract = await t.run(async (ctx) => {
      return await ctx.db.get("abstracts", abstractId);
    });
    expect(abstract?.code).toMatch(/^\d{6}$/);
  });

  test("published key dates are returned in configured order", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });

    await staff.mutation(api.keyDates.create, {
      displayDate: "10 March 2027",
      title: "Conference",
      tone: "red",
      sortOrder: 20,
      published: true,
    });
    await staff.mutation(api.keyDates.create, {
      displayDate: "1 October 2026",
      title: "Submissions open",
      tone: "green",
      sortOrder: 10,
      published: true,
    });

    const dates = await t.query(api.keyDates.listPublished, {});
    expect(dates.map((date) => date.title)).toEqual([
      "Submissions open",
      "Conference",
    ]);
  });

  test("new key dates are appended and can be reordered", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });
    const first = await staff.mutation(api.keyDates.create, {
      displayDate: "1 October 2026",
      title: "Submissions open",
      tone: "green",
      published: true,
    });
    const second = await staff.mutation(api.keyDates.create, {
      displayDate: "10 March 2027",
      title: "Conference",
      tone: "red",
      published: false,
    });
    expect(second.sortOrder).toBeGreaterThan(first.sortOrder);

    await staff.mutation(api.keyDates.reorder, {
      keyDateIds: [second._id, first._id],
    });
    const dates = await staff.query(api.keyDates.listAdmin, {});
    expect(dates.map((date) => date.title)).toEqual([
      "Conference",
      "Submissions open",
    ]);

    await expect(
      staff.mutation(api.keyDates.reorder, {
        keyDateIds: [first._id, first._id],
      }),
    ).rejects.toThrow("Each key date can only appear once");
  });

  test("key date campaigns ignore cosmetic edits and announce visible changes", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });
    const keyDate = await staff.mutation(api.keyDates.create, {
      displayDate: "1 October 2026",
      title: "Submissions open",
      tone: "green",
      sortOrder: 10,
      published: true,
    });

    await staff.mutation(api.keyDates.update, {
      keyDateId: keyDate._id,
      displayDate: keyDate.displayDate,
      title: keyDate.title,
      tone: "orange",
    });
    let campaigns = await t.run(async (ctx) => {
      return await ctx.db.query("notificationCampaigns").take(10);
    });
    expect(campaigns).toHaveLength(1);

    await staff.mutation(api.keyDates.update, {
      keyDateId: keyDate._id,
      displayDate: "8 October 2026",
      title: keyDate.title,
      tone: "orange",
    });
    campaigns = await t.run(async (ctx) => {
      return await ctx.db.query("notificationCampaigns").take(10);
    });
    expect(campaigns).toHaveLength(2);

    await staff.mutation(api.keyDates.setPublished, {
      keyDateId: keyDate._id,
      published: false,
    });
    await staff.mutation(api.keyDates.setPublished, {
      keyDateId: keyDate._id,
      published: true,
    });
    campaigns = await t.run(async (ctx) => {
      return await ctx.db.query("notificationCampaigns").take(10);
    });
    expect(campaigns).toHaveLength(3);
  });
});
