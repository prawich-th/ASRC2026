"use client";

import Button from "@/components/form/button";
import { CheckboxField, FormField, SelectField } from "@/components/form/Form";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  MEDICAL_STUDENT_INSTITUTIONS,
  MEDICAL_STUDENT_YEARS,
  OTHER_INSTITUTION,
  PARTICIPANT_CATEGORIES,
  PREFIXES,
} from "@/lib/formOptions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./register.module.scss";

function optionalValue(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value.length > 0 ? value : undefined;
}

export default function RegisterPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const completeProfile = useMutation(api.users.completeProfile);
  const router = useRouter();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [codeSentMessage, setCodeSentMessage] = useState("");
  const [participantCategory, setParticipantCategory] = useState("");
  const [medicalStudentInstitution, setMedicalStudentInstitution] =
    useState("");

  const isMedicalStudent = participantCategory === "Medical Student";

  useEffect(() => {
    if (user?.profileComplete) {
      router.replace("/");
    }
  }, [user, router]);

  const waitingForUser = isAuthenticated && user === undefined;
  const step = isAuthenticated && user && !user.profileComplete ? 2 : 1;

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const payload = new FormData(form);
    const password = String(payload.get("password") ?? "");
    const confirmPassword = String(payload.get("confirmPassword") ?? "");
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
      setVerificationEmail(String(payload.get("email") ?? "").trim());
      setPendingPassword(password);
      setCodeSentMessage("A verification code was sent to your email.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create account",
      );
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
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not verify this email",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerificationCode() {
    setError("");
    setCodeSentMessage("");
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
        caught instanceof Error
          ? caught.message
          : "Could not resend the verification code",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePersonalInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const selectedParticipantCategory = String(
      form.get("participantCategory"),
    ) as (typeof PARTICIPANT_CATEGORIES)[number];
    const selectedInstitution = String(form.get("institution") ?? "").trim();
    const institution =
      selectedParticipantCategory === "Medical Student" &&
      selectedInstitution === OTHER_INSTITUTION
        ? String(form.get("otherInstitution") ?? "").trim()
        : selectedInstitution;

    try {
      await completeProfile({
        prefix: String(form.get("prefix")) as (typeof PREFIXES)[number],
        firstName: String(form.get("firstName") ?? "").trim(),
        otherName: optionalValue(form, "otherName"),
        lastName: String(form.get("lastName") ?? "").trim(),
        suffix: optionalValue(form, "suffix"),
        specialty: optionalValue(form, "specialty"),
        phone: String(form.get("phone") ?? "").trim(),
        institution,
        position: optionalValue(form, "position"),
        department: optionalValue(form, "department"),
        participantCategory: selectedParticipantCategory,
        city: optionalValue(form, "city"),
      });
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your information",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>Register.</h1>
          <p>
            {step === 1
              ? "Create your account to join ASRC 2027."
              : "Tell us about yourself to complete registration."}
          </p>
        </div>
      </div>
      <main className={styles.main}>
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
                    disabled={submitting || !pendingPassword}
                    onClick={() => void resendVerificationCode()}
                  >
                    Resend code
                  </Button>
                </div>
                <p className={styles.otpHelp}>
                  Check your spam folder if you don&apos;t see the email.
                </p>
              </section>
            </form>
          ) : step === 1 ? (
            <form className={styles.stepOne} onSubmit={handleCreateAccount}>
              <section className={styles.card}>
                <h2>Account Information</h2>
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
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <FormField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </section>

              <section className={`${styles.card} ${styles.consent}`}>
                <CheckboxField
                  name="agreedToTerms"
                  required
                  label={
                    <>
                      I agree to the collection and storage of my personal
                      information,{" "}
                      <Link href="/terms-conditions">terms and conditions</Link>
                      .
                    </>
                  }
                />
                <CheckboxField
                  name="wantsNotifications"
                  label="I want to receive notification regarding this conference via email."
                />
                {error ? <p className={styles.error}>{error}</p> : null}
                <Button className="primary" type="submit" disabled={submitting}>
                  {submitting ? "Please wait…" : "Register Now"}
                </Button>
                <p className={styles.signIn}>
                  Already have an account? <Link href="/login">Sign in</Link>
                </p>
              </section>
            </form>
          ) : (
            <form onSubmit={handlePersonalInformation}>
              <section className={styles.card}>
                <h2>Personal Information</h2>
                {user?.email ? (
                  <p className={styles.signedInAs}>Signed in as {user.email}</p>
                ) : null}
                <div className={styles.personalGrid}>
                  <SelectField
                    className={styles.field}
                    label="Prefix"
                    name="prefix"
                    defaultValue=""
                    required
                    placeholder="Select"
                    options={PREFIXES.map((value) => ({ value, label: value }))}
                  />
                  <FormField
                    className={styles.field}
                    label="First Name"
                    name="firstName"
                    type="text"
                    required
                  />
                  <FormField
                    className={styles.field}
                    label="Other Name"
                    name="otherName"
                    type="text"
                  />
                  <FormField
                    className={styles.field}
                    label="Last Name"
                    name="lastName"
                    type="text"
                    required
                  />
                  <FormField
                    className={styles.field}
                    label="Suffix"
                    name="suffix"
                    type="text"
                  />
                  <FormField
                    className={styles.field}
                    label="Specialty"
                    name="specialty"
                    type="text"
                  />
                  <FormField
                    className={styles.field}
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                  <SelectField
                    className={styles.field}
                    label="Participant Category"
                    name="participantCategory"
                    defaultValue=""
                    required
                    placeholder="Select"
                    onChange={(event) => {
                      setParticipantCategory(event.target.value);
                      setMedicalStudentInstitution("");
                    }}
                    options={PARTICIPANT_CATEGORIES.map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                  {isMedicalStudent ? (
                    <div
                      className={`${styles.field} ${styles.institutionField} ${styles.medicalInstitutionField}`}
                    >
                      <SelectField
                        label="Institution"
                        name="institution"
                        defaultValue=""
                        required
                        placeholder="Select"
                        options={[
                          ...MEDICAL_STUDENT_INSTITUTIONS.map((value) => ({
                            value,
                            label: value,
                          })),
                          {
                            value: OTHER_INSTITUTION,
                            label: OTHER_INSTITUTION,
                          },
                        ]}
                        onChange={(event) =>
                          setMedicalStudentInstitution(event.target.value)
                        }
                      />
                      {medicalStudentInstitution === OTHER_INSTITUTION ? (
                        <FormField
                          label="Other Institution"
                          name="otherInstitution"
                          type="text"
                          required
                        />
                      ) : null}
                    </div>
                  ) : (
                    <FormField
                      className={`${styles.field} ${styles.institutionField}`}
                      label="Institution"
                      name="institution"
                      type="text"
                      required
                    />
                  )}
                  {isMedicalStudent ? (
                    <SelectField
                      className={styles.field}
                      label="Year"
                      name="position"
                      defaultValue=""
                      required
                      placeholder="Select"
                      options={MEDICAL_STUDENT_YEARS.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  ) : (
                    <FormField
                      className={styles.field}
                      label="Position"
                      name="position"
                      type="text"
                    />
                  )}
                  <FormField
                    className={styles.field}
                    label={isMedicalStudent ? "Program" : "Department"}
                    name="department"
                    type="text"
                  />
                  <FormField
                    className={styles.field}
                    label="City"
                    name="city"
                    type="text"
                  />
                </div>
                {error ? <p className={styles.error}>{error}</p> : null}
                <div className={styles.actions}>
                  <Button
                    className="primary"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Please wait…" : "Complete Registration"}
                  </Button>
                </div>
              </section>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
