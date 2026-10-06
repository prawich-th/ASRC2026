"use client";

import styles from "@/components/admin/admin.module.scss";
import AffiliationFields, {
  AffiliationDraft,
  EMPTY_AFFILIATION,
  fromAffiliationDraft,
  toAffiliationDraft,
} from "@/components/affiliations/affiliation-fields";
import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import { FileUploadField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { AffiliationStatus, formatAffiliation } from "@/lib/affiliation";
import {
  AFFILIATION_IMPORT_TEMPLATE,
  AffiliationImportError,
  AffiliationImportRow,
  parseAffiliationImport,
} from "@/lib/affiliationImport";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { ChangeEvent, useMemo, useState } from "react";
import local from "./affiliations.module.scss";

type AdminRow = FunctionReturnType<typeof api.affiliations.listAdmin>[number];

const TABS: Array<{ status: AffiliationStatus; label: string }> = [
  { status: "pending", label: "Awaiting review" },
  { status: "verified", label: "Verified" },
  { status: "archived", label: "Archived" },
];

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return match?.[1] ?? caught.message;
  }
  return fallback;
}

function secondaryLine(affiliation: Doc<"affiliations">) {
  return [
    affiliation.department,
    affiliation.faculty,
    affiliation.district,
    affiliation.province,
    affiliation.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

function AffiliationRow({ row }: { row: AdminRow }) {
  const { affiliation } = row;
  const update = useMutation(api.affiliations.update);
  const setStatus = useMutation(api.affiliations.setStatus);
  const merge = useMutation(api.affiliations.merge);
  const [mode, setMode] = useState<"view" | "edit" | "merge">("view");
  const [draft, setDraft] = useState<AffiliationDraft>(() =>
    toAffiliationDraft(affiliation),
  );
  const [mergeTarget, setMergeTarget] = useState<Id<"affiliations">>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      setMode("view");
    } catch (caught) {
      setError(errorMessage(caught, fallback));
    } finally {
      setBusy(false);
    }
  }

  const merged = affiliation.mergedInto !== undefined;

  return (
    <li className={local.row}>
      <div className={local.rowMain}>
        <div className={local.rowText}>
          <strong>{affiliation.university}</strong>
          <span>{secondaryLine(affiliation) || "No further details"}</span>
          {affiliation.status === "pending" && row.createdByName ? (
            <span className={local.rowMeta}>
              Added by {row.createdByName}
            </span>
          ) : null}
          {merged ? (
            <span className={local.rowMeta}>
              Merged into {row.mergedIntoLabel ?? "another affiliation"}
            </span>
          ) : null}
        </div>
        {!merged && mode === "view" ? (
          <div className={styles.actions}>
            {affiliation.status === "pending" ? (
              <Button
                className="green"
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      setStatus({
                        affiliationId: affiliation._id,
                        status: "verified",
                      }),
                    "Could not verify affiliation.",
                  )
                }
              >
                Verify
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(toAffiliationDraft(affiliation));
                setMode("edit");
              }}
            >
              Edit
            </Button>
            {affiliation.status !== "archived" ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => setMode("merge")}
              >
                Merge…
              </Button>
            ) : null}
            {affiliation.status === "archived" ? (
              <Button
                className="action"
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      setStatus({
                        affiliationId: affiliation._id,
                        status: "verified",
                      }),
                    "Could not restore affiliation.",
                  )
                }
              >
                Restore
              </Button>
            ) : (
              <Button
                className="destructive"
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      setStatus({
                        affiliationId: affiliation._id,
                        status: "archived",
                      }),
                    "Could not archive affiliation.",
                  )
                }
              >
                Archive
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {mode === "edit" ? (
        <div className={local.panel}>
          <AffiliationFields
            idPrefix={`edit-${affiliation._id}`}
            value={draft}
            onChange={setDraft}
          />
          <p className={styles.helperText}>
            Changes apply everywhere this affiliation is used, including
            submitted abstracts and participant profiles.
          </p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => setMode("view")}>
              Cancel
            </Button>
            <Button
              className="green"
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    update({
                      affiliationId: affiliation._id,
                      ...fromAffiliationDraft(draft),
                    }),
                  "Could not save affiliation.",
                )
              }
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "merge" ? (
        <div className={local.panel}>
          <p className={local.panelTitle}>
            Merge “{formatAffiliation(affiliation)}” into:
          </p>
          <AffiliationPicker
            value={mergeTarget}
            onChange={setMergeTarget}
            placeholder="Search for the affiliation to keep"
          />
          <p className={styles.helperText}>
            Everyone using this entry will be moved to the selected one, and
            this entry will be archived.
          </p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => setMode("view")}>
              Cancel
            </Button>
            <Button
              className="action"
              type="button"
              disabled={busy || !mergeTarget}
              onClick={() =>
                mergeTarget &&
                void run(
                  () =>
                    merge({
                      sourceId: affiliation._id,
                      targetId: mergeTarget,
                    }),
                  "Could not merge affiliations.",
                )
              }
            >
              {busy ? "Merging…" : "Merge"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </li>
  );
}

const IMPORT_BATCH_SIZE = 200;

function AffiliationImportPanel() {
  const importBatch = useMutation(api.affiliations.importBatch);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<AffiliationImportRow[]>([]);
  const [problems, setProblems] = useState<AffiliationImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    added: number;
    skipped: number;
    failed: number;
  } | null>(null);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setFile(selected);
    setRows([]);
    setProblems([]);
    setResult(null);
    setError("");
    if (!selected) {
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setProblems([{ row: 1, message: "Please select a CSV file" }]);
      return;
    }
    try {
      const parsed = parseAffiliationImport(await selected.text());
      setRows(parsed.rows);
      setProblems(parsed.errors);
    } catch (caught) {
      setProblems([
        { row: 1, message: errorMessage(caught, "Could not read the CSV") },
      ]);
    }
  }

  function downloadTemplate() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${AFFILIATION_IMPORT_TEMPLATE}\n`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    link.download = "asrc-affiliation-import-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function confirmImport() {
    setImporting(true);
    setError("");
    setResult(null);
    const totals = { added: 0, skipped: 0, failed: 0 };
    const failures: AffiliationImportError[] = [];
    try {
      for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(start, start + IMPORT_BATCH_SIZE);
        const outcome = await importBatch({
          affiliations: batch.map((row) => row.affiliation),
        });
        totals.added += outcome.added;
        totals.skipped += outcome.skipped;
        totals.failed += outcome.errors.length;
        failures.push(
          ...outcome.errors.map((item) => ({
            row: batch[item.index].row,
            message: item.message,
          })),
        );
      }
      setResult(totals);
      setRows([]);
      setProblems(failures);
    } catch (caught) {
      setError(errorMessage(caught, "Could not import affiliations."));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className={styles.importPanel}>
      <div className={styles.importHeader}>
        <div>
          <h2>Import from CSV</h2>
          <p>
            One affiliation per row with the columns{" "}
            <code>department, faculty, university, district, province, country</code>
            . University and country are required; entries already on the list
            are skipped. Imported affiliations are verified straight away.
          </p>
        </div>
        <Button type="button" onClick={downloadTemplate}>
          Download CSV template
        </Button>
      </div>
      <FileUploadField
        label="CSV file"
        accept=".csv,text/csv"
        selectedFiles={file ? [file] : []}
        contextText="Select one UTF-8 CSV file"
        onChange={(event) => void selectFile(event)}
      />
      {problems.length > 0 ? (
        <div className={styles.importErrors}>
          <strong>
            {result
              ? "These rows could not be imported:"
              : rows.length > 0
                ? "These rows will be skipped:"
                : "Fix these CSV issues before importing:"}
          </strong>
          <ul>
            {problems.slice(0, 20).map((item) => (
              <li key={`${item.row}-${item.message}`}>
                Row {item.row}: {item.message}
              </li>
            ))}
          </ul>
          {problems.length > 20 ? (
            <p>And {problems.length - 20} more.</p>
          ) : null}
        </div>
      ) : null}
      {rows.length > 0 ? (
        <>
          <p className={styles.importSummary}>
            {rows.length} affiliation{rows.length === 1 ? "" : "s"} ready to
            import.
          </p>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.previewTable}`}>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>University / Office</th>
                  <th>Faculty</th>
                  <th>Department</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map(({ row, affiliation }) => (
                  <tr key={row}>
                    <td>{row}</td>
                    <td>{affiliation.university}</td>
                    <td>{affiliation.faculty ?? "—"}</td>
                    <td>{affiliation.department ?? "—"}</td>
                    <td>
                      {[
                        affiliation.district,
                        affiliation.province,
                        affiliation.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 25 ? (
            <p className={styles.importSummary}>Previewing the first 25 rows.</p>
          ) : null}
          <div className={styles.actions}>
            <Button
              className="green"
              type="button"
              disabled={importing}
              onClick={() => void confirmImport()}
            >
              {importing
                ? "Importing…"
                : `Import ${rows.length} affiliation${rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {result ? (
        <p className={styles.success}>
          Import complete: {result.added} added, {result.skipped} already
          listed
          {result.failed ? `, ${result.failed} invalid` : ""}.
        </p>
      ) : null}
    </section>
  );
}

export default function AdminAffiliationsPage() {
  const counts = useQuery(api.affiliations.counts);
  const [tab, setTab] = useState<AffiliationStatus | null>(null);
  const activeTab: AffiliationStatus =
    tab ?? (counts && counts.pending > 0 ? "pending" : "verified");
  const rows = useQuery(api.affiliations.listAdmin, { status: activeTab });
  const create = useMutation(api.affiliations.create);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [draft, setDraft] = useState<AffiliationDraft>(EMPTY_AFFILIATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const terms = search.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return (rows ?? []).filter((row) => {
      const text = formatAffiliation(row.affiliation).toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }, [rows, search]);

  async function handleCreate() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await create(fromAffiliationDraft(draft));
      setDraft(EMPTY_AFFILIATION);
      setAdding(false);
      setNotice("Affiliation added.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not add affiliation."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h1>Affiliations</h1>
            <p>
              The shared list participants choose from when completing their
              profile and listing abstract authors.
            </p>
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={() => setShowImport((open) => !open)}
            >
              {showImport ? "Close import" : "Import CSV"}
            </Button>
            <Button
              className="green"
              type="button"
              onClick={() => {
                setAdding((open) => !open);
                setError("");
              }}
            >
              {adding ? "Close" : "Add affiliation"}
            </Button>
          </div>
        </div>

        {showImport ? <AffiliationImportPanel /> : null}
        {adding ? (
          <div
            className={local.panel}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
          >
            <AffiliationFields
              idPrefix="new-affiliation"
              value={draft}
              onChange={setDraft}
            />
            <div className={styles.actions}>
              <Button
                className="green"
                type="button"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                {busy ? "Adding…" : "Add affiliation"}
              </Button>
            </div>
          </div>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        {notice ? <p className={styles.success}>{notice}</p> : null}
      </section>

      <section className={`${styles.card} ${styles.stack}`}>
        <div className={local.toolbar}>
          <div className={local.tabs} role="tablist">
            {TABS.map((item) => (
              <button
                key={item.status}
                type="button"
                role="tab"
                aria-selected={activeTab === item.status}
                onClick={() => setTab(item.status)}
              >
                {item.label}
                {item.status !== "archived" && counts ? (
                  <span className={local.count}>{counts[item.status]}</span>
                ) : null}
              </button>
            ))}
          </div>
          <input
            className={`${styles.field} ${local.search}`}
            type="search"
            placeholder="Search affiliations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {activeTab === "pending" ? (
          <p className={styles.helperText}>
            Participants added these while registering or listing authors.
            They can already use them; verify to share them with everyone, or
            merge duplicates into an existing entry.
          </p>
        ) : null}

        {rows === undefined ? (
          <LoadingScreen variant="inline" what="affiliations" />
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>
            {rows.length === 0
              ? activeTab === "pending"
                ? "Nothing awaiting review."
                : "No affiliations here yet."
              : "No affiliations match your search."}
          </p>
        ) : (
          <ul className={local.list}>
            {filtered.map((row) => (
              <AffiliationRow key={row.affiliation._id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
