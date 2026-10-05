import { Doc, Id } from "@/convex/_generated/dataModel";
import { buildAuthorCredits } from "@/lib/abstractDisplay";
import { countWords, plainTextToRichText, RichTextOp } from "@/lib/richText";
import { Fragment } from "react";
import styles from "./abstract-editor.module.scss";
import RichTextView from "./rich-text-view";

export type PreviewAbstract = {
  title: string;
  authorList?: ReadonlyArray<{
    name: string;
    affiliationId?: Id<"affiliations">;
    presenting: boolean;
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

/** Shows an abstract the way it will appear in the conference proceedings. */
export default function AbstractPreview({
  abstract,
  affiliations,
  showWordCount = false,
}: {
  abstract: PreviewAbstract;
  affiliations: ReadonlyArray<Doc<"affiliations">>;
  showWordCount?: boolean;
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

  return (
    <article className={styles.preview}>
      <h3 className={styles.previewTitle}>
        {abstract.title || <span className={styles.missing}>Untitled abstract</span>}
      </h3>

      {hasStructuredAuthors ? (
        <p className={styles.previewAuthors}>
          {credits.authors.map((author, index) => (
            <Fragment key={index}>
              {index > 0 ? ", " : null}
              <span className={author.presenting ? styles.presenting : undefined}>
                {author.name || "Unnamed author"}
              </span>
              {author.number ? <sup>{author.number}</sup> : null}
              {author.presenting ? <sup>*</sup> : null}
            </Fragment>
          ))}
        </p>
      ) : abstract.authors ? (
        <p className={`${styles.previewAuthors} ${styles.preserveLines}`}>
          {abstract.authors}
        </p>
      ) : null}

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
      ) : null}
      {hasStructuredAuthors ? (
        <p className={styles.previewFootnote}>
          <sup>*</sup> Presenting author
        </p>
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
