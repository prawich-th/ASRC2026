"use client";

import Button from "@/components/form/button";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { formatAffiliation } from "@/lib/affiliation";
import { useMutation, useQuery } from "convex/react";
import {
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import AffiliationFields, {
  AffiliationDraft,
  EMPTY_AFFILIATION,
  fromAffiliationDraft,
} from "./affiliation-fields";
import styles from "./affiliations.module.scss";

const MAX_RESULTS = 50;

function secondaryLine(affiliation: Doc<"affiliations">) {
  return [
    affiliation.department,
    affiliation.faculty,
    affiliation.district,
    affiliation.province,
    affiliation.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function matches(affiliation: Doc<"affiliations">, terms: string[]) {
  const haystack = formatAffiliation(affiliation).toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export default function AffiliationPicker({
  value,
  onChange,
  label,
  placeholder = "Search university, faculty, or department",
  known = [],
  invalid = false,
}: {
  value: Id<"affiliations"> | undefined;
  onChange: (affiliationId: Id<"affiliations"> | undefined) => void;
  label?: string;
  placeholder?: string;
  /** Affiliations already loaded by the caller (e.g. archived ones on a draft). */
  known?: ReadonlyArray<Doc<"affiliations">>;
  invalid?: boolean;
}) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const options = useQuery(api.affiliations.listForSelection);
  const propose = useMutation(api.affiliations.propose);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<AffiliationDraft>(EMPTY_AFFILIATION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const localSelected =
    options?.find((item) => item._id === value) ??
    known.find((item) => item._id === value);
  const fetched = useQuery(
    api.affiliations.getById,
    value && options !== undefined && !localSelected
      ? { affiliationId: value }
      : "skip",
  );
  const selected = localSelected ?? fetched ?? undefined;

  const results = useMemo(() => {
    const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return (options ?? [])
      .filter((item) => matches(item, terms))
      .slice(0, MAX_RESULTS);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openList() {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }

  function choose(affiliation: Doc<"affiliations">) {
    onChange(affiliation._id);
    setOpen(false);
    setQuery("");
  }

  function startAdding() {
    setDraft({ ...EMPTY_AFFILIATION, university: query.trim() });
    setError("");
    setAdding(true);
    setOpen(false);
  }

  async function saveNew() {
    setError("");
    setSaving(true);
    try {
      const created = await propose(fromAffiliationDraft(draft));
      onChange(created._id);
      setAdding(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add affiliation.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = results[activeIndex];
      if (option) {
        choose(option);
      } else {
        startAdding();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={styles.picker} ref={rootRef}>
      {label ? (
        <label className={styles.pickerLabel} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div
        className={`${styles.control} ${invalid ? styles.invalid : ""} ${
          open ? styles.controlOpen : ""
        }`}
      >
        <i className="bx bx-search-alt-2" aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[activeIndex]
              ? `${listId}-${activeIndex}`
              : undefined
          }
          placeholder={selected ? undefined : placeholder}
          value={open ? query : selected ? formatAffiliation(selected) : ""}
          title={selected ? formatAffiliation(selected) : undefined}
          onFocus={() => {
            if (!open) openList();
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {value && !open ? (
          <button
            className={styles.clear}
            type="button"
            aria-label="Clear affiliation"
            onClick={() => onChange(undefined)}
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        ) : (
          <i className="bx bx-chevron-down" aria-hidden="true" />
        )}
      </div>
      {selected?.status === "pending" ? (
        <p className={styles.pendingNote}>
          Added by you — the organisers will verify this affiliation.
        </p>
      ) : null}

      {open ? (
        <div className={styles.dropdown}>
          <ul id={listId} role="listbox" aria-label="Affiliations">
            {options === undefined ? (
              <li className={styles.dropdownEmpty}>Loading affiliations…</li>
            ) : results.length === 0 ? (
              <li className={styles.dropdownEmpty}>
                No matching affiliation.
              </li>
            ) : (
              results.map((item, index) => (
                <li
                  key={item._id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={item._id === value}
                  className={`${styles.option} ${
                    index === activeIndex ? styles.optionActive : ""
                  }`}
                  onPointerEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(item);
                  }}
                >
                  <strong>
                    {item.university}
                    {item.status === "pending" ? (
                      <span className={styles.pendingBadge}>Awaiting review</span>
                    ) : null}
                  </strong>
                  <span>{secondaryLine(item)}</span>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            className={`${styles.addOption} ${
              activeIndex === results.length ? styles.optionActive : ""
            }`}
            onPointerDown={(event) => {
              event.preventDefault();
              startAdding();
            }}
          >
            <i className="bx bx-plus-circle" aria-hidden="true" />
            Can&apos;t find it? Add a new affiliation
          </button>
        </div>
      ) : null}

      {adding ? (
        <div
          className={styles.addPanel}
          onKeyDown={(event) => {
            // Keep Enter from submitting a surrounding form.
            if (event.key === "Enter") {
              event.preventDefault();
              void saveNew();
            }
          }}
        >
          <p className={styles.addPanelTitle}>New affiliation</p>
          <AffiliationFields
            idPrefix={`${baseId}-new`}
            value={draft}
            onChange={setDraft}
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.addPanelActions}>
            <Button type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              className="green"
              type="button"
              disabled={saving}
              onClick={() => void saveNew()}
            >
              {saving ? "Adding…" : "Add and select"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
