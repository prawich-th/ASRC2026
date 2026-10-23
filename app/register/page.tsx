"use client";

import Button from "@/components/form/button";
import { CheckboxField, FormField } from "@/components/form/Form";
import Footer from "@/components/layout/footer";
import Section, { sectionStyles } from "@/components/layout/section";
import LoadingScreen from "@/components/layout/loading-screen";
import ProfileFields from "@/components/profile/profile-fields";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { errorMessage } from "@/lib/errorMessage";
import { MIN_PASSWORD_LENGTH } from "@/lib/formOptions";
import {
  ProfileFormValues,
  profileValuesFromUser,
  toProfileInput,
} from "@/lib/profileForm";
import { clearDraft, readDraft, writeDraft } from "@/lib/sessionDraft";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./register.module.scss";

/** The email waiting for its verification code, kept across a refresh. */
const VERIFY_EMAIL_KEY = "asrc.register.verifyEmail";
const profileDraftKey = (userId: string) => `asrc.register.profile.${userId}`;

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const completeProfile = useMutation(api.users.completeProfile);
  const router = useRouter();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState(
    () => readDraft<string>(VERIFY_EMAIL_KEY) ?? "",
  );
  const [pendingPassword, setPendingPassword] = useState("");
  const [askPasswordToResend, setAskPasswordToResend] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileFormValues | null>(
    null,
  );

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // Step 2 starts from an unsent draft, else from anything already on the
  // account (pre-registered participants arrive with most fields filled).
  const savedDraft = useMemo(
    () =>
      user ? readDraft<ProfileFormValues>(profileDraftKey(user._id)) : null,
    [user],
  );
  const profileValues =
    profileDraft ?? savedDraft ?? profileValuesFromUser(user);

  function updateProfileDraft(values: ProfileFormValues) {
    setProfileDraft(values);
    if (user) {
      writeDraft(profileDraftKey(user._id), values);
    }
  }

  useEffect(() => {
    if (user?.profileComplete) {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    // Once signed in, the pending verification is over.
    if (isAuthenticated) {
      clearDraft(VERIFY_EMAIL_KEY);
    }
  }, [isAuthenticated]);

  const waitingForUser = isAuthenticated && user === undefined;
  const step = isAuthenticated && user && !user.profileComplete ? 2 : 1;

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = new FormData(event.currentTarget);
    const agreedToTerms = payload.has("agreedToTerms");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions.");
      return;
    }

    setSubmitting(true);
    payload.set("flow", "signUp");
    payload.set("agreedToTerms", String(agreedToTerms));
    payload.set(
      "wantsNotifications",
      String(payload.has("wantsNotifications")),
    );
    payload.delete("confirmPassword");

    try {
      await signIn("password", payload);
      const email = String(payload.get("email") ?? "").trim();
      setVerificationEmail(email);
      writeDraft(VERIFY_EMAIL_KEY, email);
      setPendingPassword(password);
      setCodeSentMessage("A verification code was sent to your email.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not create account."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCodeSentMessage("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    form.set("flow", "email-verification");
    form.set("email", verificationEmail);
    try {
      await signIn("password", form);
      setPendingPassword("");
      clearDraft(VERIFY_EMAIL_KEY);
    } catch (caught) {
      setError(errorMessage(caught, "Could not verify this email."));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Sending a new code means signing in again, which needs the password. It
   * is only kept in memory, so after a refresh we ask for it.
   */
  async function resendVerificationCode(passwordForResend = pendingPassword) {
    if (!passwordForResend) {
      setAskPasswordToResend(true);
      return;
    }
    setError("");
    setCodeSentMessage("");
    setSubmitting(true);
    const form = new FormData();
    form.set("flow", "signIn");
    form.set("email", verificationEmail);
    form.set("password", passwordForResend);
    try {
      await signIn("password", form);
      setPendingPassword(passwordForResend);
      setAskPasswordToResend(false);
      setCodeSentMessage("A new verification code was sent.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not resend the verification code."));
    } finally {
      setSubmitting(false);
    }
  }

  function startWithDifferentEmail() {
    clearDraft(VERIFY_EMAIL_KEY);
    setVerificationEmail("");
    setPendingPassword("");
    setAskPasswordToResend(false);
    setCodeSentMessage("");
    setError("");
  }

  async function handlePersonalInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = toProfileInput(profileValues);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSubmitting(true);
    try {
      await completeProfile(result.input);
      if (user) {
        clearDraft(profileDraftKey(user._id));
      }
      router.replace("/");
    } catch (caught) {
      setError(errorMessage(caught, "Could not save your information."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={sectionStyles.page}>
      <main>
        <Section innerClassName={styles.head}>
          <div>
            <h1>Register.</h1>
            <p>
              {step === 1
                ? "Create your account to join ASRC 2027."
                : "Tell us about yourself to complete registration."}
            </p>
          </div>
        </Section>
        <Section ring={{ color: "green", side: "left", level: "low" }}>
          <div className={styles.inner}>
          <ol className={styles.steps} aria-label="Registration steps">
            <li className={step === 1 ? styles.active : styles.done}>
              <span>1</span>
              Create account
            </li>
            <li className={step === 2 ? styles.active : undefined}>
              <span>2</span>
              Personal information
            </li>
          </ol>

          {isLoading || waitingForUser || user?.profileComplete ? (
            <LoadingScreen
              variant="inline"
              what={user?.profileComplete ? "your dashboard" : "your account"}
            />
          ) : step === 1 && verificationEmail ? (
            <form
              className={styles.otpForm}
              onSubmit={handleEmailVerification}
            >
              <section className={`${styles.card} ${styles.otpCard}`}>
                <div className={styles.otpIcon} aria-hidden="true">
                  <i className="bx bx-envelope" />
                </div>
                <div className={styles.otpHeading}>
                  <h2>Verify your email</h2>
                  <p>
                    Enter the 8-digit code sent to{" "}
                    <strong>{verificationEmail}</strong>.
                  </p>
                </div>
                {codeSentMessage ? (
                  <p className={styles.otpNotice} aria-live="polite">
                    <i className="bx bx-check-circle" aria-hidden="true" />
                    {codeSentMessage}
                  </p>
                ) : null}
                <div className={styles.otpField}>
                  <FormField
                    label="Verification code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    minLength={8}
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="00000000"
                    aria-describedby="verification-code-hint"
                    required
                  />
                  <p id="verification-code-hint">
                    The code expires after 15 minutes.
                  </p>
                </div>
                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}
                <div className={styles.otpActions}>
                  <Button
                    className="primary"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Please wait…" : "Verify email"}
                  </Button>
                  <Button
                    type="button"
                    className="secondary"
                    disabled={submitting}
                    onClick={() => void resendVerificationCode()}
                  >
                    Resend code
                  </Button>
                </div>
                {askPasswordToResend ? (
                  <div className={styles.resendPassword}>
                    <FormField
                      id="resend-password"
                      label="Password"
                      name="resendPassword"
                      type="password"
                      autoComplete="current-password"
                      hint="Enter the password you chose so we can send a new code."
                      minLength={MIN_PASSWORD_LENGTH}
                    />
                    <Button
                      type="button"
                      className="secondary"
                      disabled={submitting}
                      onClick={(event) => {
                        const input = event.currentTarget.form?.elements.namedItem(
                          "resendPassword",
                        ) as HTMLInputElement | null;
                        void resendVerificationCode(input?.value ?? "");
                      }}
                    >
                      Send new code
                    </Button>
                  </div>
                ) : null}
                <p className={styles.otpHelp}>
                  Check your spam folder if you don&apos;t see the email.{" "}
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={startWithDifferentEmail}
                  >
                    Use a different email
                  </button>
                </p>
              </section>
            </form>
          ) : step === 1 ? (
            <form className={styles.stepOne} onSubmit={handleCreateAccount}>
              <section className={styles.card}>
                <h2>Account information</h2>
                <div className={styles.stack}>
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
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <FormField
                    label="Confirm password"
                    name="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    errorMessage={
                      passwordMismatch ? "Passwords do not match." : undefined
                    }
                    aria-invalid={passwordMismatch}
                    required
                  />
                  <CheckboxField
                    id="show-passwords"
                    label="Show passwords"
                    checked={showPasswords}
                    onChange={(event) => setShowPasswords(event.target.checked)}
                  />
                </div>
              </section>

              <section className={`${styles.card} ${styles.consent}`}>
                <CheckboxField
                  name="agreedToTerms"
                  required
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/terms-conditions">terms and conditions</Link>{" "}
                      and the collection and storage of my personal
                      information as described in the{" "}
                      <Link href="/privacy">privacy policy</Link>.
                    </>
                  }
                />
                <CheckboxField
                  name="wantsNotifications"
                  label="I want to receive notification regarding this conference via email."
                />
                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}
                <Button className="primary" type="submit" disabled={submitting}>
                  {submitting ? "Please wait…" : "Create account"}
                </Button>
                <p className={styles.signIn}>
                  Already have an account? <Link href="/login">Sign in</Link>
                </p>
              </section>
            </form>
          ) : (
            <form onSubmit={handlePersonalInformation}>
              <section className={styles.card}>
                <h2>Personal information</h2>
                {user?.email ? (
                  <p className={styles.signedInAs}>Signed in as {user.email}</p>
                ) : null}
                <ProfileFields
                  idPrefix="register"
                  values={profileValues}
                  onChange={updateProfileDraft}
                  legacyAffiliation={
                    [user?.department, user?.institution]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                />
                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}
                <div className={styles.actions}>
                  <Button
                    className="primary"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Please wait…" : "Complete registration"}
                  </Button>
                </div>
              </section>
            </form>
          )}
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
