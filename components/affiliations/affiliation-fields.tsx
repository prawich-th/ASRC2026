import { AFFILIATION_FIELDS, AffiliationInput } from "@/lib/affiliation";
import styles from "./affiliations.module.scss";

export type AffiliationDraft = Record<keyof AffiliationInput, string>;

export const EMPTY_AFFILIATION: AffiliationDraft = {
  department: "",
  faculty: "",
  university: "",
  district: "",
  province: "",
  country: "Thailand",
};

const PLACEHOLDERS: AffiliationDraft = {
  department: "e.g. Department of Pharmacology",
  faculty: "e.g. Faculty of Medicine",
  university: "e.g. Thammasat University",
  district: "e.g. Khlong Luang",
  province: "e.g. Pathum Thani",
  country: "e.g. Thailand",
};

export function toAffiliationDraft(
  affiliation: Partial<AffiliationInput>,
): AffiliationDraft {
  return {
    department: affiliation.department ?? "",
    faculty: affiliation.faculty ?? "",
    university: affiliation.university ?? "",
    district: affiliation.district ?? "",
    province: affiliation.province ?? "",
    country: affiliation.country ?? "",
  };
}

export function fromAffiliationDraft(draft: AffiliationDraft): AffiliationInput {
  const optional = (value: string) => value.trim() || undefined;
  return {
    department: optional(draft.department),
    faculty: optional(draft.faculty),
    university: draft.university.trim(),
    district: optional(draft.district),
    province: optional(draft.province),
    country: draft.country.trim(),
  };
}

export default function AffiliationFields({
  value,
  onChange,
  idPrefix,
}: {
  value: AffiliationDraft;
  onChange: (value: AffiliationDraft) => void;
  idPrefix: string;
}) {
  return (
    <div className={styles.fieldGrid}>
      {AFFILIATION_FIELDS.map((field) => (
        <label
          key={field.key}
          className={field.key === "university" ? styles.wide : undefined}
          htmlFor={`${idPrefix}-${field.key}`}
        >
          <span>
            {field.label}
            {field.required ? <em aria-hidden="true"> *</em> : null}
          </span>
          <input
            id={`${idPrefix}-${field.key}`}
            value={value[field.key]}
            required={field.required}
            placeholder={PLACEHOLDERS[field.key]}
            onChange={(event) =>
              onChange({ ...value, [field.key]: event.target.value })
            }
          />
        </label>
      ))}
    </div>
  );
}
