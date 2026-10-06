"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MEDICAL_STUDENT_YEARS,
  PARTICIPANT_CATEGORIES,
  PREFIXES,
} from "@/lib/formOptions";
import { FormEvent, ReactNode, useState } from "react";
import styles from "./admin.module.scss";

export type ProfileFormValues = {
  prefix: string;
  firstName: string;
  otherName: string;
  lastName: string;
  suffix: string;
  specialty: string;
  phone: string;
  affiliationId?: Id<"affiliations">;
  position: string;
  participantCategory: string;
  city: string;
};

export type ProfileInputArgs = {
  prefix: (typeof PREFIXES)[number];
  firstName: string;
  otherName?: string;
  lastName: string;
  suffix?: string;
  specialty?: string;
  phone: string;
  affiliationId: Id<"affiliations">;
  position?: string;
  participantCategory: (typeof PARTICIPANT_CATEGORIES)[number];
  city?: string;
};

export const EMPTY_PROFILE: ProfileFormValues = {
  prefix: "",
  firstName: "",
  otherName: "",
  lastName: "",
  suffix: "",
  specialty: "",
  phone: "",
  position: "",
  participantCategory: "",
  city: "",
};

export function profileValuesFromUser(user: Doc<"users">): ProfileFormValues {
  return {
    prefix: user.prefix ?? "",
    firstName: user.firstName ?? "",
    otherName: user.otherName ?? "",
    lastName: user.lastName ?? "",
    suffix: user.suffix ?? "",
    specialty: user.specialty ?? "",
    phone: user.phone ?? "",
    affiliationId: user.affiliationId,
    position: user.position ?? "",
    participantCategory: user.participantCategory ?? "",
    city: user.city ?? "",
  };
}

/** Converts form values to mutation args, or explains what is missing. */
export function toProfileInput(
  values: ProfileFormValues,
): { input: ProfileInputArgs } | { error: string } {
  if (!(PREFIXES as readonly string[]).includes(values.prefix)) {
    return { error: "Choose a prefix." };
  }
  if (
    !(PARTICIPANT_CATEGORIES as readonly string[]).includes(
      values.participantCategory,
    )
  ) {
    return { error: "Choose a participant category." };
  }
  if (!values.affiliationId) {
    return { error: "Choose an affiliation." };
  }
  return {
    input: {
      prefix: values.prefix as ProfileInputArgs["prefix"],
      firstName: values.firstName,
      otherName: values.otherName || undefined,
      lastName: values.lastName,
      suffix: values.suffix || undefined,
      specialty: values.specialty || undefined,
      phone: values.phone,
      affiliationId: values.affiliationId,
      position: values.position || undefined,
      participantCategory:
        values.participantCategory as ProfileInputArgs["participantCategory"],
      city: values.city || undefined,
    },
  };
}

/**
 * The registration profile fields, laid out for the admin dashboard. Used to
 * edit a participant's profile and by the profile debugger.
 */
export default function ProfileForm({
  initialValues = EMPTY_PROFILE,
  onSubmit,
  submitting,
  submitLabel,
  idPrefix,
  children,
}: {
  initialValues?: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => void;
  submitting: boolean;
  submitLabel: string;
  idPrefix: string;
  /** Extra controls rendered above the submit button. */
  children?: ReactNode;
}) {
  const [values, setValues] = useState(initialValues);
  const isMedicalStudent = values.participantCategory === "Medical Student";

  function set<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  function text(
    key: Exclude<keyof ProfileFormValues, "affiliationId">,
    label: string,
    options: { required?: boolean; type?: string } = {},
  ) {
    return (
      <label>
        {label}
        {options.required ? " *" : ""}
        <input
          id={`${idPrefix}-${key}`}
          className={styles.field}
          type={options.type ?? "text"}
          required={options.required}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <form className={styles.stack} onSubmit={submit}>
      <div className={styles.formGrid}>
        <label>
          Prefix *
          <select
            className={styles.select}
            required
            value={values.prefix}
            onChange={(event) => set("prefix", event.target.value)}
          >
            <option value="" disabled>
              Select
            </option>
            {PREFIXES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {text("firstName", "First name", { required: true })}
        {text("otherName", "Other name")}
        {text("lastName", "Last name", { required: true })}
        {text("suffix", "Suffix")}
        {text("specialty", "Specialty")}
        {text("phone", "Phone number", { required: true, type: "tel" })}
        <label>
          Participant category *
          <select
            className={styles.select}
            required
            value={values.participantCategory}
            onChange={(event) => set("participantCategory", event.target.value)}
          >
            <option value="" disabled>
              Select
            </option>
            {PARTICIPANT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.full}>
          <AffiliationPicker
            label="Affiliation *"
            value={values.affiliationId}
            onChange={(affiliationId) => set("affiliationId", affiliationId)}
          />
        </div>
        {isMedicalStudent ? (
          <label>
            Year
            <select
              className={styles.select}
              value={values.position}
              onChange={(event) => set("position", event.target.value)}
            >
              <option value="">Select</option>
              {MEDICAL_STUDENT_YEARS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : (
          text("position", "Position")
        )}
        {text("city", "City")}
      </div>
      {children}
      <div className={styles.actions}>
        <Button className="green" type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
