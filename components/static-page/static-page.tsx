import type { ReactNode } from "react";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import styles from "./static-page.module.scss";

type StaticPageProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export default function StaticPage({
  title,
  eyebrow,
  children,
}: StaticPageProps) {
  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h1>{title}.</h1>
        </div>
      </section>
      <main className={styles.main}>
        <article className={styles.article}>{children}</article>
      </main>
      <Footer />
    </div>
  );
}
