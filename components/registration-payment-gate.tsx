"use client";

import styles from "@/app/abstracts/abstracts.module.scss";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";
import Button from "./form/button";

export type RegistrationStatus = {
  eligible: boolean;
  paid: boolean;
  waived: boolean;
  configured: boolean;
};

export default function RegistrationPaymentGate({
  status,
}: {
  status: RegistrationStatus | undefined;
}) {
  const createCheckout = useAction(api.billing.createRegistrationCheckout);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setStartingCheckout(true);
    setError("");
    try {
      const checkout = await createCheckout();
      if (!checkout.url) {
        throw new Error("Stripe did not return a checkout link");
      }
      window.location.assign(checkout.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start registration payment.",
      );
      setStartingCheckout(false);
    }
  }

  if (status === undefined) {
    return (
      <section className={`${styles.card} ${styles.paymentCard}`}>
        <h2>Registration Fee</h2>
        <p className={styles.helperText}>Checking your registration status…</p>
      </section>
    );
  }

  if (status.paid || status.waived) {
    return (
      <section className={`${styles.card} ${styles.paymentCard}`}>
        <div className={`${styles.paymentStatus} ${styles.paymentComplete}`}>
          <i className="bx bx-check-circle" aria-hidden="true" />
          <div>
            <h2>Registration Fee</h2>
            <p>
              {status.waived
                ? "Your registration fee has been waived."
                : "Your registration fee has been paid."}{" "}
              You can submit your abstract for review.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.card} ${styles.paymentCard}`}>
      <div className={styles.paymentStatus}>
        <i className="bx bx-credit-card" aria-hidden="true" />
        <div>
          <h2>Registration Fee Required</h2>
          <p>
            Complete the one-time registration payment before submitting your
            abstract. Payment is securely handled by Stripe.
          </p>
        </div>
      </div>
      {!status.configured ? (
        <p className={styles.error}>
          Online payment is not available yet. Please contact the conference
          administrator.
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <Button
          className="primary"
          type="button"
          disabled={!status.configured || startingCheckout}
          onClick={() => void handleCheckout()}
        >
          {startingCheckout ? "Opening Stripe…" : "Pay Registration Fee"}
        </Button>
      </div>
    </section>
  );
}
