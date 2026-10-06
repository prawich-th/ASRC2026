"use client";

import styles from "@/components/admin/admin.module.scss";
import ProfileForm, {
  ProfileFormValues,
  profileValuesFromUser,
  toProfileInput,
} from "@/components/admin/profile-form";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getRoleLabel } from "@/lib/adminRoles";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    const match = caught.message.match(/Uncaught Error: (.*?)(?:\n|$)/);
    return match?.[1] ?? caught.message;
  }
  return fallback;
}

function formatDate(value?: number) {
  return value
    ? new Date(value).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const userId = id as Id<"users">;
  const user = useQuery(api.adminUsers.getById, { userId });
  const updateProfile = useMutation(api.adminUsers.updateProfile);
  const [wantsNotifications, setWantsNotifications] = useState<boolean>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (user === undefined) {
    return <LoadingScreen variant="inline" what="user" />;
  }
  if (user === null) {
    return (
      <section className={styles.card}>
        <p className={styles.empty}>User not found.</p>
        <Link href="/admin/users">Back to users</Link>
      </section>
    );
  }

  const notifications = wantsNotifications ?? user.wantsNotifications ?? false;

  async function save(values: ProfileFormValues) {
    setError("");
    setNotice("");
    const result = toProfileInput(values);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        userId,
        profile: result.input,
        wantsNotifications: notifications,
      });
      setNotice("Profile saved.");
    } catch (caught) {
      setError(errorMessage(caught, "Could not save the profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.stack}>
      <p className={styles.backLink}>
        <Link href="/admin/users">← Back to users</Link>
      </p>
      <section className={`${styles.card} ${styles.stack}`}>
        <div className={styles.header}>
          <div>
            <h1>{user.name || user.email || "Unnamed user"}</h1>
            <p>Edit this participant&apos;s profile on their behalf.</p>
          </div>
        </div>
        <dl className={styles.meta}>
          <div>
            <dt>Email</dt>
            <dd>{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{getRoleLabel(user.role)}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>
              {user.preRegisteredAt && !user.claimedAt
                ? "Pre-registered, awaiting signup"
                : `Registered ${formatDate(user.claimedAt ?? user._creationTime)}`}
            </dd>
          </div>
          <div>
            <dt>Profile</dt>
            <dd>{user.profileComplete ? "Complete" : "Incomplete"}</dd>
          </div>
        </dl>
        <p className={styles.helperText}>
          The email address is the sign-in identity and cannot be changed here.
          Saving marks the profile complete.
        </p>
        <ProfileForm
          key={user._id}
          idPrefix="edit-user"
          initialValues={profileValuesFromUser(user)}
          submitting={saving}
          submitLabel="Save profile"
          onSubmit={(values) => void save(values)}
        >
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(event) => setWantsNotifications(event.target.checked)}
            />
            Receives conference updates by email
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          {notice ? <p className={styles.success}>{notice}</p> : null}
        </ProfileForm>
      </section>
    </div>
  );
}
