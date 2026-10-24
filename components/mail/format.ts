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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Local time as a `datetime-local` input value. */
export function toDateTimeInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a `datetime-local` value in the browser's time zone. */
export function fromDateTimeInput(value: string): number | undefined {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
}

function atHour(base: Date, daysAhead: number, hour: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Quick picks for scheduled send, all in the future. */
export function schedulePresets(now: Date): { label: string; at: Date }[] {
  const presets = [];
  const thisAfternoon = atHour(now, 0, 13);
  if (thisAfternoon.getTime() - now.getTime() > 30 * 60 * 1000) {
    presets.push({ label: "This afternoon", at: thisAfternoon });
  }
  presets.push({ label: "Tomorrow morning", at: atHour(now, 1, 8) });
  presets.push({ label: "Tomorrow afternoon", at: atHour(now, 1, 13) });
  // Next Monday, or the one after if today is Sunday (tomorrow is covered).
  const untilMonday = ((8 - now.getDay()) % 7) || 7;
  if (untilMonday > 1) {
    presets.push({ label: "Monday morning", at: atHour(now, untilMonday, 8) });
  }
  return presets;
}
