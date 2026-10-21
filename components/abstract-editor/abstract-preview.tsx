import { Doc, Id } from "@/convex/_generated/dataModel";
import { buildAuthorCredits } from "@/lib/abstractDisplay";
import { AbstractStudyType, formatStudyType } from "@/lib/abstractForm";
import { countWords, plainTextToRichText, RichTextOp } from "@/lib/richText";
import { Fragment } from "react";
import styles from "./abstract-editor.module.scss";
import RichTextView from "./rich-text-view";

export type PreviewAbstract = {
  title: string;
  studyType?: AbstractStudyType;
  studyTypeOther?: string;
  authorList?: ReadonlyArray<{
    name: string;
    affiliationId?: Id<"affiliations">;
    presenting: boolean;
    facultyAdvisor?: boolean;
  }>;
  advisor?: string;
  advisorAffiliationId?: Id<"affiliations">;
  bodyRich?: ReadonlyArray<RichTextOp>;
  body: string;
  keywords: ReadonlyArray<string>;
  /** Legacy free-text fields from submissions made before the editor. */
  authors?: string;
  affiliation?: string;
};

/**
 * Shows an abstract the way it will appear in the conference proceedings: a
 * white sheet whatever ground it sits on, with left-aligned body text.
 */
export default function AbstractPreview({
  abstract,
  affiliations,
  showWordCount = false,
  correspondingAuthor,
}: {
  abstract: PreviewAbstract;
  affiliations: ReadonlyArray<Doc<"affiliations">>;
  showWordCount?: boolean;
  correspondingAuthor?: string;
}) {
  const hasStructuredAuthors = (abstract.authorList?.length ?? 0) > 0;
  const credits = buildAuthorCredits(
    abstract.authorList ?? [],
    abstract.advisor
      ? { name: abstract.advisor, affiliationId: abstract.advisorAffiliationId }
      : undefined,
    affiliations,
  );
  const ops = abstract.bodyRich ?? plainTextToRichText(abstract.body);
  const wordCount = countWords(abstract.body);
  const studyType = formatStudyType(abstract.studyType, abstract.studyTypeOther);
  const hasPresenter =
    hasStructuredAuthors &&
    (abstract.authorList ?? []).some((author) => author.presenting);

  return (
    <article className={styles.preview}>
      {studyType ? <p className={styles.previewStudyType}>{studyType}</p> : null}
      <h3 className={styles.previewTitle}>
        {abstract.title || <span className={styles.missing}>Untitled abstract</span>}
      </h3>

      {hasStructuredAuthors ? (
        <p className={styles.previewAuthors}>
          {credits.authors.map((author, index) => {
            const presenting = abstract.authorList?.[index]?.presenting;
            return (
              <Fragment key={index}>
                {index > 0 ? ", " : null}
                <span className={presenting ? styles.presenting : undefined}>
                  {author.name || "Unnamed author"}
                </span>
                {author.number || presenting ? (
                  <sup>
                    {author.number}
                    {presenting ? "*" : null}
                  </sup>
                ) : null}
                {abstract.authorList?.[index]?.facultyAdvisor
                  ? " (Faculty advisor)"
                  : null}
              </Fragment>
            );
          })}
        </p>
      ) : abstract.authors ? (
        <p className={`${styles.previewAuthors} ${styles.preserveLines}`}>
          {abstract.authors}
        </p>
      ) : (
        <p className={`${styles.previewAuthors} ${styles.missing}`}>
          No authors listed
        </p>
      )}

      {credits.advisor ? (
        <p className={styles.previewAdvisor}>
          Faculty advisor: {credits.advisor.name}
          {credits.advisor.number ? <sup>{credits.advisor.number}</sup> : null}
        </p>
      ) : null}

      {credits.affiliations.length > 0 ? (
        <ol className={styles.previewAffiliations}>
          {credits.affiliations.map((affiliation) => (
            <li key={affiliation.number}>
              <sup>{affiliation.number}</sup> {affiliation.label}
            </li>
          ))}
        </ol>
      ) : abstract.affiliation ? (
        <p className={`${styles.previewAffiliationsLegacy} ${styles.preserveLines}`}>
          {abstract.affiliation}
        </p>
      ) : (
        <p className={`${styles.previewAffiliationsLegacy} ${styles.missing}`}>
          No affiliations listed
        </p>
      )}
      {hasPresenter ? (
        <p className={styles.previewFootnote}>
          <sup>*</sup> Presenting author
        </p>
      ) : null}
      {correspondingAuthor ? (
        <p className={styles.previewFootnote}>Corresponding author: {correspondingAuthor}</p>
      ) : null}

      {ops.length > 0 ? (
        <RichTextView className={styles.previewBody} ops={ops} />
      ) : (
        <p className={styles.missing}>No abstract text yet.</p>
      )}

      {abstract.keywords.length > 0 ? (
        <p className={styles.previewKeywords}>
          <strong>Keywords:</strong> {abstract.keywords.join(", ")}
        </p>
      ) : null}
      {showWordCount ? (
        <p className={styles.previewWordCount}>{wordCount} words</p>
      ) : null}
    </article>
  );
}
