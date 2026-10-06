"use client";

import {
  RICH_TEXT_FORMATS,
  RichTextOp,
  sanitizeRichTextOps,
} from "@/lib/richText";
import "quill/dist/quill.snow.css";
import { CSSProperties, useEffect, useRef } from "react";
import styles from "./abstract-editor.module.scss";

const TOOLBAR = [
  ["bold", "italic", "underline"],
  [{ script: "sub" }, { script: "super" }],
  ["clean"],
];

/**
 * Quill editor, by default limited to the abstract's inline formatting. The
 * initial value is read once on mount; afterwards the editor owns its content
 * and reports changes. Pass `toolbar`, `formats`, and `sanitize` together to
 * allow other formats.
 */
export default function RichTextEditor<Op = RichTextOp>({
  initialValue,
  onChange,
  placeholder,
  labelledBy,
  invalid = false,
  toolbar = TOOLBAR,
  formats = RICH_TEXT_FORMATS,
  sanitize = sanitizeRichTextOps as unknown as (ops: unknown[]) => Op[],
  minHeight,
}: {
  initialValue: ReadonlyArray<Op>;
  onChange: (ops: Op[], plainText: string) => void;
  placeholder?: string;
  labelledBy?: string;
  invalid?: boolean;
  toolbar?: unknown[];
  formats?: ReadonlyArray<string>;
  sanitize?: (ops: unknown[]) => Op[];
  /** CSS length for the editing area, e.g. "24rem". */
  minHeight?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  const optionsRef = useRef({ placeholder, toolbar, formats, sanitize });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const editorElement = document.createElement("div");
    host.appendChild(editorElement);

    void import("quill").then(({ default: Quill }) => {
      if (cancelled) return;
      const quill = new Quill(editorElement, {
        theme: "snow",
        placeholder: optionsRef.current.placeholder,
        formats: [...optionsRef.current.formats],
        modules: { toolbar: optionsRef.current.toolbar },
      });
      quill.setContents(
        [...initialValueRef.current] as Parameters<typeof quill.setContents>[0],
        "silent",
      );
      quill.root.setAttribute("role", "textbox");
      quill.root.setAttribute("aria-multiline", "true");
      if (labelledBy) {
        quill.root.setAttribute("aria-labelledby", labelledBy);
      }
      quill.on("text-change", () => {
        onChangeRef.current(
          optionsRef.current.sanitize(quill.getContents().ops),
          quill.getText(),
        );
      });
    });

    return () => {
      cancelled = true;
      // Quill inserts its toolbar next to the editor element; clear both.
      host.replaceChildren();
    };
  }, [labelledBy]);

  return (
    <div
      ref={hostRef}
      className={`${styles.quillHost} ${invalid ? styles.quillInvalid : ""}`}
      style={
        minHeight
          ? ({ "--quill-min-height": minHeight } as CSSProperties)
          : undefined
      }
    />
  );
}
