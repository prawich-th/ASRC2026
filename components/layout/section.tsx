import type { ReactNode } from "react";
import styles from "./section.module.scss";

export type SectionRing = {
  color: "green" | "orange" | "gray";
  side: "left" | "right";
  /** Neighbouring rings sit at different heights; omit for the middle. */
  level?: "high" | "low";
};

type SectionProps = {
  children: ReactNode;
  id?: string;
  /** Section rings rotate orange, green, grey and switch sides down a page. */
  ring?: SectionRing;
  /** The slim date strip: less padding and never a ring. */
  strip?: boolean;
  className?: string;
  innerClassName?: string;
};

/**
 * A full-width public page band. Render it as a direct child of <main> inside
 * a `PublicPage` so the grounds alternate paper / paper-sunk.
 */
export default function Section({
  children,
  id,
  ring,
  strip,
  className,
  innerClassName,
}: SectionProps) {
  return (
    <section
      id={id}
      className={[styles.section, strip ? styles.strip : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {ring && !strip ? (
        <span
          className={[
            styles.ring,
            styles.sectionRing,
            styles[ring.color],
            styles[ring.side],
            ring.level ? styles[ring.level] : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      ) : null}
      <div className={`${styles.inner} ${innerClassName ?? ""}`}>
        {children}
      </div>
    </section>
  );
}

export const sectionStyles = styles;
