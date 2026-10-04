"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.scss";

export const PAGE_SIZES = [10, 25, 50] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

type PaginatedResults<T> = {
  results: T[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
};

/**
 * Splits a Convex cursor-paginated query into numbered pages. Further pages
 * are fetched on demand, and the view returns to page 1 whenever `resetKey`
 * (the serialized filters) changes.
 */
export function usePages<T>(
  query: PaginatedResults<T>,
  pageSize: number,
  resetKey: string,
) {
  const [requestedPage, setRequestedPage] = useState(0);
  const [pageKey, setPageKey] = useState(resetKey);

  if (pageKey !== resetKey) {
    setPageKey(resetKey);
    setRequestedPage(0);
  }

  const loaded = query.results.length;
  const exhausted = query.status === "Exhausted";
  const lastLoadedPage = Math.max(0, Math.ceil(loaded / pageSize) - 1);
  const page = exhausted
    ? Math.min(requestedPage, lastLoadedPage)
    : requestedPage;
  const start = page * pageSize;
  const items = query.results.slice(start, start + pageSize);
  const hasNext = loaded > start + pageSize || !exhausted;
  const missing = start + pageSize - loaded;
  const { status, loadMore } = query;

  // Top up the current page after the page size grows or rows disappear.
  useEffect(() => {
    if (missing > 0 && status === "CanLoadMore") {
      loadMore(missing);
    }
  }, [loadMore, missing, status]);

  function goToPage(next: number) {
    setRequestedPage(Math.max(0, next));
  }

  return {
    items,
    page,
    start,
    hasNext,
    totalPages: exhausted ? lastLoadedPage + 1 : undefined,
    loadingPage:
      query.status === "LoadingFirstPage" ||
      (items.length < pageSize && query.status === "LoadingMore"),
    goToPage,
  };
}

export default function Pager({
  page,
  start,
  count,
  totalPages,
  hasNext,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  start: number;
  count: number;
  totalPages?: number;
  hasNext: boolean;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  return (
    <div className={styles.pager}>
      <p className={styles.pagerSummary}>
        {count === 0 ? "No results" : `Showing ${start + 1}–${start + count}`}
      </p>
      <div className={styles.pagerControls}>
        <label className={styles.pagerSize}>
          Rows
          <select
            className={styles.select}
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as PageSize)
            }
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.pagerButton}
          type="button"
          disabled={page === 0}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>
        <span className={styles.pagerPage}>
          Page {page + 1}
          {totalPages ? ` of ${totalPages}` : ""}
        </span>
        <button
          className={styles.pagerButton}
          type="button"
          disabled={!hasNext}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          <i className="bx bx-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
