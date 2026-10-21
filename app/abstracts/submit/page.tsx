"use client";

import AbstractEditor from "@/components/abstract-editor/abstract-editor";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import LoadingScreen from "@/components/layout/loading-screen";
import Modal from "@/components/layout/modal";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../abstracts.module.scss";

function formatDate(time: number) {
  return new Date(time).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SubmitAbstractPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me);
  const abstracts = useQuery(
    api.abstracts.listMine,
    isAuthenticated ? {} : "skip",
  );
  // Once chosen, stays chosen: the editor's own autosaved draft must not
  // reopen the prompt.
  const [startNew, setStartNew] = useState(false);
  const drafts = abstracts?.filter((abstract) => abstract.status === "draft");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !me || drafts === undefined) {
    return <LoadingScreen what="abstract submission" />;
  }

  return (
    <div className={styles.page}>
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Submit an abstract</h1>
          <p>
            Write your abstract here — your draft saves automatically.
          </p>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          <AbstractEditor me={me} />
        </div>
      </main>
      <Footer />
      <Modal
        open={drafts.length > 0 && !startNew}
        title={
          drafts.length === 1
            ? "Continue your draft?"
            : "Continue one of your drafts?"
        }
        description={
          drafts.length === 1
            ? "You already have an abstract in draft. Pick up where you left off, or start a new one."
            : `You already have ${drafts.length} abstracts in draft. Pick up where you left off, or start a new one.`
        }
        onClose={() => setStartNew(true)}
      >
        <ul className={styles.draftList}>
          {drafts.map((draft) => (
            <li key={draft._id}>
              <Link
                href={`/abstracts/${draft._id}/edit`}
                className={styles.draftLink}
              >
                <div>
                  <strong>{draft.title || "Untitled abstract"}</strong>
                  <span>Last saved {formatDate(draft.updatedAt)}</span>
                </div>
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.draftActions}>
          <Button
            className="secondary"
            type="button"
            onClick={() => setStartNew(true)}
          >
            Start a new abstract
          </Button>
        </div>
      </Modal>
    </div>
  );
}
