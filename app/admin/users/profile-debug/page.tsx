"use client";

import styles from "@/components/admin/admin.module.scss";
import ProfileForm, {
  EMPTY_PROFILE,
  ProfileFormValues,
  profileValuesFromUser,
  toProfileInput,
} from "@/components/admin/profile-form";
import Button from "@/components/form/button";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useConvex, useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type Preview = FunctionReturnType<typeof api.adminUsers.previewProfile>;

export default function ProfileDebugPage() {
  return (
    <Suspense fallback={<LoadingScreen variant="inline" what="debugger" />}>
      <ProfileDebugger />
    </Suspense>
  );
}

function ProfileDebugger() {
  const convex = useConvex();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUser = searchParams.get("user") ?? "";
  const targetId = /^[0-9a-z]{20,40}$/.test(requestedUser)
    ? (requestedUser as Id<"users">)
    : undefined;
  const me = useQuery(api.users.me);
  const target = useQuery(
    api.adminUsers.getById,
    targetId ? { userId: targetId } : "skip",
  );
  const restart = useMutation(api.adminUsers.restartOwnRegistration);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [formError, setFormError] = useState("");
  const [running, setRunning] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const subject = targetId ? target : me;
  if (subject === undefined) {
    return <LoadingScreen variant="inline" what="debugger" />;
  }

  async function run(values: ProfileFormValues) {
    setFormError("");
    setPreview(null);
    const result = toProfileInput(values);
    if ("error" in result) {
      setFormError(`Blocked in the browser: ${result.error}`);
      return;
    }
    setRunning(true);
    try {
      setPreview(
        await convex.query(api.adminUsers.previewProfile, {
          userId: targetId,
          profile: result.input,
        }),
      );
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "The dry run failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  async function restartRegistration() {
    if (
      !window.confirm(
        "Mark your own profile incomplete and open the registration form? Your current details are kept until you submit again.",
      )
    ) {
      return;
    }
    setRestarting(true);
    try {
      await restart();
      router.push("/register");
    } finally {
      setRestarting(false);
    }
  }

  const changed = preview?.changes.filter(
    (change) => change.before !== change.after,
  );

  return (
    <div className={styles.stack}>
      <p className={styles.backLink}>
        <Link href="/admin/users">← Back to users</Link>
      </p>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h1>Profile creation debugger</h1>
            <p>
              Test the registration profile step without saving anything. The
              dry run applies exactly the same validation and derived fields
              (display name, affiliation, search text) as a participant
              completing their profile.
            </p>
          </div>
        </div>
        <p className={styles.helperText}>
          Running against:{" "}
          <strong>
            {subject
              ? subject.name || subject.email || "Unnamed user"
              : "Unknown user"}
          </strong>
          {targetId ? (
            <>
              {" "}
              · <Link href="/admin/users/profile-debug">use my account</Link>
            </>
          ) : (
            " (your account). Open a user from the users list and choose “Test profile” to dry-run against them."
          )}
        </p>
        <ProfileForm
          key={subject?._id ?? "none"}
          idPrefix="debug-profile"
          initialValues={
            subject ? profileValuesFromUser(subject) : EMPTY_PROFILE
          }
          submitting={running}
          submitLabel="Dry run"
          onSubmit={(values) => void run(values)}
        />
        {formError ? <p className={styles.error}>{formError}</p> : null}
        {preview?.error ? (
          <div className={styles.importErrors}>
            <strong>A participant would see this error:</strong>
            <p>{preview.error}</p>
          </div>
        ) : null}
        {preview && !preview.error ? (
          <>
            <p className={styles.success}>
              Valid. Saving would change {changed?.length ?? 0} field
              {changed?.length === 1 ? "" : "s"}.
            </p>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.previewTable}`}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Current value</th>
                    <th>After saving</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.map((change) => (
                    <tr key={change.field}>
                      <td>
                        <code>{change.field}</code>
                      </td>
                      <td>{change.before ?? "—"}</td>
                      <td>
                        {change.before === change.after ? (
                          <span className={styles.cellMeta}>unchanged</span>
                        ) : (
                          <strong>{change.after ?? "—"}</strong>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className={`${styles.card} ${styles.stack}`}>
        <h2>Walk through the real flow</h2>
        <p className={styles.helperText}>
          Restart your own registration to see the profile step exactly as a new
          participant does. To test the full sign-up with email verification,
          register with an address alias you can receive, such as{" "}
          <code>yourname+test1@gmail.com</code>; each alias becomes a separate
          account.
        </p>
        <div className={styles.actions}>
          <Button
            type="button"
            disabled={restarting}
            onClick={() => void restartRegistration()}
          >
            {restarting ? "Opening…" : "Restart my registration"}
          </Button>
          <Link href="/admin/users?profile=incomplete">
            Users with incomplete profiles
          </Link>
        </div>
      </section>
    </div>
  );
}
