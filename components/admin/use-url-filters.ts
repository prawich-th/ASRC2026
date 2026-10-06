"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Keeps a page's filters in the query string so filtered views survive a
 * reload and can be shared as links. Unknown or empty values read as "".
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const serialized = searchParams.toString();

  const values = useMemo(() => {
    const params = new URLSearchParams(serialized);
    return Object.fromEntries(
      keys.map((key) => [key, params.get(key)?.trim() ?? ""]),
    ) as Record<K, string>;
    // `keys` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const setValues = useCallback(
    (patch: Partial<Record<K, string>>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch) as Array<
        [K, string | undefined]
      >) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  return [values, setValues] as const;
}

/** Returns `value` when it is one of `allowed`, otherwise undefined. */
export function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
): T | undefined {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * A search box bound to a URL value: typing updates immediately, while the
 * committed value (which drives the query) follows after a short pause.
 */
export function useDebouncedSearch(
  committed: string,
  commit: (value: string) => void,
  delay = 300,
) {
  const [text, setText] = useState(committed);
  const [lastCommitted, setLastCommitted] = useState(committed);

  // Follow outside changes such as "Clear filters" or back/forward.
  if (committed !== lastCommitted) {
    setLastCommitted(committed);
    if (committed !== text.trim()) {
      setText(committed);
    }
  }

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === committed) {
      return;
    }
    const timeout = window.setTimeout(() => commit(trimmed), delay);
    return () => window.clearTimeout(timeout);
  }, [commit, committed, delay, text]);

  return [text, setText] as const;
}
