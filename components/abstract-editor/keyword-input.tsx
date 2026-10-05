"use client";

import { MAX_ABSTRACT_KEYWORDS, normalizeKeywords } from "@/lib/abstractForm";
import { useState } from "react";
import styles from "./abstract-editor.module.scss";

export default function KeywordInput({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string;
  value: ReadonlyArray<string>;
  onChange: (keywords: string[]) => void;
  invalid?: boolean;
}) {
  const [text, setText] = useState("");
  const full = value.length >= MAX_ABSTRACT_KEYWORDS;

  function commit(raw: string) {
    const next = normalizeKeywords([...value, ...raw.split(/[,;\n]/)]).slice(
      0,
      MAX_ABSTRACT_KEYWORDS,
    );
    if (next.length !== value.length) {
      onChange(next);
    }
    setText("");
  }

  return (
    <div
      className={`${styles.keywordBox} ${invalid ? styles.keywordInvalid : ""}`}
    >
      <ul className={styles.keywordChips}>
        {value.map((keyword) => (
          <li key={keyword}>
            {keyword}
            <button
              type="button"
              aria-label={`Remove keyword ${keyword}`}
              onClick={() => onChange(value.filter((item) => item !== keyword))}
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <input
        id={id}
        value={text}
        disabled={full}
        placeholder={
          full
            ? `Maximum of ${MAX_ABSTRACT_KEYWORDS} keywords`
            : value.length === 0
              ? "Type a keyword and press Enter"
              : "Add another keyword"
        }
        onChange={(event) => {
          const next = event.target.value;
          if (/[,;]/.test(next)) {
            commit(next);
          } else {
            setText(next);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(text);
          } else if (event.key === "Backspace" && !text && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (text.trim()) commit(text);
        }}
      />
    </div>
  );
}
