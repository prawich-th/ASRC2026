"use client";

import { useEffect, useState } from "react";
import styles from "@/app/home.module.scss";

const TARGET = {
  year: 2027,
  month: 2, // March (0-indexed)
  date: 14,
} as const;

type CalendarDate = {
  year: number;
  month: number;
  date: number;
};

function bangkokDate(nowMs: number): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(nowMs));

  const valueOf = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type);
    return Number(part?.value);
  };

  return {
    year: valueOf("year"),
    month: valueOf("month") - 1,
    date: valueOf("day"),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addCalendarMonths(from: CalendarDate, months: number): CalendarDate {
  const totalMonths = from.month + months;
  const year = from.year + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const date = Math.min(from.date, daysInMonth(year, month));
  return { year, month, date };
}

function daysBetween(from: CalendarDate, to: CalendarDate) {
  const start = Date.UTC(from.year, from.month, from.date);
  const end = Date.UTC(to.year, to.month, to.date);
  return Math.round((end - start) / 86_400_000);
}

function isOnOrAfterTarget(now: CalendarDate) {
  if (now.year !== TARGET.year) {
    return now.year > TARGET.year;
  }
  if (now.month !== TARGET.month) {
    return now.month > TARGET.month;
  }
  return now.date >= TARGET.date;
}

function remainingUntil(nowMs: number) {
  const now = bangkokDate(nowMs);
  if (isOnOrAfterTarget(now)) {
    return { months: 0, days: 0 };
  }

  let months = (TARGET.year - now.year) * 12 + (TARGET.month - now.month);
  if (now.date > TARGET.date) {
    months -= 1;
  }

  const afterMonths = addCalendarMonths(now, months);
  const days = Math.max(0, daysBetween(afterMonths, TARGET));

  return { months: Math.max(0, months), days };
}

function DigitPair({ value }: { value: number }) {
  const digits = String(Math.max(0, value)).padStart(2, "0").slice(-2);

  return (
    <div className={styles.number}>
      <span>{digits[0]}</span>
      <span>{digits[1]}</span>
    </div>
  );
}

export default function Countdown() {
  const [remaining, setRemaining] = useState(() => remainingUntil(Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(remainingUntil(Date.now()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const label = `${remaining.months} months and ${remaining.days} days until 14 March 2027`;

  return (
    <div
      className={styles.countdown}
      role="timer"
      aria-live="polite"
      aria-label={label}
      suppressHydrationWarning
    >
      <div className={styles.set}>
        <DigitPair value={remaining.months} />
        <div className={styles.text}>Months</div>
      </div>
      <div className={styles.set}>
        <DigitPair value={remaining.days} />
        <div className={styles.text}>Days</div>
      </div>
    </div>
  );
}
