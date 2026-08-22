export type AnnouncementTag = {
  name: string;
  tone: "primary" | "secondary" | "tertiary";
};

const tones: AnnouncementTag["tone"][] = [
  "primary",
  "secondary",
  "tertiary",
];

export function parseAnnouncementTags(value: string): AnnouncementTag[] {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((name, index) => ({ name, tone: tones[index % tones.length] }));
}

export function announcementTagsToInput(tags: AnnouncementTag[]) {
  return tags.map((tag) => tag.name).join(", ");
}
