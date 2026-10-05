import { formatAffiliation } from "./affiliation";
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

export function getCategoryLabel(category?: string): string {
  if (category === "oral") {
    return "Oral Presentation";
  }
  if (category === "poster") {
    return "Poster Presentation";
  }
  return category || "To be assigned";
}

type CreditAffiliation = Parameters<typeof formatAffiliation>[0] & {
  _id: string;
};

export type AuthorCredits = {
  authors: Array<{ name: string; number?: number; presenting: boolean }>;
  advisor?: { name: string; number?: number };
  affiliations: Array<{ number: number; label: string }>;
};

/** Numbers affiliations in order of first appearance, as printed in proceedings. */
export function buildAuthorCredits(
  authorList: ReadonlyArray<{
    name: string;
    affiliationId?: string;
    presenting: boolean;
  }>,
  advisor: { name: string; affiliationId?: string } | undefined,
  affiliations: ReadonlyArray<CreditAffiliation>,
): AuthorCredits {
  const byId = new Map(affiliations.map((item) => [item._id, item]));
  const numbers = new Map<string, number>();
  const listed: AuthorCredits["affiliations"] = [];

  function numberFor(affiliationId: string | undefined) {
    const affiliation = affiliationId ? byId.get(affiliationId) : undefined;
    if (!affiliation) return undefined;
    let number = numbers.get(affiliation._id);
    if (number === undefined) {
      number = listed.length + 1;
      numbers.set(affiliation._id, number);
      listed.push({ number, label: formatAffiliation(affiliation) });
    }
    return number;
  }

  const authors = authorList.map((author) => ({
    name: author.name,
    number: numberFor(author.affiliationId),
    presenting: author.presenting,
  }));
  const advisorCredit = advisor?.name
    ? { name: advisor.name, number: numberFor(advisor.affiliationId) }
    : undefined;
  return { authors, advisor: advisorCredit, affiliations: listed };
}
