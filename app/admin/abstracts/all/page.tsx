"use client";

import styles from "@/components/admin/admin.module.scss";
import Pager, { PageSize, usePages } from "@/components/admin/pager";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { getCategoryLabel } from "@/lib/abstractDisplay";
import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewStatus =
  "submitted" | "revision_requested" | "selected" | "rejected";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | ReviewStatus>("all");
  const [category, setCategory] = useState<"all" | AbstractCategory>("all");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const query = usePaginatedQuery(
    api.abstracts.listForReview,
    {
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
      search: debouncedSearch || undefined,
    },
    { initialNumItems: pageSize },
  );
  const pages = usePages(
    query,
    pageSize,
    JSON.stringify([debouncedSearch, status, category, pageSize]),
  );
  const hasFilters =
    search.trim().length > 0 || status !== "all" || category !== "all";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

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
            placeholder="Search title or 6-digit ID"
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

      {pages.loadingPage ? (
        <LoadingScreen variant="inline" what="abstracts" />
      ) : pages.items.length === 0 ? (
        <p className={styles.empty}>
          {hasFilters
            ? "No abstracts match the selected filters."
            : "No abstracts have been submitted yet."}
        </p>
      ) : (
        <>
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
                {pages.items.map((item) => (
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

      <Pager
        page={pages.page}
        start={pages.start}
        count={pages.items.length}
        totalPages={pages.totalPages}
        hasNext={pages.hasNext}
        pageSize={pageSize}
        onPageChange={pages.goToPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}
