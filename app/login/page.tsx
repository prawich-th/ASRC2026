"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./login.module.scss";
import Link from "next/link";
import Button from "@/components/form/button";
import { api } from "@/convex/_generated/api";
import { FormField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";

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
      setError(
        caught instanceof Error ? caught.message : "Authentication failed",
      );
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
      setError(
        caught instanceof Error ? caught.message : "Could not verify email",
      );
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
      setError(
        caught instanceof Error ? caught.message : "Could not resend code",
      );
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
    <main className={styles.page}>
      <section className={styles.login}>
        <div className={styles.card}>
          <Link className={styles.back} href="/">
            {"<- Back Home"}
          </Link>
          <div>
            <img className={styles.logo} src="/asrc.png" alt="ASRC 2027" />
          </div>
          <h1>Sign In.</h1>
          {verificationEmail ? (
            <form onSubmit={handleVerification}>
              <p>{codeSentMessage}</p>
              <FormField
                label="Verification code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={8}
                maxLength={8}
                pattern="[0-9]{8}"
                required
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <Button disabled={submitting} type="submit">
                {submitting ? "Please wait…" : "Verify email"}
              </Button>
              <Button
                disabled={submitting || !pendingPassword}
                type="button"
                onClick={() => void resendVerificationCode()}
              >
                Resend code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <FormField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <FormField
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <Button disabled={submitting} type="submit">
                {submitting ? "Please wait…" : "Sign in"}
              </Button>
            </form>
          )}
        </div>

        <div className={styles.register}>
          <p>Don&apos;t have an account?</p>{" "}
          <Link href="/register">
            <Button type="button" className={"primary"}>
              Register Now
            </Button>
          </Link>
        </div>
      </section>
      <section className={styles.info}>
        <div className={styles.logos}>
          <img src="/thammasat.png" alt="Thammasat University" />
          <img src="/cicm.png" alt="CICM" />
          <img src="/smo.png" alt="SMO" />
        </div>
        <span className={styles.infoText}>
          <h1>CICM ASRC 2027</h1>
          <p>Annual Student Research Conference</p>
          <p>Chulabhorn Internaltional College of Medicine</p>
        </span>
      </section>
      <div className={styles.arcs}>
        <div className={styles.grey}></div>
        <div className={styles.orange}></div>
        <div className={styles.red}></div>
      </div>
    </main>
  );
}
