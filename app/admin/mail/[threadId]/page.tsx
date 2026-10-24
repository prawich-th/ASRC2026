"use client";

import adminStyles from "@/components/admin/admin.module.scss";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import {
  displayAddress,
  errorMessage,
  formatBytes,
  formatFullDate,
} from "@/components/mail/format";
import MailComposer, { ComposerMode } from "@/components/mail/mail-composer";
import styles from "@/components/mail/mail.module.scss";
import MessageBody from "@/components/mail/message-body";
import ScheduledList from "@/components/mail/scheduled-list";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Message = FunctionReturnType<typeof api.mailActions.loadThread>[number];
type MoveFolder = "inbox" | "archive" | "spam" | "trash";

export default function MailThreadPage() {
  const { threadId: rawId } = useParams<{ threadId: string }>();
  const threadId = rawId as Id<"mailThreads">;
  const router = useRouter();
  const data = useQuery(api.mail.getThread, { threadId });
  const loadThread = useAction(api.mailActions.loadThread);
  const moveThread = useAction(api.mailActions.moveThread);
  const setRead = useAction(api.mailActions.setRead);
  const getAttachmentUrl = useAction(api.mailActions.getAttachmentUrl);

  const [messages, setMessages] = useState<Message[]>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [composer, setComposer] = useState<ComposerMode | null>(null);
  const [notice, setNotice] = useState("");
  const emailCount = data?.thread.emailCount;

  // Reload whenever the cached email count changes (new mail via webhook).
  useEffect(() => {
    if (emailCount === undefined) {
      return;
    }
    let cancelled = false;
    loadThread({ threadId })
      .then((result) => {
        if (!cancelled) {
          setMessages(result);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(errorMessage(caught, "Could not load this conversation."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadThread, threadId, emailCount]);

  if (data === undefined) {
    return <LoadingScreen variant="inline" what="conversation" />;
  }
  if (data === null) {
    return (
      <section className={adminStyles.card}>
        <p className={adminStyles.empty}>This conversation no longer exists.</p>
        <p className={adminStyles.backLink}>
          <Link href="/admin/mail">← Back to mail</Link>
        </p>
      </section>
    );
  }

  const { thread, inbox } = data;
  const backHref = `/admin/mail?inbox=${inbox._id}&folder=${thread.folder}`;
  const last = messages?.[messages.length - 1];

  async function run(task: () => Promise<unknown>, thenBack = false) {
    setWorking(true);
    setError("");
    try {
      await task();
      if (thenBack) {
        router.push(backHref);
      }
    } catch (caught) {
      setError(errorMessage(caught, "Action failed."));
    } finally {
      setWorking(false);
    }
  }

  function move(folder: MoveFolder) {
    void run(() => moveThread({ threadId, folder }), true);
  }

  async function openAttachment(message: Message, attachmentId: string) {
    // Open the tab first so popup blockers allow it, then point it at the URL.
    const tab = window.open("", "_blank");
    try {
      const url = await getAttachmentUrl({
        threadId,
        emailId: message.id,
        attachmentId,
        direction: message.direction,
      });
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (caught) {
      tab?.close();
      setError(errorMessage(caught, "Could not open the attachment."));
    }
  }

  function startComposer(kind: "reply" | "replyAll" | "forward") {
    if (!last) {
      return;
    }
    const recipients =
      last.direction === "inbound"
        ? last.replyTo.length > 0
          ? last.replyTo
          : [last.from]
        : last.to;
    setNotice("");
    setComposer({
      kind,
      inboxId: inbox._id,
      threadId,
      emailId: last.id,
      context:
        kind === "forward"
          ? `Forwarding the latest message from ${inbox.address}.`
          : `From ${inbox.address} to ${recipients.map(displayAddress).join(", ")}${kind === "replyAll" ? " and everyone else on the thread" : ""}.`,
    });
  }

  return (
    <div className={adminStyles.stack}>
      <p className={adminStyles.backLink}>
        <Link href={backHref}>← Back to {inbox.name}</Link>
      </p>
      <section className={`${adminStyles.card} ${adminStyles.stack}`}>
        <div className={adminStyles.header}>
          <div>
            <h1 className={styles.threadTitle}>{thread.subject}</h1>
            <p>
              {inbox.address} · {thread.emailCount}{" "}
              {thread.emailCount === 1 ? "message" : "messages"}
            </p>
          </div>
          <div className={adminStyles.actions}>
            {thread.folder === "inbox" || thread.folder === "sent" ? (
              <Button className="secondary sm" type="button" disabled={working} onClick={() => move("archive")}>
                <i className="bx bx-archive" aria-hidden="true" />
                Archive
              </Button>
            ) : (
              <Button className="secondary sm" type="button" disabled={working} onClick={() => move("inbox")}>
                <i className="bx bx-inbox" aria-hidden="true" />
                Move to inbox
              </Button>
            )}
            {thread.folder !== "spam" ? (
              <Button className="secondary sm" type="button" disabled={working} onClick={() => move("spam")}>
                <i className="bx bx-alert-octagon" aria-hidden="true" />
                Spam
              </Button>
            ) : null}
            {thread.folder !== "trash" ? (
              <Button className="secondary sm" type="button" disabled={working} onClick={() => move("trash")}>
                <i className="bx bx-trash" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            <Button
              className="text sm"
              type="button"
              disabled={working}
              onClick={() => void run(() => setRead({ threadId, read: false }), true)}
            >
              Mark unread
            </Button>
          </div>
        </div>
        {error ? <p className={adminStyles.error}>{error}</p> : null}

        {messages === undefined ? (
          error ? null : <LoadingScreen variant="inline" what="messages" />
        ) : (
          <ol className={styles.messageList}>
            {messages.map((message) => (
              <li key={message.id} className={styles.message}>
                <header className={styles.messageHead}>
                  <div>
                    <strong>{displayAddress(message.from)}</strong>
                    {message.direction === "outbound" ? (
                      <span className={`${adminStyles.badge} ${adminStyles.green}`}>Sent</span>
                    ) : null}
                    <p>
                      {message.from !== displayAddress(message.from) ? `${message.from} · ` : ""}
                      To {message.to.join(", ")}
                      {message.cc.length > 0 ? ` · Cc ${message.cc.join(", ")}` : ""}
                    </p>
                  </div>
                  <time dateTime={message.receivedAt}>{formatFullDate(message.receivedAt)}</time>
                </header>
                <MessageBody html={message.html} text={message.text} />
                {message.attachments.length > 0 ? (
                  <ul className={styles.attachmentList}>
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <button
                          type="button"
                          className={styles.attachmentLink}
                          onClick={() => void openAttachment(message, attachment.id)}
                        >
                          <i className="bx bx-paperclip" aria-hidden="true" />
                          <span>{attachment.filename ?? "Attachment"}</span>
                          <small>{formatBytes(attachment.size)}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <ScheduledList inboxId={inbox._id} threadId={thread._id} />
        {notice ? <p className={adminStyles.success}>{notice}</p> : null}
        {composer ? (
          <MailComposer
            key={`${composer.kind}:${"emailId" in composer ? composer.emailId : ""}`}
            mode={composer}
            onCancel={() => setComposer(null)}
            onSent={(sendAt) => {
              setComposer(null);
              setNotice(sendAt ? `Scheduled to send on ${formatFullDate(sendAt)}.` : "");
            }}
          />
        ) : last ? (
          <div className={styles.replyBar}>
            <Button className="secondary" type="button" onClick={() => startComposer("forward")}>
              <i className="bx bx-forward" aria-hidden="true" />
              Forward
            </Button>
            <Button className="secondary" type="button" onClick={() => startComposer("replyAll")}>
              <i className="bx bx-reply-big" aria-hidden="true" />
              Reply all
            </Button>
            <Button className="green" type="button" onClick={() => startComposer("reply")}>
              <i className="bx bx-reply" aria-hidden="true" />
              Reply
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
