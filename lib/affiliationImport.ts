import {
  AFFILIATION_FIELDS,
  AffiliationInput,
  affiliationKey,
  normalizeAffiliationInput,
} from "./affiliation";
import { escapeCsvCell, parseCsvRows } from "./csv";

export type AffiliationImportError = {
  row: number;
  message: string;
};

export type AffiliationImportRow = {
  row: number;
  affiliation: AffiliationInput;
};

export const AFFILIATION_IMPORT_HEADERS = AFFILIATION_FIELDS.map(
  (field) => field.key,
);

const TEMPLATE_ROWS: AffiliationInput[] = [
  {
    department: "Department of Medicine",
    faculty: "Faculty of Medicine",
    university: "Example University",
    district: "Pathum Wan",
    province: "Bangkok",
    country: "Thailand",
  },
  {
    university: "Example Hospital",
    province: "Chiang Mai",
    country: "Thailand",
  },
];

export const AFFILIATION_IMPORT_TEMPLATE = [
  AFFILIATION_IMPORT_HEADERS.join(","),
  ...TEMPLATE_ROWS.map((row) =>
    AFFILIATION_IMPORT_HEADERS.map((key) => escapeCsvCell(row[key] ?? "")).join(
      ",",
    ),
  ),
].join("\n");

/** Accepts the field keys or their labels, in any case, as column headers. */
function headerKey(header: string): keyof AffiliationInput | undefined {
  const simplified = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return AFFILIATION_FIELDS.find(
    (field) =>
      field.key === simplified ||
      field.label.toLowerCase().replace(/[^a-z]/g, "") === simplified,
  )?.key;
}

/**
 * Parses an affiliation CSV. Required columns are university and country;
 * rows repeating an earlier row in the same file are reported as errors.
 */
export function parseAffiliationImport(csv: string): {
  rows: AffiliationImportRow[];
  errors: AffiliationImportError[];
} {
  const parsedRows = parseCsvRows(csv.replace(/^﻿/, ""));
  if (parsedRows.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "The CSV is empty" }] };
  }

  const columns = new Map<keyof AffiliationInput, number>();
  parsedRows[0].forEach((header, index) => {
    const key = headerKey(header);
    if (key && !columns.has(key)) {
      columns.set(key, index);
    }
  });
  const missing = AFFILIATION_FIELDS.filter(
    (field) => field.required && !columns.has(field.key),
  ).map((field) => field.key);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 1, message: `Missing columns: ${missing.join(", ")}` }],
    };
  }

  const rows: AffiliationImportRow[] = [];
  const errors: AffiliationImportError[] = [];
  const seen = new Map<string, number>();
  for (const [index, cells] of parsedRows.slice(1).entries()) {
    const rowNumber = index + 2;
    const get = (key: keyof AffiliationInput) => {
      const column = columns.get(key);
      return column === undefined ? "" : (cells[column] ?? "");
    };
    let affiliation: AffiliationInput;
    try {
      affiliation = normalizeAffiliationInput({
        department: get("department"),
        faculty: get("faculty"),
        university: get("university"),
        district: get("district"),
        province: get("province"),
        country: get("country"),
      });
    } catch (caught) {
      errors.push({
        row: rowNumber,
        message: caught instanceof Error ? caught.message : "Invalid row",
      });
      continue;
    }
    const key = affiliationKey(affiliation);
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      errors.push({
        row: rowNumber,
        message: `Duplicate of row ${firstRow}`,
      });
      continue;
    }
    seen.set(key, rowNumber);
    rows.push({ row: rowNumber, affiliation });
  }
  return { rows, errors };
}
