/**
 * Dedicated DIU Student ID Range & Exception Parser
 *
 * Handles:
 * - Standard ranges: "262-15-001 to 262-15-066", "242-15-001 - 242-15-063"
 * - Multiple ranges in one cell (newline, comma, semicolon, "&")
 * - Range + "&" + individual IDs: "242-15-001 to 242-15-063 & 242-15-099, 242-15-102"
 * - Long numeric IDs with leading zeros: "0242310005101001 to 0242310005101066"
 * - "All" (batch-scoped special rule; never global)
 * - Malformed, reversed, or prefix-mismatched ranges (never guesses)
 */

export interface StudentIdRange {
  raw: string;
  prefix: string;
  startSuffix: string;
  endSuffix: string;
  startFull: string;
  endFull: string;
  width: number;
}

export interface ParsedStudentIdExpression {
  raw: string;
  isAllInBatch: boolean;
  ranges: StudentIdRange[];
  individualIds: string[];
  errors: string[];
  warnings: string[];
  needsManualReview: boolean;
}

interface SplitIdParts {
  prefix: string;
  suffix: string;
  width: number;
}

function normalizeToken(token: string): string {
  return token.replace(/\s+/g, " ").trim();
}

function isValidSingleId(id: string): boolean {
  // Accept hyphenated DIU IDs (e.g. 262-15-001, 211-15-12345) or long numeric IDs (e.g. 0242310005101001)
  return /^(\d{2,4}-\d{1,4}-\d{1,6}|\d{8,20})$/.test(id);
}

function splitPrefixAndSuffix(startId: string, endId: string): {
  ok: boolean;
  start?: SplitIdParts;
  end?: SplitIdParts;
  error?: string;
} {
  if (!isValidSingleId(startId) || !isValidSingleId(endId)) {
    return {
      ok: false,
      error: `Invalid student ID format in range "${startId} to ${endId}".`,
    };
  }

  const startHasDash = startId.includes("-");
  const endHasDash = endId.includes("-");

  if (startHasDash !== endHasDash) {
    return {
      ok: false,
      error: `Incompatible ID formats in range "${startId}" and "${endId}".`,
    };
  }

  if (startHasDash) {
    const startLastDash = startId.lastIndexOf("-");
    const endLastDash = endId.lastIndexOf("-");
    const startPrefix = startId.slice(0, startLastDash + 1);
    const endPrefix = endId.slice(0, endLastDash + 1);

    if (startPrefix !== endPrefix) {
      return {
        ok: false,
        error: `Mismatched ID prefixes "${startPrefix}" and "${endPrefix}".`,
      };
    }

    const startSuffix = startId.slice(startLastDash + 1);
    const endSuffix = endId.slice(endLastDash + 1);

    if (!/^\d+$/.test(startSuffix) || !/^\d+$/.test(endSuffix)) {
      return {
        ok: false,
        error: `Non-numeric suffix in range "${startId}" to "${endId}".`,
      };
    }

    if (startSuffix.length !== endSuffix.length) {
      return {
        ok: false,
        error: `Inconsistent zero-padded suffix width between "${startId}" and "${endId}".`,
      };
    }

    return {
      ok: true,
      start: { prefix: startPrefix, suffix: startSuffix, width: startSuffix.length },
      end: { prefix: endPrefix, suffix: endSuffix, width: endSuffix.length },
    };
  }

  // Long numeric IDs without dashes (e.g. 0242310005101001 to 0242310005101066)
  if (startId.length !== endId.length) {
    return {
      ok: false,
      error: `Incompatible numeric ID lengths between "${startId}" and "${endId}".`,
    };
  }

  // Find longest common prefix, keeping at least a 3-digit suffix for comparison
  let commonLen = 0;
  const maxPrefixLen = Math.max(0, startId.length - 3);
  while (commonLen < maxPrefixLen && startId[commonLen] === endId[commonLen]) {
    commonLen++;
  }

  if (commonLen < Math.floor(startId.length / 2)) {
    return {
      ok: false,
      error: `Numeric IDs "${startId}" and "${endId}" do not share a compatible cohort prefix.`,
    };
  }

  const prefix = startId.slice(0, commonLen);
  const startSuffix = startId.slice(commonLen);
  const endSuffix = endId.slice(commonLen);

  return {
    ok: true,
    start: { prefix, suffix: startSuffix, width: startSuffix.length },
    end: { prefix, suffix: endSuffix, width: endSuffix.length },
  };
}

function trySplitRangeSegment(segment: string): { isRange: boolean; left?: string; right?: string } {
  // 1. Explicit "to" separator (case-insensitive)
  const toMatch = segment.match(/^(.+?)\s+to\s+(.+)$/i);
  if (toMatch) {
    return { isRange: true, left: toMatch[1].trim(), right: toMatch[2].trim() };
  }

  // 2. En-dash / em-dash
  const unicodeDashMatch = segment.match(/^(.+?)\s*[–—]\s*(.+)$/);
  if (unicodeDashMatch) {
    return { isRange: true, left: unicodeDashMatch[1].trim(), right: unicodeDashMatch[2].trim() };
  }

  // 3. Spaced hyphen between two IDs: "262-15-001 - 262-15-066"
  const spacedHyphenMatch = segment.match(/^(.+?)\s+-\s+(.+)$/);
  if (spacedHyphenMatch) {
    return { isRange: true, left: spacedHyphenMatch[1].trim(), right: spacedHyphenMatch[2].trim() };
  }

  // 4. Compact hyphen between two full hyphenated IDs: "262-15-001-262-15-066"
  const compactHyphenMatch = segment.match(/^(\d{2,4}-\d{1,4}-\d{1,6})-(\d{2,4}-\d{1,4}-\d{1,6})$/);
  if (compactHyphenMatch) {
    return { isRange: true, left: compactHyphenMatch[1].trim(), right: compactHyphenMatch[2].trim() };
  }

  // 5. Compact hyphen between two long numeric IDs: "0242310005101001-0242310005101066"
  const compactNumericMatch = segment.match(/^(\d{8,20})-(\d{8,20})$/);
  if (compactNumericMatch) {
    return { isRange: true, left: compactNumericMatch[1].trim(), right: compactNumericMatch[2].trim() };
  }

  return { isRange: false };
}

export function parseStudentIdExpression(rawValue: string | null | undefined): ParsedStudentIdExpression {
  const raw = (rawValue ?? "").trim();
  const result: ParsedStudentIdExpression = {
    raw,
    isAllInBatch: false,
    ranges: [],
    individualIds: [],
    errors: [],
    warnings: [],
    needsManualReview: false,
  };

  if (!raw) {
    result.warnings.push("Student ID range cell is empty.");
    result.needsManualReview = true;
    return result;
  }

  if (/^all(\s+students?)?$/i.test(raw)) {
    result.isAllInBatch = true;
    result.warnings.push(
      '"All" is treated as a batch-scoped rule and requires explicit Admin confirmation before assigning.'
    );
    return result;
  }

  // Split by newlines, commas, semicolons, "&", or "+"
  const segments = raw
    .split(/[\r\n,;&+]+/)
    .map((s) => normalizeToken(s))
    .filter(Boolean);

  if (segments.length === 0) {
    result.errors.push("No valid student ID segments found.");
    result.needsManualReview = true;
    return result;
  }

  for (const segment of segments) {
    // Normalize internal spaces around hyphens inside an ID (e.g. "262- 15-001" -> "262-15-001")
    const cleanedSegment = segment.replace(/\s*-\s*/g, (match, offset, full) => {
      // Preserve spaced " - " when it separates two full IDs
      const before = full.slice(0, offset);
      const after = full.slice(offset + match.length);
      if (isValidSingleId(before.trim()) && isValidSingleId(after.trim())) {
        return " - ";
      }
      return "-";
    });

    if (/^all(\s+students?)?$/i.test(cleanedSegment)) {
      result.isAllInBatch = true;
      result.warnings.push(
        '"All" detected alongside other entries; requires explicit batch-scoped Admin confirmation.'
      );
      continue;
    }

    const rangeSplit = trySplitRangeSegment(cleanedSegment);
    if (rangeSplit.isRange && rangeSplit.left && rangeSplit.right) {
      const leftId = rangeSplit.left.replace(/\s+/g, "");
      const rightId = rangeSplit.right.replace(/\s+/g, "");

      const split = splitPrefixAndSuffix(leftId, rightId);
      if (!split.ok || !split.start || !split.end) {
        result.errors.push(split.error || `Malformed range "${segment}".`);
        result.needsManualReview = true;
        continue;
      }

      const startBig = BigInt(split.start.suffix);
      const endBig = BigInt(split.end.suffix);

      if (startBig > endBig) {
        result.errors.push(`Reversed student ID range "${leftId} to ${rightId}" (start > end).`);
        result.needsManualReview = true;
        continue;
      }

      result.ranges.push({
        raw: segment,
        prefix: split.start.prefix,
        startSuffix: split.start.suffix,
        endSuffix: split.end.suffix,
        startFull: leftId,
        endFull: rightId,
        width: split.start.width,
      });
    } else {
      const singleId = cleanedSegment.replace(/\s+/g, "");
      if (!isValidSingleId(singleId)) {
        result.errors.push(`Unrecognized student ID or malformed range "${segment}".`);
        result.needsManualReview = true;
        continue;
      }
      if (!result.individualIds.includes(singleId)) {
        result.individualIds.push(singleId);
      }
    }
  }

  return result;
}

/**
 * Checks whether an exact stored student DIU ID falls within a parsed expression.
 * Never fabricates IDs; strictly compares exact prefix, width, and inclusive numeric bounds.
 */
export function doesStudentIdMatchParsedExpression(
  studentDiuId: string | null | undefined,
  parsed: ParsedStudentIdExpression
): boolean {
  if (!studentDiuId) return false;
  const candidate = studentDiuId.trim();
  if (!candidate) return false;

  if (parsed.individualIds.includes(candidate)) {
    return true;
  }

  for (const range of parsed.ranges) {
    if (!candidate.startsWith(range.prefix)) continue;
    const suffix = candidate.slice(range.prefix.length);
    if (!/^\d+$/.test(suffix) || suffix.length !== range.width) continue;

    const val = BigInt(suffix);
    const startVal = BigInt(range.startSuffix);
    const endVal = BigInt(range.endSuffix);
    if (val >= startVal && val <= endVal) {
      return true;
    }
  }

  return false;
}

/**
 * Detects whether two parsed student ID expressions overlap on any range or individual ID.
 */
export function doParsedExpressionsOverlap(
  a: ParsedStudentIdExpression,
  b: ParsedStudentIdExpression
): boolean {
  for (const id of a.individualIds) {
    if (doesStudentIdMatchParsedExpression(id, b)) return true;
  }
  for (const id of b.individualIds) {
    if (doesStudentIdMatchParsedExpression(id, a)) return true;
  }

  for (const ra of a.ranges) {
    for (const rb of b.ranges) {
      if (ra.prefix !== rb.prefix || ra.width !== rb.width) continue;
      const aStart = BigInt(ra.startSuffix);
      const aEnd = BigInt(ra.endSuffix);
      const bStart = BigInt(rb.startSuffix);
      const bEnd = BigInt(rb.endSuffix);
      if (aStart <= bEnd && bStart <= aEnd) {
        return true;
      }
    }
  }

  return false;
}
