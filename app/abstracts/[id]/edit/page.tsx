"use client";

import AbstractEditor from "@/components/abstract-editor/abstract-editor";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAbstractStatusLabel } from "@/lib/abstractDisplay";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "../../abstracts.module.scss";

export default function EditAbstractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const abstractId = params.id as Id<"abstracts">;
  const detail = useQuery(
    api.abstracts.getMineById,
    isAuthenticated ? { abstractId } : "skip",
  );
  const me = useQuery(api.users.me);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || detail === undefined || !me) {
    return <LoadingScreen what="your abstract" />;
  }

  const isRevision = detail?.abstract.status === "revision_requested";
  const isEditable = detail?.abstract.status === "draft" || isRevision;

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>{isRevision ? "Revise Abstract." : "Edit Abstract."}</h1>
          <p>
            {isRevision
              ? "Address the committee feedback, then resubmit for review."
              : "Your draft saves automatically. Submit when you are ready."}
          </p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          {!detail ? (
            <section className={styles.card}>
              <h2>Abstract not found</h2>
              <p className={styles.helperText}>
                The abstract may have been removed or you may not have
                permission to edit it.
              </p>
              <div className={styles.actions}>
                <Link href="/profile/abstracts">
                  <Button className="primary" type="button">
                    Back to My Abstracts
                  </Button>
                </Link>
              </div>
            </section>
          ) : !isEditable ? (
            <section className={styles.card}>
              <h2>{getAbstractStatusLabel(detail.abstract.status)}</h2>
              <p className={styles.helperText}>
                This abstract can no longer be edited. You can view it on the
                detail page.
              </p>
              <div className={styles.actions}>
                <Link href={`/abstracts/${detail.abstract._id}`}>
                  <Button className="primary" type="button">
                    View Abstract
                  </Button>
                </Link>
              </div>
            </section>
          ) : (
            <AbstractEditor key={detail.abstract._id} detail={detail} me={me} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
