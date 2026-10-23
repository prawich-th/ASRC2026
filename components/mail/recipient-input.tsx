"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useId, useState } from "react";
import styles from "./mail.module.scss";

export type Recipient = { email: string; name?: string };

const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function parseTyped(value: string): Recipient[] {
  return value
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

/**
 * Address field with chips. Typing searches registered participants by
 * name, email or institution; free-typed addresses are accepted too.
 */
export default function RecipientInput({
  inboxId,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  inboxId: Id<"mailInboxes">;
  label: string;
  value: Recipient[];
  onChange: (value: Recipient[]) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const inputId = useId();
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(draft.trim()), 200);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  const results = useQuery(
    api.mail.suggestRecipients,
    search.length >= 2 ? { inboxId, search } : "skip",
  );
  const chosen = new Set(value.map((recipient) => recipient.email.toLowerCase()));
  const suggestions = (results ?? []).filter(
    (suggestion) => !chosen.has(suggestion.email.toLowerCase()),
  );
  const showList = open && draft.trim().length >= 2 && suggestions.length > 0;
  const active = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

  function add(recipients: Recipient[]) {
    const next = [...value];
    for (const recipient of recipients) {
      if (!next.some((item) => item.email.toLowerCase() === recipient.email.toLowerCase())) {
        next.push(recipient);
      }
    }
    onChange(next);
    setDraft("");
    setSearch("");
    setHighlighted(0);
  }

  function commitDraft() {
    if (draft.trim()) {
      add(parseTyped(draft));
    }
  }

  function remove(email: string) {
    onChange(value.filter((recipient) => recipient.email !== email));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (showList && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((active + 1) % suggestions.length);
    } else if (showList && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((active - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      if (showList) {
        event.preventDefault();
        add([suggestions[active]]);
      } else if (draft.trim()) {
        event.preventDefault();
        commitDraft();
      }
    } else if (event.key === "," || event.key === ";") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      remove(value[value.length - 1].email);
    }
  }

  return (
    <div className={styles.composerField}>
      <label htmlFor={inputId}>{label}</label>
      <div className={styles.recipientBox}>
        {value.map((recipient) => {
          const invalid = !EMAIL_PATTERN.test(recipient.email);
          return (
            <span
              key={recipient.email}
              className={`${styles.recipientChip} ${invalid ? styles.recipientInvalid : ""}`}
              title={recipient.name ? recipient.email : undefined}
            >
              {recipient.name || recipient.email}
              <button
                type="button"
                aria-label={`Remove ${recipient.email}`}
                onClick={() => remove(recipient.email)}
              >
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <input
          id={inputId}
          type="text"
          inputMode="email"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          // Native validation only needs to know that something was entered.
          required={required && value.length === 0}
          value={draft}
          placeholder={value.length === 0 ? placeholder : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            commitDraft();
          }}
          onKeyDown={onKeyDown}
        />
        {showList ? (
          <ul id={listId} role="listbox" className={styles.suggestions}>
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.email}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown keeps focus in the input so blur doesn't commit the draft first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  add([suggestion]);
                }}
                onMouseEnter={() => setHighlighted(index)}
              >
                <strong>{suggestion.name || suggestion.email}</strong>
                {suggestion.name ? <small>{suggestion.email}</small> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
