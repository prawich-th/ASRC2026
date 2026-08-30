import styles from "@/app/abstracts/abstracts.module.scss";

const requiredItems = [
  "A clear research title",
  "Full names of all author(s)",
  "The full name of the faculty advisor",
  "Author and advisor affiliations",
  "The abstract text",
  "Relevant keywords",
  "The completed paper as a PDF using the official template",
] as const;

export default function AbstractPreparationChecklist() {
  return (
    <aside className={styles.preparationPanel} aria-labelledby="prepare-heading">
      <div className={styles.preparationHeading}>
        <i className="bx bx-clipboard" aria-hidden="true" />
        <div>
          <h3 id="prepare-heading">Prepare before you begin</h3>
          <p>Have all required information and files ready.</p>
        </div>
      </div>
      <ul>
        {requiredItems.map((item) => (
          <li key={item}>
            <i className="bx bx-check" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className={styles.optionalPreparation}>
        Optional: supplementary files such as figures, datasets, spreadsheets,
        or supporting documents.
      </p>
    </aside>
  );
}
