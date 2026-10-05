"use client";

import AbstractPreview from "@/components/abstract-editor/abstract-preview";
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
type AbstractCategory = "oral" | "poster";

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
  const [selectedCategoryDraft, setSelectedCategory] = useState<
    AbstractCategory | "" | null
  >(null);

  async function save(decision?: Decision) {
    if (!detail) {
      return;
    }
    const privateNotes =
      privateNotesDraft ?? detail.abstract.privateNotes ?? "";
    const submitterFeedback =
      feedbackDraft ?? detail.abstract.submitterFeedback ?? "";
    const selectedCategory =
      selectedCategoryDraft ?? detail.abstract.category ?? "";

    if (decision === "revision_requested" && !submitterFeedback.trim()) {
      setMessage("Add feedback explaining the required revisions.");
      return;
    }
    if (decision === "selected" && !selectedCategory) {
      setMessage(
        "Select an oral or poster presentation category before approval.",
      );
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
        category:
          decision === "selected" ? selectedCategory || undefined : undefined,
      });
      if (decision) {
        onDecided?.(abstractId);
        setMessage("Review decision saved.");
      } else {
        setMessage("Review notes saved.");
      }
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not save review.",
      );
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
  const selectedCategory =
    selectedCategoryDraft ?? detail.abstract.category ?? "";
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
            <dt>Presenting author</dt>
            <dd>
              {detail.abstract.authorList?.find((author) => author.presenting)
                ?.name ?? "Not specified"}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{getCategoryLabel(detail.abstract.category)}</dd>
          </div>
        </dl>
        <AbstractPreview
          abstract={detail.abstract}
          affiliations={detail.affiliations}
          showWordCount
        />
      </section>

      {detail.files.length > 0 ? (
        <section className={`${styles.card} ${styles.stack}`}>
          <h2>Legacy submission files</h2>
          <ul className={styles.fileList}>
            {detail.files.map((file) => (
              <li key={file._id}>
                <span>
                  {file.kind === "supplementary" ? "Supplementary" : "Paper"}
                  {" · "}
                  {file.fileName}
                </span>
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
        </section>
      ) : null}

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
        {canDecide ? (
          <label>
            Presentation category (required for selection)
            <select
              className={styles.select}
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value as AbstractCategory | "")
              }
            >
              <option value="">Select a category</option>
              <option value="oral">Oral presentation</option>
              <option value="poster">Poster presentation</option>
            </select>
          </label>
        ) : null}
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
          <Button
            className="action"
            disabled={saving}
            type="button"
            onClick={() => void save()}
          >
            Save notes
          </Button>
          {canDecide ? (
            <>
              <Button
                className="action"
                disabled={saving}
                type="button"
                onClick={() => void save("revision_requested")}
              >
                Send back for edit
              </Button>
              <Button
                className="destructive"
                disabled={saving}
                type="button"
                onClick={() => void save("rejected")}
              >
                Reject
              </Button>
              <Button
                className="green"
                disabled={saving}
                type="button"
                onClick={() => void save("selected")}
              >
                Select for presentation
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
