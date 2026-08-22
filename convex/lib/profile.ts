import { v } from "convex/values";
import {
  PARTICIPANT_CATEGORIES,
  PREFIXES,
  USER_ROLES,
} from "../../lib/formOptions";

const prefixLiterals = PREFIXES.map((prefix) => v.literal(prefix));
const participantCategoryLiterals = PARTICIPANT_CATEGORIES.map((category) =>
  v.literal(category),
);
const userRoleLiterals = USER_ROLES.map((role) => v.literal(role));

export const prefixValidator = v.union(
  ...(prefixLiterals as [
    (typeof prefixLiterals)[number],
    ...(typeof prefixLiterals)[number][],
  ]),
);

export const participantCategoryValidator = v.union(
  ...(participantCategoryLiterals as [
    (typeof participantCategoryLiterals)[number],
    ...(typeof participantCategoryLiterals)[number][],
  ]),
);

export const userRoleValidator = v.union(
  ...(userRoleLiterals as [
    (typeof userRoleLiterals)[number],
    ...(typeof userRoleLiterals)[number][],
  ]),
);

export const userFields = {
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  profileImageId: v.optional(v.id("_storage")),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  prefix: v.optional(prefixValidator),
  firstName: v.optional(v.string()),
  otherName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  suffix: v.optional(v.string()),
  specialty: v.optional(v.string()),
  institution: v.optional(v.string()),
  position: v.optional(v.string()),
  department: v.optional(v.string()),
  participantCategory: v.optional(participantCategoryValidator),
  city: v.optional(v.string()),
  agreedToTerms: v.optional(v.boolean()),
  wantsNotifications: v.optional(v.boolean()),
  profileComplete: v.optional(v.boolean()),
  role: v.optional(userRoleValidator),
};

export const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  ...userFields,
});
