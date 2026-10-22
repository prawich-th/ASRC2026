"use client";

import AffiliationPicker from "@/components/affiliations/affiliation-picker";
import { FormField, SelectField } from "@/components/form/Form";
import { api } from "@/convex/_generated/api";
import {
  MEDICAL_STUDENT_YEARS,
  PARTICIPANT_CATEGORIES,
  PREFIXES,
} from "@/lib/formOptions";
import { ProfileFormValues } from "@/lib/profileForm";
import { useQuery } from "convex/react";
import styles from "./profile-fields.module.scss";

const prefixOptions = PREFIXES.map((value) => ({ value, label: value }));
const categoryOptions = PARTICIPANT_CATEGORIES.map((value) => ({
  value,
  label: value,
}));
const yearOptions = MEDICAL_STUDENT_YEARS.map((value) => ({
  value,
  label: value,
}));

/**
 * The participant's registration profile fields. Used for step 2 of
 * registration and on the profile page so both collect the same data.
 */
export default function ProfileFields({
  values,
  onChange,
  idPrefix,
  legacyAffiliation,
}: {
  values: ProfileFormValues;
  onChange: (values: ProfileFormValues) => void;
  idPrefix: string;
  /** Free-text institution from an import, shown until an affiliation is chosen. */
  legacyAffiliation?: string;
}) {
  const isMedicalStudent = values.participantCategory === "Medical Student";
  const affiliation = useQuery(
    api.affiliations.getById,
    values.affiliationId ? { affiliationId: values.affiliationId } : "skip",
  );
  // Same fallback the server uses when no city is typed.
  const affiliationCity =
    affiliation?.province?.trim() || affiliation?.district?.trim() || undefined;

  function set<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function setCategory(participantCategory: string) {
    const wasMedicalStudent = isMedicalStudent;
    const nowMedicalStudent = participantCategory === "Medical Student";
    // A Year value is not a position (and vice versa), so clear it on switch.
    const position =
      wasMedicalStudent !== nowMedicalStudent ? "" : values.position;
    onChange({ ...values, participantCategory, position });
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={styles.grid}>
      <SelectField
        id={id("prefix")}
        className={styles.span2}
        label="Prefix"
        required
        placeholder="Select"
        options={prefixOptions}
        value={values.prefix}
        onChange={(event) => set("prefix", event.target.value)}
      />
      <FormField
        id={id("firstName")}
        className={styles.span3}
        label="First name"
        autoComplete="given-name"
        required
        maxLength={200}
        value={values.firstName}
        onChange={(event) => set("firstName", event.target.value)}
      />
      <FormField
        id={id("otherName")}
        className={styles.span3}
        label="Other name"
        autoComplete="additional-name"
        maxLength={200}
        value={values.otherName}
        onChange={(event) => set("otherName", event.target.value)}
      />
      <FormField
        id={id("lastName")}
        className={styles.span4}
        label="Last name"
        autoComplete="family-name"
        required
        maxLength={200}
        value={values.lastName}
        onChange={(event) => set("lastName", event.target.value)}
      />
      <FormField
        id={id("suffix")}
        className={styles.span2}
        label="Suffix"
        autoComplete="honorific-suffix"
        maxLength={200}
        value={values.suffix}
        onChange={(event) => set("suffix", event.target.value)}
      />
      <FormField
        id={id("specialty")}
        className={styles.span4}
        label="Specialty"
        maxLength={200}
        value={values.specialty}
        onChange={(event) => set("specialty", event.target.value)}
      />
      <FormField
        id={id("phone")}
        className={styles.span6}
        label="Phone number"
        type="tel"
        autoComplete="tel"
        required
        maxLength={200}
        value={values.phone}
        onChange={(event) => set("phone", event.target.value)}
      />
      <SelectField
        id={id("participantCategory")}
        className={styles.span6}
        label="Participant category"
        required
        placeholder="Select"
        options={categoryOptions}
        value={values.participantCategory}
        onChange={(event) => setCategory(event.target.value)}
      />
      {isMedicalStudent ? (
        <SelectField
          id={id("year")}
          className={styles.span6}
          label="Year"
          required
          placeholder="Select"
          options={yearOptions}
          value={values.position}
          onChange={(event) => set("position", event.target.value)}
        />
      ) : (
        <FormField
          id={id("position")}
          className={styles.span6}
          label="Position"
          autoComplete="organization-title"
          maxLength={200}
          value={values.position}
          onChange={(event) => set("position", event.target.value)}
        />
      )}
      <div className={styles.full}>
        <AffiliationPicker
          label="Affiliation"
          placeholder="Search your university, faculty, or department"
          value={values.affiliationId}
          onChange={(affiliationId) => set("affiliationId", affiliationId)}
        />
        {!values.affiliationId && legacyAffiliation ? (
          <p className={styles.warning}>
            <i className="bx bx-alert-triangle" aria-hidden="true" />
            You previously entered “{legacyAffiliation}”. Please select it from
            the list, or add it if it is missing.
          </p>
        ) : (
          <p className={styles.hint}>
            {isMedicalStudent ? "Choose your medical school. " : ""}
            Can&apos;t find it? Choose “Add a new affiliation” at the bottom of
            the list.
          </p>
        )}
      </div>
      <FormField
        id={id("city")}
        className={styles.span6}
        label="City (optional)"
        autoComplete="address-level2"
        maxLength={200}
        placeholder={affiliationCity}
        hint={
          affiliationCity
            ? `Leave blank to use your affiliation's city, ${affiliationCity}.`
            : "Leave blank to use your affiliation's city."
        }
        value={values.city}
        onChange={(event) => set("city", event.target.value)}
      />
    </div>
  );
}
