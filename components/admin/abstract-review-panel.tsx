"use client";

import Button from "@/components/form/button";
import FilePreviewDrawer, { PreviewFile } from "./file-preview-drawer";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getAbstractStatusLabel,
  getCategoryLabel,
} from "@/lib/abstractDisplay";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import styles from "./admin.module.scss";

type Decision = "selected" | "rejected" | "revision_requested";

function getStatusClass(status: string) {
  if (status === "selected") {
    return styles.green;
  }
  if (status === "rejected") {
    return styles.red;
  }
  return styles.orange;
}

export default function AbstractReviewPanel({
  abstractId,
  onDecided,
}: {
  abstractId: Id<"abstracts">;
  onDecided?: (abstractId: Id<"abstracts">) => void;
}) {
  const detail = useQuery(api.abstracts.getForReview, { abstractId });
  const saveReview = useMutation(api.abstracts.saveReview);
  const [privateNotesDraft, setPrivateNotes] = useState<string | null>(null);
  const [feedbackDraft, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  async function save(decision?: Decision) {
    if (!detail) {
      return;
    }
    const privateNotes = privateNotesDraft ?? detail.abstract.privateNotes ?? "";
    const submitterFeedback =
      feedbackDraft ?? detail.abstract.submitterFeedback ?? "";

    if (decision === "revision_requested" && !submitterFeedback.trim()) {
      setMessage("Add feedback explaining the required revisions.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await saveReview({
        abstractId,
        privateNotes,
        submitterFeedback,
        decision,
      });
      if (decision) {
        onDecided?.(abstractId);
        setMessage("Review decision saved.");
      } else {
        setMessage("Review notes saved.");
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not save review.");
    } finally {
      setSaving(false);
    }
  }

  if (detail === undefined) {
    return <LoadingScreen variant="inline" what="abstract" />;
  }
  if (detail === null) {
    return (
      <div className={styles.reviewState}>
        This abstract could not be found or is not available to review.
      </div>
    );
  }

  const privateNotes = privateNotesDraft ?? detail.abstract.privateNotes ?? "";
  const submitterFeedback =
    feedbackDraft ?? detail.abstract.submitterFeedback ?? "";
  const canDecide = detail.abstract.status === "submitted";

  return (
    <div className={styles.reviewContent}>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <span
              className={`${styles.badge} ${getStatusClass(detail.abstract.status)}`}
            >
              {getAbstractStatusLabel(detail.abstract.status)}
            </span>
            <h1>{detail.abstract.title}</h1>
            <p>{detail.abstract.code}</p>
          </div>
        </div>
        <dl className={styles.meta}>
          <div>
            <dt>Submitter</dt>
            <dd>{detail.owner.name || detail.owner.email || "Unknown"}</dd>
          </div>
          <div>
            <dt>Affiliation</dt>
            <dd>{detail.abstract.affiliation}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{getCategoryLabel(detail.abstract.category)}</dd>
          </div>
          <div>
            <dt>Keywords</dt>
            <dd>{detail.abstract.keywords.join(", ")}</dd>
          </div>
        </dl>
        <div className={styles.article}>{detail.abstract.body}</div>
      </section>

      <section className={`${styles.card} ${styles.stack}`}>
        <h2>Supporting files</h2>
        {detail.files.length === 0 ? (
          <p>No supporting files.</p>
        ) : (
          <ul className={styles.fileList}>
            {detail.files.map((file) => (
              <li key={file._id}>
                <span>{file.fileName}</span>
                {file.url ? (
                  <button
                    className={styles.filePreviewButton}
                    type="button"
                    onClick={() => setPreviewFile(file)}
                  >
                    Preview
                  </button>
                ) : (
                  <span>Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${styles.card} ${styles.stack}`}>
        <h2>Review decision</h2>
        <label>
          Private academic staff notes
          <textarea
            className={styles.textArea}
            value={privateNotes}
            onChange={(event) => setPrivateNotes(event.target.value)}
          />
        </label>
        <label>
          Feedback visible to the submitter
          <textarea
            className={styles.textArea}
            value={submitterFeedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
        </label>
        {message ? (
          <p
            className={
              message.startsWith("Review") ? styles.success : styles.error
            }
          >
            {message}
          </p>
        ) : null}
        <div className={styles.reviewActions}>
          <Button className="action" disabled={saving} type="button" onClick={() => void save()}>
            Save notes
          </Button>
          {canDecide ? (
            <>
              <Button className="action" disabled={saving} type="button" onClick={() => void save("revision_requested")}>
                Send back for edit
              </Button>
              <Button className="destructive" disabled={saving} type="button" onClick={() => void save("rejected")}>
                Reject
              </Button>
              <Button className="green" disabled={saving} type="button" onClick={() => void save("selected")}>
                Approve
              </Button>
            </>
          ) : null}
        </div>
      </section>
      <FilePreviewDrawer
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
