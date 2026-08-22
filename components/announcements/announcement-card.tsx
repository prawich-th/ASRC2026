import Link from "next/link";
import styles from "./announcement-card.module.scss";

export type AnnouncementCardData = {
  slug: string;
  title: string;
  summary: string;
  tags: Array<{
    name: string;
    tone: "primary" | "secondary" | "tertiary";
  }>;
  publishedAt?: number;
};

function formatDate(value?: number) {
  if (!value) {
    return "Publication pending";
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export default function AnnouncementCard({
  announcement,
}: {
  announcement: AnnouncementCardData;
}) {
  return (
    <Link className={styles.link} href={`/announcements/${announcement.slug}`}>
      <article className={styles.card}>
        <div className={styles.tags}>
          {announcement.tags.map((tag) => (
            <span key={`${tag.name}-${tag.tone}`} className={styles[tag.tone]}>
              {tag.name}
            </span>
          ))}
        </div>
        <h3>{announcement.title}</h3>
        <p>{announcement.summary}</p>
        <time className={styles.date} dateTime={announcement.publishedAt ? new Date(announcement.publishedAt).toISOString() : undefined}>
          {formatDate(announcement.publishedAt)}
        </time>
      </article>
    </Link>
  );
}
