"use client";

import { useEffect, useRef } from "react";
import Button from "../form/button";
import styles from "./admin.module.scss";

export type RegistrationFeeStatus = "required" | "waived" | "paid";

export type RegistrationFeeDialogUser = {
  label: string;
  status: RegistrationFeeStatus;
};

export default function RegistrationFeeDialog({
  user,
  error,
  saving,
  onConfirm,
  onClose,
}: {
  user: RegistrationFeeDialogUser | null;
  error: string;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving, user]);

  if (!user) {
    return null;
  }

  const isPaid = user.status === "paid";
  const isWaived = user.status === "waived";
  const title = isPaid
    ? "Registration fee paid"
    : isWaived
      ? "Remove fee waiver?"
      : "Waive registration fee?";

  return (
    <div className={styles.modalLayer} role="presentation">
      <button
        className={styles.modalBackdrop}
        type="button"
        aria-label="Close registration fee dialog"
        disabled={saving}
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className={styles.confirmationModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-fee-dialog-title"
        tabIndex={-1}
      >
        <div className={styles.modalIcon} aria-hidden="true">
          <i
            className={
              isPaid
                ? "bx bx-check-circle"
                : isWaived
                  ? "bx bx-undo"
                  : "bx bx-receipt"
            }
          />
        </div>
        <div className={styles.modalContent}>
          <h2 id="registration-fee-dialog-title">{title}</h2>
          {isPaid ? (
            <p>
              Stripe has recorded a successful registration payment for{" "}
              <strong>{user.label}</strong>. No waiver action is needed.
            </p>
          ) : isWaived ? (
            <p>
              Remove the waiver for <strong>{user.label}</strong>? They will need
              to pay the registration fee before submitting an abstract.
            </p>
          ) : (
            <p>
              Waive the registration fee for <strong>{user.label}</strong>? They
              will be able to submit an abstract without paying.
            </p>
          )}
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.modalActions}>
            <Button
              type="button"
              disabled={saving}
              onClick={onClose}
            >
              {isPaid ? "Close" : "Cancel"}
            </Button>
            {!isPaid ? (
              <Button
                className={isWaived ? "destructive" : "green"}
                type="button"
                disabled={saving}
                onClick={onConfirm}
              >
                {saving
                  ? "Saving…"
                  : isWaived
                    ? "Remove Waiver"
                    : "Waive Fee"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
