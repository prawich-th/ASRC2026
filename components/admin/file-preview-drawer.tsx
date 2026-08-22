"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./admin.module.scss";

export type PreviewFile = {
  fileName: string;
  contentType?: string;
  size: number;
  url: string | null;
};

function getPreviewKind(file: PreviewFile): "pdf" | "image" | "unsupported" {
  const type = file.contentType?.toLowerCase() ?? "";
  const name = file.fileName.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
    return "image";
  }
  return "unsupported";
}

export default function FilePreviewDrawer({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!file) {
      return;
    }
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [file, onClose]);

  if (!file) {
    return null;
  }

  const kind = getPreviewKind(file);

  return (
    <div className={styles.drawerLayer} role="presentation">
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Close file preview"
        onClick={onClose}
      />
      <aside
        className={styles.fileDrawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-preview-title"
      >
        <header className={styles.drawerHeader}>
          <div>
            <h2 id="file-preview-title">{file.fileName}</h2>
            <p>
              {file.contentType ?? "Unknown file type"} ·{" "}
              {Math.max(1, Math.ceil(file.size / 1024))} KB
            </p>
          </div>
          <button
            ref={closeRef}
            className={styles.drawerClose}
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className={styles.drawerBody}>
          {!file.url ? (
            <div className={styles.previewUnavailable}>
              <h3>Preview unavailable</h3>
              <p>The stored file URL is no longer available.</p>
            </div>
          ) : kind === "pdf" ? (
            <iframe
              className={styles.pdfPreview}
              src={file.url}
              title={`Preview of ${file.fileName}`}
            />
          ) : kind === "image" ? (
            <div className={styles.imagePreview}>
              <Image
                src={file.url}
                alt={`Preview of ${file.fileName}`}
                width={1600}
                height={1200}
                unoptimized
              />
            </div>
          ) : (
            <div className={styles.previewUnavailable}>
              <h3>Preview unavailable</h3>
              <p>This browser cannot preview this file type inside the review page.</p>
              <a href={file.url} target="_blank" rel="noreferrer">
                Download or open externally
              </a>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
