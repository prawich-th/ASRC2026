"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../announcements.module.scss";

function formatDate(value?: number) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export default function AnnouncementDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const announcement = useQuery(api.announcements.getBySlug, { slug });

  return (
    <div className={styles.page}>
      <Header />
      {announcement ? (
        <section className={styles.banner}>
          <div className={styles.bannerInner}>
            <p>Announcements {"->"}</p>
            <h1>{announcement.title}</h1>
            <p>{formatDate(announcement.publishedAt)}</p>
          </div>
        </section>
      ) : null}
      <main className={styles.main}>
        <div className={styles.inner}>
          {announcement === undefined ? (
            <LoadingScreen variant="inline" what="announcement" />
          ) : announcement === null ? (
            <div className={styles.state}>
              <div>
                <h1>Announcement not found</h1>
                <p>
                  This announcement may be unpublished or no longer available.
                </p>
                <Link className={styles.back} href="/announcements">
                  Back to announcements
                </Link>
              </div>
            </div>
          ) : (
            <article className={styles.article}>
              <div className={styles.tags}>
                {announcement.tags.map((tag) => (
                  <span key={`${tag.name}-${tag.tone}`}>{tag.name}</span>
                ))}
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {announcement.body}
              </ReactMarkdown>
              {announcement.authorName ||
              announcement.authorTitle ||
              announcement.departmentName ||
              announcement.departmentEmail ? (
                <section className={styles.attribution}>
                  <div>
                    <strong>Author</strong>
                    {announcement.authorName ? (
                      <p>{announcement.authorName}</p>
                    ) : null}
                    {announcement.authorTitle ? (
                      <p>{announcement.authorTitle}</p>
                    ) : null}
                  </div>
                  <div>
                    <strong>Responsible Department</strong>
                    {announcement.departmentName ? (
                      <p>{announcement.departmentName}</p>
                    ) : null}
                    {announcement.departmentEmail ? (
                      <p>
                        Contact:{" "}
                        <a href={`mailto:${announcement.departmentEmail}`}>
                          {announcement.departmentEmail}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
