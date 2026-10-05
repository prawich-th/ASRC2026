export const AFFILIATION_STATUSES = ["verified", "pending", "archived"] as const;

export type AffiliationStatus = (typeof AFFILIATION_STATUSES)[number];

export type AffiliationInput = {
  department?: string;
  faculty?: string;
  university: string;
  district?: string;
  province?: string;
  country: string;
};

export const AFFILIATION_FIELDS = [
  { key: "department", label: "Department", required: false },
  { key: "faculty", label: "Faculty", required: false },
  { key: "university", label: "University / Office name", required: true },
  { key: "district", label: "District", required: false },
  { key: "province", label: "Province / State", required: false },
  { key: "country", label: "Country", required: true },
] as const satisfies ReadonlyArray<{
  key: keyof AffiliationInput;
  label: string;
  required: boolean;
}>;

const MAX_FIELD_LENGTH = 200;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : undefined;
}

/** Trims every field and enforces required fields and length limits. */
export function normalizeAffiliationInput(
  input: AffiliationInput,
): AffiliationInput {
  const normalized = {
    department: clean(input.department),
    faculty: clean(input.faculty),
    university: clean(input.university) ?? "",
    district: clean(input.district),
    province: clean(input.province),
    country: clean(input.country) ?? "",
  };
  if (!normalized.university) {
    throw new Error("University / office name is required");
  }
  if (!normalized.country) {
    throw new Error("Country is required");
  }
  for (const field of AFFILIATION_FIELDS) {
    const value = normalized[field.key];
    if (value && value.length > MAX_FIELD_LENGTH) {
      throw new Error(
        `${field.label} must be at most ${MAX_FIELD_LENGTH} characters`,
      );
    }
  }
  return normalized;
}

export function affiliationKey(input: AffiliationInput): string {
  return AFFILIATION_FIELDS.map((field) =>
    (input[field.key] ?? "").toLocaleLowerCase(),
  ).join("|");
}

export function formatAffiliation(
  affiliation: AffiliationInput | null | undefined,
): string {
  if (!affiliation) {
    return "";
  }
  return AFFILIATION_FIELDS.map((field) => affiliation[field.key])
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

/** Department or faculty, used where a single "unit" string is needed. */
export function affiliationUnit(affiliation: AffiliationInput): string | undefined {
  return affiliation.department ?? affiliation.faculty;
}
