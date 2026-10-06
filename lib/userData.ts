export type SearchableUser = {
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  department?: string;
  specialty?: string;
  position?: string;
  city?: string;
  participantCategory?: string;
  /** Full formatted affiliation, so faculty, province, or country match too. */
  affiliation?: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildDisplayName(
  parts: ReadonlyArray<string | undefined>,
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function buildUserSearchText(user: SearchableUser): string {
  return [
    user.name,
    user.email,
    user.phone,
    user.institution,
    user.department,
    user.specialty,
    user.position,
    user.city,
    user.participantCategory,
    user.affiliation,
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}
