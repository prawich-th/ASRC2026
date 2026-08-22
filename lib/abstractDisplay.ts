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

export function getAbstractStatusMessage(status: AbstractStatus): string {
  switch (status) {
    case "draft":
      return "This abstract is saved as a draft. Submit it when you are ready for the scientific committee to review it.";
    case "submitted":
      return "Your abstract has been submitted and is awaiting review. You will be notified when the scientific committee updates the result.";
    case "revision_requested":
      return "The committee has requested changes. Review the feedback below, revise your abstract, and resubmit it.";
    case "selected":
      return "Congratulations. The scientific committee has selected your abstract for presentation. Please watch this page and your email for further instructions.";
    case "rejected":
      return "The scientific committee has completed its review. Unfortunately, your abstract was not selected for presentation this year. Thank you for submitting to ASRC.";
    default:
      return "Your abstract has been saved in the system.";
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
