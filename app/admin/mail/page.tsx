"use client";

import adminStyles from "@/components/admin/admin.module.scss";
import { useUrlFilters } from "@/components/admin/use-url-filters";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { displayAddress, formatFullDate, formatMailDate } from "@/components/mail/format";
import MailComposer from "@/components/mail/mail-composer";
import styles from "@/components/mail/mail.module.scss";
import ScheduledList from "@/components/mail/scheduled-list";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/components/mail/format";
import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";

const FILTER_KEYS = ["inbox", "folder"] as const;

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: "bx-inbox" },
  { id: "sent", label: "Sent", icon: "bx-send" },
  { id: "scheduled", label: "Scheduled", icon: "bx-clock" },
  { id: "archive", label: "Archive", icon: "bx-archive" },
  { id: "spam", label: "Spam", icon: "bx-alert-octagon" },
  { id: "trash", label: "Trash", icon: "bx-trash" },
] as const;
type FolderId = (typeof FOLDERS)[number]["id"];
type ThreadFolderId = Exclude<FolderId, "scheduled">;

const PAGE_SIZE = 25;

export default function MailPage() {
  return (
    <Suspense fallback={<LoadingScreen variant="inline" what="mail" />}>
      <Mailbox />
    </Suspense>
  );
}

function Mailbox() {
  const inboxes = useQuery(api.mail.listMyInboxes);
  const [filters, setFilters] = useUrlFilters(FILTER_KEYS);
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState("");
  const refreshInbox = useAction(api.mailActions.refreshInbox);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const selectedId =
    inboxes?.find((item) => item._id === filters.inbox)?._id ?? inboxes?.[0]?._id;

  // Pull recent threads from Resend so the lists are right even if a webhook was missed.
  const refresh = useCallback(
    async (inboxId: Id<"mailInboxes">) => {
      setRefreshing(true);
      setRefreshError("");
      try {
        await refreshInbox({ inboxId });
      } catch (caught) {
        setRefreshError(errorMessage(caught, "Could not refresh this inbox."));
      } finally {
        setRefreshing(false);
      }
    },
    [refreshInbox],
  );

  // Silent on open; the button shows progress.
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    refreshInbox({ inboxId: selectedId }).catch((caught: unknown) =>
      setRefreshError(errorMessage(caught, "Could not refresh this inbox.")),
    );
  }, [selectedId, refreshInbox]);

  if (inboxes === undefined) {
    return <LoadingScreen variant="inline" what="mail" />;
  }
  if (inboxes.length === 0) {
    return (
      <section className={`${adminStyles.card} ${adminStyles.stack}`}>
        <div className={adminStyles.header}>
          <div>
            <h1>Mail</h1>
            <p>You haven&apos;t been given access to a shared inbox yet. Ask a super admin to add you.</p>
          </div>
        </div>
      </section>
    );
  }

  const inbox = inboxes.find((item) => item._id === filters.inbox) ?? inboxes[0];
  const folder: FolderId =
    FOLDERS.find((item) => item.id === filters.folder)?.id ?? "inbox";

  return (
    <section className={`${adminStyles.card} ${adminStyles.stack}`}>
      <div className={adminStyles.header}>
        <div>
          <h1>Mail</h1>
          <p>Shared inboxes for the organising team. Replies are sent from the inbox address.</p>
        </div>
        <div className={adminStyles.actions}>
          <Button
            className="secondary"
            type="button"
            disabled={refreshing}
            onClick={() => void refresh(inbox._id)}
          >
            <i className="bx bx-refresh-cw" aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            className="green"
            type="button"
            onClick={() => {
              setComposing(true);
              setNotice("");
            }}
          >
            <i className="bx bx-edit" aria-hidden="true" />
            New email
          </Button>
        </div>
      </div>
      {refreshError ? <p className={adminStyles.error}>{refreshError}</p> : null}

      <div className={styles.inboxTabs} role="tablist" aria-label="Inboxes">
        {inboxes.map((item) => (
          <button
            key={item._id}
            type="button"
            role="tab"
            aria-selected={item._id === inbox._id}
            className={styles.inboxTab}
            onClick={() => setFilters({ inbox: item._id, folder: "" })}
          >
            <span className={styles.inboxName}>{item.name}</span>
            <span className={styles.inboxAddress}>{item.address}</span>
            {item.unread > 0 ? (
              <b className={styles.unreadCount}>
                {item.unread >= 100 ? "99+" : item.unread}
              </b>
            ) : null}
          </button>
        ))}
      </div>

      {composing ? (
        <MailComposer
          key={inbox._id}
          mode={{ kind: "compose", inboxId: inbox._id }}
          onCancel={() => setComposing(false)}
          onSent={(sendAt) => {
            setComposing(false);
            setNotice(
              sendAt
                ? `Scheduled to send from ${inbox.address} on ${formatFullDate(sendAt)}.`
                : `Sent from ${inbox.address}.`,
            );
          }}
        />
      ) : null}
      {notice ? <p className={adminStyles.success}>{notice}</p> : null}

      <div className={styles.folderTabs} role="tablist" aria-label="Folders">
        {FOLDERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === folder}
            className={styles.folderTab}
            onClick={() => setFilters({ inbox: inbox._id, folder: item.id })}
          >
            <i className={`bx ${item.icon}`} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {folder === "scheduled" ? (
        <ScheduledList key={inbox._id} inboxId={inbox._id} />
      ) : (
        <ThreadList key={`${inbox._id}:${folder}`} inboxId={inbox._id} folder={folder} />
      )}
    </section>
  );
}

function ThreadList({
  inboxId,
  folder,
}: {
  inboxId: Id<"mailInboxes">;
  folder: ThreadFolderId;
}) {
  const threads = usePaginatedQuery(
    api.mail.listThreads,
    { inboxId, folder },
    { initialNumItems: PAGE_SIZE },
  );

  if (threads.status === "LoadingFirstPage") {
    return <LoadingScreen variant="inline" what="conversations" />;
  }
  if (threads.results.length === 0) {
    return <p className={adminStyles.empty}>No conversations here.</p>;
  }

  return (
    <div className={styles.threadListWrap}>
      <ul className={styles.threadList}>
        {threads.results.map((thread) => {
          const who =
            folder === "sent"
              ? `To: ${thread.to.map(displayAddress).join(", ")}`
              : displayAddress(thread.from) || "(unknown sender)";
          return (
            <li key={thread._id}>
              <Link
                href={`/admin/mail/${thread._id}`}
                className={`${styles.threadRow} ${thread.read ? "" : styles.unread}`}
              >
                <span className={styles.threadFrom}>
                  {thread.read ? null : (
                    <span className={styles.unreadDot} aria-label="Unread" />
                  )}
                  {who}
                  {thread.emailCount > 1 ? (
                    <small className={styles.threadCount}>{thread.emailCount}</small>
                  ) : null}
                </span>
                <span className={styles.threadSubject}>
                  {thread.subject}
                  {thread.snippet ? (
                    <span className={styles.threadSnippet}> — {thread.snippet}</span>
                  ) : null}
                </span>
                <span className={styles.threadMeta}>
                  {thread.hasAttachment ? (
                    <i className="bx bx-paperclip" aria-label="Has attachments" />
                  ) : null}
                  <time dateTime={new Date(thread.lastActivityAt).toISOString()}>
                    {formatMailDate(thread.lastActivityAt)}
                  </time>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {threads.status === "CanLoadMore" || threads.status === "LoadingMore" ? (
        <div className={styles.loadMore}>
          <Button
            className="secondary"
            type="button"
            disabled={threads.status === "LoadingMore"}
            onClick={() => threads.loadMore(PAGE_SIZE)}
          >
            {threads.status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
