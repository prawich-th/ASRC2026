"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import Button from "@/components/form/button";
import {
  MEDICAL_STUDENT_YEARS,
  PARTICIPANT_CATEGORIES,
  PREFIXES,
} from "@/lib/formOptions";
import { EMPTY_PROFILE, ProfileFormValues } from "@/lib/profileForm";
import { FormEvent, ReactNode, useState } from "react";
import styles from "./admin.module.scss";

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
        {text("city", "City (leave blank to use the affiliation's)")}
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
