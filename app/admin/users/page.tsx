"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import {
  FileUploadField,
  FormField,
  SelectField,
} from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getRoleLabel, StaffRole, STAFF_ROLES } from "@/lib/adminRoles";
import {
  ImportedUser,
  parseUserImport,
  USER_IMPORT_TEMPLATE,
  UserImportError,
} from "@/lib/userImport";
import { useMutation, usePaginatedQuery } from "convex/react";
import { ChangeEvent, useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRoleFilter] = useState<StaffRole | "">("");
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminUsers.list,
    {
      search: debouncedSearch || undefined,
      role: role || undefined,
    },
    { initialNumItems: 25 },
  );
  const setUserRole = useMutation(api.adminUsers.setRole);
  const importPreRegistered = useMutation(api.adminUsers.importPreRegistered);
  const [savingId, setSavingId] = useState<Id<"users"> | null>(null);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importUsers, setImportUsers] = useState<ImportedUser[]>([]);
  const [importErrors, setImportErrors] = useState<UserImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    invalid: number;
  } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  async function changeRole(userId: Id<"users">, value: string) {
    setError("");
    setSavingId(userId);
    try {
      await setUserRole({
        userId,
        role: value ? (value as StaffRole) : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update role.");
    } finally {
      setSavingId(null);
    }
  }

  async function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setImportUsers([]);
    setImportErrors([]);
    setImportResult(null);
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportErrors([{ row: 1, message: "Please select a CSV file" }]);
      return;
    }
    try {
      const parsed = parseUserImport(await file.text());
      setImportUsers(parsed.users);
      setImportErrors(parsed.errors);
    } catch (caught) {
      setImportErrors([
        {
          row: 1,
          message:
            caught instanceof Error ? caught.message : "Could not read CSV",
        },
      ]);
    }
  }

  function downloadTemplate() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([USER_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "asrc-user-import-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function confirmImport() {
    if (importUsers.length === 0 || importErrors.length > 0) {
      return;
    }
    setImporting(true);
    setError("");
    setImportResult(null);
    const totals = { inserted: 0, updated: 0, skipped: 0, invalid: 0 };
    try {
      for (let index = 0; index < importUsers.length; index += 100) {
        const result = await importPreRegistered({
          users: importUsers.slice(index, index + 100),
        });
        totals.inserted += result.inserted;
        totals.updated += result.updated;
        totals.skipped += result.skipped;
        totals.invalid += result.invalid;
      }
      setImportResult(totals);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not import users",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h1>Users</h1>
          <p>Review participant profiles and assign staff access.</p>
        </div>
        <Button
          className="green"
          type="button"
          onClick={() => setShowImport((visible) => !visible)}
        >
          {showImport ? "Close import" : "Import users"}
        </Button>
      </div>
      {showImport ? (
        <section className={styles.importPanel}>
          <div className={styles.importHeader}>
            <div>
              <h2>Pre-register users</h2>
              <p>
                Upload complete profiles. Users will claim them after verifying
                the same email address.
              </p>
            </div>
            <Button type="button" onClick={downloadTemplate}>
              Download CSV template
            </Button>
          </div>
          <FileUploadField
            label="CSV file"
            accept=".csv,text/csv"
            selectedFiles={selectedFile ? [selectedFile] : []}
            contextText="Select one CSV file"
            onChange={(event) => void selectImportFile(event)}
          />
          {importErrors.length > 0 ? (
            <div className={styles.importErrors}>
              <strong>Fix these CSV issues before importing:</strong>
              <ul>
                {importErrors.slice(0, 20).map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
              {importErrors.length > 20 ? (
                <p>And {importErrors.length - 20} more issues.</p>
              ) : null}
            </div>
          ) : null}
          {importUsers.length > 0 ? (
            <>
              <p className={styles.importSummary}>
                {importUsers.length} valid user
                {importUsers.length === 1 ? "" : "s"} ready to import.
              </p>
              <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.previewTable}`}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Institution</th>
                      <th>Category</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importUsers.slice(0, 25).map((user) => (
                      <tr key={user.email}>
                        <td>{user.email}</td>
                        <td>
                          {user.prefix} {user.firstName} {user.lastName}
                        </td>
                        <td>{user.institution}</td>
                        <td>{user.participantCategory}</td>
                        <td>{getRoleLabel(user.role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importUsers.length > 25 ? (
                <p className={styles.importSummary}>
                  Previewing the first 25 rows.
                </p>
              ) : null}
              <div className={styles.actions}>
                <Button
                  className="green"
                  disabled={importing || importErrors.length > 0}
                  type="button"
                  onClick={() => void confirmImport()}
                >
                  {importing
                    ? "Importing…"
                    : `Confirm import of ${importUsers.length} users`}
                </Button>
              </div>
            </>
          ) : null}
          {importResult ? (
            <p className={styles.success}>
              Import complete: {importResult.inserted} added,{" "}
              {importResult.updated} updated, {importResult.skipped} skipped,{" "}
              {importResult.invalid} invalid.
            </p>
          ) : null}
        </section>
      ) : null}
      <div className={styles.filters}>
        <FormField
          label="Search users"
          type="search"
          value={search}
          placeholder="Name, email, phone, institution, or department"
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectField
          label="Role"
          value={role}
          options={[
            { value: "", label: "All roles" },
            ...STAFF_ROLES.map((value) => ({
              value,
              label: getRoleLabel(value),
            })),
          ]}
          onChange={(event) =>
            setRoleFilter(event.target.value as StaffRole | "")
          }
        />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {status === "LoadingFirstPage" ? (
        <LoadingScreen variant="inline" what="users" />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Institution</th>
                <th>Profile</th>
                <th>Account</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {results.map((user) => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.name || user.email || "Unnamed user"}</strong>
                  </td>
                  <td>
                    {user.email ?? "—"}
                    <br />
                    {user.phone ?? ""}
                  </td>
                  <td>
                    {user.institution ?? "—"}
                    {user.department ? <><br />{user.department}</> : null}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${user.profileComplete ? styles.green : styles.orange}`}>
                      {user.profileComplete ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        user.preRegisteredAt && !user.claimedAt
                          ? styles.orange
                          : styles.green
                      }`}
                    >
                      {user.preRegisteredAt && !user.claimedAt
                        ? "Awaiting signup"
                        : "Registered"}
                    </span>
                  </td>
                  <td>
                    <select
                      className={styles.select}
                      aria-label={`Role for ${user.name || user.email || "user"}`}
                      disabled={savingId === user._id}
                      value={user.role ?? ""}
                      onChange={(event) => void changeRole(user._id, event.target.value)}
                    >
                      <option value="">{getRoleLabel()}</option>
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {results.length === 0 ? (
                <tr>
                  <td className={styles.empty} colSpan={6}>
                    {debouncedSearch
                      ? "No users match your search."
                      : "No users found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className={styles.pagination}>
          <Button
            className="green"
            disabled={status === "LoadingMore"}
            type="button"
            onClick={() => loadMore(25)}
          >
            {status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
