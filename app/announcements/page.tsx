"use client";

import AnnouncementCard from "@/components/announcements/announcement-card";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
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
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Announcements</h1>
          <p>Updates from the Annual Student Research Conference.</p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          {status === "LoadingFirstPage" ? (
            <LoadingScreen variant="inline" what="announcements" />
          ) : results.length === 0 ? (
            <div className={styles.state}>
              No announcements have been published yet.
            </div>
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
                    className="green"
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
