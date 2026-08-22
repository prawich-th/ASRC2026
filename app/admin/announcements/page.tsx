"use client";

import styles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

export default function AdminAnnouncementsPage() {
  const query = usePaginatedQuery(
    api.announcements.listAdmin,
    {},
    { initialNumItems: 25 },
  );
  const publish = useMutation(api.announcements.publish);
  const unpublish = useMutation(api.announcements.unpublish);
  const remove = useMutation(api.announcements.remove);
  const [working, setWorking] = useState<Id<"announcements"> | null>(null);
  const [error, setError] = useState("");

  async function run(
    id: Id<"announcements">,
    action: "publish" | "unpublish" | "delete",
  ) {
    if (action === "delete" && !window.confirm("Delete this announcement?")) {
      return;
    }
    setWorking(id);
    setError("");
    try {
      if (action === "publish") {
        await publish({ announcementId: id });
      } else if (action === "unpublish") {
        await unpublish({ announcementId: id });
      } else {
        await remove({ announcementId: id });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className={`${styles.card} ${styles.stack}`}>
      <div className={styles.header}>
        <div>
          <h1>Announcements</h1>
          <p>Create, preview, and publish conference updates.</p>
        </div>
        <Link href="/admin/announcements/new">
          <Button className="green" type="button">New announcement</Button>
        </Link>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {query.status === "LoadingFirstPage" ? (
        <LoadingScreen variant="inline" what="announcements" />
      ) : query.results.length === 0 ? (
        <p className={styles.empty}>No announcements yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.results.map((announcement) => (
                <tr key={announcement._id}>
                  <td>
                    <strong>{announcement.title}</strong>
                    <br />
                    <small>/{announcement.slug}</small>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${announcement.status === "published" ? styles.green : styles.orange}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td>
                    {announcement.publishedAt
                      ? new Date(announcement.publishedAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/admin/announcements/${announcement._id}/edit`}>
                        Edit
                      </Link>
                      {announcement.status === "published" ? (
                        <Button className="action" disabled={working === announcement._id} type="button" onClick={() => void run(announcement._id, "unpublish")}>
                          Unpublish
                        </Button>
                      ) : (
                        <Button className="green" disabled={working === announcement._id} type="button" onClick={() => void run(announcement._id, "publish")}>
                          Publish
                        </Button>
                      )}
                      <Button className="destructive" disabled={working === announcement._id} type="button" onClick={() => void run(announcement._id, "delete")}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.status === "CanLoadMore" || query.status === "LoadingMore" ? (
        <div className={styles.pagination}>
          <Button className="green" disabled={query.status === "LoadingMore"} type="button" onClick={() => query.loadMore(25)}>
            {query.status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
