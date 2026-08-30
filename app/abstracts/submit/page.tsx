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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { parseKeywordsInput } from "@/lib/abstractForm";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import styles from "../abstracts.module.scss";

type UploadedDraftFile = {
  _id: Id<"abstractFiles">;
  fileName: string;
  size: number;
  uploadedAt: number;
  kind?: "paper" | "supplementary";
};

type AbstractFileKind = "paper" | "supplementary";

export default function SubmitAbstractPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createDraft = useMutation(api.abstracts.createDraft);
  const generateUploadUrl = useMutation(api.abstracts.generateUploadUrl);
  const attachUploadedFile = useMutation(api.abstracts.attachUploadedFile);
  const removeFile = useMutation(api.abstracts.removeFile);

  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [body, setBody] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [affiliationDeclared, setAffiliationDeclared] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [supplementaryFiles, setSupplementaryFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDraftFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 1);
    setSelectedFiles(files);
  }

  function handleSupplementaryFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setSupplementaryFiles(Array.from(event.target.files ?? []));
  }

  function handleContinue() {
    setError("");

    if (currentStep === 0 && !title.trim()) {
      setError("Please enter the abstract title before continuing.");
      return;
    }
    if (
      currentStep === 1 &&
      (!authors.trim() || !advisor.trim() || !affiliation.trim())
    ) {
      setError(
        "Please complete the author, advisor, and affiliation fields before continuing.",
      );
      return;
    }
    if (currentStep === 2) {
      const keywords = parseKeywordsInput(keywordsInput);
      if (!body.trim()) {
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

  async function uploadPendingFiles(abstractId: Id<"abstracts">) {
    if (selectedFiles.length === 0 && supplementaryFiles.length === 0) {
      return;
    }

    const uploaded: UploadedDraftFile[] = [];
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
        kind: savedFile.kind,
      });
    }

    setUploadedFiles((current) => [...uploaded, ...current]);
    setSelectedFiles([]);
    setSupplementaryFiles([]);
  }

  async function handleSave(mode: "draft" | "submit") {
    setError("");

    const keywords = parseKeywordsInput(keywordsInput);
    if (!title.trim()) {
      setCurrentStep(0);
      setError("Please complete the abstract title.");
      return;
    }
    if (!authors.trim() || !advisor.trim() || !affiliation.trim()) {
      setCurrentStep(1);
      setError("Please complete the author, advisor, and affiliation fields.");
      return;
    }
    if (!body.trim()) {
      setCurrentStep(2);
      setError("Please complete the abstract content.");
      return;
    }

    if (keywords.length === 0) {
      setCurrentStep(2);
      setError("Please provide at least one keyword.");
      return;
    }

    if (mode === "submit" && !affiliationDeclared) {
      setError("Please declare your affiliation before submission.");
      return;
    }
    if (mode === "submit" && selectedFiles.length === 0) {
      setError("Please upload the completed paper as a PDF before submission.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createDraft({
        title,
        authors,
        advisor,
        body,
        keywords,
        affiliation,
        affiliationDeclared,
      });

      await uploadPendingFiles(created._id);

      if (mode === "submit") {
        router.replace(`/abstracts/${created._id}/payment`);
      } else {
        router.replace(`/abstracts/${created._id}/edit`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your abstract.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveUploadedFile(fileId: Id<"abstractFiles">) {
    setError("");
    try {
      await removeFile({ fileId });
      setUploadedFiles((current) =>
        current.filter((item) => item._id !== fileId),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove this file.",
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
                Start with a clear, concise title for the research paper.
              </p>
              <div className={styles.formGrid}>
                <AbstractPreparationChecklist />
                <FormField
                  label="Abstract Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter abstract title"
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
                  value={authors}
                  onChange={(event) => setAuthors(event.target.value)}
                  placeholder="Full names of all authors"
                  hint="Provide the full names of all student or presenting authors."
                />
                <FormField
                  label="Faculty Advisor"
                  value={advisor}
                  onChange={(event) => setAdvisor(event.target.value)}
                  placeholder="Full name of the faculty advisor"
                />
                <TextAreaField
                  label="Affiliations"
                  rows={5}
                  value={affiliation}
                  onChange={(event) => setAffiliation(event.target.value)}
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
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Enter the abstract text"
                />
                <FormField
                  label="Keywords"
                  value={keywordsInput}
                  onChange={(event) => setKeywordsInput(event.target.value)}
                  placeholder="Comma-separated keywords"
                  hint="Use comma-separated keywords. Example: EEG, dementia, machine learning"
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
                    <span>{title}</span>
                  </div>
                  <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                    <strong>Author(s)</strong>
                    <span>{authors}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <strong>Faculty Advisor</strong>
                    <span>{advisor}</span>
                  </div>
                  <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                    <strong>Affiliations</strong>
                    <span>{affiliation}</span>
                  </div>
                  <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                    <strong>Abstract Content</strong>
                    <span>{body}</span>
                  </div>
                  <div className={`${styles.reviewItem} ${styles.reviewWide}`}>
                    <strong>Keywords</strong>
                    <span>{parseKeywordsInput(keywordsInput).join(", ")}</span>
                  </div>
                </div>
                <CheckboxField
                  label="I declare the listed authors, faculty advisor, affiliations, and abstract details are accurate."
                  checked={affiliationDeclared}
                  onChange={(event) =>
                    setAffiliationDeclared(event.target.checked)
                  }
                />
              </section>

              <section className={styles.card}>
                <h2>Paper File</h2>
                <p className={styles.stepIntro}>
                  Download the official template, complete the paper, and upload
                  it as a PDF.
                </p>
                <div className={styles.templateDownload}>
                  <a href="/asrc-template.docx" download>
                    <Button type="button">Download Paper Template</Button>
                  </a>
                </div>
                <div className={styles.formGrid}>
                  <FileUploadField
                    label="Upload completed paper (PDF required)"
                    accept=".pdf,application/pdf"
                    selectedFiles={selectedFiles}
                    onChange={handleFileSelection}
                    contextText="Select the completed paper in PDF format"
                  />
                  <FileUploadField
                    label="Supplementary files (optional)"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                    selectedFiles={supplementaryFiles}
                    onChange={handleSupplementaryFileSelection}
                    contextText="Add figures, datasets, spreadsheets, documents, or ZIP files"
                  />
                  {selectedFiles.length > 0 ? (
                    <p className={styles.helperText}>
                      Selected {selectedFiles.length} file(s). Files will upload
                      when you save or submit.
                    </p>
                  ) : null}
                  {uploadedFiles.length > 0 ? (
                    <ul className={styles.supportingList}>
                      {uploadedFiles.map((file) => (
                        <li className={styles.supportingItem} key={file._id}>
                          <i
                            className={`bx bx-file-blank ${styles.icon}`}
                            aria-hidden="true"
                          />
                          <div className={styles.content}>
                            <strong>{file.fileName}</strong>
                            <span>{Math.ceil(file.size / 1024)} KB</span>
                            <span className={styles.fileKind}>
                              {file.kind === "supplementary"
                                ? "Supplementary"
                                : "Paper"}
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <Button
                              className="destructive"
                              type="button"
                              onClick={() =>
                                void handleRemoveUploadedFile(file._id)
                              }
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
                    {submitting ? "Saving and uploading..." : "Continue to Payment"}
                  </Button>
                </div>
              </section>
            </>
          ) : null}

          {error && currentStep !== 3 ? (
            <p className={styles.error}>{error}</p>
          ) : null}
          {currentStep !== 3 ? (
            <div className={styles.wizardActions}>
              {currentStep > 0 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep((step) => step - 1)}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                className="primary"
                type="button"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className={styles.wizardActions}>
              <Button type="button" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
