"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./login.module.scss";
import Link from "next/link";
import Button from "@/components/form/button";
import { api } from "@/convex/_generated/api";
import { FormField, PasswordField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import { errorMessage } from "@/lib/errorMessage";
import AuthShell from "./auth-shell";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [codeSentMessage, setCodeSentMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user === undefined) {
      return;
    }
    router.replace(user?.profileComplete ? "/" : "/register");
  }, [isAuthenticated, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    form.set("flow", "signIn");

    try {
      const result = await signIn("password", form);
      if (!result.signingIn) {
        setVerificationEmail(String(form.get("email") ?? "").trim());
        setPendingPassword(String(form.get("password") ?? ""));
        setCodeSentMessage("A verification code was sent to your email.");
      }
    } catch (caught) {
      setError(errorMessage(caught, "Could not sign in."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    form.set("flow", "email-verification");
    form.set("email", verificationEmail);
    try {
      await signIn("password", form);
      setPendingPassword("");
    } catch (caught) {
      setError(errorMessage(caught, "Could not verify email."));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerificationCode() {
    setError("");
    setSubmitting(true);
    const form = new FormData();
    form.set("flow", "signIn");
    form.set("email", verificationEmail);
    form.set("password", pendingPassword);
    try {
      await signIn("password", form);
      setCodeSentMessage("A new verification code was sent.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not resend code."));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <LoadingScreen
        what={isAuthenticated ? "your account" : "sign in"}
      />
    );
  }

  return (
    <AuthShell
      title="Sign in."
      intro="Welcome back. Sign in to submit and track your abstracts and keep your profile up to date."
      topLink={
        <>
          New here? <Link href="/register">Create an account</Link>
        </>
      }
    >
      {verificationEmail ? (
        <form onSubmit={handleVerification}>
          {codeSentMessage ? (
            <p className={styles.notice} aria-live="polite">
              <i className="bx bx-check-circle" aria-hidden="true" />
              {codeSentMessage}
            </p>
          ) : null}
          <FormField
            label="Verification code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={8}
            maxLength={8}
            pattern="[0-9]{8}"
            hint={`Enter the 8-digit code sent to ${verificationEmail}.`}
            required
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button className="primary" disabled={submitting} type="submit">
            {submitting ? "Please wait…" : "Verify email"}
          </Button>
          <Button
            className="secondary"
            disabled={submitting || !pendingPassword}
            type="button"
            onClick={() => void resendVerificationCode()}
          >
            Resend code
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
            <Link className={styles.forgot} href="/login/reset">
              Forgot password?
            </Link>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <Button className="primary" disabled={submitting} type="submit">
              {submitting ? "Please wait…" : "Sign in"}
            </Button>
          </form>
          <p className={styles.divider}>First time at ASRC 2027?</p>
          <Link className={styles.secondaryLink} href="/register">
            Create an account
          </Link>
          <p className={styles.switchLine}>
            First time here? <Link href="/register">Create an account</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
