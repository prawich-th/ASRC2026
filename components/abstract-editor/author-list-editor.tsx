"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { MAX_ABSTRACT_AUTHORS } from "@/lib/abstractForm";
import styles from "./abstract-editor.module.scss";

export type AuthorRow = {
  key: string;
  name: string;
  affiliationId?: Id<"affiliations">;
  presenting: boolean;
  facultyAdvisor?: boolean;
};

export function newAuthorRow(
  fields: Partial<Omit<AuthorRow, "key">> = {},
): AuthorRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    presenting: false,
    ...fields,
  };
}

export default function AuthorListEditor({
  rows,
  onChange,
  known,
  self,
  showErrors,
}: {
  rows: ReadonlyArray<AuthorRow>;
  onChange: (rows: AuthorRow[]) => void;
  known: ReadonlyArray<Doc<"affiliations">>;
  /** The signed-in user, offered as a one-click author. */
  self?: { name: string; affiliationId?: Id<"affiliations"> };
  showErrors: boolean;
}) {
  function update(key: string, fields: Partial<AuthorRow>) {
    onChange(rows.map((row) => row.key === key ? { ...row, ...fields } : row));
  }

  function move(index: number, offset: number) {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + offset, 0, row);
    onChange(next);
  }

  function remove(key: string) {
    onChange(rows.filter((row) => row.key !== key));
  }

  function add(fields: Partial<Omit<AuthorRow, "key">> = {}) {
    const previous = rows[rows.length - 1];
    onChange([
      ...rows,
      newAuthorRow({
        // Co-authors usually share the previous author's affiliation.
        affiliationId: previous?.affiliationId,
        ...fields,
      }),
    ]);
  }

  const selfListed =
    self !== undefined &&
    rows.some(
      (row) => row.name.trim().toLocaleLowerCase() === self.name.toLocaleLowerCase(),
    );
  const full = rows.length >= MAX_ABSTRACT_AUTHORS;

  return (
    <div className={styles.authorEditor}>
      {rows.length === 0 ? (
        <p className={styles.authorEmpty}>No authors yet.</p>
      ) : (
        <ol className={styles.authorRows}>
          {rows.map((row, index) => (
            <li key={row.key} className={styles.authorRow}>
              <span className={styles.authorIndex} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.authorFields}>
                <label className={styles.authorName}>
                  <span>Full name</span>
                  <input
                    value={row.name}
                    aria-invalid={showErrors && !row.name.trim()}
                    className={showErrors && !row.name.trim() ? styles.inputInvalid : undefined}
                    placeholder="e.g. Somchai Jaidee"
                    aria-label={`Author ${index + 1} full name`}
                    onChange={(event) => update(row.key, { name: event.target.value })}
                  />
                </label>
                <div className={styles.authorAffiliation}>
                  <span className={styles.fieldCaption}>Affiliation</span>
                  <AffiliationPicker
                    value={row.affiliationId}
                    known={known}
                    invalid={showErrors && !row.affiliationId}
                    onChange={(affiliationId) => update(row.key, { affiliationId })}
                  />
                </div>
              </div>
              <div className={styles.authorControls}>
                <label className={styles.presentingToggle}>
                  <input
                    type="checkbox"
                    checked={row.facultyAdvisor ?? false}
                    onChange={(event) => update(row.key, { facultyAdvisor: event.target.checked })}
                  />
                  Faculty advisor
                </label>
                <div className={styles.iconButtons}>
                  <button
                    type="button"
                    aria-label={`Move author ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <i className="bx bx-chevron-up" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move author ${index + 1} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <i className="bx bx-chevron-down" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.removeButton}
                    aria-label={`Remove author ${index + 1}`}
                    onClick={() => remove(row.key)}
                  >
                    <i className="bx bx-x" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.authorActions}>
        <Button type="button" className="action" disabled={full} onClick={() => add()}>
          Add author
        </Button>
        {self && !selfListed && !full ? (
          <Button
            type="button"
            onClick={() =>
              add({ name: self.name, affiliationId: self.affiliationId })
            }
          >
            Add myself
          </Button>
        ) : null}
        {full ? (
          <span className={styles.helper}>
            Maximum of {MAX_ABSTRACT_AUTHORS} authors.
          </span>
        ) : null}
      </div>
    </div>
  );
}
