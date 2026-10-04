"use client";

import AnnouncementCard from "@/components/announcements/announcement-card";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import styles from "./home.module.scss";

export function HomeAnnouncements() {
  const announcements = useQuery(api.announcements.listLatest, { limit: 4 });

  if (announcements === undefined) {
    return (
      <div className={styles.mainPadding}>
        <LoadingScreen variant="inline" what="announcements" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <p className={styles.mainPadding}>No announcements published yet.</p>
    );
  }

  return (
    <div className={`${styles.announcements} ${styles.mainPadding}`}>
      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement._id} announcement={announcement} />
      ))}
    </div>
  );
}

export function HomeKeyDates() {
  const keyDates = useQuery(api.keyDates.listPublished);

  if (keyDates === undefined) {
    return (
      <div className={styles.mainPadding}>
        <LoadingScreen variant="inline" what="key dates" />
      </div>
    );
  }

  return (
    <ol className={`${styles.keyDates} ${styles.mainPadding}`}>
      {keyDates.length === 0 ? (
        <li>Key dates will be announced soon.</li>
      ) : (
        keyDates.map((item) => (
          <li key={item._id} className={styles.timelineItem}>
            <span className={styles.marker}>
              <span className={`${styles.dot} ${styles[item.tone]}`} />
            </span>
            <p className={styles.timelineDate}>{item.displayDate}</p>
            <p className={styles.timelineEvent}>{item.title}</p>
          </li>
        ))
      )}
    </ol>
  );
}

const HERO_KEY_DATES_LIMIT = 5;

export function HeroKeyDates() {
  const keyDates = useQuery(api.keyDates.listPublished);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!keyDates || keyDates.length === 0) {
    return null;
  }

  if (!open) {
    return (
      <button
        className={styles.heroKeyDatesReopen}
        type="button"
        onClick={() => setOpen(true)}
      >
        <i className="bx bx-calendar" aria-hidden="true" />
        Key dates
      </button>
    );
  }

  return (
    <aside
      className={styles.heroKeyDates}
      role="dialog"
      aria-modal="false"
      aria-labelledby="hero-key-dates-title"
    >
      <div className={styles.heroKeyDatesHeader}>
        <h3 id="hero-key-dates-title">
          <i className="bx bx-calendar" aria-hidden="true" />
          Key dates
        </h3>
        <button
          className={styles.heroKeyDatesClose}
          type="button"
          aria-label="Close key dates"
          onClick={() => setOpen(false)}
        >
          <i className="bx bx-x" aria-hidden="true" />
        </button>
      </div>
      <ol className={styles.heroKeyDatesList}>
        {keyDates.slice(0, HERO_KEY_DATES_LIMIT).map((item) => (
          <li key={item._id}>
            <span className={`${styles.dot} ${styles[item.tone]}`} />
            <span className={styles.heroKeyDatesDate}>{item.displayDate}</span>
            <span className={styles.heroKeyDatesTitle}>{item.title}</span>
          </li>
        ))}
      </ol>
      <a
        className={styles.heroKeyDatesMore}
        href="#key-dates"
        onClick={() => setOpen(false)}
      >
        View full timeline
        <i className="bx bx-arrow-down" aria-hidden="true" />
      </a>
    </aside>
  );
}
