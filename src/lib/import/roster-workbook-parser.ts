import ExcelJS from "exceljs";
import { parseStudentIdExpression } from "./student-id-range-parser";
import {
  revalidateParsedRosterRows,
  type RosterColumnKey,
  type RosterValidationStatus,
  type ParsedRosterRow,
} from "./roster-revalidator";

export {
  revalidateParsedRosterRows,
  type RosterColumnKey,
  type RosterValidationStatus,
  type ParsedRosterRow,
};

export interface WorkbookInspectResult {
  fileName: string;
  worksheets: string[];
  suggestedWorksheet: string | null;
}

export interface WorksheetParseResult {
  worksheetName: string;
  headerRowNumber: number;
  headers: { colIndex: number; colLetter: string; label: string }[];
  columnMapping: Partial<Record<RosterColumnKey, number>>;
  rows: ParsedRosterRow[];
  rawRowsCount: number;
}

const HEADER_ALIASES: Record<RosterColumnKey, RegExp[]> = {
  semester_code: [/^semester\s*code$/i, /^sem(ester)?$/i, /^batch$/i],
  serial_number: [/^sl\.?$/i, /^serial/i, /^s\/n$/i, /^no\.?$/i],
  advisor_name: [/^advis[eo]r\s*name$/i, /^name\s*of\s*advis[eo]r$/i, /^faculty\s*name$/i],
  designation: [/^designation$/i, /^rank$/i, /^title$/i],
  student_id_range_raw: [/^from\s*id.*to\s*id$/i, /^student\s*id/i, /^id\s*range/i, /^from\s*id/i],
  room_number: [/^room\s*(number|no\.?)?$/i, /^office$/i],
  schedule: [/^schedule$/i, /^advising\s*hour/i, /^time$/i],
  email: [/^e-?mail$/i, /^email\s*address$/i],
  phone: [/^phone$/i, /^mobile$/i, /^contact$/i, /^cell$/i],
};

function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || "A";
}

function extractCellString(cell: ExcelJS.Cell | undefined): {
  text: string;
  wasNumericType: boolean;
} {
  if (!cell || cell.value === null || cell.value === undefined) {
    return { text: "", wasNumericType: false };
  }

  const val = cell.value;

  if (typeof val === "number") {
    // Avoid scientific notation for integer-like numbers where possible
    if (Number.isInteger(val) && Math.abs(val) < Number.MAX_SAFE_INTEGER) {
      return { text: val.toString(), wasNumericType: true };
    }
    return { text: String(val), wasNumericType: true };
  }

  if (typeof val === "string") {
    return { text: val.trim(), wasNumericType: false };
  }

  if (typeof val === "object") {
    if ("richText" in val && Array.isArray(val.richText)) {
      return {
        text: val.richText.map((r) => r.text).join("").trim(),
        wasNumericType: false,
      };
    }
    if ("text" in val && typeof val.text === "string") {
      return { text: val.text.trim(), wasNumericType: false };
    }
    if ("result" in val && val.result !== undefined && val.result !== null) {
      const resVal = val.result;
      return {
        text: String(resVal).trim(),
        wasNumericType: typeof resVal === "number",
      };
    }
    if (val instanceof Date) {
      return { text: val.toISOString().split("T")[0], wasNumericType: false };
    }
  }

  return { text: String(cell.text ?? "").trim(), wasNumericType: false };
}

function parseMergeRanges(worksheet: ExcelJS.Worksheet): {
  top: number;
  left: number;
  bottom: number;
  right: number;
}[] {
  const merges: string[] = Array.isArray(worksheet.model?.merges)
    ? worksheet.model.merges
    : [];

  const parsed: { top: number; left: number; bottom: number; right: number }[] = [];
  for (const rangeRef of merges) {
    const match = rangeRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) continue;
    const colToNum = (col: string) => {
      let n = 0;
      for (const ch of col.toUpperCase()) {
        n = n * 26 + (ch.charCodeAt(0) - 64);
      }
      return n;
    };
    parsed.push({
      left: colToNum(match[1]),
      top: parseInt(match[2], 10),
      right: colToNum(match[3]),
      bottom: parseInt(match[4], 10),
    });
  }
  return parsed;
}

export function extractBatchLabelAndNumber(
  rawColA: string,
  fallbackSemesterCode: string
): { batchLabel: string; batchNumber: string | null; semesterCode: string } {
  const cleaned = rawColA.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      batchLabel: "",
      batchNumber: null,
      semesterCode: fallbackSemesterCode,
    };
  }

  // Match patterns like "72 Batch", "Batch 72", "Fall 26 - 72 Batch", "69th Batch"
  const batchMatch = cleaned.match(/\b(\d{1,3})(?:st|nd|rd|th)?\s*batch\b/i)
    || cleaned.match(/\bbatch\s*[-:#]?\s*(\d{1,3})\b/i);

  if (batchMatch) {
    return {
      batchLabel: cleaned,
      batchNumber: batchMatch[1],
      semesterCode: fallbackSemesterCode || cleaned,
    };
  }

  // If Column A is purely a 2-3 digit number (e.g. "72"), treat it as batch number
  if (/^\d{2,3}$/.test(cleaned)) {
    return {
      batchLabel: `${cleaned} Batch`,
      batchNumber: cleaned,
      semesterCode: fallbackSemesterCode,
    };
  }

  // Otherwise preserve the exact label (do NOT confuse semester code like "Fall 26" or "262" with batch number)
  return {
    batchLabel: cleaned,
    batchNumber: null,
    semesterCode: cleaned,
  };
}

async function loadWorkbook(buffer: Buffer, fileName: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    const ws = workbook.addWorksheet("CSV Import");
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) {
        ws.addRow([]);
        continue;
      }
      // Basic RFC-4180 CSV line split preserving quoted strings
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      ws.addRow(cells);
    }
    return workbook;
  }

  // ExcelJS expects Node Buffer / ArrayBuffer
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
}

export async function inspectRosterWorkbook(
  buffer: Buffer,
  fileName: string,
  targetSemesterName?: string
): Promise<WorkbookInspectResult> {
  const workbook = await loadWorkbook(buffer, fileName);
  const worksheets = workbook.worksheets.map((ws) => ws.name);

  let suggestedWorksheet: string | null = null;
  if (targetSemesterName && /fall\s*2026/i.test(targetSemesterName)) {
    suggestedWorksheet =
      worksheets.find((name) => name.trim().toLowerCase() === "fall 26draft") ||
      worksheets.find((name) => /fall\s*26/i.test(name)) ||
      null;
  } else if (worksheets.length === 1) {
    suggestedWorksheet = worksheets[0];
  }

  return {
    fileName,
    worksheets,
    suggestedWorksheet,
  };
}

export async function parseRosterWorksheet(
  buffer: Buffer,
  fileName: string,
  worksheetName: string,
  manualColumnMapping?: Partial<Record<RosterColumnKey, number>>,
  targetSemesterCodeFallback = ""
): Promise<WorksheetParseResult> {
  const workbook = await loadWorkbook(buffer, fileName);
  const worksheet = workbook.getWorksheet(worksheetName) || workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(`Worksheet "${worksheetName}" not found.`);
  }

  const merges = parseMergeRanges(worksheet);

  // Detect header row by scanning top 25 rows for >= 3 recognized header aliases
  let headerRowNumber = 1;
  let bestScore = 0;
  let detectedMapping: Partial<Record<RosterColumnKey, number>> = {};
  let headers: { colIndex: number; colLetter: string; label: string }[] = [];

  const maxScanRow = Math.min(25, worksheet.rowCount);
  for (let r = 1; r <= maxScanRow; r++) {
    const row = worksheet.getRow(r);
    const candidateMap: Partial<Record<RosterColumnKey, number>> = {};
    const candidateHeaders: { colIndex: number; colLetter: string; label: string }[] = [];
    let score = 0;

    for (let c = 1; c <= Math.max(12, row.cellCount); c++) {
      const { text } = extractCellString(row.getCell(c));
      if (!text) continue;
      candidateHeaders.push({ colIndex: c, colLetter: colIndexToLetter(c), label: text });

      for (const [key, patterns] of Object.entries(HEADER_ALIASES) as [RosterColumnKey, RegExp[]][]) {
        if (candidateMap[key] !== undefined) continue;
        if (patterns.some((re) => re.test(text))) {
          candidateMap[key] = c;
          score++;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowNumber = r;
      detectedMapping = candidateMap;
      headers = candidateHeaders;
    }
  }

  const columnMapping = { ...detectedMapping, ...(manualColumnMapping || {}) };

  // Build quick lookup for merged cells in the batch/semester column (typically col 1)
  const batchCol = columnMapping.semester_code || 1;
  const colAMerges = merges.filter((m) => m.left <= batchCol && m.right >= batchCol);

  let activeMergedBatchText = "";
  let activeMergeBottom = -1;

  const parsedRows: ParsedRosterRow[] = [];

  for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);

    const getMappedCell = (key: RosterColumnKey) => {
      const col = columnMapping[key];
      return col ? extractCellString(row.getCell(col)) : { text: "", wasNumericType: false };
    };

    const colARaw = getMappedCell("semester_code");
    const slRaw = getMappedCell("serial_number");
    const advisorRaw = getMappedCell("advisor_name");
    const designationRaw = getMappedCell("designation");
    const rangeRaw = getMappedCell("student_id_range_raw");
    const roomRaw = getMappedCell("room_number");
    const scheduleRaw = getMappedCell("schedule");
    const emailRaw = getMappedCell("email");
    const phoneRaw = getMappedCell("phone");

    // Check if row is completely empty
    const hasAnyContent = Boolean(
      colARaw.text ||
        slRaw.text ||
        advisorRaw.text ||
        designationRaw.text ||
        rangeRaw.text ||
        roomRaw.text ||
        scheduleRaw.text ||
        emailRaw.text ||
        phoneRaw.text
    );
    if (!hasAnyContent) continue;

    // Skip repeated header rows inside the sheet
    if (
      /^advis[eo]r\s*name$/i.test(advisorRaw.text) &&
      /^e-?mail$/i.test(emailRaw.text)
    ) {
      continue;
    }

    // Track merged cell group for Column A
    const mergeForRow = colAMerges.find((m) => r >= m.top && r <= m.bottom);
    let effectiveColAText = colARaw.text;

    if (mergeForRow) {
      if (r === mergeForRow.top && colARaw.text) {
        activeMergedBatchText = colARaw.text;
        activeMergeBottom = mergeForRow.bottom;
      } else if (r <= activeMergeBottom && activeMergedBatchText) {
        effectiveColAText = activeMergedBatchText;
      }
    } else if (colARaw.text) {
      activeMergedBatchText = colARaw.text;
      activeMergeBottom = r;
    } else if (r > activeMergeBottom) {
      // Outside any merged group: do NOT fabricate a new batch; clear unless same contiguous section?
      // If a CSV or unmerged sheet has blank col A inside a batch table with valid advisor rows,
      // only carry forward if activeMergedBatchText is non-empty and row has advisor/range data.
      effectiveColAText = activeMergedBatchText;
    }

    // Skip section title/banner rows where there is no advisor, email, or range
    if (!advisorRaw.text && !emailRaw.text && !rangeRaw.text) {
      continue;
    }

    const batchInfo = extractBatchLabelAndNumber(
      effectiveColAText,
      targetSemesterCodeFallback
    );

    const rowWarnings: string[] = [];
    if (phoneRaw.wasNumericType && phoneRaw.text) {
      rowWarnings.push(
        "Phone value was stored as a number in Excel; leading zeros may have been lost."
      );
    }
    if (rangeRaw.wasNumericType && rangeRaw.text) {
      rowWarnings.push(
        "Student ID cell was stored as a number in Excel; leading zeros may have been lost."
      );
    }

    const parsedRange = parseStudentIdExpression(rangeRaw.text);

    parsedRows.push({
      rowId: `row-${r}`,
      sourceRowNumber: r,
      semesterCode: batchInfo.semesterCode,
      batchLabel: batchInfo.batchLabel,
      batchNumber: batchInfo.batchNumber,
      serialNumber: slRaw.text,
      advisorName: advisorRaw.text,
      designation: designationRaw.text,
      studentIdRangeRaw: rangeRaw.text,
      roomNumber: roomRaw.text,
      schedule: scheduleRaw.text,
      email: emailRaw.text.trim().toLowerCase(),
      phone: phoneRaw.text,
      parsedRange,
      validationStatus: "valid",
      warnings: rowWarnings,
      errors: [],
      excluded: false,
    });
  }

  return {
    worksheetName: worksheet.name,
    headerRowNumber,
    headers,
    columnMapping,
    rows: revalidateParsedRosterRows(parsedRows),
    rawRowsCount: worksheet.rowCount,
  };
}
