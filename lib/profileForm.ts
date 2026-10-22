import type { Doc, Id } from "../convex/_generated/dataModel";
import { PARTICIPANT_CATEGORIES, PREFIXES } from "./formOptions";

/**
 * The registration profile as edited in a form: every field a string so
 * inputs stay controlled. Shared by registration, the participant profile
 * page, and the admin profile editor.
 */
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

export function profileValuesFromUser(
  user: Doc<"users"> | null | undefined,
): ProfileFormValues {
  if (!user) {
    return EMPTY_PROFILE;
  }
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
    city: user.customCity ?? "",
  };
}

export function profileValuesEqual(
  a: ProfileFormValues,
  b: ProfileFormValues,
): boolean {
  return (Object.keys(a) as (keyof ProfileFormValues)[]).every(
    (key) => (a[key] ?? "") === (b[key] ?? ""),
  );
}

/** Converts form values to mutation args, or explains what is missing. */
export function toProfileInput(
  values: ProfileFormValues,
): { input: ProfileInputArgs } | { error: string } {
  if (!(PREFIXES as readonly string[]).includes(values.prefix)) {
    return { error: "Choose a prefix." };
  }
  if (!values.firstName.trim() || !values.lastName.trim()) {
    return { error: "Enter your first and last name." };
  }
  if (!values.phone.trim()) {
    return { error: "Enter a phone number." };
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
      otherName: values.otherName.trim() || undefined,
      lastName: values.lastName,
      suffix: values.suffix.trim() || undefined,
      specialty: values.specialty.trim() || undefined,
      phone: values.phone,
      affiliationId: values.affiliationId,
      position: values.position.trim() || undefined,
      participantCategory:
        values.participantCategory as ProfileInputArgs["participantCategory"],
      city: values.city.trim() || undefined,
    },
  };
}
