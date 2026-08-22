"use client";

import AnnouncementCard from "@/components/announcements/announcement-card";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
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
    return <p className={styles.mainPadding}>No announcements published yet.</p>;
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
