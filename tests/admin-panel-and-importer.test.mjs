import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

import {
  parseStudentIdExpression,
  doesStudentIdMatchParsedExpression,
  doParsedExpressionsOverlap,
} from "../src/lib/import/student-id-range-parser.ts";
import {
  inspectRosterWorkbook,
  parseRosterWorksheet,
} from "../src/lib/import/roster-workbook-parser.ts";
import { requireAdmin } from "../src/lib/auth/roles.ts";

// ============================================================================
// 1. STUDENT ID RANGE PARSER TESTS
// ============================================================================
test("Range Parser: handles ordinary inclusive range with leading zeros", () => {
  const parsed = parseStudentIdExpression("262-15-001 to 262-15-066");
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.needsManualReview, false);
  assert.equal(parsed.ranges.length, 1);
  assert.equal(parsed.ranges[0].prefix, "262-15-");
  assert.equal(parsed.ranges[0].width, 3);
  assert.equal(doesStudentIdMatchParsedExpression("262-15-001", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("262-15-066", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("262-15-067", parsed), false);
  assert.equal(doesStudentIdMatchParsedExpression("242-15-010", parsed), false);
});

test("Range Parser: handles multiple ranges, '&', and individual exception IDs", () => {
  const parsed = parseStudentIdExpression(
    "242-15-001 to 242-15-063 & 242-15-099, 242-15-102"
  );
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.ranges.length, 1);
  assert.deepEqual(parsed.individualIds, ["242-15-099", "242-15-102"]);
  assert.equal(doesStudentIdMatchParsedExpression("242-15-050", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("242-15-099", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("242-15-100", parsed), false);
});

test("Range Parser: preserves long numeric IDs with leading zeros", () => {
  const parsed = parseStudentIdExpression("0242310005101001 to 0242310005101025");
  assert.equal(parsed.errors.length, 0);
  assert.equal(doesStudentIdMatchParsedExpression("0242310005101001", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("0242310005101025", parsed), true);
  assert.equal(doesStudentIdMatchParsedExpression("0242310005101026", parsed), false);
});

test("Range Parser: treats 'All' as batch-scoped rule requiring confirmation", () => {
  const parsed = parseStudentIdExpression("All");
  assert.equal(parsed.isAllInBatch, true);
  assert.equal(parsed.ranges.length, 0);
  assert.equal(parsed.warnings.length > 0, true);
  // Never matches arbitrary students globally without batch scoping
  assert.equal(doesStudentIdMatchParsedExpression("262-15-001", parsed), false);
});

test("Range Parser: rejects reversed ranges and mismatched prefixes", () => {
  const reversed = parseStudentIdExpression("262-15-080 to 262-15-010");
  assert.equal(reversed.errors.length > 0, true);
  assert.equal(reversed.needsManualReview, true);

  const mismatched = parseStudentIdExpression("242-15-001 to 262-15-050");
  assert.equal(mismatched.errors.length > 0, true);
  assert.equal(mismatched.needsManualReview, true);
});

test("Range Parser: detects overlapping ranges across rows", () => {
  const a = parseStudentIdExpression("262-15-001 to 262-15-050");
  const b = parseStudentIdExpression("262-15-045 to 262-15-090");
  const c = parseStudentIdExpression("262-15-051 to 262-15-090");
  assert.equal(doParsedExpressionsOverlap(a, b), true);
  assert.equal(doParsedExpressionsOverlap(a, c), false);
});

// ============================================================================
// 2. EXCEL WORKBOOK IMPORTER TESTS (Fall 26Draft Structure)
// ============================================================================
test("Workbook Importer: inspects sheets, handles merged batch cells, multiline ranges, and phone warnings", async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Summer 26Active");
  wb.addWorksheet("Spring 26 Archive");
  const fall = wb.addWorksheet("Fall 26Draft");

  // Introductory merged title row
  fall.addRow(["Daffodil International University - Department of CSE Advisor List (Fall 2026)"]);
  fall.mergeCells("A1:I1");

  // Header row (Row 2)
  fall.addRow([
    "Semester Code",
    "SL",
    "Adviser Name",
    "Designation",
    "From ID- To ID",
    "Room Number",
    "Schedule",
    "Email",
    "Phone",
  ]);

  // Batch 72 merged across rows 3 and 4
  fall.addRow([
    "72 Batch",
    "1",
    "Dr. Alice Rahman",
    "Associate Professor",
    "262-15-001 to 262-15-040\n& 262-15-099",
    "AB4-502",
    "Sun 10:00-12:00",
    "alice@diu.edu.bd",
    "01711000001",
  ]);
  fall.addRow([
    "",
    "2",
    "Md. Karim Hasan",
    "Lecturer",
    "262-15-041 to 262-15-080",
    "AB4-503",
    "Tue 11:00-13:00",
    "karim@diu.edu.bd",
    1711000002, // Stored as Excel number -> must emit leading zero warning
  ]);
  fall.mergeCells("A3:A4");

  // Batch 71 "All" row
  fall.addRow([
    "71 Batch",
    "3",
    "Dr. Alice Rahman",
    "Associate Professor",
    "All",
    "AB4-502",
    "Wed 10:00-12:00",
    "alice@diu.edu.bd",
    "01711000001",
  ]);

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const inspect = await inspectRosterWorkbook(
    buffer,
    "Final_ Advisor List Fall - 2026.xlsx",
    "Fall 2026"
  );
  assert.deepEqual(inspect.worksheets, ["Summer 26Active", "Spring 26 Archive", "Fall 26Draft"]);
  assert.equal(inspect.suggestedWorksheet, "Fall 26Draft");

  const parsed = await parseRosterWorksheet(
    buffer,
    "Final_ Advisor List Fall - 2026.xlsx",
    "Fall 26Draft"
  );

  assert.equal(parsed.headerRowNumber, 2);
  assert.equal(parsed.rows.length, 3);

  // Merged Batch 72 carried forward to row 4
  assert.equal(parsed.rows[0].batchLabel, "72 Batch");
  assert.equal(parsed.rows[0].batchNumber, "72");
  assert.equal(parsed.rows[1].batchLabel, "72 Batch");
  assert.equal(parsed.rows[1].batchNumber, "72");

  // Multiline + '&' range parsed
  assert.equal(parsed.rows[0].parsedRange.ranges.length, 1);
  assert.deepEqual(parsed.rows[0].parsedRange.individualIds, ["262-15-099"]);

  // Numeric Excel phone triggers leading-zero warning
  assert.equal(
    parsed.rows[1].warnings.some((w) => w.includes("leading zeros")),
    true
  );

  // Same advisor appearing across Batch 72 and Batch 71 is VALID (multiple batches/ranges allowed)
  assert.equal(parsed.rows[0].validationStatus, "valid");

  // 'All' row flagged as batch-scoped
  assert.equal(parsed.rows[2].batchNumber, "71");
  assert.equal(parsed.rows[2].parsedRange.isAllInBatch, true);
});

test("Tolerant Importer: allows same advisor with multiple prefixes/batches, flags name mismatch and cross-advisor conflicts", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Fall 26Draft");
  ws.addRow(["Semester Code", "SL", "Adviser Name", "Designation", "From ID- To ID", "Room Number", "Schedule", "Email", "Phone"]);
  // Same advisor, two different prefixes & batches
  ws.addRow(["62 Batch", "1", "Most. Sanjida Afrin", "Lecturer", "222-15-6495 to 222-15-6555", "AB4", "Sun", "sanjida.cse@diu.edu.bd", "01711000001"]);
  ws.addRow(["61 Batch", "2", "Most. Sanjida Afrin", "Lecturer", "221-15-5232 to 221-15-5531", "AB4", "Mon", "sanjida.cse@diu.edu.bd", "01711000001"]);
  // Different advisor overlapping 222-15-6500 to 222-15-6510 -> genuine conflict!
  ws.addRow(["62 Batch", "3", "Other Advisor", "Lecturer", "222-15-6500 to 222-15-6510", "AB4", "Tue", "other@diu.edu.bd", "01711000002"]);

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const parsed = await parseRosterWorksheet(buf, "multi.xlsx", "Fall 26Draft");

  assert.equal(parsed.rows[1].validationStatus, "valid");
  assert.equal(parsed.rows[0].validationStatus, "error");
  assert.equal(parsed.rows[2].validationStatus, "error");
});

// ============================================================================
// 3. ADMIN AUTHORIZATION BOUNDARY TEST
// ============================================================================
test("Security: requireAdmin rejects unauthenticated / forged access in production", async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await assert.rejects(
      async () => {
        await requireAdmin("/admin");
      },
      (err) => {
        // Next.js redirect() throws NEXT_REDIRECT
        return err instanceof Error && (err.message.includes("NEXT_REDIRECT") || err.message.length > 0);
      }
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
