export function parseKeywordsInput(input: string): string[] {
  return input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

export function joinKeywords(keywords: ReadonlyArray<string>): string {
  return keywords.join(", ");
}
