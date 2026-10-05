import { describe, expect, test } from "vitest";
import { buildAuthorCredits } from "./abstractDisplay";
import {
  countWords,
  richTextParagraphs,
  richTextToPlainText,
  sanitizeRichTextOps,
} from "./richText";

describe("rich text", () => {
  test("keeps only supported inline formats and merges runs", () => {
    const ops = sanitizeRichTextOps([
      { insert: "Hello", attributes: { bold: true, color: "red" } },
      { insert: " world", attributes: { bold: true, link: "javascript:x" } },
      { insert: { image: "https://example.com/x.png" } },
      { insert: "\n", attributes: { header: 1 } },
      { insert: "x", attributes: { script: "evil" } },
    ]);
    expect(ops).toEqual([
      { insert: "Hello world", attributes: { bold: true } },
      { insert: "\nx" },
    ]);
  });

  test("plain text and word counts ignore formatting and blank lines", () => {
    const ops = sanitizeRichTextOps([
      { insert: "One two ", attributes: { italic: true } },
      { insert: "three\n\n\n\nfour\n" },
    ]);
    expect(richTextToPlainText(ops)).toBe("One two three\n\nfour");
    expect(countWords(richTextToPlainText(ops))).toBe(4);
    expect(countWords("   ")).toBe(0);
  });

  test("splits paragraphs without losing formatting", () => {
    const paragraphs = richTextParagraphs([
      { insert: "A", attributes: { bold: true } },
      { insert: "b\n\nc\n" },
    ]);
    expect(paragraphs).toEqual([
      [
        { insert: "A", attributes: { bold: true } },
        { insert: "b", attributes: undefined },
      ],
      [{ insert: "c", attributes: undefined }],
    ]);
  });
});

describe("author credits", () => {
  test("numbers shared affiliations once in order of appearance", () => {
    const affiliations = [
      { _id: "a", university: "Uni A", country: "Thailand" },
      { _id: "b", faculty: "Medicine", university: "Uni B", country: "Thailand" },
    ];
    const credits = buildAuthorCredits(
      [
        { name: "One", affiliationId: "b", presenting: true },
        { name: "Two", affiliationId: "a", presenting: false },
        { name: "Three", affiliationId: "b", presenting: false },
      ],
      { name: "Advisor", affiliationId: "a" },
      affiliations,
    );
    expect(credits.authors.map((author) => author.number)).toEqual([1, 2, 1]);
    expect(credits.advisor?.number).toBe(2);
    expect(credits.affiliations).toEqual([
      { number: 1, label: "Medicine, Uni B, Thailand" },
      { number: 2, label: "Uni A, Thailand" },
    ]);
  });
});
