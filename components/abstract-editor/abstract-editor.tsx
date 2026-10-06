"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  ABSTRACT_STEPS,
  AbstractStepKey,
  AbstractStudyType,
  getAbstractProblems,
  MAX_ABSTRACT_TITLE_LENGTH,
  MAX_STUDY_TYPE_OTHER_LENGTH,
  STUDY_TYPE_LABELS,
} from "@/lib/abstractForm";
import { ABSTRACT_STUDY_TYPES } from "@/lib/formOptions";
import {
  ABSTRACT_WORD_LIMIT,
  countWords,
  plainTextToRichText,
  RichTextOp,
  richTextToPlainText,
} from "@/lib/richText";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AbstractPreview from "./abstract-preview";
import styles from "./abstract-editor.module.scss";
import AuthorListEditor, { AuthorRow, newAuthorRow } from "./author-list-editor";
import KeywordInput from "./keyword-input";
import RichTextEditor from "./rich-text-editor";
import SupportingFiles from "./supporting-files";

type OwnerDetail = NonNullable<
  FunctionReturnType<typeof api.abstracts.getMineById>
>;
type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.me>>;

type FormState = {
  title: string;
  studyType?: AbstractStudyType;
  studyTypeOther: string;
  keywords: string[];
  authors: AuthorRow[];
  advisor: string;
  advisorAffiliationId?: Id<"affiliations">;
  bodyOps: RichTextOp[];
  declared: boolean;
};

const AUTOSAVE_DELAY_MS = 1200;

function authorName(user: CurrentUser) {
  return (
    [user.firstName, user.otherName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    ""
  );
}

function initialForm(detail: OwnerDetail | undefined, me: CurrentUser): FormState {
  if (detail) {
    const abstract = detail.abstract;
    return {
      title: abstract.title,
      studyType: abstract.studyType,
      studyTypeOther: abstract.studyTypeOther ?? "",
      keywords: abstract.keywords,
      authors: (abstract.authorList ?? []).map((author) => newAuthorRow(author)),
      advisor: abstract.advisor ?? "",
      advisorAffiliationId: abstract.advisorAffiliationId,
      bodyOps: abstract.bodyRich ?? plainTextToRichText(abstract.body),
      declared: abstract.affiliationDeclared,
    };
  }
  return {
    title: "",
    studyTypeOther: "",
    keywords: [],
    authors: [
      newAuthorRow({
        name: authorName(me),
        affiliationId: me.affiliationId,
        presenting: true,
      }),
    ],
    advisor: "",
    bodyOps: [],
    declared: false,
  };
}

function toPayload(form: FormState) {
  return {
    title: form.title,
    studyType: form.studyType,
    studyTypeOther: form.studyType === "other" ? form.studyTypeOther : undefined,
    keywords: form.keywords,
    authorList: form.authors.map(({ name, affiliationId, presenting }) => ({
      name,
      affiliationId,
      presenting,
    })),
    advisor: form.advisor,
    advisorAffiliationId: form.advisorAffiliationId,
    bodyRich: form.bodyOps,
    affiliationDeclared: form.declared,
  };
}

function snapshot(form: FormState) {
  return JSON.stringify(toPayload(form));
}

function formatTime(value: number) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    // Convex prefixes server errors with request metadata.
    const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return match?.[1] ?? caught.message;
  }
  return fallback;
}

export default function AbstractEditor({
  detail,
  me,
}: {
  detail?: OwnerDetail;
  me: CurrentUser;
}) {
  const router = useRouter();
  const createDraft = useMutation(api.abstracts.createDraft);
  const updateDraft = useMutation(api.abstracts.updateDraft);
  const submitDraft = useMutation(api.abstracts.submitDraft);
  const deleteDraft = useMutation(api.abstracts.deleteDraft);

  const [form, setForm] = useState<FormState>(() => initialForm(detail, me));
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(form));
  const [abstractId, setAbstractId] = useState(detail?.abstract._id);
  const [code, setCode] = useState(detail?.abstract.code);
  const [lastSavedAt, setLastSavedAt] = useState(detail?.abstract.updatedAt);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<ReadonlySet<AbstractStepKey>>(
    () => new Set(detail ? ["details", "authors", "abstract"] : []),
  );

  const formRef = useRef(form);
  const abstractIdRef = useRef(abstractId);
  const savedSnapshotRef = useRef(savedSnapshot);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const known = useMemo(() => detail?.affiliations ?? [], [detail]);
  // Shares the picker's subscription, so newly chosen affiliations preview too.
  const options = useQuery(api.affiliations.listForSelection);
  const previewAffiliations = useMemo<Doc<"affiliations">[]>(
    () => [...known, ...(options ?? [])],
    [known, options],
  );
  const status = detail?.abstract.status ?? "draft";
  const isRevision = status === "revision_requested";
  const currentSnapshot = useMemo(() => snapshot(form), [form]);
  const dirty = currentSnapshot !== savedSnapshot;
  const bodyText = useMemo(() => richTextToPlainText(form.bodyOps), [form.bodyOps]);
  const wordCount = countWords(bodyText);
  const problems = getAbstractProblems({
    title: form.title,
    studyType: form.studyType,
    studyTypeOther: form.studyTypeOther,
    authorList: form.authors,
    advisor: form.advisor,
    advisorAffiliationId: form.advisorAffiliationId,
    bodyText,
    keywords: form.keywords,
    affiliationDeclared: form.declared,
  });
  const currentStepKey = ABSTRACT_STEPS[step].key;
  const showErrors = (key: AbstractStepKey) => touched.has(key);

  /**
   * Saves the latest form state. Calls are serialized so the first save
   * creates exactly one draft and later saves update it.
   */
  const persist = useCallback(
    (options: { force?: boolean } = {}) => {
      const run = queueRef.current.then(async () => {
        const payload = toPayload(formRef.current);
        const nextSnapshot = JSON.stringify(payload);
        const existingId = abstractIdRef.current;
        if (
          nextSnapshot === savedSnapshotRef.current &&
          (existingId || !options.force)
        ) {
          return existingId;
        }
        setSaving(true);
        setSaveError("");
        try {
          let id = existingId;
          if (id) {
            await updateDraft({ abstractId: id, ...payload });
          } else {
            const created = await createDraft(payload);
            id = created._id;
            abstractIdRef.current = id;
            setAbstractId(id);
            setCode(created.code);
            window.history.replaceState(null, "", `/abstracts/${id}/edit`);
          }
          savedSnapshotRef.current = nextSnapshot;
          setSavedSnapshot(nextSnapshot);
          setLastSavedAt(Date.now());
          return id;
        } catch (caught) {
          setSaveError(errorMessage(caught, "Could not save your draft."));
          throw caught;
        } finally {
          setSaving(false);
        }
      });
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [createDraft, updateDraft],
  );

  useEffect(() => {
    if (currentSnapshot === savedSnapshotRef.current) return;
    const timer = window.setTimeout(() => {
      void persist().catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentSnapshot, persist]);

  useEffect(() => {
    if (!dirty && !saving) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function patch(fields: Partial<FormState>) {
    setForm((current) => ({ ...current, ...fields }));
  }

  function goTo(index: number) {
    setTouched((current) => new Set([...current, currentStepKey]));
    setStep(index);
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setTouched(new Set(ABSTRACT_STEPS.map((item) => item.key)));
    setSubmitError("");
    if (problems.length > 0) {
      setSubmitError("Please resolve the items above before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await persist({ force: true });
      if (!id) throw new Error("Could not save your draft.");
      await submitDraft({ abstractId: id });
      router.replace(`/abstracts/${id}`);
    } catch (caught) {
      setSubmitError(errorMessage(caught, "Could not submit your abstract."));
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!abstractId) {
      router.push("/profile/abstracts");
      return;
    }
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    try {
      // Stop autosave from touching the draft while it is deleted.
      savedSnapshotRef.current = currentSnapshot;
      await queueRef.current;
      await deleteDraft({ abstractId });
      setSavedSnapshot(currentSnapshot);
      router.replace("/profile/abstracts");
    } catch (caught) {
      setSaveError(errorMessage(caught, "Could not delete this draft."));
    }
  }

  let saveLabel: string;
  let saveTone: string;
  if (saving) {
    saveLabel = "Saving…";
    saveTone = styles.saveBusy;
  } else if (saveError) {
    saveLabel = "Not saved";
    saveTone = styles.saveError;
  } else if (dirty) {
    saveLabel = "Unsaved changes";
    saveTone = styles.saveBusy;
  } else if (abstractId && lastSavedAt) {
    saveLabel = `Saved ${formatTime(lastSavedAt)}`;
    saveTone = styles.saveOk;
  } else {
    saveLabel = "Saves automatically as you type";
    saveTone = "";
  }

  const stepProblems = problems.filter(
    (problem) => problem.step === currentStepKey,
  );

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarInfo}>
          <span className={styles.statusChip}>
            {isRevision ? "Revision" : "Draft"}
          </span>
          {code ? <span>Submission ID {code}</span> : null}
        </div>
        <div className={`${styles.saveStatus} ${saveTone}`} aria-live="polite">
          {!saving && !saveError && !dirty && abstractId ? (
            <i className="bx bx-check-circle" aria-hidden="true" />
          ) : (
            <span className={styles.saveDot} aria-hidden="true" />
          )}
          {saveLabel}
          {saveError ? (
            <button type="button" onClick={() => void persist({ force: true }).catch(() => undefined)}>
              Retry
            </button>
          ) : null}
        </div>
      </div>
      {saveError ? <p className={styles.errorBanner}>{saveError}</p> : null}

      {isRevision && detail?.abstract.submitterFeedback ? (
        <section className={styles.feedback}>
          <i className="bx bx-clipboard" aria-hidden="true" />
          <div>
            <h3>Committee feedback</h3>
            <p>{detail.abstract.submitterFeedback}</p>
          </div>
        </section>
      ) : null}

      <nav className={styles.stepper} aria-label="Abstract steps">
        <ol>
          {ABSTRACT_STEPS.map((item, index) => {
            const hasProblems =
              item.key !== "review" &&
              problems.some((problem) => problem.step === item.key);
            const state =
              index === step
                ? styles.stepCurrent
                : touched.has(item.key)
                  ? hasProblems
                    ? styles.stepWarning
                    : styles.stepDone
                  : "";
            return (
              <li key={item.key} className={state}>
                <button
                  type="button"
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => goTo(index)}
                >
                  <span className={styles.stepBadge} aria-hidden="true">
                    {index !== step && touched.has(item.key) ? (
                      hasProblems ? (
                        "!"
                      ) : (
                        <i className="bx bx-check" />
                      )
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={styles.stepLabel}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className={styles.card}>
        {currentStepKey === "details" ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Study details</h2>
              <p>
                Give your research a clear, concise title, say what kind of
                study it is, and add up to 10 keywords that describe it.
              </p>
            </header>
            <div className={styles.fieldStack}>
              <label className={styles.field} htmlFor="abstract-title">
                <span>Abstract title</span>
                <textarea
                  id="abstract-title"
                  rows={2}
                  maxLength={MAX_ABSTRACT_TITLE_LENGTH}
                  value={form.title}
                  placeholder="e.g. Prevalence of burnout among Thai medical students"
                  className={
                    showErrors("details") && !form.title.trim()
                      ? styles.inputInvalid
                      : undefined
                  }
                  onChange={(event) =>
                    patch({ title: event.target.value.replace(/\n/g, " ") })
                  }
                />
                <small>
                  Avoid unnecessary abbreviations.{" "}
                  {form.title.length}/{MAX_ABSTRACT_TITLE_LENGTH}
                </small>
              </label>
              <fieldset
                className={`${styles.studyTypes} ${
                  showErrors("details") && !form.studyType
                    ? styles.studyTypesInvalid
                    : ""
                }`}
              >
                <legend>Type of study</legend>
                {ABSTRACT_STUDY_TYPES.map((type) => (
                  <label key={type} className={styles.studyTypeOption}>
                    <input
                      type="radio"
                      name="abstract-study-type"
                      value={type}
                      checked={form.studyType === type}
                      onChange={() => patch({ studyType: type })}
                    />
                    <span>
                      {type === "other"
                        ? "Other (please specify)"
                        : STUDY_TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </fieldset>
              {form.studyType === "other" ? (
                <label className={styles.field} htmlFor="abstract-study-type-other">
                  <span>Please specify the type of study</span>
                  <input
                    id="abstract-study-type-other"
                    maxLength={MAX_STUDY_TYPE_OTHER_LENGTH}
                    value={form.studyTypeOther}
                    autoFocus
                    className={
                      showErrors("details") && !form.studyTypeOther.trim()
                        ? styles.inputInvalid
                        : undefined
                    }
                    onChange={(event) =>
                      patch({ studyTypeOther: event.target.value })
                    }
                  />
                </label>
              ) : null}
              <div className={styles.field}>
                <label htmlFor="abstract-keywords">Keywords</label>
                <KeywordInput
                  id="abstract-keywords"
                  value={form.keywords}
                  invalid={showErrors("details") && form.keywords.length === 0}
                  onChange={(keywords) => patch({ keywords })}
                />
                <small>Press Enter or type a comma after each keyword.</small>
              </div>
            </div>
          </>
        ) : null}

        {currentStepKey === "authors" ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Authors</h2>
              <p>
                List every author in publication order and choose each
                person&apos;s affiliation. Mark the author who will present.
              </p>
            </header>
            {detail?.abstract.authors && (detail.abstract.authorList?.length ?? 0) === 0 ? (
              <div className={styles.legacyNote}>
                <strong>Previously entered</strong>
                <p>{detail.abstract.authors}</p>
                {detail.abstract.affiliation ? <p>{detail.abstract.affiliation}</p> : null}
              </div>
            ) : null}
            <AuthorListEditor
              rows={form.authors}
              known={known}
              self={{ name: authorName(me), affiliationId: me.affiliationId }}
              showErrors={showErrors("authors")}
              onChange={(authors) => patch({ authors })}
            />

            <div className={styles.advisorBlock}>
              <h3>Faculty advisor</h3>
              <p>The academic advisor who reviewed and approved this work.</p>
              <div className={styles.advisorFields}>
                <label className={styles.field} htmlFor="advisor-name">
                  <span>Full name</span>
                  <input
                    id="advisor-name"
                    value={form.advisor}
                    placeholder="e.g. Assoc. Prof. Dr. Somsak Rakdee"
                    className={
                      showErrors("authors") && !form.advisor.trim()
                        ? styles.inputInvalid
                        : undefined
                    }
                    onChange={(event) => patch({ advisor: event.target.value })}
                  />
                </label>
                <div className={styles.field}>
                  <span className={styles.fieldCaption}>Affiliation</span>
                  <AffiliationPicker
                    value={form.advisorAffiliationId}
                    known={known}
                    invalid={showErrors("authors") && !form.advisorAffiliationId}
                    onChange={(advisorAffiliationId) =>
                      patch({ advisorAffiliationId })
                    }
                  />
                </div>
              </div>
            </div>
          </>
        ) : null}

        {currentStepKey === "abstract" ? (
          <>
            <header className={styles.stepHeader}>
              <h2 id="abstract-body-label">Abstract</h2>
              <p>
                Up to {ABSTRACT_WORD_LIMIT} words covering background,
                objectives, methods, results, and conclusion. Use the toolbar
                for italics (e.g. species names) and sub/superscripts.
              </p>
            </header>
            <RichTextEditor
              labelledBy="abstract-body-label"
              initialValue={form.bodyOps}
              invalid={
                wordCount > ABSTRACT_WORD_LIMIT ||
                (showErrors("abstract") && wordCount === 0)
              }
              onChange={(bodyOps) => patch({ bodyOps })}
            />
            <div className={styles.wordMeter}>
              <div
                className={styles.wordMeterTrack}
                role="meter"
                aria-label="Word count"
                aria-valuemin={0}
                aria-valuemax={ABSTRACT_WORD_LIMIT}
                aria-valuenow={wordCount}
              >
                <span
                  className={
                    wordCount > ABSTRACT_WORD_LIMIT
                      ? styles.meterOver
                      : wordCount > ABSTRACT_WORD_LIMIT * 0.9
                        ? styles.meterNear
                        : undefined
                  }
                  style={{
                    width: `${Math.min(100, (wordCount / ABSTRACT_WORD_LIMIT) * 100)}%`,
                  }}
                />
              </div>
              <span
                className={
                  wordCount > ABSTRACT_WORD_LIMIT ? styles.wordOver : undefined
                }
              >
                {wordCount} / {ABSTRACT_WORD_LIMIT} words
                {wordCount > ABSTRACT_WORD_LIMIT
                  ? ` — remove ${wordCount - ABSTRACT_WORD_LIMIT}`
                  : ""}
              </span>
            </div>
            <SupportingFiles
              abstractId={abstractId}
              editable
              ensureSaved={() => persist({ force: true })}
            />
          </>
        ) : null}

        {currentStepKey === "review" ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Review &amp; submit</h2>
              <p>This is how your abstract will appear to the committee.</p>
            </header>
            <AbstractPreview
              abstract={{
                title: form.title,
                studyType: form.studyType,
                studyTypeOther: form.studyTypeOther,
                authorList: form.authors,
                advisor: form.advisor,
                advisorAffiliationId: form.advisorAffiliationId,
                bodyRich: form.bodyOps,
                body: bodyText,
                keywords: form.keywords,
              }}
              affiliations={previewAffiliations}
              showWordCount
            />

            {problems.some((problem) => problem.step !== "review") ? (
              <div className={styles.problemList}>
                <strong>Before you submit</strong>
                <ul>
                  {problems
                    .filter((problem) => problem.step !== "review")
                    .map((problem) => (
                      <li key={problem.message}>
                        <button
                          type="button"
                          onClick={() =>
                            goTo(
                              ABSTRACT_STEPS.findIndex(
                                (item) => item.key === problem.step,
                              ),
                            )
                          }
                        >
                          {problem.message}
                          <i className="bx bx-chevron-right" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <label className={styles.declaration}>
              <input
                type="checkbox"
                checked={form.declared}
                onChange={(event) => patch({ declared: event.target.checked })}
              />
              <span>
                I declare that the listed authors, faculty advisor, affiliations,
                and abstract are accurate, and that the faculty advisor has
                reviewed and approved this submission.
              </span>
            </label>

            {submitError ? <p className={styles.errorText}>{submitError}</p> : null}
            <div className={styles.submitRow}>
              <Button
                type="button"
                disabled={submitting || saving}
                onClick={() => void persist({ force: true }).catch(() => undefined)}
              >
                Save draft
              </Button>
              <Button
                className="primary"
                type="button"
                disabled={submitting || problems.length > 0}
                onClick={() => void handleSubmit()}
              >
                {submitting
                  ? "Submitting…"
                  : isRevision
                    ? "Resubmit for review"
                    : "Submit for review"}
              </Button>
            </div>
          </>
        ) : null}

        {currentStepKey !== "review" &&
        showErrors(currentStepKey) &&
        stepProblems.length > 0 ? (
          <ul className={styles.inlineProblems}>
            {stepProblems.map((problem) => (
              <li key={problem.message}>{problem.message}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className={styles.stepNav}>
        {step > 0 ? (
          <Button type="button" onClick={() => goTo(step - 1)}>
            Back
          </Button>
        ) : (
          <Link href="/profile/abstracts" className={styles.subtleLink}>
            My abstracts
          </Link>
        )}
        {status === "draft" ? (
          <button
            type="button"
            className={styles.deleteLink}
            onClick={() => void handleDelete()}
          >
            {abstractId ? "Delete draft" : "Discard"}
          </button>
        ) : null}
        {step < ABSTRACT_STEPS.length - 1 ? (
          <Button className="primary" type="button" onClick={() => goTo(step + 1)}>
            {step === ABSTRACT_STEPS.length - 2 ? "Review" : "Continue"}
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
