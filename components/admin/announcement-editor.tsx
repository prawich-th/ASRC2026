"use client";

import RichTextEditor from "@/components/abstract-editor/rich-text-editor";
import Button from "@/components/form/button";
import {
  RICH_DOCUMENT_FORMATS,
  RichDocumentOp,
  sanitizeRichDocument,
} from "@/lib/richDocument";
import { FormEvent, useState } from "react";
import styles from "./admin.module.scss";

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ script: "sub" }, { script: "super" }],
  [{ list: "ordered" }, { list: "bullet" }, "blockquote"],
  ["link"],
  ["clean"],
];

export type AnnouncementEditorValue = {
  title: string;
  slug: string;
  summary: string;
  bodyRich: RichDocumentOp[];
  tagNames: string;
  authorName: string;
  authorTitle: string;
  departmentName: string;
  departmentEmail: string;
};

export default function AnnouncementEditor({
  initialValue,
  saving,
  error,
  onSave,
}: {
  initialValue?: AnnouncementEditorValue;
  saving: boolean;
  error: string;
  onSave: (value: AnnouncementEditorValue) => Promise<void>;
}) {
  const [value, setValue] = useState<AnnouncementEditorValue>(
    initialValue ?? {
      title: "",
      slug: "",
      summary: "",
      bodyRich: [],
      tagNames: "New, Academics",
      authorName: "",
      authorTitle: "",
      departmentName: "",
      departmentEmail: "",
    },
  );

  function update<K extends keyof AnnouncementEditorValue>(
    key: K,
    nextValue: AnnouncementEditorValue[K],
  ) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(value);
  }

  return (
    <form className={`${styles.card} ${styles.stack}`} onSubmit={submit}>
      <div className={styles.header}>
        <div>
          <h2>Announcement content</h2>
          <p>
            Format the body with the toolbar: headings, lists, links, and
            quotes appear on the site and in the email exactly as shown.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          Title
          <input
            required
            className={styles.field}
            value={value.title}
            onChange={(event) => update("title", event.target.value)}
          />
        </label>
        <label>
          URL slug
          <input
            required
            className={styles.field}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="deadline-extended"
            value={value.slug}
            onChange={(event) =>
              update(
                "slug",
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/g, "-")
                  .replace(/^-+|-+$/g, ""),
              )
            }
          />
        </label>
        <label className={styles.full}>
          Card summary
          <textarea
            required
            maxLength={320}
            className={styles.textArea}
            value={value.summary}
            onChange={(event) => update("summary", event.target.value)}
          />
        </label>
        <label className={styles.full}>
          Tags, separated by commas
          <input
            className={styles.field}
            value={value.tagNames}
            onChange={(event) => update("tagNames", event.target.value)}
          />
        </label>
        <label>
          Author name
          <input
            required
            className={styles.field}
            value={value.authorName}
            onChange={(event) => update("authorName", event.target.value)}
          />
        </label>
        <label>
          Author title
          <input
            required
            className={styles.field}
            value={value.authorTitle}
            onChange={(event) => update("authorTitle", event.target.value)}
          />
        </label>
        <label>
          Responsible department
          <input
            required
            className={styles.field}
            value={value.departmentName}
            onChange={(event) => update("departmentName", event.target.value)}
          />
        </label>
        <label>
          Department contact email
          <input
            required
            className={styles.field}
            type="email"
            value={value.departmentEmail}
            onChange={(event) => update("departmentEmail", event.target.value)}
          />
        </label>
        <div className={styles.full}>
          <label id="announcement-body-label">Body</label>
          <div className={styles.richEditor}>
            <RichTextEditor<RichDocumentOp>
              initialValue={value.bodyRich}
              labelledBy="announcement-body-label"
              toolbar={TOOLBAR}
              formats={RICH_DOCUMENT_FORMATS}
              sanitize={sanitizeRichDocument}
              minHeight="26rem"
              onChange={(ops) => update("bodyRich", ops)}
            />
          </div>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <Button className="green" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
