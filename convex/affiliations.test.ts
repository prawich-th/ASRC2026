/// <reference types="vite/client" />

import resendTest from "@convex-dev/resend/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const THAMMASAT = {
  faculty: "Faculty of Medicine",
  university: "Thammasat University",
  district: "Khlong Luang",
  province: "Pathum Thani",
  country: "Thailand",
};

async function setup() {
  const t = convexTest(schema, modules);
  resendTest.register(t);
  const ids = await t.run(async (ctx) => ({
    alice: await ctx.db.insert("users", {
      name: "Alice",
      email: "delivered+alice@resend.dev",
    }),
    bob: await ctx.db.insert("users", { name: "Bob", email: "bob@example.com" }),
    staff: await ctx.db.insert("users", {
      name: "Staff",
      email: "staff@example.com",
      role: "staff",
    }),
  }));
  return {
    t,
    ids,
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
    staff: t.withIdentity({ subject: ids.staff }),
  };
}

function draftArgs(affiliationId: Id<"affiliations">, body: string) {
  return {
    title: "Sleep and memory",
    studyType: "experimental" as const,
    authorList: [{ name: "Alice Author", affiliationId, presenting: true }],
    advisor: "Dr Advisor",
    advisorAffiliationId: affiliationId,
    bodyRich: [{ insert: `${body}\n` }],
    keywords: ["sleep"],
    affiliationDeclared: true,
  };
}

describe("affiliations", () => {
  test("participant additions stay private until staff verify them", async () => {
    const { alice, bob, staff } = await setup();
    const proposed = await alice.mutation(api.affiliations.propose, {
      ...THAMMASAT,
      university: "  Thammasat   University ",
    });
    expect(proposed.status).toBe("pending");
    expect(proposed.university).toBe("Thammasat University");

    const again = await bob.mutation(api.affiliations.propose, THAMMASAT);
    expect(again._id).toBe(proposed._id);

    expect(
      (await alice.query(api.affiliations.listForSelection, {})).map((a) => a._id),
    ).toContain(proposed._id);
    expect(await bob.query(api.affiliations.listForSelection, {})).toHaveLength(0);

    await expect(
      bob.mutation(api.affiliations.setStatus, {
        affiliationId: proposed._id,
        status: "verified",
      }),
    ).rejects.toThrow("Unauthorized");
    await staff.mutation(api.affiliations.setStatus, {
      affiliationId: proposed._id,
      status: "verified",
    });
    expect(
      (await bob.query(api.affiliations.listForSelection, {})).map((a) => a._id),
    ).toContain(proposed._id);
  });

  test("required fields are enforced", async () => {
    const { staff } = await setup();
    await expect(
      staff.mutation(api.affiliations.create, { ...THAMMASAT, university: " " }),
    ).rejects.toThrow("University / office name is required");
    await expect(
      staff.mutation(api.affiliations.create, { ...THAMMASAT, country: "" }),
    ).rejects.toThrow("Country is required");
  });

  test("profiles store the affiliation and denormalize institution", async () => {
    const { t, ids, alice, staff } = await setup();
    const affiliation = await staff.mutation(api.affiliations.create, THAMMASAT);
    await alice.mutation(api.users.completeProfile, {
      prefix: "Ms.",
      firstName: "Alice",
      lastName: "Author",
      phone: "0800000000",
      affiliationId: affiliation._id,
      participantCategory: "Medical Student",
    });
    const user = await t.run((ctx) => ctx.db.get("users", ids.alice));
    expect(user?.affiliationId).toBe(affiliation._id);
    expect(user?.institution).toBe("Thammasat University");
    expect(user?.department).toBe("Faculty of Medicine");

    await staff.mutation(api.affiliations.update, {
      affiliationId: affiliation._id,
      ...THAMMASAT,
      university: "Thammasat University (Rangsit)",
    });
    const updated = await t.run((ctx) => ctx.db.get("users", ids.alice));
    expect(updated?.institution).toBe("Thammasat University (Rangsit)");
  });

  test("merging moves profiles and abstract references to the kept entry", async () => {
    const { t, ids, alice, staff } = await setup();
    const duplicate = await alice.mutation(api.affiliations.propose, {
      ...THAMMASAT,
      faculty: "Medicine",
    });
    const kept = await staff.mutation(api.affiliations.create, THAMMASAT);
    await alice.mutation(api.users.updateProfile, {
      prefix: "Ms.",
      firstName: "Alice",
      lastName: "Author",
      affiliationId: duplicate._id,
    });
    const draft = await alice.mutation(
      api.abstracts.createDraft,
      draftArgs(duplicate._id, "Body"),
    );

    await staff.mutation(api.affiliations.merge, {
      sourceId: duplicate._id,
      targetId: kept._id,
    });

    const user = await t.run((ctx) => ctx.db.get("users", ids.alice));
    expect(user?.affiliationId).toBe(kept._id);
    const detail = await alice.query(api.abstracts.getMineById, {
      abstractId: draft._id,
    });
    expect(detail?.abstract.authorList?.[0]?.affiliationId).toBe(kept._id);
    expect(detail?.affiliations.map((a) => a._id)).toEqual([kept._id]);
    expect(await alice.query(api.affiliations.listForSelection, {})).toEqual([
      expect.objectContaining({ _id: kept._id }),
    ]);
  });
});

describe("online abstract submission", () => {
  test("drafts may exceed the word limit but submission may not", async () => {
    const { alice, staff } = await setup();
    const affiliation = await staff.mutation(api.affiliations.create, THAMMASAT);
    const longBody = Array.from({ length: 251 }, (_, i) => `word${i}`).join(" ");
    const draft = await alice.mutation(
      api.abstracts.createDraft,
      draftArgs(affiliation._id, longBody),
    );
    await expect(
      alice.mutation(api.abstracts.submitDraft, { abstractId: draft._id }),
    ).rejects.toThrow("Shorten the abstract to 250 words");

    const shortBody = longBody.split(" ").slice(0, 250).join(" ");
    await alice.mutation(api.abstracts.updateDraft, {
      abstractId: draft._id,
      ...draftArgs(affiliation._id, shortBody),
    });
    const submitted = await alice.mutation(api.abstracts.submitDraft, {
      abstractId: draft._id,
    });
    expect(submitted.status).toBe("submitted");
    expect(submitted.body).toBe(shortBody);
  });

  test("every author needs an affiliation and one presenter", async () => {
    const { alice, staff } = await setup();
    const affiliation = await staff.mutation(api.affiliations.create, THAMMASAT);
    const draft = await alice.mutation(api.abstracts.createDraft, {
      ...draftArgs(affiliation._id, "Short body"),
      authorList: [
        { name: "Alice Author", affiliationId: affiliation._id, presenting: false },
        { name: "Bob Author", presenting: false },
      ],
    });
    await expect(
      alice.mutation(api.abstracts.submitDraft, { abstractId: draft._id }),
    ).rejects.toThrow("Every author needs an affiliation.");
    await expect(
      alice.mutation(api.abstracts.submitDraft, { abstractId: draft._id }),
    ).rejects.toThrow("Mark which author will present.");
  });

  test("only one presenting author is kept and formatting is preserved", async () => {
    const { alice, staff } = await setup();
    const affiliation = await staff.mutation(api.affiliations.create, THAMMASAT);
    const draft = await alice.mutation(api.abstracts.createDraft, {
      ...draftArgs(affiliation._id, ""),
      authorList: [
        { name: "First", affiliationId: affiliation._id, presenting: true },
        { name: "Second", affiliationId: affiliation._id, presenting: true },
        { name: "", presenting: false },
      ],
      bodyRich: [
        { insert: "E. coli", attributes: { italic: true } },
        { insert: " grew in H" },
        { insert: "2", attributes: { script: "sub" } },
        { insert: "O.\n" },
      ],
    });
    expect(draft.authorList?.map((author) => author.presenting)).toEqual([
      true,
      false,
    ]);
    expect(draft.body).toBe("E. coli grew in H2O.");
    expect(draft.bodyRich?.[0]).toEqual({
      insert: "E. coli",
      attributes: { italic: true },
    });
  });

  test("owners can delete unsubmitted drafts only", async () => {
    const { alice, bob, staff } = await setup();
    const affiliation = await staff.mutation(api.affiliations.create, THAMMASAT);
    const draft = await alice.mutation(
      api.abstracts.createDraft,
      draftArgs(affiliation._id, "Body"),
    );
    await expect(
      bob.mutation(api.abstracts.deleteDraft, { abstractId: draft._id }),
    ).rejects.toThrow("Abstract not found");
    await alice.mutation(api.abstracts.deleteDraft, { abstractId: draft._id });
    expect(await alice.query(api.abstracts.listMine, {})).toHaveLength(0);
  });
});
