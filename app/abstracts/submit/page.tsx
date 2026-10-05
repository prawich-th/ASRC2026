"use client";

import AbstractEditor from "@/components/abstract-editor/abstract-editor";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "../abstracts.module.scss";

export default function SubmitAbstractPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !me) {
    return <LoadingScreen what="abstract submission" />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Submit Abstract.</h1>
          <p>
            Write your abstract here — your draft saves automatically and you
            can come back to it any time.
          </p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          <AbstractEditor me={me} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
