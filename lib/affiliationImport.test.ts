import { describe, expect, test } from "vitest";
import {
  AFFILIATION_IMPORT_TEMPLATE,
  parseAffiliationImport,
} from "./affiliationImport";

describe("parseAffiliationImport", () => {
  test("the template parses cleanly", () => {
    const parsed = parseAffiliationImport(AFFILIATION_IMPORT_TEMPLATE);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
  });

  test("accepts labels as headers, any column order, and quoted cells", () => {
    const parsed = parseAffiliationImport(
      '﻿Country,"University / Office name",Faculty\r\n' +
        'Thailand,"Mahidol University, Salaya",Faculty of Medicine\r\n',
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toEqual({
      row: 2,
      affiliation: {
        country: "Thailand",
        university: "Mahidol University, Salaya",
        faculty: "Faculty of Medicine",
        department: undefined,
        district: undefined,
        province: undefined,
      },
    });
  });

  test("reports missing columns, missing values, and repeated rows", () => {
    expect(parseAffiliationImport("university\nX").errors).toEqual([
      { row: 1, message: "Missing columns: country" },
    ]);
    const parsed = parseAffiliationImport(
      "university,country\nA,Thailand\n,Thailand\na,THAILAND\n",
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toEqual([
      { row: 3, message: "University / office name is required" },
      { row: 4, message: "Duplicate of row 2" },
    ]);
  });
});
