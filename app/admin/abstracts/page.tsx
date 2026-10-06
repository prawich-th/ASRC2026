"use client";

import AbstractReviewPanel from "@/components/admin/abstract-review-panel";
import styles from "@/components/admin/admin.module.scss";
import { useDebouncedSearch } from "@/components/admin/use-url-filters";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getCategoryLabel } from "@/lib/abstractDisplay";
import { usePaginatedQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function AdminAbstractsPage() {
  return (
    <Suspense fallback={<LoadingScreen variant="inline" what="review queue" />}>
      <ReviewQueue />
    </Suspense>
  );
}

function ReviewQueue() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<Id<"abstracts"> | null>(
    () => (searchParams.get("selected") as Id<"abstracts"> | null) ?? null,
  );
  const [dismissedIds, setDismissedIds] = useState<Set<Id<"abstracts">>>(
    () => new Set(),
  );
  const [committedSearch, setCommittedSearch] = useState("");
  const [search, setSearch] = useDebouncedSearch(
    committedSearch,
    setCommittedSearch,
  );
  const [category, setCategory] = useState<"" | "oral" | "poster" | "none">(
    "",
  );
  const query = usePaginatedQuery(
    api.abstracts.listForReview,
    {
      status: "submitted",
      search: committedSearch || undefined,
      category: category || undefined,
    },
    { initialNumItems: 50 },
  );
  const queue = query.results.filter(
    (item) => !dismissedIds.has(item.abstract._id),
  );
  const activeId =
    selectedId && queue.some((item) => item.abstract._id === selectedId)
      ? selectedId
      : queue[0]?.abstract._id;

  function handleDecided(abstractId: Id<"abstracts">) {
    const currentIndex = queue.findIndex(
      (item) => item.abstract._id === abstractId,
    );
    const next = queue[currentIndex + 1] ?? queue[currentIndex - 1];
    setDismissedIds((current) => {
      const updated = new Set(current);
      updated.add(abstractId);
      return updated;
    });
    setSelectedId(next?.abstract._id ?? null);
  }

  return (
    <div className={styles.reviewWorkspace}>
      <aside className={`${styles.card} ${styles.reviewSidebar}`}>
        <div className={styles.queueHeader}>
          <h1>Pending review</h1>
          <p>
            {queue.length} loaded submission{queue.length === 1 ? "" : "s"}
          </p>
          <input
            className={styles.field}
            type="search"
            aria-label="Search the review queue"
            placeholder="Search title, ID, author, or keyword"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.select}
            aria-label="Filter by category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as typeof category)
            }
          >
            <option value="">All categories</option>
            <option value="oral">Oral presentation</option>
            <option value="poster">Poster presentation</option>
            <option value="none">No category yet</option>
          </select>
        </div>
        {query.status === "LoadingFirstPage" ? (
          <LoadingScreen variant="inline" what="abstracts" />
        ) : queue.length === 0 ? (
          <p className={styles.empty}>
            {committedSearch || category
              ? "No pending abstracts match."
              : "All loaded abstracts are reviewed."}
          </p>
        ) : (
          <ul className={styles.queueList}>
            {queue.map((item) => (
              <li key={item.abstract._id}>
                <button
                  className={`${styles.queueButton} ${
                    item.abstract._id === activeId ? styles.active : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedId(item.abstract._id)}
                >
                  <strong>{item.abstract.title}</strong>
                  <span>{item.abstract.code}</span>
                  <span>{item.owner.name || item.owner.email || "Unknown"}</span>
                  <small>{getCategoryLabel(item.abstract.category)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.status === "CanLoadMore" || query.status === "LoadingMore" ? (
          <div className={styles.queueFooter}>
            <Button
              className="green"
              type="button"
              disabled={query.status === "LoadingMore"}
              onClick={() => query.loadMore(50)}
            >
              {query.status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </aside>

      {activeId ? (
        <AbstractReviewPanel
          key={activeId}
          abstractId={activeId}
          onDecided={handleDecided}
        />
      ) : (
        <div className={styles.reviewState}>
          <div>
            <h2>Review queue complete</h2>
            <p>
              {committedSearch || category
                ? "No submitted abstracts match the current search."
                : "There are no submitted abstracts waiting for a decision."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
