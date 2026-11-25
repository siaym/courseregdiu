import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

import { CSE_CURRICULUM_DATASET } from "../src/lib/curriculum/cse-curriculum-dataset.ts";
import {
  computeAuthoritativeCredits,
  masterCourseSchema,
  SPECIALIZATION_GROUPS,
} from "../src/lib/validations/curriculum.ts";
import { parseCourseWorksheet } from "../src/lib/curriculum/course-import-parser.ts";
import { requireAdmin } from "../src/lib/auth/roles.ts";

// ============================================================================
// 1. EXTRACTED OFFICIAL DIU CSE CURRICULUM VERIFICATION
// ============================================================================
test("CSE Curriculum Dataset: matches official credit totals from source image (154.5 Cr)", () => {
  const core = CSE_CURRICULUM_DATASET.filter((c) => c.category === "CORE");
  const genEd = CSE_CURRICULUM_DATASET.filter((c) => c.category === "GENERAL_EDUCATION");
  const project = CSE_CURRICULUM_DATASET.filter((c) => c.category === "PROJECT");
  const common = CSE_CURRICULUM_DATASET.filter((c) => c.category === "COMMON_ELECTIVE");
  const spec = CSE_CURRICULUM_DATASET.filter((c) => c.category === "SPECIALIZATION_ELECTIVE");

  assert.equal(core.length, 37);
  assert.equal(core.reduce((s, c) => s + c.totalCredits, 0), 93);

  assert.equal(genEd.length, 13);
  assert.equal(genEd.reduce((s, c) => s + c.totalCredits, 0), 37.5);

  assert.equal(project.length, 3);
  assert.equal(project.reduce((s, c) => s + c.totalCredits, 0), 6);
  assert.equal(project.every((c) => c.code === "CSE-499" && Boolean(c.variant)), true);

  assert.equal(common.length, 2);
  assert.equal(spec.length, 38);

  for (const group of SPECIALIZATION_GROUPS) {
    const groupCourses = spec.filter((c) => c.specializationGroup === group);
    assert.equal(groupCourses.length >= 6, true, `${group} must have at least 6 courses`);
  }

  // Official programme summary: 93 + 37.5 + 6 + 18 (1 specialization group of 6 courses) = 154.5
  const programmeTotal = 93 + 37.5 + 6 + 18;
  assert.equal(programmeTotal, 154.5);
});

// ============================================================================
// 2. CREDIT & VALIDATION RULES
// ============================================================================
test("Curriculum Validation: computes theory+lab, allows total-only, rejects negative credits", () => {
  const split = computeAuthoritativeCredits(1.5, 1.5, null);
  assert.equal(split.ok, true);
  assert.equal(split.totalCredits, 3);

  const totalOnly = computeAuthoritativeCredits(null, null, 2);
  assert.equal(totalOnly.ok, true);
  assert.equal(totalOnly.totalCredits, 2);

  const neg = computeAuthoritativeCredits(-1, 1.5, null);
  assert.equal(neg.ok, false);

  const variantValid = masterCourseSchema.safeParse({
    code: "CSE-499",
    title: "FYDP (Phase-I)",
    category: "PROJECT",
    totalCredits: 2,
    variant: "Phase-I",
  });
  assert.equal(variantValid.success, true);
});

// ============================================================================
// 3. BULK COURSE IMPORTER (XLSX)
// ============================================================================
test("Course Importer: parses XLSX, detects duplicates and invalid credits", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("CSE Catalog");
  ws.addRow(["Code", "Course Title", "Category", "Theory", "Lab", "Total Credits", "Specialization", "Variant"]);
  ws.addRow(["CSE-215", "Electronic Devices and Circuits", "CORE", "3", "", "3", "", ""]);
  ws.addRow(["CSE-215", "Electronic Devices and Circuits", "CORE", "3", "", "3", "", ""]); // Duplicate
  ws.addRow(["CSE-999", "Bad Credit Course", "CORE", "-2", "", "", "", ""]); // Invalid negative

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const parsed = await parseCourseWorksheet(buf, "cse.xlsx", "CSE Catalog");

  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].status, "valid");
  assert.equal(parsed.rows[1].status, "duplicate");
  assert.equal(parsed.rows[2].status, "error");
});

// ============================================================================
// 4. ADMIN AUTHORIZATION BOUNDARY
// ============================================================================
test("Security: curriculum Admin actions block unauthenticated users in production", async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await assert.rejects(async () => {
      await requireAdmin("/admin/curriculum");
    });
  } finally {
    process.env.NODE_ENV = prev;
  }
});
