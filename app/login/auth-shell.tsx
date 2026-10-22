/* eslint-disable @next/next/no-img-element -- small static logos and the dome drawing */
import Countdown, { CountdownText } from "@/components/countdown";
import Link from "next/link";
import { ReactNode } from "react";
import styles from "./login.module.scss";

/**
 * The sign-in screen layout: the conference panel with its rings on one side
 * and the form panel on the other. Under 900px the conference panel shrinks
 * to a short band above the form. Shared by sign in and password reset.
 */
export default function AuthShell({
  title,
  intro,
  topLink,
  children,
}: {
  title: string;
  intro: ReactNode;
  /** The account switch in the top bar, e.g. "New here? Create an account". */
  topLink: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.brand} aria-label="About ASRC 2027">
        {/* Back to front: gray, orange, green. */}
        <div className={styles.rings} aria-hidden="true">
          <span className={styles.gray} />
          <span className={styles.orange} />
          <span className={styles.green} />
          <img className={styles.dome} src="/home/dome.png" alt="" />
          {/* Paper keyline so the dome's strokes stay distinct over rings. */}
          <svg className={styles.svgDefs} focusable="false">
            <filter id="auth-dome-keyline" colorInterpolationFilters="sRGB">
              <feComponentTransfer in="SourceAlpha" result="solid">
                <feFuncA type="discrete" tableValues="0 1 1 1" />
              </feComponentTransfer>
              <feMorphology
                in="solid"
                operator="dilate"
                radius="2"
                result="grown"
              />
              <feFlood floodColor="#f3f1ea" />
              <feComposite in2="grown" operator="in" result="keyline" />
              <feMerge>
                <feMergeNode in="keyline" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </svg>
        </div>

        <div className={styles.logos}>
          <img src="/thammasat.png" alt="Thammasat University" />
          <img src="/cicm.png" alt="Chulabhorn International College of Medicine" />
          <img src="/smo.png" alt="Society of Medical Students, CICM" />
        </div>

        <div className={styles.theme}>
          <p className={styles.eyebrow}>Annual Student Research Conference 2027</p>
          <h2>Medical Interdisciplinary Advancement:</h2>
          <p className={styles.subtitle}>
            Bridging Knowledge, Innovation, and Patient Care
          </p>
          <Countdown />
          <p className={styles.when}>
            <strong>10 March 2027</strong> · Chulabhorn International College of
            Medicine, Thammasat University
          </p>
        </div>

        <div className={styles.compact}>
          <p className={styles.eyebrow}>CICM ASRC 2027</p>
          <p className={styles.compactTitle}>Annual Student Research Conference</p>
          <p className={styles.when}>
            <strong>10 March 2027</strong> · <CountdownText />
          </p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.topBar}>
          <Link className={styles.back} href="/">
            <i className="bx bx-arrow-left" aria-hidden="true" />
            Back to home
          </Link>
          <span className={styles.topLink}>{topLink}</span>
        </div>

        <div className={styles.formArea}>
          <div className={styles.formInner}>
            <div className={styles.heading}>
              <img className={styles.logo} src="/asrc.png" alt="ASRC 2027" />
              <h1>{title}</h1>
              <p>{intro}</p>
            </div>
            {children}
          </div>
        </div>

        <div className={styles.legal}>
          <span>Organised by the Society of Medical Students, CICM</span>
          <span className={styles.legalLinks}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms-conditions">Terms and conditions</Link>
          </span>
        </div>
      </section>
    </main>
  );
}
