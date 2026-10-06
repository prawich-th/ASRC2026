import { ABSTRACT_STUDY_TYPES } from "./formOptions";
import { ABSTRACT_WORD_LIMIT, countWords } from "./richText";

export type AbstractStudyType = (typeof ABSTRACT_STUDY_TYPES)[number];

export const STUDY_TYPE_LABELS: Record<AbstractStudyType, string> = {
  experimental: "Experimental study",
  observational: "Observational study (cohort, case-control, cross-sectional)",
  in_silico: "In silico (computer-based) study",
  meta_analysis: "Meta-analysis",
  systematic_review: "Systematic review",
  case_report: "Case report / case series",
  qualitative: "Qualitative study",
  other: "Other",
};

export const MAX_STUDY_TYPE_OTHER_LENGTH = 120;

/** "Other" shows what the author typed; otherwise the standard label. */
export function formatStudyType(
  studyType: AbstractStudyType | undefined,
  other?: string,
): string | undefined {
  if (!studyType) return undefined;
  if (studyType === "other") return other?.trim() || STUDY_TYPE_LABELS.other;
  return STUDY_TYPE_LABELS[studyType];
}

/** Supporting material uploads. */
export const MAX_SUPPORTING_FILES = 5;
export const MAX_SUPPORTING_FILE_BYTES = 20 * 1024 * 1024;
export const SUPPORTING_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".zip",
] as const;

export function isAllowedSupportingFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTING_FILE_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  );
}

export const MAX_ABSTRACT_AUTHORS = 20;
export const MAX_ABSTRACT_KEYWORDS = 10;
export const MAX_ABSTRACT_TITLE_LENGTH = 300;

export const ABSTRACT_STEPS = [
  { key: "details", label: "Study details" },
  { key: "authors", label: "Authors" },
  { key: "abstract", label: "Abstract" },
  { key: "review", label: "Review & submit" },
] as const;

export type AbstractStepKey = (typeof ABSTRACT_STEPS)[number]["key"];

export type AbstractDraftShape<AffiliationId = string> = {
  title: string;
  studyType?: AbstractStudyType;
  studyTypeOther?: string;
  authorList: ReadonlyArray<{
    name: string;
    affiliationId?: AffiliationId;
    presenting: boolean;
  }>;
  advisor: string;
  advisorAffiliationId?: AffiliationId;
  bodyText: string;
  keywords: ReadonlyArray<string>;
  affiliationDeclared: boolean;
};

export type AbstractProblem = { step: AbstractStepKey; message: string };

/** Everything that blocks submission, grouped by the step that fixes it. */
export function getAbstractProblems<AffiliationId>(
  draft: AbstractDraftShape<AffiliationId>,
): AbstractProblem[] {
  const problems: AbstractProblem[] = [];
  if (!draft.title.trim()) {
    problems.push({ step: "details", message: "Add a title." });
  }
  if (!draft.studyType) {
    problems.push({ step: "details", message: "Choose the type of study." });
  } else if (draft.studyType === "other" && !draft.studyTypeOther?.trim()) {
    problems.push({
      step: "details",
      message: "Describe the type of study.",
    });
  }
  if (draft.keywords.length === 0) {
    problems.push({ step: "details", message: "Add at least one keyword." });
  }

  if (draft.authorList.length === 0) {
    problems.push({ step: "authors", message: "Add at least one author." });
  }
  if (draft.authorList.some((author) => !author.name.trim())) {
    problems.push({ step: "authors", message: "Every author needs a name." });
  }
  if (draft.authorList.some((author) => !author.affiliationId)) {
    problems.push({
      step: "authors",
      message: "Every author needs an affiliation.",
    });
  }
  if (
    draft.authorList.length > 0 &&
    !draft.authorList.some((author) => author.presenting)
  ) {
    problems.push({
      step: "authors",
      message: "Mark which author will present.",
    });
  }
  if (!draft.advisor.trim() || !draft.advisorAffiliationId) {
    problems.push({
      step: "authors",
      message: "Add the faculty advisor and their affiliation.",
    });
  }

  const words = countWords(draft.bodyText);
  if (words === 0) {
    problems.push({ step: "abstract", message: "Write the abstract." });
  } else if (words > ABSTRACT_WORD_LIMIT) {
    problems.push({
      step: "abstract",
      message: `Shorten the abstract to ${ABSTRACT_WORD_LIMIT} words (currently ${words}).`,
    });
  }

  if (!draft.affiliationDeclared) {
    problems.push({
      step: "review",
      message: "Confirm the declaration.",
    });
  }
  return problems;
}

export function normalizeKeywords(keywords: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of keywords) {
    const keyword = raw.replace(/\s+/g, " ").trim();
    const key = keyword.toLocaleLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }
  return result;
}
