import {
  parseStudentIdExpression,
  doParsedExpressionsOverlap,
  type ParsedStudentIdExpression,
} from "./student-id-range-parser";

export type RosterColumnKey =
  | "semester_code"
  | "serial_number"
  | "advisor_name"
  | "designation"
  | "student_id_range_raw"
  | "room_number"
  | "schedule"
  | "email"
  | "phone";

export type RosterValidationStatus =
  | "valid"
  | "warning"
  | "error"
  | "duplicate"
  | "needs_review"
  | "excluded";

export interface ParsedRosterRow {
  rowId: string;
  sourceRowNumber: number;
  semesterCode: string;
  batchLabel: string;
  batchNumber: string | null;
  serialNumber: string;
  advisorName: string;
  designation: string;
  studentIdRangeRaw: string;
  roomNumber: string;
  schedule: string;
  email: string;
  phone: string;
  parsedRange: ParsedStudentIdExpression;
  validationStatus: RosterValidationStatus;
  warnings: string[];
  errors: string[];
  excluded: boolean;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRangeKey(row: ParsedRosterRow): string {
  const batchKey = (row.batchNumber || row.batchLabel || "").trim().toLowerCase();
  const rangeKey = row.studentIdRangeRaw.trim().toLowerCase().replace(/\s+/g, " ");
  return `${batchKey}::${rangeKey}`;
}

export function revalidateParsedRosterRows(rows: ParsedRosterRow[]): ParsedRosterRow[] {
  // Group names by normalized email to detect same-email-different-name conflicts
  const namesByEmail = new Map<string, Set<string>>();
  // Track identical (email + batch + range) repetitions
  const seenAdvisorRanges = new Map<string, number>();

  for (const r of rows) {
    if (r.excluded) continue;
    const normEmail = r.email.trim().toLowerCase();
    const normName = normalizeName(r.advisorName);
    if (normEmail && normName) {
      const set = namesByEmail.get(normEmail) || new Set<string>();
      set.add(normName);
      namesByEmail.set(normEmail, set);
    }
  }

  return rows.map((row, idx) => {
    if (row.excluded) {
      return {
        ...row,
        validationStatus: "excluded",
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [...row.warnings.filter((w) => w.includes("leading zeros"))];

    const parsedRange = parseStudentIdExpression(row.studentIdRangeRaw);
    errors.push(...parsedRange.errors);
    warnings.push(...parsedRange.warnings);

    if (!row.advisorName.trim()) {
      errors.push("Missing advisor name.");
    }

    const normEmail = row.email.trim().toLowerCase();
    let hasNameMismatchForEmail = false;
    if (!normEmail) {
      errors.push("Missing email address.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      errors.push(`Invalid email format "${row.email}".`);
    } else {
      const names = namesByEmail.get(normEmail);
      if (names && names.size > 1) {
        hasNameMismatchForEmail = true;
        errors.push(
          `Email "${normEmail}" appears with different advisor names (${Array.from(names).join(" vs ")}). Review before merging.`
        );
      }
    }

    if (!row.batchLabel.trim()) {
      warnings.push("Missing batch / semester group label.");
    }

    // Check identical repeated range for the SAME advisor (non-blocking notice)
    let isIdenticalRepeat = false;
    if (normEmail && row.studentIdRangeRaw.trim()) {
      const repKey = `${normEmail}::${normalizeRangeKey(row)}`;
      const prevRow = seenAdvisorRanges.get(repKey);
      if (prevRow !== undefined) {
        isIdenticalRepeat = true;
        warnings.push(
          `Duplicate assignment notice: identical range already listed on row ${prevRow} for this advisor (duplicate record will be skipped).`
        );
      } else {
        seenAdvisorRanges.set(repKey, row.sourceRowNumber);
      }
    }

    // Check overlapping student ID ranges ONLY across DIFFERENT advisors
    for (let j = 0; j < rows.length; j++) {
      if (j === idx || rows[j].excluded) continue;
      const other = rows[j];
      const otherEmail = other.email.trim().toLowerCase();
      // Same advisor having multiple ranges or batches is ALLOWED
      if (normEmail && otherEmail && normEmail === otherEmail) continue;

      if (doParsedExpressionsOverlap(parsedRange, other.parsedRange)) {
        errors.push(
          `Genuine conflict: Student ID range overlaps with row ${other.sourceRowNumber} (${other.advisorName || "Another advisor"}).`
        );
        break;
      }
    }

    let validationStatus: RosterValidationStatus = "valid";
    if (hasNameMismatchForEmail || parsedRange.needsManualReview) {
      validationStatus = "needs_review";
    } else if (errors.length > 0) {
      validationStatus = "error";
    } else if (isIdenticalRepeat) {
      validationStatus = "duplicate";
    } else if (warnings.length > 0) {
      validationStatus = "warning";
    }

    return {
      ...row,
      email: normEmail,
      parsedRange,
      errors,
      warnings,
      validationStatus,
    };
  });
}
