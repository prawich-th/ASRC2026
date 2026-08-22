import {
  PARTICIPANT_CATEGORIES,
  PREFIXES,
  USER_ROLES,
} from "./formOptions";
import { normalizeEmail } from "./userData";

export const USER_IMPORT_HEADERS = [
  "email",
  "prefix",
  "firstName",
  "otherName",
  "lastName",
  "suffix",
  "specialty",
  "phone",
  "institution",
  "position",
  "department",
  "participantCategory",
  "city",
  "role",
] as const;

export type ImportedUser = {
  email: string;
  prefix: (typeof PREFIXES)[number];
  firstName: string;
  otherName?: string;
  lastName: string;
  suffix?: string;
  specialty?: string;
  phone: string;
  institution: string;
  position?: string;
  department?: string;
  participantCategory: (typeof PARTICIPANT_CATEGORIES)[number];
  city?: string;
  role?: (typeof USER_ROLES)[number];
};

export type UserImportError = {
  row: number;
  message: string;
};

export const USER_IMPORT_TEMPLATE = `${USER_IMPORT_HEADERS.join(",")}
person@example.com,Dr.,Jane,,Researcher,,Cardiology,+66123456789,Example University,Faculty,Medicine,Researcher,Bangkok,
`;

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unclosed quoted value");
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }
  return rows;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

export function parseUserImport(csv: string): {
  users: ImportedUser[];
  errors: UserImportError[];
} {
  const parsedRows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (parsedRows.length === 0) {
    return { users: [], errors: [{ row: 1, message: "The CSV is empty" }] };
  }

  const headers = parsedRows[0].map((header) => header.trim());
  const missingHeaders = USER_IMPORT_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    return {
      users: [],
      errors: [
        {
          row: 1,
          message: `Missing columns: ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  const column = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  ) as Record<string, number>;
  const users: ImportedUser[] = [];
  const errors: UserImportError[] = [];
  const seenEmails = new Set<string>();

  for (const [index, cells] of parsedRows.slice(1).entries()) {
    const rowNumber = index + 2;
    const get = (header: (typeof USER_IMPORT_HEADERS)[number]) =>
      cells[column[header]]?.trim() ?? "";
    const email = normalizeEmail(get("email"));
    const prefix = get("prefix");
    const participantCategory = get("participantCategory");
    const role = get("role");
    const required = [
      ["email", email],
      ["prefix", prefix],
      ["firstName", get("firstName")],
      ["lastName", get("lastName")],
      ["phone", get("phone")],
      ["institution", get("institution")],
      ["participantCategory", participantCategory],
    ] as const;
    const missing = required
      .filter(([, value]) => !value)
      .map(([field]) => field);
    if (missing.length > 0) {
      errors.push({
        row: rowNumber,
        message: `Missing required values: ${missing.join(", ")}`,
      });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, message: "Invalid email address" });
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push({ row: rowNumber, message: "Duplicate email in CSV" });
      continue;
    }
    if (!PREFIXES.includes(prefix as (typeof PREFIXES)[number])) {
      errors.push({ row: rowNumber, message: `Invalid prefix: ${prefix}` });
      continue;
    }
    if (
      !PARTICIPANT_CATEGORIES.includes(
        participantCategory as (typeof PARTICIPANT_CATEGORIES)[number],
      )
    ) {
      errors.push({
        row: rowNumber,
        message: `Invalid participant category: ${participantCategory}`,
      });
      continue;
    }
    if (role && !USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      errors.push({ row: rowNumber, message: `Invalid role: ${role}` });
      continue;
    }

    seenEmails.add(email);
    users.push({
      email,
      prefix: prefix as (typeof PREFIXES)[number],
      firstName: get("firstName"),
      otherName: optional(get("otherName")),
      lastName: get("lastName"),
      suffix: optional(get("suffix")),
      specialty: optional(get("specialty")),
      phone: get("phone"),
      institution: get("institution"),
      position: optional(get("position")),
      department: optional(get("department")),
      participantCategory:
        participantCategory as (typeof PARTICIPANT_CATEGORIES)[number],
      city: optional(get("city")),
      role: role ? (role as (typeof USER_ROLES)[number]) : undefined,
    });
  }

  return { users, errors };
}
