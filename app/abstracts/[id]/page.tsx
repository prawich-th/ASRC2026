"use client";

import AbstractPreview from "@/components/abstract-editor/abstract-preview";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getAbstractStatusLabel,
  getAbstractStatusMessage,
  getAbstractStatusTone,
  getCategoryLabel,
} from "@/lib/abstractDisplay";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "../abstracts.module.scss";

function formatDate(value?: number) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AbstractViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const abstractId = params.id as Id<"abstracts">;

  const detail = useQuery(api.abstracts.getMineById, { abstractId });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || detail === undefined) {
    return <LoadingScreen what="your abstract" />;
  }

  if (!detail) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.inner}>
            <section className={styles.card}>
              <h2>Abstract not found</h2>
              <p className={styles.helperText}>
                The abstract may have been removed or you may not have
                permission to view it.
              </p>
              <div className={styles.actions}>
                <Link href="/profile/abstracts">
                  <Button className="primary" type="button">
                    Back to My Abstracts
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const statusTone = getAbstractStatusTone(detail.abstract.status);
  const statusLabel = getAbstractStatusLabel(detail.abstract.status);
  const statusMessage = getAbstractStatusMessage(detail.abstract.status);

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <p>My Abstract {"->"}</p>
          <h1>{detail.abstract.title}</h1>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          <section className={styles.metadataGrid}>
            <div className={styles.card}>
              <ul className={styles.metaRows}>
                <li>
                  <strong>Submission ID</strong>
                  <span>{detail.abstract.code}</span>
                </li>
                <li>
                  <strong>Submission Date</strong>
                  <span>{formatDate(detail.abstract.submittedAt)}</span>
                </li>
                <li>
                  <strong>Category</strong>
                  <span>{getCategoryLabel(detail.abstract.category)}</span>
                </li>
              </ul>
            </div>

            <div className={styles.statusCard}>
              <div className={`${styles.statusHead} ${styles[statusTone]}`}>
                <span>{statusLabel}</span>
                <i className="bx bx-search-alt-2" aria-hidden="true" />
              </div>
              <div className={styles.statusBody}>
                <p>{statusMessage}</p>
                <p className={styles.updated}>
                  Last updated {formatDate(detail.abstract.updatedAt)}
                </p>
              </div>
            </div>
          </section>

          {detail.abstract.submitterFeedback ? (
            <section className={styles.card}>
              <h2>Committee Feedback</h2>
              <p>{detail.abstract.submitterFeedback}</p>
              {detail.abstract.status === "revision_requested" ? (
                <div className={styles.actions}>
                  <Link href={`/abstracts/${detail.abstract._id}/edit`}>
                    <Button className="action" type="button">
                      Edit and Resubmit
                    </Button>
                  </Link>
                </div>
              ) : null}
              {detail.abstract.reviewedAt ? (
                <p className={styles.helperText}>
                  Reviewed {formatDate(detail.abstract.reviewedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className={styles.card}>
            <div className={styles.headerRow}>
              <h2>Your Abstract</h2>
              {detail.abstract.status === "draft" ||
              detail.abstract.status === "revision_requested" ? (
                <Link href={`/abstracts/${detail.abstract._id}/edit`}>
                  <Button className="primary" type="button">
                    {detail.abstract.status === "revision_requested"
                      ? "Edit Revision"
                      : "Edit"}
                  </Button>
                </Link>
              ) : null}
            </div>
            <AbstractPreview
              abstract={detail.abstract}
              affiliations={detail.affiliations}
            />
          </section>

          {detail.files.length > 0 ? (
            <section className={styles.card}>
              <h2>Files from the previous submission system</h2>
              <ul className={styles.supportingList}>
                {detail.files.map((file) => (
                  <li key={file._id} className={styles.supportingItem}>
                    <i
                      className={`bx bx-file-blank ${styles.icon}`}
                      aria-hidden="true"
                    />
                    <div className={styles.content}>
                      <strong>{file.fileName}</strong>
                      <span className={styles.fileKind}>
                        {file.kind === "supplementary"
                          ? "Supplementary"
                          : "Paper"}
                      </span>
                      <span>
                        Uploaded: {formatDate(file.uploadedAt)} (
                        {Math.ceil(file.size / 1024)} KB)
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      {file.url ? (
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <Button className="green" type="button">
                            Open
                          </Button>
                        </a>
                      ) : (
                        <span className={styles.helperText}>Unavailable</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
