"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getRoleLabel, StaffRole, STAFF_ROLES } from "@/lib/adminRoles";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";

export default function AdminUsersPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminUsers.list,
    {},
    { initialNumItems: 25 },
  );
  const setRole = useMutation(api.adminUsers.setRole);
  const [savingId, setSavingId] = useState<Id<"users"> | null>(null);
  const [error, setError] = useState("");

  async function changeRole(userId: Id<"users">, value: string) {
    setError("");
    setSavingId(userId);
    try {
      await setRole({
        userId,
        role: value ? (value as StaffRole) : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update role.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h1>Users</h1>
          <p>Review participant profiles and assign staff access.</p>
        </div>
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
