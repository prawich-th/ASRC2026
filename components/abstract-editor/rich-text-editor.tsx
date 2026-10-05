"use client";

import {
  RICH_TEXT_FORMATS,
  RichTextOp,
  sanitizeRichTextOps,
} from "@/lib/richText";
import "quill/dist/quill.snow.css";
import { useEffect, useRef } from "react";
import styles from "./abstract-editor.module.scss";

const TOOLBAR = [
  ["bold", "italic", "underline"],
  [{ script: "sub" }, { script: "super" }],
  ["clean"],
];

/**
 * Quill editor limited to inline formatting. The initial value is read once
 * on mount; afterwards the editor owns its content and reports changes.
 */
export default function RichTextEditor({
  initialValue,
  onChange,
  placeholder,
  labelledBy,
  invalid = false,
}: {
  initialValue: ReadonlyArray<RichTextOp>;
  onChange: (ops: RichTextOp[], plainText: string) => void;
  placeholder?: string;
  labelledBy?: string;
  invalid?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  const placeholderRef = useRef(placeholder);

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
        placeholder: placeholderRef.current,
        formats: [...RICH_TEXT_FORMATS],
        modules: { toolbar: TOOLBAR },
      });
      quill.setContents([...initialValueRef.current], "silent");
      quill.root.setAttribute("role", "textbox");
      quill.root.setAttribute("aria-multiline", "true");
      if (labelledBy) {
        quill.root.setAttribute("aria-labelledby", labelledBy);
      }
      quill.on("text-change", () => {
        onChangeRef.current(
          sanitizeRichTextOps(quill.getContents().ops),
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
    />
  );
}
