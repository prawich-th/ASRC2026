/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUsers() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const participant = await ctx.db.insert("users", {
      name: "Participant",
      email: "participant@example.com",
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

  test("academic staff reviews abstracts without leaking private notes", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
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

    await academic.mutation(api.abstracts.saveReview, {
      abstractId,
      privateNotes: "Internal scoring note",
      submitterFeedback: "Strong submission.",
      decision: "selected",
    });

    const ownerView = await participant.query(api.abstracts.getMineById, {
      abstractId,
    });
    expect(ownerView?.abstract.status).toBe("selected");
    expect(ownerView?.abstract.submitterFeedback).toBe("Strong submission.");
    expect(ownerView?.abstract).not.toHaveProperty("privateNotes");
  });

  test("revision requests require feedback and owners can edit then resubmit", async () => {
    const { t, ids } = await seedUsers();
    const abstractId = await t.run(async (ctx) => {
      return await ctx.db.insert("abstracts", {
        ownerId: ids.participant,
        title: "Revision Study",
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

    await participant.mutation(api.abstracts.updateDraft, {
      abstractId,
      title: "Revision Study",
      body: "Revised body with clearer methods",
      keywords: ["research", "methods"],
      category: "poster",
      affiliation: "CICM",
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

  test("published key dates are returned in configured order", async () => {
    const { t, ids } = await seedUsers();
    const staff = t.withIdentity({ subject: ids.staff });

    await staff.mutation(api.keyDates.create, {
      displayDate: "14 March 2027",
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
});
