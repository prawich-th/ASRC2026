"use client";

import AnnouncementCard from "@/components/announcements/announcement-card";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Section, { sectionStyles } from "@/components/layout/section";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import styles from "./announcements.module.scss";

export default function AnnouncementsPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.announcements.listPublished,
    {},
    { initialNumItems: 12 },
  );

  return (
    <div className={sectionStyles.page}>
      <main>
        <Section innerClassName={styles.head}>
          <div>
            <h1>Announcements.</h1>
            <p className={styles.intro}>
              Updates from the Annual Student Research Conference.
            </p>
          </div>
        </Section>
        <Section ring={{ color: "orange", side: "right", level: "high" }}>
          {status === "LoadingFirstPage" ? (
            <LoadingScreen variant="inline" what="announcements" />
          ) : results.length === 0 ? (
            <p className={styles.state}>
              Announcements about the programme and deadlines will appear here.
            </p>
          ) : (
            <>
              <div className={styles.grid}>
                {results.map((announcement) => (
                  <AnnouncementCard
                    key={announcement._id}
                    announcement={announcement}
                  />
                ))}
              </div>
              {status === "CanLoadMore" || status === "LoadingMore" ? (
                <div className={styles.pagination}>
                  <Button
                    className="secondary"
                    type="button"
                    disabled={status === "LoadingMore"}
                    onClick={() => loadMore(12)}
                  >
                    {status === "LoadingMore" ? "Loading…" : "Load more"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Section>
      </main>
      <Footer />
    </div>
  );
}
