"use client";

import styles from "@/components/admin/admin.module.scss";
import FilterChips, { ActiveFilter } from "@/components/admin/filter-chips";
import Pager, { PageSize, usePages } from "@/components/admin/pager";
import {
  oneOf,
  useDebouncedSearch,
  useUrlFilters,
} from "@/components/admin/use-url-filters";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { getCategoryLabel } from "@/lib/abstractDisplay";
import { usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { Suspense, useState } from "react";

const FILTER_KEYS = [
  "q",
  "status",
  "category",
  "reviewed",
  "from",
  "to",
  "sort",
] as const;

const STATUS_FILTERS = [
  "submitted",
  "revision_requested",
  "selected",
  "rejected",
] as const;
const CATEGORY_FILTERS = ["oral", "poster", "none"] as const;
const REVIEWED_FILTERS = ["reviewed", "unreviewed"] as const;
const SORT_OPTIONS = ["newest", "oldest"] as const;

const STATUS_LABELS = {
  submitted: "Submitted",
  revision_requested: "Revision requested",
  selected: "Selected",
  rejected: "Rejected",
} as const;
const CATEGORY_LABELS = {
  oral: "Oral presentation",
  poster: "Poster presentation",
  none: "No category yet",
} as const;
const REVIEWED_LABELS = {
  reviewed: "Has review notes",
  unreviewed: "Not yet reviewed",
} as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local midnight at the start of a yyyy-mm-dd date, plus `days`. */
function startOfDay(value: string, days = 0): number | undefined {
  if (!DATE_PATTERN.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  const time = new Date(year, month - 1, day + days).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function formatDay(value: string) {
  const time = startOfDay(value);
  return time === undefined
    ? value
    : new Date(time).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

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
  return (
    <Suspense fallback={<LoadingScreen variant="inline" what="abstracts" />}>
      <AbstractDirectory />
    </Suspense>
  );
}

function AbstractDirectory() {
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const [search, setSearch] = useDebouncedSearch(filters.q, (q) =>
    setFilters({ q }),
  );
  const status = oneOf(filters.status, STATUS_FILTERS);
  const category = oneOf(filters.category, CATEGORY_FILTERS);
  const reviewed = oneOf(filters.reviewed, REVIEWED_FILTERS);
  const order = oneOf(filters.sort, SORT_OPTIONS) ?? "newest";
  const from = startOfDay(filters.from) !== undefined ? filters.from : "";
  const to = startOfDay(filters.to) !== undefined ? filters.to : "";
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const queryArgs = {
    search: filters.q || undefined,
    status,
    category,
    reviewed,
    submittedFrom: startOfDay(from),
    // The "to" date is inclusive, so the range ends at the next midnight.
    submittedTo: startOfDay(to, 1),
    order,
  };
  const query = usePaginatedQuery(api.abstracts.listForReview, queryArgs, {
    initialNumItems: pageSize,
  });
  const pages = usePages(
    query,
    pageSize,
    JSON.stringify([queryArgs, pageSize]),
  );

  const activeFilters: ActiveFilter[] = [
    ...(filters.q
      ? [
          {
            key: "q",
            label: `“${filters.q}”`,
            onRemove: () => setFilters({ q: "" }),
          },
        ]
      : []),
    ...(status
      ? [
          {
            key: "status",
            label: STATUS_LABELS[status],
            onRemove: () => setFilters({ status: "" }),
          },
        ]
      : []),
    ...(category
      ? [
          {
            key: "category",
            label: CATEGORY_LABELS[category],
            onRemove: () => setFilters({ category: "" }),
          },
        ]
      : []),
    ...(reviewed
      ? [
          {
            key: "reviewed",
            label: REVIEWED_LABELS[reviewed],
            onRemove: () => setFilters({ reviewed: "" }),
          },
        ]
      : []),
    ...(from
      ? [
          {
            key: "from",
            label: `Submitted from ${formatDay(from)}`,
            onRemove: () => setFilters({ from: "" }),
          },
        ]
      : []),
    ...(to
      ? [
          {
            key: "to",
            label: `Submitted until ${formatDay(to)}`,
            onRemove: () => setFilters({ to: "" }),
          },
        ]
      : []),
  ];

  function clearFilters() {
    setFilters(
      Object.fromEntries(FILTER_KEYS.map((key) => [key, ""])) as Record<
        (typeof FILTER_KEYS)[number],
        string
      >,
    );
  }

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h1>All abstracts</h1>
          <p>View every submitted abstract and its current review status.</p>
        </div>
      </div>

      <div className={styles.filterPanel}>
        <label className={styles.filterSearch}>
          Search
          <input
            className={styles.field}
            type="search"
            value={search}
            placeholder="Title, 6-digit ID, keyword, author, affiliation, or submitter"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            className={styles.select}
            value={status ?? ""}
            onChange={(event) => setFilters({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            className={styles.select}
            value={category ?? ""}
            onChange={(event) => setFilters({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {CATEGORY_FILTERS.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review
          <select
            className={styles.select}
            value={reviewed ?? ""}
            onChange={(event) => setFilters({ reviewed: event.target.value })}
          >
            <option value="">Any</option>
            {REVIEWED_FILTERS.map((value) => (
              <option key={value} value={value}>
                {REVIEWED_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Submitted from
          <input
            className={styles.field}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFilters({ from: event.target.value })}
          />
        </label>
        <label>
          Submitted until
          <input
            className={styles.field}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setFilters({ to: event.target.value })}
          />
        </label>
        <label>
          Sort by
          <select
            className={styles.select}
            value={order}
            disabled={Boolean(filters.q)}
            title={
              filters.q ? "Search results are sorted by relevance" : undefined
            }
            onChange={(event) =>
              setFilters({
                sort: event.target.value === "newest" ? "" : event.target.value,
              })
            }
          >
            <option value="newest">Newest submissions first</option>
            <option value="oldest">Oldest submissions first</option>
          </select>
        </label>
      </div>
      <FilterChips filters={activeFilters} onClearAll={clearFilters} />

      {pages.loadingPage ? (
        <LoadingScreen variant="inline" what="abstracts" />
      ) : pages.items.length === 0 ? (
        <p className={styles.empty}>
          {activeFilters.length > 0
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
                        <strong>{item.abstract.title || "Untitled"}</strong>
                      </Link>
                      {item.abstract.authorNames.length > 0 ? (
                        <span className={styles.cellMeta}>
                          {item.abstract.authorNames.join(", ")}
                        </span>
                      ) : null}
                      {item.abstract.keywords.length > 0 ? (
                        <span className={styles.cellMeta}>
                          Keywords: {item.abstract.keywords.join(", ")}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {item.owner.name || item.owner.email || "Unknown"}
                      {item.owner.institution ? (
                        <span className={styles.cellMeta}>
                          {item.owner.institution}
                        </span>
                      ) : null}
                    </td>
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
                        ? new Date(
                            item.abstract.submittedAt,
                          ).toLocaleDateString("en-GB")
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
