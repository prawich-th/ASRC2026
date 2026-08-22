import styles from "./footer.module.scss";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <Link href="/">
          <div className={styles.logos}>
            <img src="/thammasat.png" alt="Thammasat University" />
            <img src="/cicm.png" alt="CICM" />
            <img src="/smo.png" alt="logo" />
            <img src="/asrc.png" alt="logo" />
          </div>
        </Link>
        <div className={styles.desc}>
          <p>Observe. Innovate. Inspire.</p>
          <h2>Annual Student Research Conference (ASRC)</h2>
          <p>
            Chulabhorn International College of Medicine <br />
            2026-27 © Society of Medical Students of CICM
          </p>
        </div>
        <div className={styles.links}>
          <h3>Any Questions?</h3>
          <span>
            <i className="bx bx-envelope" />
            <p>
              <a href="mailto:smomedcicm+asrc@gmail.com">
                smomedcicm+asrc@gmail.com
              </a>
            </p>
          </span>
          <span>
            <i className="bx bx-phone"></i>
            <p>+66 2 564 1000</p>
          </span>
          <span>
            <i className="bx bx-map"></i>

            <p>
              99/129 Moo 18 Phahon Yothin Rd. <br />
              Khlong Nueng Subdistrict, Khlong Luang District, <br />
              Pathum Thani 12120
            </p>
          </span>
        </div>
      </div>
      <div className={styles.right}>
        <p>
          <Link href="/terms-conditions">Terms and Conditions</Link>
        </p>
        <p>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </p>
        <p>
          <Link href="/abstracts/submit">Submit an Abstract</Link>
        </p>
      </div>
    </footer>
  );
}
