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

export function revalidateParsedRosterRows(rows: ParsedRosterRow[]): ParsedRosterRow[] {
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.excluded) continue;
    const norm = r.email.trim().toLowerCase();
    if (norm) {
      emailCounts.set(norm, (emailCounts.get(norm) || 0) + 1);
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
    if (!normEmail) {
      errors.push("Missing email address.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      errors.push(`Invalid email format "${row.email}".`);
    } else if ((emailCounts.get(normEmail) || 0) > 1) {
      warnings.push(`Duplicate advisor email "${normEmail}" appears in multiple rows.`);
    }

    if (!row.batchLabel.trim()) {
      warnings.push("Missing batch / semester group label.");
    }

    for (let j = 0; j < rows.length; j++) {
      if (j === idx || rows[j].excluded) continue;
      const other = rows[j];
      if (doParsedExpressionsOverlap(parsedRange, other.parsedRange)) {
        errors.push(
          `Student ID range overlaps with row ${other.sourceRowNumber} (${other.advisorName || "Unknown"}).`
        );
        break;
      }
    }

    let validationStatus: RosterValidationStatus = "valid";
    if (errors.length > 0) {
      validationStatus = parsedRange.needsManualReview ? "needs_review" : "error";
    } else if (normEmail && (emailCounts.get(normEmail) || 0) > 1) {
      validationStatus = "duplicate";
    } else if (parsedRange.needsManualReview) {
      validationStatus = "needs_review";
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
