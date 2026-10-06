"use client";

import styles from "./admin.module.scss";

export type ActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

/** Summarizes the applied filters, each removable on its own. */
export default function FilterChips({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) {
    return null;
  }
  return (
    <div className={styles.filterChips} aria-label="Active filters">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className={styles.filterChip}
          aria-label={`Remove filter: ${filter.label}`}
          onClick={filter.onRemove}
        >
          {filter.label}
          <i className="bx bx-x" aria-hidden="true" />
        </button>
      ))}
      {filters.length > 1 ? (
        <button
          type="button"
          className={styles.filterClear}
          onClick={onClearAll}
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
