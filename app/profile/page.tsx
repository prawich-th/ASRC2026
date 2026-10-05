"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import { FormField, SelectField } from "@/components/form/Form";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import { PREFIXES } from "@/lib/formOptions";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import styles from "./profile.module.scss";

const prefixOptions = PREFIXES.map((prefix) => ({
  value: prefix,
  label: prefix,
}));

type ProfileDraft = {
  prefix: (typeof PREFIXES)[number];
  firstName: string;
  otherName: string;
  lastName: string;
  suffix: string;
  affiliationId?: Id<"affiliations">;
  position: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const user = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateProfileImageUploadUrl = useMutation(
    api.users.generateProfileImageUploadUrl,
  );
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const removeProfileImage = useMutation(api.users.removeProfileImage);

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileSnapshot = useMemo<ProfileDraft | null>(() => {
    if (!user) {
      return null;
    }
    return {
      prefix: user.prefix ?? PREFIXES[0],
      firstName: user.firstName ?? "",
      otherName: user.otherName ?? "",
      lastName: user.lastName ?? "",
      suffix: user.suffix ?? "",
      affiliationId: user.affiliationId,
      position: user.position ?? "",
    };
  }, [user]);

  const formValues = draft ?? profileSnapshot;

  const formReady = useMemo(() => {
    if (!formValues) {
      return false;
    }
    return (
      formValues.firstName.trim().length > 0 &&
      formValues.lastName.trim().length > 0 &&
      formValues.affiliationId !== undefined
    );
  }, [formValues]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!formValues) {
      setError("Profile data is unavailable. Please refresh this page.");
      return;
    }
    if (!formReady || !formValues.affiliationId) {
      setError(
        "Please complete prefix, first name, last name, and affiliation.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        prefix: formValues.prefix,
        firstName: formValues.firstName,
        otherName: formValues.otherName.trim()
          ? formValues.otherName
          : undefined,
        lastName: formValues.lastName,
        suffix: formValues.suffix.trim() ? formValues.suffix : undefined,
        affiliationId: formValues.affiliationId,
        position: formValues.position.trim() ? formValues.position : undefined,
      });
      setDraft(null);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update profile.",
      );
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

    if (file.size > 5 * 1024 * 1024) {
      setError("Please upload an image smaller than 5MB.");
      return;
    }

    setImageUploading(true);
    try {
      const uploadUrl = await generateProfileImageUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("Could not upload image.");
      }

      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };
      await updateProfileImage({ storageId });
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update profile image.",
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function handleRemoveProfileImage() {
    setError("");
    setImageUploading(true);
    try {
      await removeProfileImage();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove profile image.",
      );
    } finally {
      setImageUploading(false);
    }
  }

  if (!user || !formValues) {
    return <LoadingScreen variant="inline" what="your profile" />;
  }

  return (
    <div className={styles.inner}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Profile</h1>
          <p>
            Keep your name and affiliation up to date for certificates and the
            programme.
          </p>
        </div>
      </div>
      <section className={styles.card}>
        <h2>Personal Information</h2>
        <form className={styles.profileForm} onSubmit={handleSave}>
          <div className={styles.avatarColumn}>
            {user.image ? (
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
                className="action"
                type="button"
                disabled={imageUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUploading ? "Uploading..." : "Upload Photo"}
              </Button>
              {user.profileImageId ? (
                <Button
                  className="destructive"
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
            <div className={styles.grid}>
              <SelectField
                label="Prefix"
                options={prefixOptions}
                value={formValues.prefix}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    prefix: event.target.value as (typeof PREFIXES)[number],
                  }))
                }
              />
              <FormField
                label="First Name"
                value={formValues.firstName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    firstName: event.target.value,
                  }))
                }
              />
              <FormField
                label="Last Name"
                value={formValues.lastName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    lastName: event.target.value,
                  }))
                }
              />
              <FormField
                label="Other Name"
                value={formValues.otherName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    otherName: event.target.value,
                  }))
                }
              />
              <FormField
                label="Suffix"
                value={formValues.suffix}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    suffix: event.target.value,
                  }))
                }
              />
              <div className={styles.fullWidth}>
                <AffiliationPicker
                  label="Affiliation"
                  value={formValues.affiliationId}
                  onChange={(affiliationId) =>
                    setDraft((current) => ({
                      ...(current ?? formValues),
                      affiliationId,
                    }))
                  }
                />
                {!formValues.affiliationId && user.institution ? (
                  <p className={styles.legacyHint}>
                    You previously entered “
                    {[user.department, user.institution]
                      .filter(Boolean)
                      .join(", ")}
                    ”. Please select it from the list, or add it if it is
                    missing.
                  </p>
                ) : null}
              </div>
              <FormField
                label="Position"
                value={formValues.position}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...(current ?? formValues),
                    position: event.target.value,
                  }))
                }
              />
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <Button className="green" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
