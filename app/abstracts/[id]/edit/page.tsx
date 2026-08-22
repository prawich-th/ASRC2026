"use client";

import Button from "@/components/form/button";
import {
  CheckboxField,
  FileUploadField,
  FormField,
  SelectField,
  TextAreaField,
} from "@/components/form/Form";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAbstractStatusLabel } from "@/lib/abstractDisplay";
import { joinKeywords, parseKeywordsInput } from "@/lib/abstractForm";
import { ABSTRACT_CATEGORIES } from "@/lib/formOptions";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "../../abstracts.module.scss";

type ExistingFile = {
  _id: Id<"abstractFiles">;
  fileName: string;
  size: number;
  uploadedAt: number;
  url: string | null;
};

type DraftForm = {
  title: string;
  body: string;
  keywordsInput: string;
  category: (typeof ABSTRACT_CATEGORIES)[number];
  affiliation: string;
  affiliationDeclared: boolean;
};

export default function EditAbstractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const abstractId = params.id as Id<"abstracts">;

  const detail = useQuery(api.abstracts.getMineById, { abstractId });
  const updateDraft = useMutation(api.abstracts.updateDraft);
  const submitDraft = useMutation(api.abstracts.submitDraft);
  const generateUploadUrl = useMutation(api.abstracts.generateUploadUrl);
  const attachUploadedFile = useMutation(api.abstracts.attachUploadedFile);
  const removeFile = useMutation(api.abstracts.removeFile);

  const [draft, setDraft] = useState<DraftForm | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileOverrides, setFileOverrides] = useState<ExistingFile[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const detailDraft = useMemo<DraftForm | null>(() => {
    if (!detail) {
      return null;
    }
    return {
      title: detail.abstract.title,
      body: detail.abstract.body,
      keywordsInput: joinKeywords(detail.abstract.keywords),
      category: detail.abstract.category,
      affiliation: detail.abstract.affiliation,
      affiliationDeclared: detail.abstract.affiliationDeclared,
    };
  }, [detail]);

  const files = useMemo<ExistingFile[]>(() => {
    if (fileOverrides) {
      return fileOverrides;
    }
    if (!detail) {
      return [];
    }
    return detail.files.map((file) => ({
      _id: file._id,
      fileName: file.fileName,
      size: file.size,
      uploadedAt: file.uploadedAt,
      url: file.url,
    }));
  }, [fileOverrides, detail]);

  const formValues = draft ?? detailDraft;

  const categoryOptions = useMemo(
    () =>
      ABSTRACT_CATEGORIES.map((value) => ({
        value,
        label: value === "oral" ? "Oral Presentation" : "Poster Presentation",
      })),
    [],
  );

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function uploadPendingFiles() {
    if (selectedFiles.length === 0) {
      return;
    }

    const uploaded: ExistingFile[] = [];
    for (const file of selectedFiles) {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error(`Could not upload "${file.name}"`);
      }

      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };

      const savedFile = await attachUploadedFile({
        abstractId,
        storageId,
        fileName: file.name,
      });

      uploaded.push({
        _id: savedFile._id,
        fileName: savedFile.fileName,
        size: savedFile.size,
        uploadedAt: savedFile.uploadedAt,
        url: null,
      });
    }

    setFileOverrides([...uploaded, ...files]);
    setSelectedFiles([]);
  }

  async function handleSave(mode: "draft" | "submit") {
    setError("");

    if (!detail) {
      setError("Abstract not found.");
      return;
    }
    if (
      detail.abstract.status !== "draft" &&
      detail.abstract.status !== "revision_requested"
    ) {
      setError("This abstract is not open for editing.");
      return;
    }

    if (!formValues) {
      setError("Abstract data is unavailable.");
      return;
    }

    const keywords = parseKeywordsInput(formValues.keywordsInput);
    if (
      !formValues.title.trim() ||
      !formValues.body.trim() ||
      keywords.length === 0 ||
      !formValues.affiliation.trim()
    ) {
      setError("Please complete title, abstract, keywords, and affiliation.");
      return;
    }

    if (mode === "submit" && !formValues.affiliationDeclared) {
      setError("Please declare your affiliation before submission.");
      return;
    }

    setSubmitting(true);
    try {
      await updateDraft({
        abstractId,
        title: formValues.title,
        body: formValues.body,
        keywords,
        category: formValues.category,
        affiliation: formValues.affiliation,
        affiliationDeclared: formValues.affiliationDeclared,
      });

      await uploadPendingFiles();

      if (mode === "submit") {
        await submitDraft({ abstractId });
        router.replace(`/abstracts/${abstractId}`);
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save draft.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveFile(fileId: Id<"abstractFiles">) {
    setError("");
    try {
      await removeFile({ fileId });
      setFileOverrides(files.filter((item) => item._id !== fileId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove file.");
    }
  }

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
                The abstract may have been removed or you may not have permission to
                edit it.
              </p>
              <div className={styles.actions}>
                <Link href="/profile">
                  <Button className="primary" type="button">
                    Back to Profile
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

  if (!formValues) {
    return <LoadingScreen what="your abstract" />;
  }

  const isRevision = detail.abstract.status === "revision_requested";
  const isEditable = detail.abstract.status === "draft" || isRevision;

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>{isRevision ? "Revise Abstract" : "My Abstract (draft)"}</h1>
          <p>
            {isRevision
              ? "Address the committee feedback, then resubmit for review."
              : "Refine your draft and submit when you are ready."}
          </p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          {!isEditable ? (
            <section className={styles.card}>
              <h2>{getAbstractStatusLabel(detail.abstract.status)}</h2>
              <p className={styles.helperText}>
                This abstract can no longer be edited. You can view it on the detail
                page.
              </p>
              <div className={styles.actions}>
                <Link href={`/abstracts/${detail.abstract._id}`}>
                  <Button className="primary" type="button">
                    View Abstract
                  </Button>
                </Link>
              </div>
            </section>
          ) : null}

          <section className={styles.card}>
            <h2>Abstract Information</h2>
            <div className={styles.formGrid}>
              <FormField
                label="Abstract Title"
                value={formValues.title}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    title: event.target.value,
                  })
                }
              />
              <SelectField
                label="Category"
                options={categoryOptions}
                value={formValues.category}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    category: event.target.value as (typeof ABSTRACT_CATEGORIES)[number],
                  })
                }
              />
              <TextAreaField
                label="Abstract"
                rows={7}
                value={formValues.body}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    body: event.target.value,
                  })
                }
              />
              <FormField
                label="Keywords"
                value={formValues.keywordsInput}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    keywordsInput: event.target.value,
                  })
                }
                placeholder="Comma-separated keywords"
              />
              <FormField
                label="Affiliation"
                value={formValues.affiliation}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    affiliation: event.target.value,
                  })
                }
              />
              <CheckboxField
                label="I declare the listed affiliation and abstract details are accurate."
                checked={formValues.affiliationDeclared}
                disabled={!isEditable}
                onChange={(event) =>
                  setDraft({
                    ...formValues,
                    affiliationDeclared: event.target.checked,
                  })
                }
              />
            </div>
          </section>

          <section className={styles.card}>
            <h2>Supporting Files</h2>
            {isEditable ? (
              <FileUploadField
                label="Upload files"
                multiple
                selectedFiles={selectedFiles}
                onChange={handleFileSelection}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
            ) : null}

            {files.length > 0 ? (
              <ul className={styles.supportingList}>
                {files.map((file) => (
                  <li key={file._id} className={styles.supportingItem}>
                    <i className={`bx bx-file-blank ${styles.icon}`} aria-hidden="true" />
                    <div className={styles.content}>
                      <strong>{file.fileName}</strong>
                      <span>{Math.ceil(file.size / 1024)} KB</span>
                    </div>
                    <div className={styles.rowActions}>
                      {file.url ? (
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <Button className="green" type="button">
                            Open
                          </Button>
                        </a>
                      ) : null}
                      {isEditable ? (
                        <Button
                          className="destructive"
                          type="button"
                          onClick={() => void handleRemoveFile(file._id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>No supporting files uploaded yet.</p>
            )}

            {error ? <p className={styles.error}>{error}</p> : null}
            {isEditable ? (
              <div className={styles.actions}>
                <Button
                  className="action"
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSave("draft")}
                >
                  {submitting ? "Please wait..." : isRevision ? "Save Changes" : "Save Draft"}
                </Button>
                <Button
                  className="primary"
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSave("submit")}
                >
                  {submitting ? "Please wait..." : isRevision ? "Resubmit for Review" : "Submit for Review"}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
