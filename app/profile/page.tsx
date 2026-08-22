"use client";

import Button from "@/components/form/button";
import { FormField, SelectField } from "@/components/form/Form";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import LoadingScreen from "@/components/layout/loading-screen";
import { api } from "@/convex/_generated/api";
import {
  getAbstractStatusLabel,
  getAbstractStatusTone,
  getCategoryLabel,
} from "@/lib/abstractDisplay";
import { PREFIXES } from "@/lib/formOptions";
import { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  institution: string;
  department: string;
  position: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const abstracts = useQuery(api.abstracts.listMine);
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

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
      institution: user.institution ?? "",
      department: user.department ?? "",
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
      formValues.institution.trim().length > 0
    );
  }, [formValues]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!formValues) {
      setError("Profile data is unavailable. Please refresh this page.");
      return;
    }
    if (!formReady) {
      setError(
        "Please complete prefix, first name, last name, and institution.",
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
        institution: formValues.institution,
        department: formValues.department.trim()
          ? formValues.department
          : undefined,
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

  if (
    isLoading ||
    !isAuthenticated ||
    user === undefined ||
    user === null ||
    abstracts === undefined ||
    !formValues
  ) {
    return <LoadingScreen what={["your profile", "your abstracts"]} />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1>My Account.</h1>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.inner}>
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
                  <FormField
                    label="Institution"
                    className={styles.fullWidth}
                    value={formValues.institution}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...(current ?? formValues),
                        institution: event.target.value,
                      }))
                    }
                  />
                  <FormField
                    label="Department / Program"
                    value={formValues.department}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...(current ?? formValues),
                        department: event.target.value,
                      }))
                    }
                  />
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

          <section className={styles.card}>
            <div className={styles.listHeader}>
              <h2>My Abstract(s)</h2>
              <Link href="/abstracts/submit">
                <Button className="primary" type="button">
                  Submit New
                </Button>
              </Link>
            </div>

            {abstracts.length === 0 ? (
              <p className={styles.emptyState}>
                You have not created any abstracts yet.
              </p>
            ) : (
              <ul className={styles.abstractList}>
                {abstracts.map((abstract) => {
                  const tone = getAbstractStatusTone(abstract.status);
                  return (
                    <li key={abstract._id} className={styles.abstractItem}>
                      <div className={`${styles.status} ${styles[tone]}`}>
                        {getAbstractStatusLabel(abstract.status)}
                      </div>
                      <div className={styles.content}>
                        <span className={styles.category}>
                          {getCategoryLabel(abstract.category)}
                        </span>
                        <h3>{abstract.title}</h3>
                      </div>
                      <Link
                        href={`/abstracts/${abstract._id}`}
                        className={styles.chevron}
                      >
                        <i className="bx bx-chevron-right" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
