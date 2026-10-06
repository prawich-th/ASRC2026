import {
  RichDocumentLine,
  RichDocumentOp,
  richDocumentLines,
} from "@/lib/richDocument";
import { ReactNode } from "react";

function renderSegment(
  segment: RichDocumentLine["segments"][number],
  key: number,
): ReactNode {
  const attributes = segment.attributes ?? {};
  let node: ReactNode = segment.text;
  if (attributes.script === "sub") node = <sub>{node}</sub>;
  if (attributes.script === "super") node = <sup>{node}</sup>;
  if (attributes.strike) node = <s>{node}</s>;
  if (attributes.underline) node = <u>{node}</u>;
  if (attributes.italic) node = <em>{node}</em>;
  if (attributes.bold) node = <strong>{node}</strong>;
  if (attributes.link) {
    const external = /^https?:/i.test(attributes.link);
    node = (
      <a
        href={attributes.link}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {node}
      </a>
    );
  }
  return <span key={key}>{node}</span>;
}

/**
 * Renders a stored rich document as React elements (never raw HTML).
 * Headings start at h2 so the page title stays the only h1.
 */
export default function RichDocumentView({
  ops,
  className,
}: {
  ops: ReadonlyArray<RichDocumentOp>;
  className?: string;
}) {
  const blocks: ReactNode[] = [];
  let list: { tag: "ol" | "ul"; items: ReactNode[] } | null = null;
  const flush = () => {
    if (list) {
      const List = list.tag;
      blocks.push(<List key={blocks.length}>{list.items}</List>);
      list = null;
    }
  };

  richDocumentLines(ops).forEach((line, index) => {
    const content = line.segments.map(renderSegment);
    if (line.block.list) {
      const tag = line.block.list === "ordered" ? "ol" : "ul";
      if (list?.tag !== tag) {
        flush();
        list = { tag, items: [] };
      }
      list!.items.push(<li key={index}>{content}</li>);
      return;
    }
    flush();
    if (content.length === 0) return;
    if (line.block.header) {
      const Heading = `h${line.block.header + 1}` as "h2" | "h3" | "h4";
      blocks.push(<Heading key={blocks.length}>{content}</Heading>);
    } else if (line.block.blockquote) {
      blocks.push(<blockquote key={blocks.length}>{content}</blockquote>);
    } else {
      blocks.push(<p key={blocks.length}>{content}</p>);
    }
  });
  flush();

  return <div className={className}>{blocks}</div>;
}
