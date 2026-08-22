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
import { getCategoryLabel } from "@/lib/abstractDisplay";
import { parseKeywordsInput } from "@/lib/abstractForm";
import { ABSTRACT_CATEGORIES } from "@/lib/formOptions";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "../abstracts.module.scss";

type UploadedDraftFile = {
  _id: Id<"abstractFiles">;
  fileName: string;
  size: number;
  uploadedAt: number;
};

export default function SubmitAbstractPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createDraft = useMutation(api.abstracts.createDraft);
  const submitDraft = useMutation(api.abstracts.submitDraft);
  const generateUploadUrl = useMutation(api.abstracts.generateUploadUrl);
  const attachUploadedFile = useMutation(api.abstracts.attachUploadedFile);
  const removeFile = useMutation(api.abstracts.removeFile);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [category, setCategory] = useState<(typeof ABSTRACT_CATEGORIES)[number]>(
    ABSTRACT_CATEGORIES[0],
  );
  const [affiliation, setAffiliation] = useState("");
  const [affiliationDeclared, setAffiliationDeclared] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDraftFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const categoryOptions = useMemo(
    () =>
      ABSTRACT_CATEGORIES.map((value) => ({
        value,
        label: getCategoryLabel(value),
      })),
    [],
  );

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
  }

  async function uploadPendingFiles(abstractId: Id<"abstracts">) {
    if (selectedFiles.length === 0) {
      return;
    }

    const uploaded: UploadedDraftFile[] = [];
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
      });
    }

    setUploadedFiles((current) => [...uploaded, ...current]);
    setSelectedFiles([]);
  }

  async function handleSave(mode: "draft" | "submit") {
    setError("");

    const keywords = parseKeywordsInput(keywordsInput);
    if (!title.trim() || !body.trim() || keywords.length === 0 || !affiliation.trim()) {
      setError("Please complete title, abstract, keywords, and affiliation.");
      return;
    }

    if (mode === "submit" && !affiliationDeclared) {
      setError("Please declare your affiliation before submission.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createDraft({
        title,
        body,
        keywords,
        category,
        affiliation,
        affiliationDeclared,
      });

      await uploadPendingFiles(created._id);

      if (mode === "submit") {
        await submitDraft({ abstractId: created._id });
        router.replace(`/abstracts/${created._id}`);
      } else {
        router.replace(`/abstracts/${created._id}/edit`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save your abstract.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveUploadedFile(fileId: Id<"abstractFiles">) {
    setError("");
    try {
      await removeFile({ fileId });
      setUploadedFiles((current) => current.filter((item) => item._id !== fileId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove this file.",
      );
    }
  }

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen what="abstract submission" />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Submit Abstract.</h1>
          <p>Create a draft and submit your abstract for ASRC review.</p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          <section className={styles.card}>
            <h2>Abstract Information</h2>
            <div className={styles.formGrid}>
              <FormField
                label="Abstract Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter abstract title"
              />
              <SelectField
                label="Category"
                value={category}
                options={categoryOptions}
                onChange={(event) =>
                  setCategory(event.target.value as (typeof ABSTRACT_CATEGORIES)[number])
                }
              />
              <TextAreaField
                label="Abstract"
                rows={7}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your abstract paragraph"
              />
              <FormField
                label="Keywords"
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                placeholder="Comma-separated keywords"
                hint="Example: EEG, dementia, machine learning"
              />
              <FormField
                label="Affiliation"
                value={affiliation}
                onChange={(event) => setAffiliation(event.target.value)}
                placeholder="Institution or organization name"
              />
              <CheckboxField
                label="I declare the listed affiliation and abstract details are accurate."
                checked={affiliationDeclared}
                onChange={(event) => setAffiliationDeclared(event.target.checked)}
              />
            </div>
          </section>

          <section className={styles.card}>
            <h2>Supporting Files (Optional)</h2>
            <div className={styles.formGrid}>
              <FileUploadField
                label="Upload files"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                selectedFiles={selectedFiles}
                onChange={handleFileSelection}
                contextText="Accepted formats: PDF, DOC, DOCX, PNG, JPG"
              />
              {selectedFiles.length > 0 ? (
                <p className={styles.helperText}>
                  Selected {selectedFiles.length} file(s). Files will upload when you
                  save or submit.
                </p>
              ) : null}
              {uploadedFiles.length > 0 ? (
                <ul className={styles.supportingList}>
                  {uploadedFiles.map((file) => (
                    <li className={styles.supportingItem} key={file._id}>
                      <i className={`bx bx-file-blank ${styles.icon}`} aria-hidden="true" />
                      <div className={styles.content}>
                        <strong>{file.fileName}</strong>
                        <span>{Math.ceil(file.size / 1024)} KB</span>
                      </div>
                      <div className={styles.rowActions}>
                        <Button
                          className="destructive"
                          type="button"
                          onClick={() => void handleRemoveUploadedFile(file._id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <Button
                className="action"
                type="button"
                disabled={submitting}
                onClick={() => void handleSave("draft")}
              >
                {submitting ? "Please wait..." : "Save Draft"}
              </Button>
              <Button
                className="primary"
                type="button"
                disabled={submitting}
                onClick={() => void handleSave("submit")}
              >
                {submitting ? "Please wait..." : "Submit for Review"}
              </Button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
