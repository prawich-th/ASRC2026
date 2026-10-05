import { RichTextOp, richTextParagraphs } from "@/lib/richText";
import { ReactNode } from "react";

function renderOp(op: RichTextOp, key: number): ReactNode {
  let node: ReactNode = op.insert;
  const attributes = op.attributes;
  if (attributes?.script === "sub") node = <sub>{node}</sub>;
  if (attributes?.script === "super") node = <sup>{node}</sup>;
  if (attributes?.underline) node = <u>{node}</u>;
  if (attributes?.italic) node = <em>{node}</em>;
  if (attributes?.bold) node = <strong>{node}</strong>;
  return <span key={key}>{node}</span>;
}

/** Renders stored abstract text as React elements (never raw HTML). */
export default function RichTextView({
  ops,
  className,
}: {
  ops: ReadonlyArray<RichTextOp>;
  className?: string;
}) {
  return (
    <div className={className}>
      {richTextParagraphs(ops).map((paragraph, index) => (
        <p key={index}>{paragraph.map(renderOp)}</p>
      ))}
    </div>
  );
}
