/**
 * Small sessionStorage helpers for unsent form drafts. Storage can be missing
 * or throw (private windows, blocked site data), so every call is guarded and
 * the form must still work without it.
 */
export function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Drafts are a convenience; ignore storage failures.
  }
}

export function clearDraft(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
