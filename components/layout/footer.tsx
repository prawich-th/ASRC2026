import { CONTACTS } from "@/lib/contacts";
import styles from "./footer.module.scss";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/" className={styles.logos} aria-label="ASRC 2027 home">
            <img src="/thammasat.png" alt="Thammasat University" />
            <img src="/cicm.png" alt="CICM" />
            <img src="/smo.png" alt="SMO CICM" />
            <img src="/asrc.png" alt="ASRC" />
          </Link>
          <div className={styles.desc}>
            <p className={styles.motto}>Observe. Innovate. Inspire.</p>
            <h2>Annual Student Research Conference (ASRC)</h2>
            <p>Chulabhorn International College of Medicine</p>
            <p>© 2026 Society of Medical Students of CICM</p>
          </div>
          <div className={styles.contacts}>
            <h3>Any questions?</h3>
            {CONTACTS.map((contact) => {
              const value =
                contact.lines.length > 1 ? (
                  <address>
                    {contact.lines.map((line, index) => (
                      <span key={line}>
                        {index > 0 ? <br /> : null}
                        {line}
                      </span>
                    ))}
                  </address>
                ) : (
                  contact.lines[0]
                );

              return (
                <div key={contact.label} className={styles.contact}>
                  <i className={contact.icon} aria-hidden="true" />
                  {contact.href ? (
                    <a href={contact.href}>{value}</a>
                  ) : (
                    <span>{value}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <nav className={styles.right} aria-label="Footer">
          <Link href="/contact">Contact us</Link>
          <Link href="/guidelines">Submission guidelines</Link>
          <Link href="/abstracts/submit">Submit an abstract</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms-conditions">Terms and conditions</Link>
        </nav>
      </div>
    </footer>
  );
}
