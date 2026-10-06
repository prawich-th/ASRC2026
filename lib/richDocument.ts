/**
 * Rich documents (announcements) are stored as a restricted Quill delta:
 * text inserts with inline formatting, plus block formatting carried on the
 * line-break inserts, as Quill does.
 */

export const RICH_DOCUMENT_MAX_OPS = 5000;
export const RICH_DOCUMENT_MAX_LINK_LENGTH = 2000;

export const RICH_DOCUMENT_FORMATS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "script",
  "link",
  "header",
  "list",
  "blockquote",
] as const;

export type RichDocumentInline = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  script?: "sub" | "super";
  link?: string;
};

export type RichDocumentBlock = {
  header?: 1 | 2 | 3;
  list?: "ordered" | "bullet";
  blockquote?: boolean;
};

export type RichDocumentAttributes = RichDocumentInline & RichDocumentBlock;

export type RichDocumentOp = {
  insert: string;
  attributes?: RichDocumentAttributes;
};

export type RichDocumentLine = {
  segments: Array<{ text: string; attributes?: RichDocumentInline }>;
  block: RichDocumentBlock;
};

/** Accepts only web and email links, so stored content can never run script. */
export function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const link = value.trim();
  if (!link || link.length > RICH_DOCUMENT_MAX_LINK_LENGTH) return undefined;
  if (/^(https?:\/\/|mailto:)/i.test(link)) return link;
  // Quill stores bare domains as typed; treat them as https.
  if (/^[\w-]+(\.[\w-]+)+([/?#]\S*)?$/.test(link)) return `https://${link}`;
  return undefined;
}

function pickInline(source: Record<string, unknown>): RichDocumentInline {
  const attributes: RichDocumentInline = {};
  if (source.bold === true) attributes.bold = true;
  if (source.italic === true) attributes.italic = true;
  if (source.underline === true) attributes.underline = true;
  if (source.strike === true) attributes.strike = true;
  if (source.script === "sub" || source.script === "super") {
    attributes.script = source.script;
  }
  const link = safeLink(source.link);
  if (link) attributes.link = link;
  return attributes;
}

function pickBlock(source: Record<string, unknown>): RichDocumentBlock {
  const attributes: RichDocumentBlock = {};
  if (source.header === 1 || source.header === 2 || source.header === 3) {
    attributes.header = source.header;
  }
  if (source.list === "ordered" || source.list === "bullet") {
    attributes.list = source.list;
  }
  if (source.blockquote === true) attributes.blockquote = true;
  return attributes;
}

function isLineBreaks(text: string) {
  return /^\n+$/.test(text);
}

function sameAttributes(a?: RichDocumentAttributes, b?: RichDocumentAttributes) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

/**
 * Reduces arbitrary Quill delta ops to the supported formats. Inline
 * formatting stays on text, block formatting on line breaks; embeds and
 * unknown attributes are dropped and neighbouring text runs merged.
 */
export function sanitizeRichDocument(
  ops: ReadonlyArray<unknown>,
): RichDocumentOp[] {
  const result: RichDocumentOp[] = [];
  for (const raw of ops) {
    if (!raw || typeof raw !== "object") continue;
    const op = raw as { insert?: unknown; attributes?: unknown };
    if (typeof op.insert !== "string" || op.insert.length === 0) continue;
    const insert = op.insert.replace(/\r\n?/g, "\n");
    const source =
      op.attributes && typeof op.attributes === "object"
        ? (op.attributes as Record<string, unknown>)
        : {};
    const breaks = isLineBreaks(insert);
    const picked: RichDocumentAttributes = breaks
      ? pickBlock(source)
      : pickInline(source);
    const attributes = Object.keys(picked).length > 0 ? picked : undefined;
    const previous = result[result.length - 1];
    if (
      previous &&
      isLineBreaks(previous.insert) === breaks &&
      sameAttributes(previous.attributes, attributes)
    ) {
      previous.insert += insert;
    } else {
      result.push(attributes ? { insert, attributes } : { insert });
    }
  }
  return result;
}

/** Splits a document into lines, each with its block formatting. */
export function richDocumentLines(
  ops: ReadonlyArray<RichDocumentOp>,
): RichDocumentLine[] {
  const lines: RichDocumentLine[] = [];
  let segments: RichDocumentLine["segments"] = [];
  for (const op of ops) {
    const parts = op.insert.split("\n");
    parts.forEach((text, index) => {
      if (index > 0) {
        const block = isLineBreaks(op.insert)
          ? pickBlock((op.attributes ?? {}) as Record<string, unknown>)
          : {};
        lines.push({ segments, block });
        segments = [];
      }
      if (text) {
        const inline = op.attributes
          ? pickInline(op.attributes as Record<string, unknown>)
          : {};
        segments.push(
          Object.keys(inline).length > 0
            ? { text, attributes: inline }
            : { text },
        );
      }
    });
  }
  if (segments.length > 0) {
    lines.push({ segments, block: {} });
  }
  return lines;
}

function lineText(line: RichDocumentLine) {
  return line.segments.map((segment) => segment.text).join("");
}

export function richDocumentToPlainText(
  ops: ReadonlyArray<RichDocumentOp>,
): string {
  let ordered = 0;
  return richDocumentLines(ops)
    .map((line) => {
      const text = lineText(line);
      ordered = line.block.list === "ordered" ? ordered + 1 : 0;
      if (line.block.list === "ordered") return `${ordered}. ${text}`;
      if (line.block.list === "bullet") return `- ${text}`;
      if (line.block.blockquote) return `> ${text}`;
      return text;
    })
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseInlineMarkdown(
  text: string,
): Array<{ text: string; attributes?: RichDocumentInline }> {
  const segments: Array<{ text: string; attributes?: RichDocumentInline }> =
    [];
  const pattern =
    /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|~~([^~]+)~~|`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: text.slice(last, index) });
    if (match[1] !== undefined) {
      const link = safeLink(match[2]);
      segments.push(link ? { text: match[1], attributes: { link } } : { text: match[1] });
    } else if (match[3] ?? match[4]) {
      segments.push({ text: (match[3] ?? match[4])!, attributes: { bold: true } });
    } else if (match[5] ?? match[6]) {
      segments.push({ text: (match[5] ?? match[6])!, attributes: { italic: true } });
    } else if (match[7]) {
      segments.push({ text: match[7], attributes: { strike: true } });
    } else if (match[8]) {
      segments.push({ text: match[8] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** Best-effort conversion of the legacy Markdown announcement bodies. */
export function markdownToRichDocument(markdown: string): RichDocumentOp[] {
  const ops: unknown[] = [];
  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    let text = line;
    let block: RichDocumentBlock = {};
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (heading) {
      text = heading[2];
      block = { header: Math.min(heading[1].length, 3) as 1 | 2 | 3 };
    } else if (bullet) {
      text = bullet[1];
      block = { list: "bullet" };
    } else if (ordered) {
      text = ordered[1];
      block = { list: "ordered" };
    } else if (quote) {
      text = quote[1];
      block = { blockquote: true };
    }
    for (const segment of parseInlineMarkdown(text)) {
      ops.push({ insert: segment.text, attributes: segment.attributes });
    }
    ops.push({ insert: "\n", attributes: block });
  }
  return sanitizeRichDocument(ops);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function segmentHtml(segment: RichDocumentLine["segments"][number]): string {
  const attributes = segment.attributes ?? {};
  let html = escapeHtml(segment.text);
  if (attributes.script === "sub") html = `<sub>${html}</sub>`;
  if (attributes.script === "super") html = `<sup>${html}</sup>`;
  if (attributes.strike) html = `<s>${html}</s>`;
  if (attributes.underline) html = `<u>${html}</u>`;
  if (attributes.italic) html = `<em>${html}</em>`;
  if (attributes.bold) html = `<strong>${html}</strong>`;
  if (attributes.link) {
    html = `<a href="${escapeHtml(attributes.link)}" style="color:#135642;text-decoration:underline;">${html}</a>`;
  }
  return html;
}

/** Email-safe HTML with inline styles. All text and links are escaped. */
export function richDocumentToEmailHtml(
  ops: ReadonlyArray<RichDocumentOp>,
): string {
  const output: string[] = [];
  let list: "ol" | "ul" | null = null;
  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = null;
  };
  for (const line of richDocumentLines(ops)) {
    const html = line.segments.map(segmentHtml).join("");
    if (line.block.list) {
      const tag = line.block.list === "ordered" ? "ol" : "ul";
      if (list !== tag) {
        closeList();
        output.push(
          `<${tag} style="margin:0 0 14px;padding-left:22px;color:#4f4b45;font-size:15px;line-height:1.7;">`,
        );
        list = tag;
      }
      output.push(`<li>${html}</li>`);
      continue;
    }
    closeList();
    if (!html.trim()) continue;
    if (line.block.header) {
      const level = line.block.header + 1;
      output.push(
        `<h${level} style="margin:22px 0 8px;color:#171717;line-height:1.35;">${html}</h${level}>`,
      );
    } else if (line.block.blockquote) {
      output.push(
        `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #dc7339;background:#fffcf7;color:#625e57;font-size:15px;line-height:1.65;">${html}</blockquote>`,
      );
    } else {
      output.push(
        `<p style="margin:0 0 14px;color:#4f4b45;font-size:15px;line-height:1.7;">${html}</p>`,
      );
    }
  }
  closeList();
  return output.join("");
}
