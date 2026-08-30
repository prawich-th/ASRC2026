"use client";

import Button from "@/components/form/button";
import AbstractFormStepper, {
  ABSTRACT_FORM_LAST_STEP,
} from "@/components/abstract-form-stepper";
import AbstractPreparationChecklist from "@/components/abstract-preparation-checklist";
import {
  CheckboxField,
  FileUploadField,
  FormField,
  TextAreaField,
} from "@/components/form/Form";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import RegistrationPaymentGate from "@/components/registration-payment-gate";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAbstractStatusLabel } from "@/lib/abstractDisplay";
import { joinKeywords, parseKeywordsInput } from "@/lib/abstractForm";
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
  kind?: "paper" | "supplementary";
};

type AbstractFileKind = "paper" | "supplementary";

type DraftForm = {
  title: string;
  authors: string;
  advisor: string;
  body: string;
  keywordsInput: string;
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
  const registrationStatus = useQuery(
    api.billingQueries.getRegistrationStatus,
    isAuthenticated ? {} : "skip",
  );

  const [draft, setDraft] = useState<DraftForm | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [supplementaryFiles, setSupplementaryFiles] = useState<File[]>([]);
  const [fileOverrides, setFileOverrides] = useState<ExistingFile[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

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
      authors: detail.abstract.authors ?? "",
      advisor: detail.abstract.advisor ?? "",
      body: detail.abstract.body,
      keywordsInput: joinKeywords(detail.abstract.keywords),
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
      kind: file.kind,
    }));
  }, [fileOverrides, detail]);

  const formValues = draft ?? detailDraft;

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []).slice(0, 1));
  }

  function handleSupplementaryFileSelection(event: ChangeEvent<HTMLInputElement>) {
    setSupplementaryFiles(Array.from(event.target.files ?? []));
  }

  function handleContinue() {
    setError("");
    if (!formValues) {
      setError("Abstract data is unavailable.");
      return;
    }

    if (currentStep === 0 && !formValues.title.trim()) {
      setError("Please enter the abstract title before continuing.");
      return;
    }
    if (
      currentStep === 1 &&
      (!formValues.authors.trim() ||
        !formValues.advisor.trim() ||
        !formValues.affiliation.trim())
    ) {
      setError("Please complete the author, advisor, and affiliation fields before continuing.");
      return;
    }
    if (currentStep === 2) {
      const keywords = parseKeywordsInput(formValues.keywordsInput);
      if (!formValues.body.trim()) {
        setError("Please complete the abstract content before continuing.");
        return;
      }
      if (keywords.length === 0) {
        setError("Please provide at least one keyword before continuing.");
        return;
      }
    }

    setCurrentStep((step) => Math.min(step + 1, ABSTRACT_FORM_LAST_STEP));
  }

  async function uploadPendingFiles() {
    if (selectedFiles.length === 0 && supplementaryFiles.length === 0) {
      return;
    }

    const uploaded: ExistingFile[] = [];
    const pendingFiles: Array<{ file: File; kind: AbstractFileKind }> = [
      ...selectedFiles.map((file) => ({ file, kind: "paper" as const })),
      ...supplementaryFiles.map((file) => ({
        file,
        kind: "supplementary" as const,
      })),
    ];
    for (const { file, kind } of pendingFiles) {
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
        kind,
      });

      uploaded.push({
        _id: savedFile._id,
        fileName: savedFile.fileName,
        size: savedFile.size,
        uploadedAt: savedFile.uploadedAt,
        url: null,
        kind: savedFile.kind,
      });
    }

    setFileOverrides([...uploaded, ...files]);
    setSelectedFiles([]);
    setSupplementaryFiles([]);
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
    if (!formValues.title.trim()) {
      setCurrentStep(0);
      setError("Please complete the abstract title.");
      return;
    }
    if (
      !formValues.authors.trim() ||
      !formValues.advisor.trim() ||
      !formValues.affiliation.trim()
    ) {
      setCurrentStep(1);
      setError("Please complete the author, advisor, and affiliation fields.");
      return;
    }
    if (!formValues.body.trim()) {
      setCurrentStep(2);
      setError("Please complete the abstract content.");
      return;
    }

    if (keywords.length === 0) {
      setCurrentStep(2);
      setError("Please provide at least one keyword.");
      return;
    }

    if (mode === "submit" && !formValues.affiliationDeclared) {
      setError("Please declare your affiliation before submission.");
      return;
    }
    const hasPaperFile =
      selectedFiles.some((file) => file.name.toLocaleLowerCase().endsWith(".pdf")) ||
      files.some(
        (file) =>
          file.fileName.toLocaleLowerCase().endsWith(".pdf") &&
          (file.kind === "paper" || file.kind === undefined),
      );
    if (mode === "submit" && !hasPaperFile) {
      setError("Please upload the completed paper as a PDF before submission.");
      return;
    }

    setSubmitting(true);
    try {
      await updateDraft({
        abstractId,
        title: formValues.title,
        authors: formValues.authors,
        advisor: formValues.advisor,
        body: formValues.body,
        keywords,
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

          {isEditable ? (
            <>
              <AbstractFormStepper
                currentStep={currentStep}
                onStepChange={(step) => {
                  setError("");
                  setCurrentStep(step);
                }}
              />

              {currentStep === 0 ? (
                <section className={styles.card}>
                  <h2>Research Information</h2>
                  <p className={styles.stepIntro}>
                    Review the title of the research paper.
                  </p>
                  <div className={styles.formGrid}>
                    <AbstractPreparationChecklist />
                    <FormField
                      label="Abstract Title"
                      value={formValues.title}
                      onChange={(event) =>
                        setDraft({ ...formValues, title: event.target.value })
                      }
                    />
                  </div>
                </section>
              ) : null}

              {currentStep === 1 ? (
                <section className={styles.card}>
                  <h2>Author and Advisor</h2>
                  <p className={styles.stepIntro}>
                    Enter the author names separately from the faculty advisor.
                  </p>
                  <div className={styles.formGrid}>
                    <TextAreaField
                      label="Author(s)"
                      rows={5}
                      value={formValues.authors}
                      onChange={(event) =>
                        setDraft({ ...formValues, authors: event.target.value })
                      }
                      placeholder="Full names of all authors"
                      hint="Provide the full names of all student or presenting authors."
                    />
                    <FormField
                      label="Faculty Advisor"
                      value={formValues.advisor}
                      onChange={(event) =>
                        setDraft({ ...formValues, advisor: event.target.value })
                      }
                      placeholder="Full name of the faculty advisor"
                    />
                    <TextAreaField
                      label="Affiliations"
                      rows={5}
                      value={formValues.affiliation}
                      onChange={(event) =>
                        setDraft({ ...formValues, affiliation: event.target.value })
                      }
                      placeholder="List each author's institution, department, program, or research organization"
                    />
                  </div>
                </section>
              ) : null}

              {currentStep === 2 ? (
                <section className={styles.card}>
                  <h2>Abstract Content</h2>
                  <p className={styles.stepIntro}>
                    Enter only the abstract text, followed by the relevant keywords.
                  </p>
                  <div className={styles.formGrid}>
                    <TextAreaField
                      label="Abstract Content"
                      rows={16}
                      value={formValues.body}
                      onChange={(event) =>
                        setDraft({ ...formValues, body: event.target.value })
                      }
                    />
                    <FormField
                      label="Keywords"
                      value={formValues.keywordsInput}
                      onChange={(event) =>
                        setDraft({ ...formValues, keywordsInput: event.target.value })
                      }
                      placeholder="Comma-separated keywords"
                      hint="Use comma-separated keywords."
                    />
                  </div>
                </section>
              ) : null}

              {currentStep === 3 ? (
                <>
                  <section className={styles.card}>
                    <h2>Review Your Abstract</h2>
                    <p className={styles.stepIntro}>
                      Confirm the information below before saving or submitting.
                    </p>
                    <div className={styles.reviewGrid}>
                      <div className={styles.reviewItem}>
                        <strong>Title</strong>
                        <span>{formValues.title}</span>
                      </div>
                      <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                        <strong>Author(s)</strong>
                        <span>{formValues.authors}</span>
                      </div>
                      <div className={styles.reviewItem}>
                        <strong>Faculty Advisor</strong>
                        <span>{formValues.advisor}</span>
                      </div>
                      <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                        <strong>Affiliations</strong>
                        <span>{formValues.affiliation}</span>
                      </div>
                      <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                        <strong>Abstract Content</strong>
                        <span>{formValues.body}</span>
                      </div>
                      <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                        <strong>Keywords</strong>
                        <span>{parseKeywordsInput(formValues.keywordsInput).join(", ")}</span>
                      </div>
                    </div>
                    <CheckboxField
                      label="I declare the listed authors, faculty advisor, affiliations, and abstract details are accurate."
                      checked={formValues.affiliationDeclared}
                      onChange={(event) =>
                        setDraft({
                          ...formValues,
                          affiliationDeclared: event.target.checked,
                        })
                      }
                    />
                  </section>

                  <RegistrationPaymentGate status={registrationStatus} />

                  <section className={styles.card}>
                    <h2>Paper File</h2>
                    <p className={styles.stepIntro}>
                      Download the official template, complete the paper, and upload it as a PDF.
                    </p>
                    <div className={styles.templateDownload}>
                      <Button type="button" disabled>Download Paper Template</Button>
                      <span>Template link will be available soon.</span>
                    </div>
                    <FileUploadField
                      label="Upload completed paper (PDF required)"
                      selectedFiles={selectedFiles}
                      onChange={handleFileSelection}
                      accept=".pdf,application/pdf"
                    />
                    <FileUploadField
                      label="Supplementary files (optional)"
                      multiple
                      selectedFiles={supplementaryFiles}
                      onChange={handleSupplementaryFileSelection}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                      contextText="Add figures, datasets, spreadsheets, documents, or ZIP files"
                    />

                    {files.length > 0 ? (
                      <ul className={styles.supportingList}>
                        {files.map((file) => (
                          <li key={file._id} className={styles.supportingItem}>
                            <i className={`bx bx-file-blank ${styles.icon}`} aria-hidden="true" />
                            <div className={styles.content}>
                              <strong>{file.fileName}</strong>
                              <span>{Math.ceil(file.size / 1024)} KB</span>
                              <span className={styles.fileKind}>
                                {file.kind === "supplementary" ? "Supplementary" : "Paper"}
                              </span>
                            </div>
                            <div className={styles.rowActions}>
                              {file.url ? (
                                <a href={file.url} target="_blank" rel="noreferrer">
                                  <Button className="green" type="button">Open</Button>
                                </a>
                              ) : null}
                              <Button
                                className="destructive"
                                type="button"
                                onClick={() => void handleRemoveFile(file._id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyState}>No supporting files uploaded yet.</p>
                    )}

                    {error ? <p className={styles.error}>{error}</p> : null}
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
                        disabled={submitting || registrationStatus?.eligible !== true}
                        onClick={() => void handleSave("submit")}
                      >
                        {submitting ? "Please wait..." : isRevision ? "Resubmit for Review" : "Submit for Review"}
                      </Button>
                    </div>
                  </section>
                </>
              ) : null}

              {error && currentStep !== 3 ? <p className={styles.error}>{error}</p> : null}
              {currentStep !== 3 ? (
                <div className={styles.wizardActions}>
                  {currentStep > 0 ? (
                    <Button type="button" onClick={() => setCurrentStep((step) => step - 1)}>
                      Back
                    </Button>
                  ) : <span />}
                  <Button className="primary" type="button" onClick={handleContinue}>
                    Continue
                  </Button>
                </div>
              ) : (
                <div className={styles.wizardActions}>
                  <Button type="button" onClick={() => setCurrentStep(2)}>Back</Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
