"use client";

import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import RegistrationPaymentGate from "@/components/registration-payment-gate";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "../../abstracts.module.scss";

type PaymentPageClientProps = {
  abstractId: string;
  paymentResult?: string;
};

export default function PaymentPageClient({
  abstractId: abstractIdString,
  paymentResult,
}: PaymentPageClientProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const abstractId = abstractIdString as Id<"abstracts">;
  const detail = useQuery(
    api.abstracts.getMineById,
    isAuthenticated ? { abstractId } : "skip",
  );
  const registrationStatus = useQuery(
    api.billingQueries.getRegistrationStatus,
    isAuthenticated ? {} : "skip",
  );
  const submitDraft = useMutation(api.abstracts.submitDraft);
  const finalizationStarted = useRef(false);
  const [finalizationError, setFinalizationError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const isEditable =
    detail?.abstract.status === "draft" ||
    detail?.abstract.status === "revision_requested";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (
      !isEditable ||
      registrationStatus?.eligible !== true ||
      finalizationStarted.current
    ) {
      return;
    }

    finalizationStarted.current = true;
    void submitDraft({ abstractId })
      .then(() => router.replace(`/abstracts/${abstractId}`))
      .catch((caught: unknown) => {
        finalizationStarted.current = false;
        setFinalizationError(
          caught instanceof Error
            ? caught.message
            : "Could not complete the abstract submission.",
        );
      });
  }, [abstractId, isEditable, registrationStatus?.eligible, retryCount, router, submitDraft]);

  if (
    isLoading ||
    !isAuthenticated ||
    detail === undefined ||
    registrationStatus === undefined
  ) {
    return <LoadingScreen what="the payment step" />;
  }

  if (!detail) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.inner}>
            <section className={styles.card}>
              <h2>Abstract not found</h2>
              <p className={styles.helperText}>
                The abstract may have been removed or you may not have
                permission to submit it.
              </p>
              <div className={styles.actions}>
                <Link href="/profile">
                  <Button className="primary" type="button">
                    Back to Profile
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isEditable) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.inner}>
            <section className={styles.card}>
              <h2>This abstract has already been submitted</h2>
              <p className={styles.helperText}>
                Payment is complete and the abstract is no longer awaiting
                submission.
              </p>
              <div className={styles.actions}>
                <Link href={`/abstracts/${abstractId}`}>
                  <Button className="primary" type="button">
                    View Abstract
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const paperCount = detail.files.filter(
    (file) => file.kind === "paper" || file.kind === undefined,
  ).length;

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <p>Abstract Submission {"->"} Final Step</p>
          <h1>Registration Payment</h1>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          <section className={styles.card}>
            <h2>Your abstract is saved</h2>
            <p className={styles.stepIntro}>
              The abstract details and files below are already uploaded. Complete
              the registration payment to send this submission for review.
            </p>
            <ul className={styles.metaRows}>
              <li>
                <strong>Submission ID</strong>
                <span>{detail.abstract.code}</span>
              </li>
              <li>
                <strong>Title</strong>
                <span>{detail.abstract.title}</span>
              </li>
              <li>
                <strong>Paper files</strong>
                <span>{paperCount}</span>
              </li>
              <li>
                <strong>Supplementary files</strong>
                <span>{detail.files.length - paperCount}</span>
              </li>
            </ul>
          </section>

          {registrationStatus.eligible ? (
            <section className={`${styles.card} ${styles.paymentCard}`}>
              <div className={`${styles.paymentStatus} ${styles.paymentComplete}`}>
                <i className="bx bx-check-circle" aria-hidden="true" />
                <div>
                  <h2>Payment confirmed</h2>
                  <p>Finalizing your abstract submission now…</p>
                </div>
              </div>
              {finalizationError ? (
                <>
                  <p className={styles.error}>{finalizationError}</p>
                  <div className={styles.actions}>
                    <Button
                      className="primary"
                      type="button"
                      onClick={() => {
                        setFinalizationError("");
                        setRetryCount((count) => count + 1);
                      }}
                    >
                      Try Final Submission Again
                    </Button>
                  </div>
                </>
              ) : null}
            </section>
          ) : paymentResult === "success" ? (
            <section className={`${styles.card} ${styles.paymentCard}`}>
              <div className={styles.paymentStatus}>
                <i className="bx bx-time-five" aria-hidden="true" />
                <div>
                  <h2>Confirming your payment</h2>
                  <p>
                    Stripe returned successfully. We are waiting for secure
                    payment confirmation; this page will continue automatically.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {paymentResult === "canceled" ? (
                <p className={styles.error}>
                  Payment was canceled. Your abstract and uploaded files are
                  still saved, and you can try again when ready.
                </p>
              ) : null}
              <RegistrationPaymentGate
                status={registrationStatus}
                returnPath={`/abstracts/${abstractId}/payment`}
              />
              <div className={styles.actions}>
                <Link href={`/abstracts/${abstractId}/edit`}>
                  <Button type="button">Back to Edit Abstract</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
