"use client";

import Button from "@/components/form/button";
import { CheckboxField, FormField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import InvitationLetter from "@/components/profile/invitation-letter";
import ProfileFields from "@/components/profile/profile-fields";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errorMessage";
import { MIN_PASSWORD_LENGTH } from "@/lib/formOptions";
import {
  ProfileFormValues,
  profileValuesEqual,
  profileValuesFromUser,
  toProfileInput,
} from "@/lib/profileForm";
import { useAction, useMutation, useQuery } from "convex/react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import styles from "./profile.module.scss";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ProfilePage() {
  const user = useQuery(api.users.me);

  if (!user) {
    return <LoadingScreen variant="inline" what="your profile" />;
  }

  return (
    <div className={styles.inner}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Profile</h1>
          <p>
            Keep your details up to date for certificates and the programme.
          </p>
        </div>
      </div>
      <PersonalInformation user={user} />
      <EmailPreferences user={user} />
      <AccountSecurity email={user.email} />

      {/* Letters are not issued yet; pass the uploaded file's URL here. */}
      <InvitationLetter />
    </div>
  );
}

function PersonalInformation({ user }: { user: Doc<"users"> }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const generateProfileImageUploadUrl = useMutation(
    api.users.generateProfileImageUploadUrl,
  );
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const removeProfileImage = useMutation(api.users.removeProfileImage);

  const [draft, setDraft] = useState<ProfileFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedValues = profileValuesFromUser(user);
  const values = draft ?? savedValues;
  const dirty = draft !== null && !profileValuesEqual(draft, savedValues);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(next: ProfileFormValues) {
    setDraft(next);
    setSaved(false);
  }

  function discard() {
    setDraft(null);
    setError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const result = toProfileInput(values);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSaving(true);
    try {
      await updateProfile(result.input);
      setDraft(null);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught, "Could not update profile."));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setError("");
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Please upload an image smaller than 5MB.");
      return;
    }

    setImageUploading(true);
    try {
      const uploadUrl = await generateProfileImageUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResult.ok) {
        throw new Error("Could not upload image.");
      }
      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };
      await updateProfileImage({ storageId });
    } catch (caught) {
      setError(errorMessage(caught, "Could not update profile image."));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleRemoveProfileImage() {
    setError("");
    setImageUploading(true);
    try {
      await removeProfileImage();
    } catch (caught) {
      setError(errorMessage(caught, "Could not remove profile image."));
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Personal information</h2>
      <form className={styles.profileForm} onSubmit={handleSave}>
        <div className={styles.avatarColumn}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Convex storage URL
            <img
              src={user.image}
              alt={`${user.firstName ?? "User"} profile`}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <i className="bx bx-user" aria-hidden="true" />
            </div>
          )}
          <input
            ref={fileInputRef}
            className={styles.hiddenFileInput}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
          />
          <div className={styles.avatarActions}>
            <Button
              className="secondary"
              type="button"
              disabled={imageUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUploading ? "Uploading…" : "Upload photo"}
            </Button>
            {user.profileImageId ? (
              <Button
                className="dangerText"
                type="button"
                disabled={imageUploading}
                onClick={() => void handleRemoveProfileImage()}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.fieldsColumn}>
          <ProfileFields
            idPrefix="profile"
            values={values}
            onChange={edit}
            legacyAffiliation={
              [user.department, user.institution].filter(Boolean).join(", ") ||
              undefined
            }
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            {saved && !dirty ? (
              <p className={styles.success} role="status">
                <i className="bx bx-check-circle" aria-hidden="true" />
                Saved
              </p>
            ) : null}
            {dirty ? (
              <Button
                className="text"
                type="button"
                disabled={saving}
                onClick={discard}
              >
                Discard changes
              </Button>
            ) : null}
            <Button className="green" disabled={saving || !dirty} type="submit">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function EmailPreferences({ user }: { user: Doc<"users"> }) {
  const updateNotificationPreference = useMutation(
    api.users.updateNotificationPreference,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle(wantsNotifications: boolean) {
    setError("");
    setSaving(true);
    try {
      await updateNotificationPreference({ wantsNotifications });
    } catch (caught) {
      setError(errorMessage(caught, "Could not update your preference."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Email preferences</h2>
      <div className={styles.stack}>
        <CheckboxField
          id="wants-notifications"
          label="Send me conference announcements and updates by email."
          hint="Emails about your account and your abstracts are always sent."
          checked={user.wantsNotifications ?? false}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AccountSecurity({ email }: { email?: string }) {
  const changePassword = useAction(api.users.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught, "Could not change your password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Account security</h2>
      <form className={styles.securityForm} onSubmit={handleSubmit}>
        <FormField
          id="account-email"
          label="Email"
          type="email"
          value={email ?? ""}
          hint="Contact the organisers to change the email on your account."
          readOnly
          disabled
        />
        <FormField
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <FormField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Other devices will be signed out.`}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <FormField
          id="confirm-new-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          value={confirmPassword}
          errorMessage={mismatch ? "Passwords do not match." : undefined}
          aria-invalid={mismatch}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {error ? (
          <p className={`${styles.error} ${styles.fullRow}`} role="alert">
            {error}
          </p>
        ) : null}
        <div className={`${styles.actions} ${styles.fullRow}`}>
          {saved ? (
            <p className={styles.success} role="status">
              <i className="bx bx-check-circle" aria-hidden="true" />
              Password changed
            </p>
          ) : null}
          <Button className="green" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
