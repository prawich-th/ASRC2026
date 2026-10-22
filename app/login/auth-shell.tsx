/* eslint-disable @next/next/no-img-element -- small static logos */
import Link from "next/link";
import { ReactNode } from "react";
import styles from "./login.module.scss";

/**
 * The sign-in screen layout: a card on the left, conference details and
 * rings on the right. Shared by sign in and password reset.
 */
export default function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  /** Rendered under the card, e.g. the create-account prompt. */
  footer?: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.login}>
        <div className={styles.card}>
          <Link className={styles.back} href="/">
            <i className="bx bx-arrow-left" aria-hidden="true" />
            Back to home
          </Link>
          <div>
            <img className={styles.logo} src="/asrc.png" alt="ASRC 2027" />
          </div>
          <h1>{title}</h1>
          {children}
        </div>
        {footer}
      </section>
      <section className={styles.info}>
        <div className={styles.logos}>
          <img src="/thammasat.png" alt="Thammasat University" />
          <img src="/cicm.png" alt="CICM" />
          <img src="/smo.png" alt="SMO" />
        </div>
        <span className={styles.infoText}>
          <h1>CICM ASRC 2027</h1>
          <p>Annual Student Research Conference</p>
          <p>Chulabhorn International College of Medicine</p>
        </span>
      </section>
      {/* Back to front: gray, orange, green. */}
      <div className={styles.rings} aria-hidden="true">
        <span className={styles.gray} />
        <span className={styles.orange} />
        <span className={styles.green} />
      </div>
    </main>
  );
}
