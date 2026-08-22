export const STAFF_ROLES = ["staff", "academic_staff", "super_admin"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function getRoleLabel(role?: StaffRole) {
  if (role === "academic_staff") {
    return "Academic staff";
  }
  if (role === "super_admin") {
    return "Super admin";
  }
  if (role === "staff") {
    return "Staff";
  }
  return "Participant";
}
