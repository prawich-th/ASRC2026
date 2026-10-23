export function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return match?.[1] ?? caught.message;
  }
  return fallback;
}

export function formatBytes(size: number | null | undefined) {
  if (!size) {
    return "";
  }
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Time today, otherwise "12 Oct" (or "12 Oct 2025" for other years). */
export function formatMailDate(value: number) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function formatFullDate(value: string | number) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Ada Lovelace <ada@example.com>" → "Ada Lovelace". */
export function displayAddress(value: string) {
  const match = value.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return match?.[1] ?? value;
}
