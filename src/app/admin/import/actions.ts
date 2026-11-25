"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  inspectRosterWorkbook,
  parseRosterWorksheet,
  revalidateParsedRosterRows,
  type ParsedRosterRow,
  type RosterColumnKey,
  type WorkbookInspectResult,
  type WorksheetParseResult,
} from "@/lib/import/roster-workbook-parser";
import { doesStudentIdMatchParsedExpression } from "@/lib/import/student-id-range-parser";
import type { AdminActionResult } from "@/app/admin/actions";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export type AssignmentStrategyMode = "range" | "batch" | "individual" | "advisors_only";
export type RosterCommitMode = "add_only" | "update_and_add" | "replace_batches";

export interface PreviewMatchedStudent {
  studentId: string;
  diuId: string | null;
  fullName: string;
  batch: string | null;
  targetAdvisorEmail: string;
  targetAdvisorName: string;
  sourceRowNumber: number;
  existingAdvisorName: string | null;
  hasExistingAssignment: boolean;
}

export interface RosterCommitPreview {
  advisorsToCreate: number;
  advisorsToUpdate: number;
  newAssignmentsCount: number;
  existingAssignmentsRetainedCount: number;
  overwrittenAssignmentsCount: number;
  conflictsCount: number;
  unmatchedIndividualIds: string[];
  blockingRowsCount: number;
  totalAffectedStudents: number;
  affectedBatches: string[];
  hasAllBatchRule: boolean;
  matchedStudents: PreviewMatchedStudent[];
}

function validateUploadFile(file: File | null): string | null {
  if (!file) return "Please select an .xlsx or .csv file.";
  if (file.size === 0) return "Uploaded file is empty.";
  if (file.size > MAX_FILE_BYTES) return "File size exceeds the 10 MB limit.";
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
    return "Unsupported file format. Only .xlsx and .csv files are accepted.";
  }
  return null;
}

export async function inspectRosterWorkbookAction(
  formData: FormData
): Promise<AdminActionResult<WorkbookInspectResult>> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  const targetSemesterName = (formData.get("targetSemesterName") as string | null) || "";
  const fileErr = validateUploadFile(file);
  if (fileErr || !file) {
    return { success: false, error: fileErr || "Invalid file." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await inspectRosterWorkbook(buffer, file.name, targetSemesterName);
    if (result.worksheets.length === 0) {
      return { success: false, error: "No worksheets found in workbook." };
    }
    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to read workbook.",
    };
  }
}

export async function parseRosterWorksheetAction(
  formData: FormData
): Promise<AdminActionResult<WorksheetParseResult>> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  const worksheetName = (formData.get("worksheetName") as string | null) || "";
  const mappingJson = (formData.get("columnMapping") as string | null) || "";
  const semesterCodeFallback = (formData.get("semesterCode") as string | null) || "";

  const fileErr = validateUploadFile(file);
  if (fileErr || !file) {
    return { success: false, error: fileErr || "Invalid file." };
  }

  let manualMapping: Partial<Record<RosterColumnKey, number>> | undefined;
  if (mappingJson) {
    try {
      manualMapping = JSON.parse(mappingJson) as Partial<Record<RosterColumnKey, number>>;
    } catch {
      return { success: false, error: "Invalid column mapping payload." };
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseRosterWorksheet(
      buffer,
      file.name,
      worksheetName,
      manualMapping,
      semesterCodeFallback
    );
    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to parse worksheet.",
    };
  }
}

function studentMatchesBatch(
  studentBatch: string | null,
  rowBatchLabel: string,
  rowBatchNumber: string | null
): boolean {
  if (!studentBatch) return false;
  const sb = studentBatch.trim().toLowerCase();
  const rl = rowBatchLabel.trim().toLowerCase();
  if (rl && sb === rl) return true;
  if (rowBatchNumber) {
    const rn = rowBatchNumber.trim().toLowerCase();
    return sb === rn || sb.startsWith(`${rn} `) || sb.startsWith(`${rn}st`) || sb.startsWith(`${rn}nd`) || sb.startsWith(`${rn}rd`) || sb.startsWith(`${rn}th`);
  }
  return false;
}

export async function previewRosterCommitAction(payload: {
  rows: ParsedRosterRow[];
  semesterId: string;
  departmentCode?: string;
  assignmentMode: AssignmentStrategyMode;
  commitMode: RosterCommitMode;
  selectedBatchForAll?: string;
  selectedStudentIds?: string[];
}): Promise<AdminActionResult<RosterCommitPreview>> {
  await requireAdmin();

  const revalidated = revalidateParsedRosterRows(payload.rows);
  const activeRows = revalidated.filter((r) => !r.excluded);
  const blockingRowsCount = activeRows.filter(
    (r) => r.validationStatus === "error" || r.validationStatus === "needs_review"
  ).length;

  try {
    const supabase = await getSupabaseServerClient();

    const [advisorsRes, studentsRes, assignmentsRes] = await Promise.all([
      supabase.from("advisor_profiles").select("id, email, full_name"),
      supabase
        .from("profiles")
        .select("id, diu_id, full_name, batch, department_code")
        .eq("role", "student"),
      supabase
        .from("advisor_assignments")
        .select("id, student_id, advisor_profile_id, advisor_id, is_active")
        .eq("semester_id", payload.semesterId)
        .eq("is_active", true),
    ]);

    if (advisorsRes.error || studentsRes.error || assignmentsRes.error) {
      return {
        success: false,
        error:
          advisorsRes.error?.message ||
          studentsRes.error?.message ||
          assignmentsRes.error?.message ||
          "Database query failed during preview.",
      };
    }

    const existingAdvisorsByEmail = new Map<string, { id: string; full_name: string }>();
    const advisorNameById = new Map<string, string>();
    for (const a of (advisorsRes.data || []) as { id: string; email: string; full_name: string }[]) {
      existingAdvisorsByEmail.set(a.email.trim().toLowerCase(), a);
      advisorNameById.set(a.id, a.full_name);
    }

    const uniqueEmails = new Set(activeRows.map((r) => r.email.trim().toLowerCase()).filter(Boolean));
    let advisorsToCreate = 0;
    let advisorsToUpdate = 0;
    for (const email of uniqueEmails) {
      if (existingAdvisorsByEmail.has(email)) {
        advisorsToUpdate++;
      } else {
        advisorsToCreate++;
      }
    }

    const students = (studentsRes.data || []) as {
      id: string;
      diu_id: string | null;
      full_name: string;
      batch: string | null;
      department_code: string | null;
    }[];

    const existingAssignmentByStudent = new Map<
      string,
      { id: string; advisorName: string | null }
    >();
    for (const asg of (assignmentsRes.data || []) as {
      id: string;
      student_id: string;
      advisor_profile_id: string | null;
    }[]) {
      existingAssignmentByStudent.set(asg.student_id, {
        id: asg.id,
        advisorName: asg.advisor_profile_id ? advisorNameById.get(asg.advisor_profile_id) || "Assigned" : "Assigned",
      });
    }

    const matchedStudents: PreviewMatchedStudent[] = [];
    const seenStudentIds = new Set<string>();
    const unmatchedSet = new Set<string>();
    const affectedBatchSet = new Set<string>();
    let hasAllBatchRule = false;

    if (payload.assignmentMode !== "advisors_only") {
      for (const row of activeRows) {
        if (row.batchLabel) affectedBatchSet.add(row.batchLabel);
        if (row.parsedRange.isAllInBatch) hasAllBatchRule = true;

        // Track explicit individual IDs that don't exist in profiles
        for (const indId of row.parsedRange.individualIds) {
          const exists = students.some((s) => s.diu_id?.trim() === indId);
          if (!exists) unmatchedSet.add(indId);
        }

        for (const st of students) {
          if (
            payload.departmentCode &&
            st.department_code &&
            st.department_code !== payload.departmentCode
          ) {
            continue;
          }

          let matches = false;
          if (payload.assignmentMode === "range") {
            if (row.parsedRange.isAllInBatch) {
              matches = studentMatchesBatch(st.batch, row.batchLabel, row.batchNumber);
            } else {
              matches = doesStudentIdMatchParsedExpression(st.diu_id, row.parsedRange);
            }
          } else if (payload.assignmentMode === "batch") {
            const targetBatch = payload.selectedBatchForAll || row.batchLabel;
            matches = studentMatchesBatch(st.batch, targetBatch, row.batchNumber);
          } else if (payload.assignmentMode === "individual") {
            matches = Boolean(payload.selectedStudentIds?.includes(st.id));
          }

          if (matches && !seenStudentIds.has(st.id)) {
            seenStudentIds.add(st.id);
            const existing = existingAssignmentByStudent.get(st.id);
            matchedStudents.push({
              studentId: st.id,
              diuId: st.diu_id,
              fullName: st.full_name,
              batch: st.batch,
              targetAdvisorEmail: row.email,
              targetAdvisorName: row.advisorName,
              sourceRowNumber: row.sourceRowNumber,
              existingAdvisorName: existing?.advisorName || null,
              hasExistingAssignment: Boolean(existing),
            });
          }
        }
      }
    }

    const conflictsCount = matchedStudents.filter((m) => m.hasExistingAssignment).length;
    const newAssignmentsCount = matchedStudents.filter((m) => !m.hasExistingAssignment).length;
    const existingAssignmentsRetainedCount =
      payload.commitMode === "replace_batches" ? 0 : conflictsCount;
    const overwrittenAssignmentsCount =
      payload.commitMode === "replace_batches" ? conflictsCount : 0;

    return {
      success: true,
      data: {
        advisorsToCreate,
        advisorsToUpdate: payload.commitMode === "add_only" ? 0 : advisorsToUpdate,
        newAssignmentsCount,
        existingAssignmentsRetainedCount,
        overwrittenAssignmentsCount,
        conflictsCount,
        unmatchedIndividualIds: Array.from(unmatchedSet),
        blockingRowsCount,
        totalAffectedStudents: matchedStudents.length,
        affectedBatches: Array.from(affectedBatchSet),
        hasAllBatchRule,
        matchedStudents,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to preview roster import.",
    };
  }
}

export async function commitRosterImportAction(payload: {
  fileName: string;
  worksheetName: string;
  semesterId: string;
  departmentCode?: string;
  assignmentMode: AssignmentStrategyMode;
  commitMode: RosterCommitMode;
  rows: ParsedRosterRow[];
  matchedStudents: PreviewMatchedStudent[];
  replaceConfirmed?: boolean;
  allRuleConfirmed?: boolean;
}): Promise<AdminActionResult<{ importBatchId: string; advisorsProcessed: number; assignmentsCreated: number }>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const revalidated = revalidateParsedRosterRows(payload.rows);
  const activeRows = revalidated.filter((r) => !r.excluded);
  const blocking = activeRows.filter(
    (r) => r.validationStatus === "error" || r.validationStatus === "needs_review"
  );

  if (blocking.length > 0) {
    return {
      success: false,
      error: `Cannot commit import: ${blocking.length} row(s) still require manual correction or exclusion.`,
    };
  }

  const hasAllRule = activeRows.some((r) => r.parsedRange.isAllInBatch);
  if (hasAllRule && payload.assignmentMode !== "advisors_only" && !payload.allRuleConfirmed) {
    return {
      success: false,
      error: 'Explicit Admin confirmation is required for batch-scoped "All" assignment rules.',
    };
  }

  if (payload.commitMode === "replace_batches" && !payload.replaceConfirmed) {
    return {
      success: false,
      error: "Explicit confirmation is required before replacing existing batch assignments.",
    };
  }

  try {
    const supabase = await getSupabaseServerClient();

    // 1. Create import audit header
    const importHeader = {
      file_name: payload.fileName,
      worksheet_name: payload.worksheetName,
      semester_id: payload.semesterId,
      department_code: payload.departmentCode || null,
      assignment_mode: payload.assignmentMode,
      commit_mode: payload.commitMode,
      imported_by: adminUser.id,
      summary: {
        totalRows: revalidated.length,
        activeRows: activeRows.length,
        matchedStudents: payload.matchedStudents.length,
      },
      warnings: activeRows.flatMap((r) => r.warnings.map((w) => `Row ${r.sourceRowNumber}: ${w}`)),
      status: "completed" as const,
    };

    const { data: importRecord, error: impErr } = await (
      supabase.from("advisor_roster_imports") as unknown as {
        insert: (p: typeof importHeader) => {
          select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
        };
      }
    )
      .insert(importHeader)
      .select()
      .single();

    if (impErr || !importRecord) {
      return { success: false, error: `Failed to record import batch: ${impErr?.message || "Unknown error"}` };
    }

    const importBatchId = importRecord.id;

    // 2. Persist import row snapshots
    const rowSnapshots = revalidated.map((r) => ({
      import_batch_id: importBatchId,
      source_row_number: r.sourceRowNumber,
      semester_code: r.semesterCode || null,
      batch_label: r.batchLabel || null,
      batch_number: r.batchNumber || null,
      serial_number: r.serialNumber || null,
      advisor_name: r.advisorName || null,
      designation: r.designation || null,
      student_id_range_raw: r.studentIdRangeRaw || null,
      room_number: r.roomNumber || null,
      schedule: r.schedule || null,
      email: r.email || null,
      phone: r.phone || null,
      validation_status: r.validationStatus,
      warning_details: [...r.errors, ...r.warnings],
      matched_student_count: payload.matchedStudents.filter(
        (m) => m.sourceRowNumber === r.sourceRowNumber
      ).length,
    }));

    if (rowSnapshots.length > 0) {
      await (
        supabase.from("advisor_roster_import_rows") as unknown as {
          insert: (p: typeof rowSnapshots) => Promise<{ error: { message: string } | null }>;
        }
      ).insert(rowSnapshots);
    }

    // 3. Upsert / update advisor_profiles (without auto-creating Auth accounts or deactivating missing advisors)
    const advisorIdByEmail = new Map<string, string>();
    let advisorsProcessed = 0;

    for (const row of activeRows) {
      const normEmail = row.email.trim().toLowerCase();
      if (!normEmail || advisorIdByEmail.has(normEmail)) continue;

      const { data: existingAdv } = await supabase
        .from("advisor_profiles")
        .select("id")
        .eq("email", normEmail)
        .maybeSingle();

      if (existingAdv) {
        const advId = (existingAdv as { id: string }).id;
        advisorIdByEmail.set(normEmail, advId);

        if (payload.commitMode === "update_and_add" || payload.commitMode === "replace_batches") {
          await (
            supabase.from("advisor_profiles") as unknown as {
              update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
            }
          )
            .update({
              full_name: row.advisorName,
              designation: row.designation || null,
              phone: row.phone || null,
              room_number: row.roomNumber || null,
              schedule: row.schedule || null,
              department_code: payload.departmentCode || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", advId);
          advisorsProcessed++;
        }
      } else {
        const { data: linkedProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", normEmail)
          .maybeSingle();

        const { data: createdAdv } = await (
          supabase.from("advisor_profiles") as unknown as {
            insert: (p: Record<string, unknown>) => {
              select: () => { single: () => Promise<{ data: { id: string } | null }> };
            };
          }
        )
          .insert({
            profile_id: (linkedProfile as { id: string } | null)?.id ?? null,
            full_name: row.advisorName,
            designation: row.designation || null,
            email: normEmail,
            phone: row.phone || null,
            room_number: row.roomNumber || null,
            schedule: row.schedule || null,
            department_code: payload.departmentCode || null,
            is_active: true,
            created_by: adminUser.id,
          })
          .select()
          .single();

        if (createdAdv?.id) {
          advisorIdByEmail.set(normEmail, createdAdv.id);
          advisorsProcessed++;
        }
      }
    }

    // 4. Persist advisor_assignment_rules (id_range, entire_batch, individual_student) + student assignments
    let rulesCreated = 0;
    let assignmentsCreated = 0;

    if (payload.assignmentMode !== "advisors_only") {
      // Persist rules per active row (ignoring exact duplicates via unique index)
      for (const row of activeRows) {
        const normEmail = row.email.trim().toLowerCase();
        const advisorProfileId = advisorIdByEmail.get(normEmail);
        if (!advisorProfileId) continue;

        const batchVal = (row.batchNumber || row.batchLabel || "").trim();
        if (!batchVal) continue;

        if (row.parsedRange.isAllInBatch || payload.assignmentMode === "batch") {
          const { error: ruleErr } = await (
            supabase.from("advisor_assignment_rules") as unknown as {
              insert: (p: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
            }
          ).insert({
            advisor_profile_id: advisorProfileId,
            semester_id: payload.semesterId,
            batch: batchVal,
            assignment_type: "entire_batch",
            is_active: true,
            source: "excel_import",
            import_batch_id: importBatchId,
            created_by: adminUser.id,
            updated_by: adminUser.id,
          });
          if (!ruleErr) rulesCreated++;
        } else {
          for (const rng of row.parsedRange.ranges) {
            const { error: ruleErr } = await (
              supabase.from("advisor_assignment_rules") as unknown as {
                insert: (p: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
              }
            ).insert({
              advisor_profile_id: advisorProfileId,
              semester_id: payload.semesterId,
              batch: batchVal,
              student_id_prefix: rng.prefix,
              start_student_id: rng.startFull,
              end_student_id: rng.endFull,
              assignment_type: "id_range",
              is_active: true,
              source: "excel_import",
              import_batch_id: importBatchId,
              created_by: adminUser.id,
              updated_by: adminUser.id,
            });
            if (!ruleErr) rulesCreated++;
          }
        }
      }

      for (const match of payload.matchedStudents) {
        if (match.hasExistingAssignment && payload.commitMode !== "replace_batches") {
          // Never overwrite existing assignments by default
          continue;
        }

        const advisorProfileId = advisorIdByEmail.get(match.targetAdvisorEmail.trim().toLowerCase());
        if (!advisorProfileId) continue;

        const sourceRow = activeRows.find((r) => r.sourceRowNumber === match.sourceRowNumber);

        const { error: rpcErr } = await (
          supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ error: { message: string } | null }>
        )("admin_assign_student_advisor", {
          p_student_id: match.studentId,
          p_advisor_profile_id: advisorProfileId,
          p_semester_id: payload.semesterId,
          p_assignment_source: "excel_import",
          p_assignment_rule_type: payload.assignmentMode === "batch" ? "batch" : "range",
          p_source_range_raw: sourceRow?.studentIdRangeRaw || null,
          p_import_batch_id: importBatchId,
          p_reason: `Imported from ${payload.fileName} (${payload.worksheetName})`,
        });

        if (!rpcErr) {
          assignmentsCreated++;
        }
      }
    }

    // 5. Record overall import audit event
    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "ROSTER_IMPORTED",
      entity_type: "advisor_roster_import",
      entity_id: importBatchId,
      import_batch_id: importBatchId,
      after_data: {
        fileName: payload.fileName,
        worksheetName: payload.worksheetName,
        advisorsProcessed,
        rulesCreated,
        assignmentsCreated,
        commitMode: payload.commitMode,
        assignmentMode: payload.assignmentMode,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/advisors");
    revalidatePath("/admin/assignments");
    revalidatePath("/admin/import");

    return {
      success: true,
      data: { importBatchId, advisorsProcessed, assignmentsCreated },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Transactional import failed.",
    };
  }
}
