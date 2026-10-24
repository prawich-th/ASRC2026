"use client";

import adminStyles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import {
  displayAddress,
  errorMessage,
  formatFullDate,
  fromDateTimeInput,
  toDateTimeInput,
} from "./format";
import styles from "./mail.module.scss";

type Scheduled = FunctionReturnType<typeof api.mail.listScheduled>[number];

const KIND_LABELS: Record<Scheduled["kind"], string> = {
  compose: "New email",
  reply: "Reply",
  forward: "Forward",
};

/**
 * Emails waiting to be sent from an inbox. With `threadId`, only that
 * conversation's replies and forwards, and nothing when there are none.
 */
export default function ScheduledList({
  inboxId,
  threadId,
}: {
  inboxId: Id<"mailInboxes">;
  threadId?: Id<"mailThreads">;
}) {
  const all = useQuery(api.mail.listScheduled, { inboxId });
  if (all === undefined) {
    return threadId ? null : <LoadingScreen variant="inline" what="scheduled emails" />;
  }
  const items = threadId ? all.filter((item) => item.threadId === threadId) : all;
  if (items.length === 0) {
    return threadId ? null : (
      <p className={adminStyles.empty}>
        No scheduled emails. Use &ldquo;Send later&rdquo; in the composer to schedule one.
      </p>
    );
  }
  return (
    <ul className={styles.scheduledList} aria-label="Scheduled emails">
      {items.map((item) => (
        <ScheduledRow key={item._id} item={item} showThreadLink={!threadId} />
      ))}
    </ul>
  );
}

function ScheduledRow({
  item,
  showThreadLink,
}: {
  item: Scheduled;
  showThreadLink: boolean;
}) {
  const cancel = useMutation(api.mail.cancelScheduled);
  const reschedule = useMutation(api.mail.rescheduleScheduled);
  const [editing, setEditing] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<unknown>) {
    setWorking(true);
    setError("");
    try {
      await task();
      setEditing(null);
    } catch (caught) {
      setError(errorMessage(caught, "Action failed."));
    } finally {
      setWorking(false);
    }
  }

  function saveTime() {
    const sendAt = editing === null ? undefined : fromDateTimeInput(editing);
    if (sendAt === undefined || sendAt <= Date.now()) {
      setError("Pick a send time in the future.");
      return;
    }
    void run(() => reschedule({ scheduledId: item._id, sendAt }));
  }

  const recipients =
    item.kind === "reply"
      ? "To the conversation"
      : `To ${item.to.map(displayAddress).join(", ")}`;
  const sending = item.status === "sending";
  const failed = item.status === "failed";

  return (
    <li className={styles.scheduledRow}>
      <div className={styles.scheduledMain}>
        <strong>
          {KIND_LABELS[item.kind]}: {item.subject}
        </strong>
        <small>
          {recipients}
          {item.cc.length > 0 ? ` · Cc ${item.cc.map(displayAddress).join(", ")}` : ""}
          {item.attachmentCount > 0
            ? ` · ${item.attachmentCount} attachment${item.attachmentCount === 1 ? "" : "s"}`
            : ""}
        </small>
        {item.snippet ? <small>{item.snippet}</small> : null}
        <small>
          Scheduled by {item.createdByName}
          {showThreadLink && item.threadId ? (
            <>
              {" · "}
              <Link href={`/admin/mail/${item.threadId}`}>Open conversation</Link>
            </>
          ) : null}
        </small>
        {failed && item.error ? (
          <small className={styles.scheduledError}>Not sent: {item.error}</small>
        ) : null}
        {error ? <small className={styles.scheduledError}>{error}</small> : null}
      </div>
      <span className={styles.scheduledWhen}>
        <span
          className={`${adminStyles.badge} ${failed ? adminStyles.red : adminStyles.orange}`}
        >
          {failed ? "Failed" : sending ? "Sending" : "Scheduled"}
        </span>
        <time dateTime={new Date(item.sendAt).toISOString()}>
          {formatFullDate(item.sendAt)}
        </time>
      </span>
      {sending ? null : (
        <div className={styles.scheduledActions}>
          {editing !== null ? (
            <>
              <input
                type="datetime-local"
                aria-label="New send time"
                value={editing}
                min={toDateTimeInput(new Date())}
                onChange={(event) => setEditing(event.target.value)}
              />
              <Button className="green sm" type="button" disabled={working} onClick={saveTime}>
                Save
              </Button>
              <Button
                className="text sm"
                type="button"
                disabled={working}
                onClick={() => setEditing(null)}
              >
                Keep time
              </Button>
            </>
          ) : (
            <>
              <Button
                className="secondary sm"
                type="button"
                disabled={working}
                onClick={() => void run(() => reschedule({ scheduledId: item._id }))}
              >
                <i className="bx bx-send" aria-hidden="true" />
                {failed ? "Try again now" : "Send now"}
              </Button>
              <Button
                className="text sm"
                type="button"
                disabled={working}
                onClick={() =>
                  setEditing(
                    toDateTimeInput(new Date(Math.max(item.sendAt, Date.now() + 60 * 60 * 1000))),
                  )
                }
              >
                Change time
              </Button>
              <Button
                className="dangerText sm"
                type="button"
                disabled={working}
                onClick={() => {
                  if (window.confirm("Cancel this scheduled email? It will not be sent.")) {
                    void run(() => cancel({ scheduledId: item._id }));
                  }
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
