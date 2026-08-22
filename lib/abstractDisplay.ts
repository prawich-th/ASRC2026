import { ABSTRACT_STATUSES } from "./formOptions";

export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

export function getAbstractStatusLabel(status: AbstractStatus): string {
  switch (status) {
    case "draft":
      return "Drafting";
    case "submitted":
      return "Submitted for Review";
    case "revision_requested":
      return "Revision Requested";
    case "selected":
      return "Selected for Presentation";
    case "rejected":
      return "Not Selected";
    default:
      return status;
  }
}

export function getAbstractStatusTone(status: AbstractStatus): "red" | "green" | "orange" | "gray" {
  switch (status) {
    case "submitted":
      return "red";
    case "revision_requested":
      return "orange";
    case "selected":
      return "green";
    case "rejected":
      return "gray";
    case "draft":
    default:
      return "orange";
  }
}

export function getCategoryLabel(category: string): string {
  if (category === "oral") {
    return "Oral Presentation";
  }
  if (category === "poster") {
    return "Poster Presentation";
  }
  return category;
}
