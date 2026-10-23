/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { withSignature } from "./lib/mailSignature";
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from "./lib/webhookSignature";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const snapshot = {
  subject: "Sponsorship enquiry",
  from: "partner@example.com",
  to: ["external@cicmasrc.org"],
  folder: "inbox" as const,
  read: false,
  hasAttachment: false,
  emailCount: 1,
  lastActivityAt: 1000,
};

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const insertUser = (email: string, role?: "staff" | "super_admin") =>
      ctx.db.insert("users", { email, searchText: email, role, claimedAt: 1 });
    const admin = await insertUser("admin@example.com", "super_admin");
    const member = await insertUser("member@example.com", "staff");
    const outsider = await insertUser("outsider@example.com", "staff");
    const participant = await insertUser("participant@example.com");
    const inbox = await ctx.db.insert("mailInboxes", {
      address: "external@cicmasrc.org",
      name: "External Affairs",
      fromName: "ASRC 2027",
      resendInboxId: "inbox_external",
    });
    await ctx.db.insert("mailInboxMembers", {
      inboxId: inbox,
      userId: member,
      addedBy: admin,
      addedAt: 1,
    });
    return { admin, member, outsider, participant, inbox };
  });
  const as = (userId: (typeof ids)[keyof typeof ids]) =>
    t.withIdentity({ subject: userId });
  return { t, ids, as };
}

const firstPage = { numItems: 10, cursor: null };

describe("mail access", () => {
  test("members and super admins can list threads; others cannot", async () => {
    const { t, ids, as } = await setup();
    await t.mutation(internal.mail.upsertThread, {
      resendInboxId: "inbox_external",
      resendThreadId: "thread_1",
      snapshot,
    });
    const args = { inboxId: ids.inbox, folder: "inbox" as const, paginationOpts: firstPage };

    const memberPage = await as(ids.member).query(api.mail.listThreads, args);
    expect(memberPage.page).toHaveLength(1);
    const adminPage = await as(ids.admin).query(api.mail.listThreads, args);
    expect(adminPage.page).toHaveLength(1);

    await expect(
      as(ids.outsider).query(api.mail.listThreads, args),
    ).rejects.toThrow("Unauthorized");
    await expect(
      as(ids.participant).query(api.mail.listThreads, args),
    ).rejects.toThrow("Unauthorized");
  });

  test("listMyInboxes returns only accessible inboxes with unread counts", async () => {
    const { t, ids, as } = await setup();
    await t.mutation(internal.mail.upsertThread, {
      resendInboxId: "inbox_external",
      resendThreadId: "thread_1",
      snapshot,
    });
    const mine = await as(ids.member).query(api.mail.listMyInboxes, {});
    expect(mine).toEqual([
      expect.objectContaining({ address: "external@cicmasrc.org", unread: 1 }),
    ]);
    expect(await as(ids.outsider).query(api.mail.listMyInboxes, {})).toEqual([]);
    expect(await as(ids.participant).query(api.mail.listMyInboxes, {})).toEqual([]);
  });

  test("only super admins assign inboxes, and only to staff", async () => {
    const { ids, as } = await setup();
    await expect(
      as(ids.member).mutation(api.mail.setInboxMembership, {
        userId: ids.outsider,
        inboxId: ids.inbox,
        assigned: true,
      }),
    ).rejects.toThrow("Unauthorized");
    await expect(
      as(ids.admin).mutation(api.mail.setInboxMembership, {
        userId: ids.participant,
        inboxId: ids.inbox,
        assigned: true,
      }),
    ).rejects.toThrow("staff role");

    await as(ids.admin).mutation(api.mail.setInboxMembership, {
      userId: ids.outsider,
      inboxId: ids.inbox,
      assigned: true,
    });
    expect(await as(ids.outsider).query(api.mail.listMyInboxes, {})).toHaveLength(1);
  });

  test("removing a user's role drops their inbox memberships", async () => {
    const { ids, as } = await setup();
    await as(ids.admin).mutation(api.adminUsers.removeRole, { userId: ids.member });
    const assignments = await as(ids.admin).query(api.mail.listUserInboxes, {
      userId: ids.member,
    });
    expect(assignments.every((inbox) => !inbox.assigned)).toBe(true);
  });
});

describe("recipient suggestions", () => {
  test("suggests registered users to inbox members only", async () => {
    const { t, ids, as } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "rin@example.com",
        firstName: "Rin",
        lastName: "Resident",
        searchText: "rin resident rin@example.com example university",
        claimedAt: 1,
      });
    });
    const args = { inboxId: ids.inbox, search: "rin" };
    expect(await as(ids.member).query(api.mail.suggestRecipients, args)).toEqual([
      { name: "Rin Resident", email: "rin@example.com" },
    ]);
    expect(
      await as(ids.member).query(api.mail.suggestRecipients, { ...args, search: "r" }),
    ).toEqual([]);
    await expect(
      as(ids.outsider).query(api.mail.suggestRecipients, args),
    ).rejects.toThrow("Unauthorized");
  });
});

describe("mail cache", () => {
  test("upsertThread is idempotent and ignores unknown inboxes", async () => {
    const { t, ids } = await setup();
    const first = await t.mutation(internal.mail.upsertThread, {
      resendInboxId: "inbox_external",
      resendThreadId: "thread_1",
      snapshot,
    });
    const second = await t.mutation(internal.mail.upsertThread, {
      resendInboxId: "inbox_external",
      resendThreadId: "thread_1",
      snapshot: { ...snapshot, read: true, emailCount: 2 },
    });
    expect(second).toBe(first);
    const rows = await t.run((ctx) =>
      ctx.db
        .query("mailThreads")
        .withIndex("by_inboxId_and_folder_and_lastActivityAt", (q) =>
          q.eq("inboxId", ids.inbox).eq("folder", "inbox"),
        )
        .take(10),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ read: true, emailCount: 2 });

    const unknown = await t.mutation(internal.mail.upsertThread, {
      resendInboxId: "inbox_other",
      resendThreadId: "thread_2",
      snapshot,
    });
    expect(unknown).toBeNull();
  });

  test("recordWebhookEvent dedupes by svix id", async () => {
    const { t } = await setup();
    expect(await t.mutation(internal.mail.recordWebhookEvent, { svixId: "msg_1" })).toBe(true);
    expect(await t.mutation(internal.mail.recordWebhookEvent, { svixId: "msg_1" })).toBe(false);
  });
});

describe("webhook signatures", () => {
  const secret = `whsec_${btoa("test-signing-secret-0123456789")}`;
  const body = JSON.stringify({ type: "inbox.email.received", data: {} });

  async function signed(overrides: Partial<{ body: string; nowSeconds: number }> = {}) {
    const timestamp = "1700000000";
    const signature = await signWebhookPayload({ secret, id: "msg_1", timestamp, body });
    return verifyWebhookSignature({
      secret,
      id: "msg_1",
      timestamp,
      signature: `v1,bogus v1,${signature}`,
      body: overrides.body ?? body,
      nowSeconds: overrides.nowSeconds ?? 1700000010,
    });
  }

  test("accepts a correctly signed payload", async () => {
    expect(await signed()).toBe(true);
  });

  test("rejects a tampered body", async () => {
    expect(await signed({ body: `${body} ` })).toBe(false);
  });

  test("rejects an old timestamp", async () => {
    expect(await signed({ nowSeconds: 1700000000 + 60 * 60 })).toBe(false);
  });
});

describe("mail signatures", () => {
  const sender = {
    name: "Pat <Example>",
    position: "Website Lead",
    email: "pr@cicmasrc.org",
  };
  const body = { html: "<p>Hello</p>", text: "Hello" };

  test("full signature has logo, escaped name and position", () => {
    const signed = withSignature(body, sender, "full");
    expect(signed.html).toContain("asrc.png");
    expect(signed.html).toContain("Pat &lt;Example&gt;");
    expect(signed.html).toContain("Website Lead");
    expect(signed.html).toContain("mailto:pr@cicmasrc.org");
    expect(signed.text).toContain("Hello\n\n-- \nPat <Example>\nWebsite Lead");
  });

  test("compact signature is text only and skips a missing position", () => {
    const signed = withSignature(body, { name: "Pat", email: "pr@cicmasrc.org" }, "compact");
    expect(signed.html).not.toContain("<img");
    expect(signed.html).not.toContain(`<span style="color:#c3003f;">`);
    expect(signed.text.split("\n")[3]).toBe("Pat");
  });

  test("none leaves the body unchanged", () => {
    expect(withSignature(body, sender, "none")).toBe(body);
  });
});

describe("staff position", () => {
  test("only super admins set it, and only on staff", async () => {
    const { t, ids, as } = await setup();
    await expect(
      as(ids.member).mutation(api.adminUsers.setStaffPosition, {
        userId: ids.member,
        staffPosition: "Lead",
      }),
    ).rejects.toThrow("Unauthorized");
    await expect(
      as(ids.admin).mutation(api.adminUsers.setStaffPosition, {
        userId: ids.participant,
        staffPosition: "Lead",
      }),
    ).rejects.toThrow("staff");
    await as(ids.admin).mutation(api.adminUsers.setStaffPosition, {
      userId: ids.member,
      staffPosition: "  Website   Lead ",
    });
    const member = await t.run((ctx) => ctx.db.get("users", ids.member));
    expect(member?.staffPosition).toBe("Website Lead");
  });
});
