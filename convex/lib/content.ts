import { v } from "convex/values";
import {
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TAG_TONES,
  KEY_DATE_TONES,
} from "../../lib/formOptions";

const announcementTagToneLiterals = ANNOUNCEMENT_TAG_TONES.map((tone) =>
  v.literal(tone),
);
const announcementStatusLiterals = ANNOUNCEMENT_STATUSES.map((status) =>
  v.literal(status),
);
const keyDateToneLiterals = KEY_DATE_TONES.map((tone) => v.literal(tone));

export const announcementTagToneValidator = v.union(
  ...(announcementTagToneLiterals as [
    (typeof announcementTagToneLiterals)[number],
    ...(typeof announcementTagToneLiterals)[number][],
  ]),
);

export const announcementStatusValidator = v.union(
  ...(announcementStatusLiterals as [
    (typeof announcementStatusLiterals)[number],
    ...(typeof announcementStatusLiterals)[number][],
  ]),
);

export const keyDateToneValidator = v.union(
  ...(keyDateToneLiterals as [
    (typeof keyDateToneLiterals)[number],
    ...(typeof keyDateToneLiterals)[number][],
  ]),
);

export const announcementTagValidator = v.object({
  name: v.string(),
  tone: announcementTagToneValidator,
});

export const announcementFields = {
  title: v.string(),
  slug: v.string(),
  summary: v.string(),
  body: v.string(),
  tags: v.array(announcementTagValidator),
  status: announcementStatusValidator,
  authorId: v.id("users"),
  authorName: v.optional(v.string()),
  authorTitle: v.optional(v.string()),
  departmentName: v.optional(v.string()),
  departmentEmail: v.optional(v.string()),
  updatedAt: v.number(),
  publishedAt: v.optional(v.number()),
};

export const announcementValidator = v.object({
  _id: v.id("announcements"),
  _creationTime: v.number(),
  ...announcementFields,
});

export const keyDateFields = {
  displayDate: v.string(),
  title: v.string(),
  tone: keyDateToneValidator,
  sortOrder: v.number(),
  published: v.boolean(),
  authorId: v.id("users"),
  updatedAt: v.number(),
};

export const keyDateValidator = v.object({
  _id: v.id("keyDates"),
  _creationTime: v.number(),
  ...keyDateFields,
});
