"use client";

import RichTextEditor from "@/components/abstract-editor/rich-text-editor";
import Button from "@/components/form/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  RICH_DOCUMENT_FORMATS,
  RichDocumentOp,
  sanitizeRichDocument,
} from "@/lib/richDocument";
import { useAction, useMutation } from "convex/react";
import { useId, useState } from "react";
import {
  errorMessage,
  formatBytes,
  formatFullDate,
  fromDateTimeInput,
  schedulePresets,
  toDateTimeInput,
} from "./format";
import styles from "./mail.module.scss";
import RecipientInput, { Recipient } from "./recipient-input";

const ATTACHMENT_LIMIT_BYTES = 25 * 1024 * 1024;

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }, "blockquote"],
  ["link"],
  ["clean"],
];

export type ComposerMode =
  | { kind: "compose"; inboxId: Id<"mailInboxes"> }
  | {
      kind: "reply" | "replyAll" | "forward";
      inboxId: Id<"mailInboxes">;
      threadId: Id<"mailThreads">;
      emailId: string;
      /** Shown above the form, e.g. who the reply goes to. */
      context?: string;
    };

type SignatureStyle = "full" | "compact" | "none";

type Attachment = {
  uploadId: Id<"mailUploads">;
  filename: string;
  size: number;
};

function emails(recipients: Recipient[]): string[] {
  return recipients.map((recipient) => recipient.email);
}

const TITLES: Record<ComposerMode["kind"], string> = {
  compose: "New email",
  reply: "Reply",
  replyAll: "Reply all",
  forward: "Forward",
};

export default function MailComposer({
  mode,
  onCancel,
  onSent,
}: {
  mode: ComposerMode;
  onCancel: () => void;
  /** `sendAt` is set when the email was scheduled rather than sent. */
  onSent: (sendAt?: number) => void;
}) {
  const compose = useAction(api.mailActions.compose);
  const reply = useAction(api.mailActions.reply);
  const forward = useAction(api.mailActions.forward);
  const generateUploadUrl = useMutation(api.mail.generateAttachmentUploadUrl);
  const registerUpload = useMutation(api.mail.registerAttachmentUpload);
  const removeUpload = useMutation(api.mail.removeAttachmentUpload);

  const bodyLabelId = useId();
  const [to, setTo] = useState<Recipient[]>([]);
  const [cc, setCc] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState<RichDocumentOp[]>([]);
  const [bodyText, setBodyText] = useState("");
  const [signature, setSignature] = useState<SignatureStyle>(
    mode.kind === "reply" || mode.kind === "replyAll" ? "compact" : "full",
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // Local "YYYY-MM-DDTHH:mm" while the schedule panel is open, else null.
  const [sendAtInput, setSendAtInput] = useState<string | null>(null);
  // Reused across retries of the same message so Resend never sends twice;
  // any edit starts a new one.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const needsTo = mode.kind === "compose" || mode.kind === "forward";
  const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);

  function edited<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setRequestId(crypto.randomUUID());
    };
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const incoming = Array.from(files);
    const incomingSize = incoming.reduce((sum, file) => sum + file.size, 0);
    if (totalSize + incomingSize > ATTACHMENT_LIMIT_BYTES) {
      setError("Attachments can be at most 25 MB in total.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of incoming) {
        const url = await generateUploadUrl({ inboxId: mode.inboxId });
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`Could not upload ${file.name}`);
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        const uploadId = await registerUpload({
          inboxId: mode.inboxId,
          storageId,
          filename: file.name,
        });
        setAttachments((current) => [
          ...current,
          { uploadId, filename: file.name, size: file.size },
        ]);
      }
      setRequestId(crypto.randomUUID());
    } catch (caught) {
      setError(errorMessage(caught, "Could not attach the file."));
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(uploadId: Id<"mailUploads">) {
    setAttachments((current) => current.filter((file) => file.uploadId !== uploadId));
    setRequestId(crypto.randomUUID());
    await removeUpload({ uploadId }).catch(() => undefined);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    const uploadIds = attachments.map((file) => file.uploadId);
    if (needsTo && to.length === 0) {
      setError("Add at least one recipient.");
      setSending(false);
      return;
    }
    if (mode.kind !== "forward" && !bodyText.trim()) {
      setError("Write a message before sending.");
      setSending(false);
      return;
    }
    const ccList = emails(cc);
    let sendAt: number | undefined;
    if (sendAtInput !== null) {
      sendAt = fromDateTimeInput(sendAtInput);
      if (sendAt === undefined || sendAt <= Date.now()) {
        setError("Pick a send time in the future.");
        setSending(false);
        return;
      }
    }
    try {
      if (mode.kind === "compose") {
        await compose({
          inboxId: mode.inboxId,
          to: emails(to),
          cc: ccList,
          subject,
          body,
          uploadIds,
          signature,
          requestId,
          sendAt,
        });
      } else if (mode.kind === "forward") {
        await forward({
          threadId: mode.threadId,
          emailId: mode.emailId,
          to: emails(to),
          cc: ccList,
          body,
          uploadIds,
          signature,
          requestId,
          sendAt,
        });
      } else {
        await reply({
          threadId: mode.threadId,
          emailId: mode.emailId,
          body,
          replyAll: mode.kind === "replyAll",
          cc: ccList,
          uploadIds,
          signature,
          requestId,
          sendAt,
        });
      }
      onSent(sendAt);
    } catch (caught) {
      setError(errorMessage(caught, "Could not send the email."));
    } finally {
      setSending(false);
    }
  }

  async function cancel() {
    for (const file of attachments) {
      await removeUpload({ uploadId: file.uploadId }).catch(() => undefined);
    }
    onCancel();
  }

  const busy = sending || uploading;
  const scheduledAt = sendAtInput === null ? undefined : fromDateTimeInput(sendAtInput);
  const sendLabel = sendAtInput === null ? "Send" : "Schedule send";

  return (
    <form className={styles.composer} onSubmit={(event) => void send(event)}>
      <div className={styles.composerHead}>
        <h2>{TITLES[mode.kind]}</h2>
        {mode.kind !== "compose" && mode.context ? <p>{mode.context}</p> : null}
      </div>
      {needsTo ? (
        <RecipientInput
          inboxId={mode.inboxId}
          label="To"
          required
          value={to}
          placeholder="Search participants or type an email address"
          onChange={edited(setTo)}
        />
      ) : null}
      <RecipientInput
        inboxId={mode.inboxId}
        label="Cc"
        value={cc}
        placeholder="Optional"
        onChange={edited(setCc)}
      />
      {mode.kind === "compose" ? (
        <label className={styles.composerField}>
          Subject
          <input
            type="text"
            required
            value={subject}
            onChange={(event) => edited(setSubject)(event.target.value)}
          />
        </label>
      ) : null}
      <div className={styles.composerField}>
        <span id={bodyLabelId}>Message</span>
        <div className={styles.composerEditor}>
          <RichTextEditor<RichDocumentOp>
            initialValue={[]}
            labelledBy={bodyLabelId}
            toolbar={TOOLBAR}
            formats={RICH_DOCUMENT_FORMATS}
            sanitize={sanitizeRichDocument}
            minHeight="12rem"
            placeholder={mode.kind === "forward" ? "Add a note (optional)" : undefined}
            onChange={(ops, plainText) => {
              setBody(ops);
              setBodyText(plainText);
              setRequestId(crypto.randomUUID());
            }}
          />
        </div>
      </div>
      {attachments.length > 0 ? (
        <ul className={styles.attachmentList}>
          {attachments.map((file) => (
            <li key={file.uploadId}>
              <i className="bx bx-paperclip" aria-hidden="true" />
              <span>{file.filename}</span>
              <small>{formatBytes(file.size)}</small>
              <button
                type="button"
                aria-label={`Remove ${file.filename}`}
                onClick={() => void removeAttachment(file.uploadId)}
              >
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {sendAtInput !== null ? (
        <fieldset className={styles.schedulePanel}>
          <legend>
            <i className="bx bx-clock" aria-hidden="true" />
            Schedule send
          </legend>
          <div className={styles.schedulePresets}>
            {schedulePresets(new Date()).map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={sendAtInput === toDateTimeInput(preset.at)}
                onClick={() => setSendAtInput(toDateTimeInput(preset.at))}
              >
                <strong>{preset.label}</strong>
                <small>{formatFullDate(preset.at.getTime())}</small>
              </button>
            ))}
          </div>
          <label className={styles.scheduleTime}>
            Date and time
            <input
              type="datetime-local"
              required
              value={sendAtInput}
              min={toDateTimeInput(new Date())}
              onChange={(event) => setSendAtInput(event.target.value)}
            />
          </label>
          <p className={styles.scheduleHint}>
            {scheduledAt
              ? `Sends ${formatFullDate(scheduledAt)} (your time, ${Intl.DateTimeFormat().resolvedOptions().timeZone}). You can cancel it from the Scheduled folder until then.`
              : "Pick when this email should go out."}
          </p>
        </fieldset>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.composerFooter}>
        <div className={styles.composerTools}>
          <label className={styles.attachButton}>
            <input
              type="file"
              multiple
              disabled={busy}
              onChange={(event) => {
                void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <i className="bx bx-paperclip" aria-hidden="true" />
            {uploading ? "Uploading…" : "Attach files"}
          </label>
          <label className={styles.signaturePicker}>
            Signature
            <select
              value={signature}
              onChange={(event) => edited(setSignature)(event.target.value as SignatureStyle)}
            >
              <option value="full">Full</option>
              <option value="compact">Compact</option>
              <option value="none">None</option>
            </select>
          </label>
        </div>
        <div className={styles.composerActions}>
          <Button className="text" type="button" disabled={sending} onClick={() => void cancel()}>
            Discard
          </Button>
          <Button
            className="secondary"
            type="button"
            disabled={sending}
            aria-expanded={sendAtInput !== null}
            onClick={() =>
              setSendAtInput((current) =>
                current === null ? toDateTimeInput(schedulePresets(new Date())[0].at) : null,
              )
            }
          >
            <i className={`bx ${sendAtInput === null ? "bx-clock" : "bx-x"}`} aria-hidden="true" />
            {sendAtInput === null ? "Send later" : "Don't schedule"}
          </Button>
          <Button className="green" type="submit" disabled={busy}>
            {sending ? (sendAtInput === null ? "Sending…" : "Scheduling…") : sendLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
