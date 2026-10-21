const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Reads the last day a key date's free-text `displayDate` covers, as a
 * YYYYMMDD number. Handles "31 January 2027", "10-14 March 2027" and
 * "October 2026" (which covers the whole month). Returns null otherwise.
 */
export function keyDateEnd(displayDate: string): number | null {
  const match = displayDate
    .trim()
    .toLowerCase()
    .match(/(?:(\d{1,2})\s+)?([a-z]+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  const month = MONTHS.indexOf(match[2]);
  if (month === -1) {
    return null;
  }
  const year = Number(match[3]);
  const day = match[1]
    ? Number(match[1])
    : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return year * 10000 + (month + 1) * 100 + day;
}

/** Today in Bangkok, as a YYYYMMDD number. */
export function bangkokToday(nowMs = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
  return Number(parts.replaceAll("-", ""));
}

export function isKeyDatePast(displayDate: string, today: number): boolean {
  const end = keyDateEnd(displayDate);
  return end !== null && end < today;
}
