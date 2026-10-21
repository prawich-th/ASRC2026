"use client";

import AnnouncementCard from "@/components/announcements/announcement-card";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { bangkokToday, keyDateEnd } from "@/lib/keyDates";
import { usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Section from "@/components/layout/section";
import styles from "./home.module.scss";

const HOME_ANNOUNCEMENTS_LIMIT = 8;

/** Announcements header and a horizontal scroller with previous/next controls. */
export function HomeAnnouncements() {
  const announcements = useQuery(api.announcements.listLatest, {
    limit: HOME_ANNOUNCEMENTS_LIMIT,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    // A pixel of slack absorbs sub-pixel rounding at either end.
    setEdges({
      start: scroller.scrollLeft <= 1,
      end:
        scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateEdges);
    };
  }, [announcements, updateEdges]);

  function scrollByCard(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    const card = scroller?.firstElementChild as HTMLElement | null;
    if (!scroller || !card) {
      return;
    }
    const gap = parseFloat(getComputedStyle(scroller).columnGap) || 0;
    scroller.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  const scrollable = !(edges.start && edges.end);

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2>Announcements.</h2>
        <div className={styles.scrollControls}>
          {scrollable ? (
            <>
              <button
                className={styles.scrollButton}
                type="button"
                aria-label="Previous announcements"
                aria-controls="home-announcements"
                disabled={edges.start}
                onClick={() => scrollByCard(-1)}
              >
                <i className="bx bx-chevron-left" aria-hidden="true" />
              </button>
              <button
                className={styles.scrollButton}
                type="button"
                aria-label="More announcements"
                aria-controls="home-announcements"
                disabled={edges.end}
                onClick={() => scrollByCard(1)}
              >
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </button>
            </>
          ) : null}
          <Link href="/announcements" className={styles.textLink}>
            View all
          </Link>
        </div>
      </div>

      {announcements === undefined ? (
        <LoadingScreen variant="inline" what="announcements" />
      ) : announcements.length === 0 ? (
        <p className={styles.emptyState}>
          Announcements about the programme and deadlines will appear here.
        </p>
      ) : (
        <div
          id="home-announcements"
          ref={scrollerRef}
          className={`${styles.announcements} ${edges.end ? "" : styles.hasMore}`}
          role="region"
          aria-label="Latest announcements"
          tabIndex={0}
        >
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
            />
          ))}
        </div>
      )}
    </>
  );
}

type KeyDate = FunctionReturnType<typeof api.keyDates.listPublished>[number];

function KeyDatesList({ keyDates }: { keyDates: KeyDate[] }) {
  const [today] = useState(() => bangkokToday());

  if (keyDates.length === 0) {
    return (
      <p className={styles.emptyState}>Key dates will be announced soon.</p>
    );
  }

  return (
    <ol className={styles.keyDates}>
      {keyDates.map((item) => {
        const end = keyDateEnd(item.displayDate);
        const past = end !== null && end < today;
        return (
          <li
            key={item._id}
            className={`${styles[item.tone]} ${past ? styles.past : ""}`}
          >
            <span className={styles.keyDate}>{item.displayDate}</span>
            <span className={styles.keyDateWhat}>{item.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

// A timeline with one date or none is too thin to stand alone, so it joins
// the announcements section instead of taking its own band.
const MIN_STANDALONE_KEY_DATES = 2;

/** Key dates as their own sunk section, when there are enough of them. */
export function HomeKeyDatesSection() {
  const keyDates = useQuery(api.keyDates.listPublished);

  if (!keyDates || keyDates.length < MIN_STANDALONE_KEY_DATES) {
    return null;
  }

  return (
    <Section
      id="key-dates"
      ring={{ color: "orange", side: "right", level: "high" }}
    >
      <h2>Key dates.</h2>
      <KeyDatesList keyDates={keyDates} />
    </Section>
  );
}

/** Key dates inside the announcements section, when there are too few. */
export function HomeKeyDatesInline() {
  const keyDates = useQuery(api.keyDates.listPublished);

  if (!keyDates || keyDates.length >= MIN_STANDALONE_KEY_DATES) {
    return null;
  }

  return (
    <div id="key-dates" className={styles.block}>
      <h2>Key dates.</h2>
      <KeyDatesList keyDates={keyDates} />
    </div>
  );
}

/** One line under the countdown naming the next upcoming key date. */
export function HomeNextDate({
  preloadedKeyDates,
  today,
}: {
  preloadedKeyDates: Preloaded<typeof api.keyDates.listPublished>;
  today: number;
}) {
  // Include the date in the initial HTML so hydration cannot expand the hero.
  const keyDates = usePreloadedQuery(preloadedKeyDates);

  const next = keyDates?.find((item) => {
    const end = keyDateEnd(item.displayDate);
    return end !== null && end >= today;
  });

  if (!next) {
    return null;
  }

  return (
    <p className={styles.nextDate}>
      Next: <strong>{next.title}</strong>, {next.displayDate}.{" "}
      <a href="#key-dates">See all key dates</a>
    </p>
  );
}
