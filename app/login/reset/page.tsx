"use client";

import Button from "@/components/form/button";
import { FormField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errorMessage";
import { MIN_PASSWORD_LENGTH } from "@/lib/formOptions";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthShell from "../auth-shell";
import styles from "../login.module.scss";

export default function ResetPasswordPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  // A successful reset signs the user in; send them on like sign in does.
  useEffect(() => {
    if (!isAuthenticated || user === undefined) {
      return;
    }
    router.replace(user?.profileComplete ? "/" : "/register");
  }, [isAuthenticated, user, router]);

  async function sendCode(address: string) {
    setError("");
    setNotice("");
    setSubmitting(true);
    const form = new FormData();
    form.set("flow", "reset");
    form.set("email", address);
    try {
      await signIn("password", form);
      setEmail(address);
      setCodeSent(true);
      setNotice(`We sent a reset code to ${address}.`);
    } catch (caught) {
      setError(errorMessage(caught, "Could not send a reset code."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await sendCode(String(form.get("email") ?? "").trim());
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    form.set("flow", "reset-verification");
    form.set("email", email);
    form.set("newPassword", newPassword);
    form.delete("confirmPassword");
    try {
      await signIn("password", form);
    } catch (caught) {
      setError(errorMessage(caught, "Could not reset your password."));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <LoadingScreen what={isAuthenticated ? "your account" : "password reset"} />
    );
  }

  return (
    <AuthShell
      title="Reset password."
      footer={
        <div className={styles.register}>
          <p>Remembered it?</p>
          <Link href="/login" className={styles.buttonLink}>
            <Button type="button" className="secondary" tabIndex={-1}>
              Back to sign in
            </Button>
          </Link>
        </div>
      }
    >
      {codeSent ? (
        <form onSubmit={handleReset}>
          {notice ? (
            <p className={styles.notice} aria-live="polite">
              <i className="bx bx-check-circle" aria-hidden="true" />
              {notice}
            </p>
          ) : null}
          <FormField
            label="Reset code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={8}
            maxLength={8}
            pattern="[0-9]{8}"
            hint="The code expires after 15 minutes."
            required
          />
          <FormField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <FormField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            errorMessage={mismatch ? "Passwords do not match." : undefined}
            aria-invalid={mismatch}
            required
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button className="primary" disabled={submitting} type="submit">
            {submitting ? "Please wait…" : "Reset password"}
          </Button>
          <Button
            className="secondary"
            disabled={submitting}
            type="button"
            onClick={() => void sendCode(email)}
          >
            Send a new code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRequest}>
          <p className={styles.intro}>
            Enter the email you registered with and we&apos;ll send you a code
            to choose a new password.
          </p>
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button className="primary" disabled={submitting} type="submit">
            {submitting ? "Please wait…" : "Send reset code"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
