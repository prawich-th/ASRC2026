import Button from "@/components/form/button";
import styles from "./invitation-letter.module.scss";

/**
 * The participant's invitation letter. Letters are not issued yet, so with no
 * `url` this shows a "not yet available" state; pass the file's URL once the
 * organising committee uploads it and the download becomes active.
 */
export default function InvitationLetter({ url }: { url?: string }) {
  const available = Boolean(url);

  return (
    <section className={styles.card} aria-labelledby="invitation-letter-title">
      <div className={styles.icon} aria-hidden="true">
        <i className="bx bx-envelope" />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h2 id="invitation-letter-title">Invitation letter</h2>
          <span
            className={`${styles.badge} ${available ? styles.ready : ""}`}
          >
            {available ? "Ready" : "Not yet available"}
          </span>
        </div>
        <p>
          {available
            ? "Your official invitation letter for ASRC 2027 is ready to download."
            : "Your official invitation letter for ASRC 2027 will appear here once the organising committee uploads it. Please check back later."}
        </p>
      </div>
      <div className={styles.action}>
        {available ? (
          <a className={styles.buttonLink} href={url} download>
            <Button className="secondary" type="button" tabIndex={-1}>
              <i className="bx bx-arrow-to-bottom" aria-hidden="true" />
              Download letter
            </Button>
          </a>
        ) : (
          <Button className="secondary" type="button" disabled>
            <i className="bx bx-arrow-to-bottom" aria-hidden="true" />
            Download letter
          </Button>
        )}
      </div>
    </section>
  );
}
