export const ABSTRACT_WORD_LIMIT = 250;
/** Hard ceiling for saved drafts, so autosave never rejects an over-length paste. */
export const ABSTRACT_DRAFT_WORD_CEILING = 2000;
export const RICH_TEXT_MAX_OPS = 2000;

export const RICH_TEXT_FORMATS = [
  "bold",
  "italic",
  "underline",
  "script",
] as const;

export type RichTextAttributes = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  script?: "sub" | "super";
};

export type RichTextOp = {
  insert: string;
  attributes?: RichTextAttributes;
};

function pickAttributes(raw: unknown): RichTextAttributes | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  const attributes: RichTextAttributes = {};
  if (source.bold === true) attributes.bold = true;
  if (source.italic === true) attributes.italic = true;
  if (source.underline === true) attributes.underline = true;
  if (source.script === "sub" || source.script === "super") {
    attributes.script = source.script;
  }
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function sameAttributes(a?: RichTextAttributes, b?: RichTextAttributes) {
  return (
    a?.bold === b?.bold &&
    a?.italic === b?.italic &&
    a?.underline === b?.underline &&
    a?.script === b?.script
  );
}

/**
 * Reduces arbitrary Quill delta ops to the formats the abstract supports:
 * text inserts with bold, italic, underline, and sub/superscript. Embeds and
 * any other attributes are dropped, and neighbouring runs are merged.
 */
export function sanitizeRichTextOps(ops: ReadonlyArray<unknown>): RichTextOp[] {
  const result: RichTextOp[] = [];
  for (const raw of ops) {
    if (!raw || typeof raw !== "object") continue;
    const op = raw as { insert?: unknown; attributes?: unknown };
    if (typeof op.insert !== "string" || op.insert.length === 0) continue;
    const insert = op.insert.replace(/\r\n?/g, "\n");
    // Line breaks never carry inline formatting.
    const attributes = insert === "\n" ? undefined : pickAttributes(op.attributes);
    const previous = result[result.length - 1];
    if (previous && sameAttributes(previous.attributes, attributes)) {
      previous.insert += insert;
    } else {
      result.push(attributes ? { insert, attributes } : { insert });
    }
  }
  return result;
}

export function richTextToPlainText(ops: ReadonlyArray<RichTextOp>): string {
  return ops
    .map((op) => op.insert)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextToRichText(text: string): RichTextOp[] {
  const trimmed = text.trim();
  return trimmed ? [{ insert: `${trimmed}\n` }] : [];
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Splits ops into paragraphs (one per line), keeping inline formatting. */
export function richTextParagraphs(
  ops: ReadonlyArray<RichTextOp>,
): RichTextOp[][] {
  const paragraphs: RichTextOp[][] = [[]];
  for (const op of ops) {
    const lines = op.insert.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        paragraphs.push([]);
      }
      if (line) {
        paragraphs[paragraphs.length - 1].push({
          insert: line,
          attributes: op.attributes,
        });
      }
    });
  }
  return paragraphs.filter((paragraph) =>
    paragraph.some((op) => op.insert.trim().length > 0),
  );
}
