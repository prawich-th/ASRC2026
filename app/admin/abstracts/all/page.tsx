"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { getCategoryLabel } from "@/lib/abstractDisplay";
import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

type ReviewStatus =
  | "submitted"
  | "revision_requested"
  | "selected"
  | "rejected";

type AbstractCategory = "oral" | "poster";

function getStatusClass(status: string) {
  if (status === "selected") {
    return styles.green;
  }
  if (status === "rejected") {
    return styles.red;
  }
  return styles.orange;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function AllAbstractsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ReviewStatus>("all");
  const [category, setCategory] = useState<"all" | AbstractCategory>("all");
  const query = usePaginatedQuery(
    api.abstracts.listForReview,
    status === "all" ? {} : { status },
    { initialNumItems: 50 },
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredAbstracts = query.results.filter((item) => {
    const owner = [
      item.owner.name,
      item.owner.firstName,
      item.owner.lastName,
      item.owner.email,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLocaleLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.abstract.title.toLocaleLowerCase().includes(normalizedSearch) ||
      item.abstract.code.includes(normalizedSearch) ||
      owner.includes(normalizedSearch);
    const matchesCategory =
      category === "all" || item.abstract.category === category;

    return matchesSearch && matchesCategory;
  });
  const hasFilters =
    normalizedSearch.length > 0 || status !== "all" || category !== "all";

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h1>All abstracts</h1>
          <p>View every submitted abstract and its current review status.</p>
        </div>
      </div>

      <div className={styles.filters}>
        <label>
          Search
          <input
            className={styles.field}
            type="search"
            value={search}
            placeholder="Search title, author, or ID"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            className={styles.select}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | ReviewStatus)
            }
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="revision_requested">Revision requested</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label>
          Category
          <select
            className={styles.select}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as "all" | AbstractCategory)
            }
          >
            <option value="all">All categories</option>
            <option value="oral">Oral presentation</option>
            <option value="poster">Poster presentation</option>
          </select>
        </label>
      </div>

      {query.status === "LoadingFirstPage" ? (
        <LoadingScreen variant="inline" what="abstracts" />
      ) : query.results.length === 0 ? (
        <p className={styles.empty}>No abstracts have been submitted yet.</p>
      ) : filteredAbstracts.length === 0 ? (
        <p className={styles.empty}>
          No loaded abstracts match the selected filters.
        </p>
      ) : (
        <>
          <p>
            Showing {filteredAbstracts.length} of {query.results.length} loaded
            abstracts.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Abstract</th>
                  <th>Submitter</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbstracts.map((item) => (
                  <tr key={item.abstract._id}>
                    <td>
                      <Link href={`/admin/abstracts/${item.abstract._id}`}>
                        {item.abstract.code}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/abstracts/${item.abstract._id}`}>
                        <strong>{item.abstract.title}</strong>
                      </Link>
                    </td>
                    <td>{item.owner.name || item.owner.email || "Unknown"}</td>
                    <td>{getCategoryLabel(item.abstract.category)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${getStatusClass(
                          item.abstract.status,
                        )}`}
                      >
                        {formatStatus(item.abstract.status)}
                      </span>
                    </td>
                    <td>
                      {item.abstract.submittedAt
                        ? new Date(item.abstract.submittedAt).toLocaleDateString(
                            "en-GB",
                          )
                        : "—"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/abstracts/${item.abstract._id}`}>
                          View
                        </Link>
                        {item.abstract.status === "submitted" ? (
                          <Link
                            href={`/admin/abstracts?selected=${encodeURIComponent(
                              item.abstract._id,
                            )}`}
                          >
                            Review
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasFilters ? (
        <div className={styles.actions}>
          <Button
            className="action"
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setCategory("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      {query.status === "CanLoadMore" || query.status === "LoadingMore" ? (
        <div className={styles.pagination}>
          <Button
            className="green"
            disabled={query.status === "LoadingMore"}
            type="button"
            onClick={() => query.loadMore(50)}
          >
            {query.status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
