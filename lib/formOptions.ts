export const PREFIXES = [
  "Dr.",
  "Prof.",
  "Assoc. Prof.",
  "Asst. Prof.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Mx.",
] as const;

export const PARTICIPANT_CATEGORIES = [
  "Medical Student",
  "Undergraduate Student",
  "Graduate Student",
  "Resident",
  "Faculty",
  "Researcher",
  "Allied Health Student",
  "Observer",
] as const;

export const MEDICAL_STUDENT_YEARS = ["1", "2", "3", "4", "5", "6"] as const;

export const ABSTRACT_CATEGORIES = ["oral", "poster"] as const;

export const ABSTRACT_STATUSES = [
  "draft",
  "submitted",
  "revision_requested",
  "selected",
  "rejected",
] as const;

export const USER_ROLES = [
  "staff",
  "academic_staff",
  "super_admin",
] as const;

export const ANNOUNCEMENT_TAG_TONES = [
  "primary",
  "secondary",
  "tertiary",
] as const;

export const ANNOUNCEMENT_STATUSES = ["draft", "published"] as const;

export const KEY_DATE_TONES = ["green", "orange", "red"] as const;
