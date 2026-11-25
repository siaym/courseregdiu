import ExcelJS from "exceljs";
import {
  COURSE_CATEGORIES,
  SPECIALIZATION_GROUPS,
  computeAuthoritativeCredits,
} from "@/lib/validations/curriculum";

export type CourseColumnKey =
  | "code"
  | "title"
  | "category"
  | "theory_credits"
  | "lab_credits"
  | "total_credits"
  | "specialization_group"
  | "variant"
  | "description";

export type CourseImportRowStatus = "valid" | "warning" | "error" | "duplicate" | "excluded";

export interface ParsedCourseImportRow {
  rowId: string;
  sourceRowNumber: number;
  code: string;
  title: string;
  category: (typeof COURSE_CATEGORIES)[number];
  theoryCredits: number | null;
  labCredits: number | null;
  totalCredits: number;
  specializationGroup: (typeof SPECIALIZATION_GROUPS)[number] | null;
  variant: string | null;
  description: string | null;
  status: CourseImportRowStatus;
  errors: string[];
  warnings: string[];
  excluded: boolean;
}

const ALIASES: Record<CourseColumnKey, RegExp[]> = {
  code: [/^(course\s*)?code$/i, /^id$/i],
  title: [/^(course\s*)?title$/i, /^name$/i, /^subject$/i],
  category: [/^category$/i, /^group$/i, /^type$/i],
  theory_credits: [/^theory(\s*credits?)?$/i],
  lab_credits: [/^lab(\s*credits?)?$/i],
  total_credits: [/^total(\s*credits?)?$/i, /^credits?$/i],
  specialization_group: [/^specialization(\s*group)?$/i],
  variant: [/^variant$/i, /^phase$/i],
  description: [/^description$/i, /^notes?$/i],
};

function parseNullableNumber(raw: string): { val: number | null; invalid: boolean } {
  const t = raw.trim();
  if (!t || t === "-" || t === "—") return { val: null, invalid: false };
  const n = Number(t);
  if (!Number.isFinite(n)) return { val: null, invalid: true };
  return { val: n, invalid: false };
}

function normalizeCategory(raw: string): (typeof COURSE_CATEGORIES)[number] | null {
  const t = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if ((COURSE_CATEGORIES as readonly string[]).includes(t)) {
    return t as (typeof COURSE_CATEGORIES)[number];
  }
  if (t.includes("GEN")) return "GENERAL_EDUCATION";
  if (t.includes("PROJ") || t.includes("FYDP")) return "PROJECT";
  if (t.includes("COMMON")) return "COMMON_ELECTIVE";
  if (t.includes("SPEC")) return "SPECIALIZATION_ELECTIVE";
  if (t.includes("CORE")) return "CORE";
  return null;
}

function normalizeSpecialization(raw: string): (typeof SPECIALIZATION_GROUPS)[number] | null {
  const t = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!t) return null;
  if ((SPECIALIZATION_GROUPS as readonly string[]).includes(t)) {
    return t as (typeof SPECIALIZATION_GROUPS)[number];
  }
  if (t.includes("ARTIFICIAL") || t === "AI") return "ARTIFICIAL_INTELLIGENCE";
  if (t.includes("SOFTWARE")) return "SOFTWARE_DEVELOPMENT";
  if (t.includes("NETWORK")) return "NETWORK_AND_COMMUNICATION";
  if (t.includes("ALGO")) return "ALGORITHMS";
  if (t.includes("EMBEDDED") || t.includes("ROBOT")) return "EMBEDDED_SYSTEMS_AND_ROBOTICS";
  return null;
}

async function loadWorkbook(buffer: Buffer, fileName: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    const ws = wb.addWorksheet("CSV");
    const lines = buffer.toString("utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) {
        ws.addRow([]);
        continue;
      }
      ws.addRow(line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
    }
    return wb;
  }
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await wb.xlsx.load(ab);
  return wb;
}

export async function inspectCourseWorkbook(buffer: Buffer, fileName: string) {
  const wb = await loadWorkbook(buffer, fileName);
  return {
    fileName,
    worksheets: wb.worksheets.map((w) => w.name),
  };
}

export async function parseCourseWorksheet(
  buffer: Buffer,
  fileName: string,
  worksheetName: string,
  manualMapping?: Partial<Record<CourseColumnKey, number>>
) {
  const wb = await loadWorkbook(buffer, fileName);
  const ws = wb.getWorksheet(worksheetName) || wb.worksheets[0];
  if (!ws) throw new Error(`Worksheet "${worksheetName}" not found.`);

  let headerRowNumber = 1;
  let detected: Partial<Record<CourseColumnKey, number>> = {};
  let headers: { colIndex: number; label: string }[] = [];
  let bestScore = 0;

  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const map: Partial<Record<CourseColumnKey, number>> = {};
    const hdrs: { colIndex: number; label: string }[] = [];
    let score = 0;
    for (let c = 1; c <= Math.max(10, row.cellCount); c++) {
      const text = String(row.getCell(c).text ?? "").trim();
      if (!text) continue;
      hdrs.push({ colIndex: c, label: text });
      for (const [k, pats] of Object.entries(ALIASES) as [CourseColumnKey, RegExp[]][]) {
        if (map[k] === undefined && pats.some((p) => p.test(text))) {
          map[k] = c;
          score++;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      headerRowNumber = r;
      detected = map;
      headers = hdrs;
    }
  }

  const mapping = { ...detected, ...(manualMapping || {}) };
  const rows: ParsedCourseImportRow[] = [];
  const seenKeys = new Set<string>();

  for (let r = headerRowNumber + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const getVal = (k: CourseColumnKey) =>
      mapping[k] ? String(row.getCell(mapping[k]!).text ?? "").trim() : "";

    const code = getVal("code");
    const title = getVal("title");
    const rawCat = getVal("category");
    const rawTheory = getVal("theory_credits");
    const rawLab = getVal("lab_credits");
    const rawTotal = getVal("total_credits");
    const rawSpec = getVal("specialization_group");
    const variant = getVal("variant") || null;
    const description = getVal("description") || null;

    if (!code && !title) continue;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!code) errors.push("Missing course code.");
    if (!title) errors.push("Missing course title.");

    const cat = rawCat ? normalizeCategory(rawCat) : "CORE";
    if (!cat) {
      errors.push(`Unrecognized category "${rawCat}".`);
    }

    const th = parseNullableNumber(rawTheory);
    const lb = parseNullableNumber(rawLab);
    const tot = parseNullableNumber(rawTotal);

    if (th.invalid) errors.push(`Invalid theory credit "${rawTheory}".`);
    if (lb.invalid) errors.push(`Invalid lab credit "${rawLab}".`);
    if (tot.invalid) errors.push(`Invalid total credit "${rawTotal}".`);

    const creditCheck = computeAuthoritativeCredits(th.val, lb.val, tot.val);
    if (!creditCheck.ok && creditCheck.error) {
      errors.push(creditCheck.error);
    }

    const spec = rawSpec ? normalizeSpecialization(rawSpec) : null;
    if (rawSpec && !spec) {
      warnings.push(`Unrecognized specialization "${rawSpec}".`);
    }

    const key = `${code.toUpperCase()}::${(variant || "").toLowerCase()}`;
    const isDuplicate = seenKeys.has(key);
    seenKeys.add(key);
    if (isDuplicate) {
      warnings.push(`Duplicate course (${code}${variant ? ` — ${variant}` : ""}) in file.`);
    }

    let status: CourseImportRowStatus = "valid";
    if (errors.length > 0) status = "error";
    else if (isDuplicate) status = "duplicate";
    else if (warnings.length > 0) status = "warning";

    rows.push({
      rowId: `crow-${r}`,
      sourceRowNumber: r,
      code,
      title,
      category: cat || "CORE",
      theoryCredits: th.val,
      labCredits: lb.val,
      totalCredits: creditCheck.ok ? creditCheck.totalCredits : 3,
      specializationGroup: spec,
      variant,
      description,
      status,
      errors,
      warnings,
      excluded: false,
    });
  }

  return { worksheetName: ws.name, headers, columnMapping: mapping, rows };
}
