"use client";

import styles from "@/app/abstracts/abstracts.module.scss";
import Button from "@/components/form/button";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import RegistrationPaymentGate from "@/components/registration-payment-gate";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RegistrationPaymentPageClientProps = {
  paymentResult?: string;
};

export default function RegistrationPaymentPageClient({
  paymentResult,
}: RegistrationPaymentPageClientProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const registrationStatus = useQuery(
    api.billingQueries.getRegistrationStatus,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || registrationStatus === undefined) {
    return <LoadingScreen what="your registration payment" />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <p>My Account {"->"} Registration Fee</p>
          <h1>Registration Payment</h1>
        </div>
      </section>
      <main className={styles.main}>
        <div className={styles.inner}>
          {registrationStatus.eligible ? (
            <>
              <RegistrationPaymentGate
                status={registrationStatus}
                returnPath="/registration-payment"
              />
              <div className={styles.actions}>
                <Link href="/profile">
                  <Button className="primary" type="button">
                    Back to Profile
                  </Button>
                </Link>
              </div>
            </>
          ) : paymentResult === "success" ? (
            <section className={`${styles.card} ${styles.paymentCard}`}>
              <div className={styles.paymentStatus}>
                <i className="bx bx-time-five" aria-hidden="true" />
                <div>
                  <h2>Confirming your payment</h2>
                  <p>
                    Stripe returned successfully. We are waiting for secure
                    payment confirmation; this page will update automatically.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {paymentResult === "canceled" ? (
                <p className={styles.error}>
                  Payment was canceled. You can try again when ready.
                </p>
              ) : null}
              <RegistrationPaymentGate
                status={registrationStatus}
                returnPath="/registration-payment"
              />
              <div className={styles.actions}>
                <Link href="/profile">
                  <Button type="button">Back to Profile</Button>
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
