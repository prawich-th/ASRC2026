import { describe, expect, test } from "vitest";
import {
  abstractDecisionEmail,
  abstractSubmissionEmail,
  announcementEmail,
  keyDateEmail,
} from "./lib/emailTemplates";

describe("conference email templates", () => {
  test("renders branded announcements and escapes user-authored content", () => {
    const email = announcementEmail({
      title: "Deadline <extended>",
      summary: "Submit by Friday & review the guidance.",
      body: "## Full article\n\nThis is **important** & complete.",
      url: "https://example.com/announcements/deadline",
    });

    expect(email.subject).toContain("Deadline <extended>");
    expect(email.html).toContain("ASRC 2027");
    expect(email.html).toContain("Deadline &lt;extended&gt;");
    expect(email.html).toContain("Friday &amp; review");
    expect(email.html).toContain(
      "https://asrc-2027.vercel.app/asrc.png",
    );
    expect(email.html).toContain("Full article");
    expect(email.html).toContain("<strong>important</strong>");
    expect(email.html).toContain("&amp; complete.");
    expect(email.text).toContain("This is **important** & complete.");
    expect(email.text).toContain(
      "https://example.com/announcements/deadline",
    );
  });

  test("shows previous and new values for changed key dates", () => {
    const email = keyDateEmail({
      title: "Abstract deadline",
      displayDate: "8 October 2026",
      previousTitle: "Submission deadline",
      previousDisplayDate: "1 October 2026",
      url: "https://example.com",
    });

    expect(email.html).toContain("Previous event");
    expect(email.html).toContain("Submission deadline");
    expect(email.html).toContain("Previous date");
    expect(email.html).toContain("8 October 2026");
  });

  test("distinguishes initial submission and resubmission receipts", () => {
    const initial = abstractSubmissionEmail({
      title: "A Study",
      submissionId: "482917",
      submittedAt: Date.UTC(2026, 7, 23),
      resubmission: false,
      url: "https://example.com/abstracts/abstract-1",
    });
    const revised = abstractSubmissionEmail({
      title: "A Study",
      submissionId: "482917",
      submittedAt: Date.UTC(2026, 7, 24),
      resubmission: true,
      url: "https://example.com/abstracts/abstract-1",
    });

    expect(initial.subject).toContain("abstract has been received");
    expect(initial.html).toContain("482917");
    expect(initial.text).toContain("Submission ID: 482917");
    expect(revised.subject).toContain("revised abstract has been received");
    expect(revised.html).toContain("Resubmission received");
  });

  test.each([
    ["selected", "has been selected"],
    ["rejected", "decision has been made"],
    ["revision_requested", "Revisions are requested"],
  ] as const)("renders the %s decision", (decision, expected) => {
    const email = abstractDecisionEmail({
      decision,
      title: "A Study",
      submissionId: "482917",
      feedback: "Clarify <methods> & results.",
      url: "https://example.com/abstracts/abstract-1",
    });

    expect(email.subject).toContain(expected);
    expect(email.html).toContain("482917");
    expect(email.html).toContain("Clarify &lt;methods&gt; &amp; results.");
    expect(email.text).toContain("Reviewer feedback");
  });
});
