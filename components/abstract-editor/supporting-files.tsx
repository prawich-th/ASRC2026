"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  isAllowedSupportingFile,
  MAX_SUPPORTING_FILE_BYTES,
  MAX_SUPPORTING_FILES,
  SUPPORTING_FILE_EXTENSIONS,
} from "@/lib/abstractForm";
import { useMutation, useQuery } from "convex/react";
import { ChangeEvent, useRef, useState } from "react";
import styles from "./abstract-editor.module.scss";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return match?.[1] ?? caught.message;
  }
  return fallback;
}

/**
 * Optional supporting material (figures, tables, data). The draft is saved
 * first if needed, since files attach to an existing abstract.
 */
export default function SupportingFiles({
  abstractId,
  ensureSaved,
  editable,
}: {
  abstractId?: Id<"abstracts">;
  ensureSaved: () => Promise<Id<"abstracts"> | undefined>;
  editable: boolean;
}) {
  const detail = useQuery(
    api.abstracts.getMineById,
    abstractId ? { abstractId } : "skip",
  );
  const generateUploadUrl = useMutation(
    api.abstracts.generateSupportingFileUploadUrl,
  );
  const addFile = useMutation(api.abstracts.addSupportingFile);
  const removeFile = useMutation(api.abstracts.removeSupportingFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const files = (detail?.files ?? []).filter(
    (file) => file.kind === "supplementary",
  );
  const full = files.length >= MAX_SUPPORTING_FILES;

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    setError("");
    if (selected.length === 0) return;
    if (files.length + selected.length > MAX_SUPPORTING_FILES) {
      setError(`You can attach at most ${MAX_SUPPORTING_FILES} files.`);
      return;
    }
    for (const file of selected) {
      if (!isAllowedSupportingFile(file.name)) {
        setError(`${file.name}: this file type is not accepted.`);
        return;
      }
      if (file.size > MAX_SUPPORTING_FILE_BYTES) {
        setError(
          `${file.name} is larger than ${MAX_SUPPORTING_FILE_BYTES / 1024 / 1024} MB.`,
        );
        return;
      }
    }
    try {
      const id = await ensureSaved();
      if (!id) throw new Error("Save the draft before attaching files.");
      for (const file of selected) {
        setUploading(file.name);
        const url = await generateUploadUrl();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) throw new Error(`Could not upload ${file.name}.`);
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        await addFile({ abstractId: id, storageId, fileName: file.name });
      }
    } catch (caught) {
      setError(errorMessage(caught, "Could not upload the file."));
    } finally {
      setUploading(null);
    }
  }

  async function remove(fileId: Id<"abstractFiles">) {
    setError("");
    try {
      await removeFile({ fileId });
    } catch (caught) {
      setError(errorMessage(caught, "Could not remove the file."));
    }
  }

  return (
    <div className={styles.supportingFiles}>
      <h3>
        Supporting material <span>(optional)</span>
      </h3>
      <p>
        Attach figures, tables, or data that help the committee assess your
        work — up to {MAX_SUPPORTING_FILES} files,{" "}
        {MAX_SUPPORTING_FILE_BYTES / 1024 / 1024} MB each (PDF, Word,
        PowerPoint, Excel, CSV, images, or ZIP).
      </p>
      {files.length > 0 ? (
        <ul className={styles.fileRows}>
          {files.map((file) => (
            <li key={file._id}>
              <i className="bx bx-paperclip" aria-hidden="true" />
              {file.url ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.fileName}
                </a>
              ) : (
                <span>{file.fileName}</span>
              )}
              <small>{formatSize(file.size)}</small>
              {editable ? (
                <button
                  type="button"
                  aria-label={`Remove ${file.fileName}`}
                  onClick={() => void remove(file._id)}
                >
                  <i className="bx bx-trash" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editable ? (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={SUPPORTING_FILE_EXTENSIONS.join(",")}
            onChange={(event) => void upload(event)}
          />
          <button
            type="button"
            className={styles.uploadButton}
            disabled={full || uploading !== null}
            onClick={() => inputRef.current?.click()}
          >
            <i className="bx bx-upload" aria-hidden="true" />
            {uploading
              ? `Uploading ${uploading}…`
              : full
                ? "File limit reached"
                : "Add files"}
          </button>
        </>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
