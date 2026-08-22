import type { Metadata } from "next";
import StaticPage from "@/components/static-page/static-page";
import { CONTACTS } from "@/lib/contacts";
import styles from "./contact.module.scss";

export const metadata: Metadata = {
  title: "Contact Us | ASRC 2026",
  description:
    "Contact the Annual Student Research Conference organizing team at Chulabhorn International College of Medicine.",
};

export default function ContactPage() {
  return (
    <StaticPage title="Contact Us">
      <p>
        Questions about ASRC, abstract submission, or the conference programme
        can be sent to the organizing team using the details below.
      </p>

      <div className={styles.grid}>
        {CONTACTS.map((contact) => {
          const body = (
            <>
              <span className={styles.icon} aria-hidden="true">
                <i className={contact.icon} />
              </span>
              <p className={styles.label}>{contact.label}</p>
              <p className={styles.value}>
                {contact.lines.map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            </>
          );

          if (contact.href) {
            const isExternal = contact.href.startsWith("http");
            return (
              <a
                key={contact.label}
                className={styles.card}
                href={contact.href}
                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {body}
              </a>
            );
          }

          return (
            <div key={contact.label} className={styles.card}>
              {body}
            </div>
          );
        })}
      </div>
    </StaticPage>
  );
}
