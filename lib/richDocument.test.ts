import { describe, expect, test } from "vitest";
import {
  markdownToRichDocument,
  richDocumentToEmailHtml,
  richDocumentToPlainText,
  sanitizeRichDocument,
} from "./richDocument";

describe("rich documents", () => {
  test("keeps supported formats and drops unsafe links and embeds", () => {
    expect(
      sanitizeRichDocument([
        { insert: "Hi", attributes: { bold: true, color: "red" } },
        { insert: "click", attributes: { link: "javascript:alert(1)" } },
        { insert: "site", attributes: { link: "example.com/path" } },
        { insert: { image: "x.png" } },
        { insert: "\n", attributes: { header: 2, bold: true } },
      ]),
    ).toEqual([
      { insert: "Hi", attributes: { bold: true } },
      { insert: "click" },
      { insert: "site", attributes: { link: "https://example.com/path" } },
      { insert: "\n", attributes: { header: 2 } },
    ]);
  });

  test("renders lists and escapes text in email HTML", () => {
    const ops = sanitizeRichDocument([
      { insert: "One <b>" },
      { insert: "\n", attributes: { list: "bullet" } },
      { insert: "Two" },
      { insert: "\n", attributes: { list: "bullet" } },
      { insert: "After\n" },
    ]);
    const html = richDocumentToEmailHtml(ops);
    expect(html).toMatch(/^<ul[^>]*><li>One &lt;b&gt;<\/li><li>Two<\/li><\/ul><p/);
    expect(richDocumentToPlainText(ops)).toBe("- One <b>\n- Two\nAfter");
  });

  test("converts legacy Markdown bodies", () => {
    const ops = markdownToRichDocument(
      "## Deadline\n\nSubmit **now** via [the portal](https://x.org).\n\n1. First\n2. Second",
    );
    expect(richDocumentToPlainText(ops)).toBe(
      "Deadline\n\nSubmit now via the portal.\n\n1. First\n2. Second",
    );
    expect(ops).toContainEqual({ insert: "now", attributes: { bold: true } });
    expect(ops).toContainEqual({
      insert: "the portal",
      attributes: { link: "https://x.org" },
    });
    expect(ops).toContainEqual({ insert: "\n", attributes: { header: 2 } });
  });
});
