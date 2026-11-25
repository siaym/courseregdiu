"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  createAdvisorSchema,
  updateAdvisorSchema,
  toggleAdvisorActiveSchema,
  type CreateAdvisorInput,
  type UpdateAdvisorInput,
  type ToggleAdvisorActiveInput,
} from "@/lib/validations/admin-panel";
import type { AdminActionResult } from "@/app/admin/actions";
import type { AdvisorProfileRow } from "@/lib/admin/admin-service";
import {
  parseStudentIdExpression,
  doesStudentIdMatchParsedExpression,
} from "@/lib/import/student-id-range-parser";
import type { Database } from "@/types/database";

export type AdvisorAssignmentRuleRow = Database["public"]["Tables"]["advisor_assignment_rules"]["Row"];

export interface AdvisorRulePreview {
  matchedCount: number;
  conflictStudents: {
    studentId: string;
    diuId: string | null;
    fullName: string;
    currentAdvisorName: string;
    currentAdvisorProfileId: string | null;
  }[];
  matchedStudents: {
    studentId: string;
    diuId: string | null;
    fullName: string;
    batch: string | null;
  }[];
}

export interface AdvisorDetailPayload {
  advisor: AdvisorProfileRow;
  rules: (AdvisorAssignmentRuleRow & { semesterLabel: string })[];
  assignedStudents: {
    assignmentId: string;
    studentId: string;
    diuId: string | null;
    fullName: string;
    email: string;
    batch: string | null;
    departmentCode: string | null;
    semesterId: string;
    semesterLabel: string;
    assignmentSource: string;
    assignmentRuleType: string;
    assignedAt: string;
  }[];
  history: {
    id: string;
    studentId: string;
    studentName: string;
    studentDiuId: string | null;
    semesterLabel: string;
    action: string;
    reason: string | null;
    createdAt: string;
  }[];
}

export async function createAdvisorAction(
  rawInput: CreateAdvisorInput
): Promise<AdminActionResult<AdvisorProfileRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = createAdvisorSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[key.toString()] = issue.message;
    });
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const data = parsed.data;
  const normEmail = data.email.trim().toLowerCase();

  try {
    const supabase = await getSupabaseServerClient();

    // Enforce normalized email uniqueness across advisor_profiles
    const { data: existingAdvisor, error: checkErr } = await supabase
      .from("advisor_profiles")
      .select("id, full_name, email")
      .eq("email", normEmail)
      .maybeSingle();

    if (checkErr) {
      return { success: false, error: `Database error: ${checkErr.message}` };
    }

    if (existingAdvisor) {
      return {
        success: false,
        error: `An advisor profile with email "${normEmail}" already exists. Edit the existing advisor instead of creating a duplicate.`,
      };
    }

    // Check if a verified profiles identity already exists for this email (link if so, do NOT auto-authorize login)
    const { data: linkedProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normEmail)
      .maybeSingle();

    const insertPayload = {
      profile_id: (linkedProfile as { id: string } | null)?.id ?? null,
      full_name: data.fullName,
      designation: data.designation || null,
      email: normEmail,
      phone: data.phone || null,
      room_number: data.roomNumber || null,
      schedule: data.schedule || null,
      department_code: data.departmentCode || null,
      employee_id: data.employeeId || null,
      is_active: data.isActive,
      created_by: adminUser.id,
    };

    const { data: created, error: insertErr } = await (
      supabase.from("advisor_profiles") as unknown as {
        insert: (p: typeof insertPayload) => {
          select: () => { single: () => Promise<{ data: AdvisorProfileRow | null; error: { message: string } | null }> };
        };
      }
    )
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !created) {
      return {
        success: false,
        error: `Failed to create advisor profile: ${insertErr?.message || "Unknown database error"}`,
      };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "ADVISOR_CREATED",
      entity_type: "advisor_profile",
      entity_id: created.id,
      after_data: created,
    });

    revalidatePath("/admin/advisors");
    revalidatePath("/admin");
    return { success: true, data: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error creating advisor.",
    };
  }
}

export async function updateAdvisorAction(
  rawInput: UpdateAdvisorInput
): Promise<AdminActionResult<AdvisorProfileRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = updateAdvisorSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[key.toString()] = issue.message;
    });
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const data = parsed.data;
  const normEmail = data.email.trim().toLowerCase();

  try {
    const supabase = await getSupabaseServerClient();

    const { data: beforeRow, error: fetchErr } = await supabase
      .from("advisor_profiles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !beforeRow) {
      return { success: false, error: fetchErr?.message || "Advisor profile not found." };
    }

    const { data: emailConflict } = await supabase
      .from("advisor_profiles")
      .select("id")
      .eq("email", normEmail)
      .neq("id", data.id)
      .maybeSingle();

    if (emailConflict) {
      return {
        success: false,
        error: `Another advisor already uses "${normEmail}".`,
      };
    }

    const updatePayload = {
      full_name: data.fullName,
      designation: data.designation || null,
      email: normEmail,
      phone: data.phone || null,
      room_number: data.roomNumber || null,
      schedule: data.schedule || null,
      department_code: data.departmentCode || null,
      employee_id: data.employeeId || null,
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await (
      supabase.from("advisor_profiles") as unknown as {
        update: (p: typeof updatePayload) => {
          eq: (c: string, v: string) => {
            select: () => { single: () => Promise<{ data: AdvisorProfileRow | null; error: { message: string } | null }> };
          };
        };
      }
    )
      .update(updatePayload)
      .eq("id", data.id)
      .select()
      .single();

    if (updateErr || !updated) {
      return {
        success: false,
        error: `Failed to update advisor: ${updateErr?.message || "Unknown error"}`,
      };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "ADVISOR_UPDATED",
      entity_type: "advisor_profile",
      entity_id: updated.id,
      before_data: beforeRow,
      after_data: updated,
    });

    revalidatePath("/admin/advisors");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error updating advisor.",
    };
  }
}

export async function toggleAdvisorActiveAction(
  rawInput: ToggleAdvisorActiveInput
): Promise<AdminActionResult<AdvisorProfileRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = toggleAdvisorActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid request." };
  }

  const { id, isActive, reason } = parsed.data;

  try {
    const supabase = await getSupabaseServerClient();

    const { data: beforeRow, error: fetchErr } = await supabase
      .from("advisor_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !beforeRow) {
      return { success: false, error: fetchErr?.message || "Advisor profile not found." };
    }

    const { data: updated, error: updateErr } = await (
      supabase.from("advisor_profiles") as unknown as {
        update: (p: { is_active: boolean; updated_at: string }) => {
          eq: (c: string, v: string) => {
            select: () => { single: () => Promise<{ data: AdvisorProfileRow | null; error: { message: string } | null }> };
          };
        };
      }
    )
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || "Failed to update advisor status." };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: isActive ? "ADVISOR_ACTIVATED" : "ADVISOR_DEACTIVATED",
      entity_type: "advisor_profile",
      entity_id: id,
      reason,
      before_data: { is_active: (beforeRow as AdvisorProfileRow).is_active },
      after_data: { is_active: isActive },
    });

    revalidatePath("/admin/advisors");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error toggling advisor status.",
    };
  }
}

export async function getAdvisorDetailAction(
  advisorId: string
): Promise<AdminActionResult<AdvisorDetailPayload>> {
  await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();

    const { data: advisor, error: advErr } = await supabase
      .from("advisor_profiles")
      .select("*")
      .eq("id", advisorId)
      .maybeSingle();

    if (advErr || !advisor) {
      return { success: false, error: advErr?.message || "Advisor not found." };
    }

    const advRow = advisor as AdvisorProfileRow;

    const [assignmentsRes, rulesRes, historyRes, studentsRes, semestersRes] = await Promise.all([
      supabase
        .from("advisor_assignments")
        .select("id, student_id, semester_id, assignment_source, assignment_rule_type, assigned_at, advisor_profile_id, advisor_id")
        .eq("is_active", true),
      supabase
        .from("advisor_assignment_rules")
        .select("*")
        .eq("advisor_profile_id", advRow.id)
        .order("batch", { ascending: true }),
      supabase
        .from("advisor_assignment_history")
        .select("*")
        .or(
          advRow.profile_id
            ? `new_advisor_profile_id.eq.${advRow.id},previous_advisor_profile_id.eq.${advRow.id},new_advisor_id.eq.${advRow.profile_id}`
            : `new_advisor_profile_id.eq.${advRow.id},previous_advisor_profile_id.eq.${advRow.id}`
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("id, diu_id, full_name, email, batch, department_code").eq("role", "student"),
      supabase.from("semesters").select("id, name, season, year"),
    ]);

    const studentMap = new Map<
      string,
      { id: string; diu_id: string | null; full_name: string; email: string; batch: string | null; department_code: string | null }
    >();
    for (const s of (studentsRes.data || []) as {
      id: string;
      diu_id: string | null;
      full_name: string;
      email: string;
      batch: string | null;
      department_code: string | null;
    }[]) {
      studentMap.set(s.id, s);
    }

    const semesterMap = new Map<string, string>();
    for (const sem of (semestersRes.data || []) as { id: string; name: string | null; season: string; year: number }[]) {
      semesterMap.set(
        sem.id,
        sem.name || `${sem.season.charAt(0).toUpperCase() + sem.season.slice(1)} ${sem.year}`
      );
    }

    const assignedStudents = ((assignmentsRes.data || []) as {
      id: string;
      student_id: string;
      semester_id: string;
      assignment_source: string;
      assignment_rule_type: string;
      assigned_at: string;
      advisor_profile_id: string | null;
      advisor_id: string | null;
    }[])
      .filter((a) => a.advisor_profile_id === advRow.id || (advRow.profile_id && a.advisor_id === advRow.profile_id))
      .map((a) => {
        const st = studentMap.get(a.student_id);
        return {
          assignmentId: a.id,
          studentId: a.student_id,
          diuId: st?.diu_id ?? null,
          fullName: st?.full_name ?? "Unknown Student",
          email: st?.email ?? "",
          batch: st?.batch ?? null,
          departmentCode: st?.department_code ?? null,
          semesterId: a.semester_id,
          semesterLabel: semesterMap.get(a.semester_id) || a.semester_id,
          assignmentSource: a.assignment_source,
          assignmentRuleType: a.assignment_rule_type,
          assignedAt: a.assigned_at,
        };
      });

    const history = ((historyRes.data || []) as {
      id: string;
      student_id: string;
      semester_id: string;
      action: string;
      reason: string | null;
      created_at: string;
    }[]).map((h) => {
      const st = studentMap.get(h.student_id);
      return {
        id: h.id,
        studentId: h.student_id,
        studentName: st?.full_name ?? "Unknown Student",
        studentDiuId: st?.diu_id ?? null,
        semesterLabel: semesterMap.get(h.semester_id) || h.semester_id,
        action: h.action,
        reason: h.reason,
        createdAt: h.created_at,
      };
    });

    const rules = ((rulesRes.error ? [] : rulesRes.data || []) as AdvisorAssignmentRuleRow[]).map(
      (r) => ({
        ...r,
        semesterLabel: semesterMap.get(r.semester_id) || r.semester_id,
      })
    );

    return {
      success: true,
      data: {
        advisor: advRow,
        rules,
        assignedStudents,
        history,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load advisor details.",
    };
  }
}

function studentMatchesRuleBatch(studentBatch: string | null, targetBatch: string): boolean {
  if (!studentBatch) return false;
  const sb = studentBatch.trim().toLowerCase();
  const tb = targetBatch.trim().toLowerCase();
  return sb === tb || sb.startsWith(`${tb} `) || sb.startsWith(`${tb}st`) || sb.startsWith(`${tb}nd`) || sb.startsWith(`${tb}rd`) || sb.startsWith(`${tb}th`);
}

export async function previewAdvisorRuleAction(payload: {
  advisorProfileId: string;
  semesterId: string;
  batch: string;
  assignmentType: "id_range" | "entire_batch" | "individual_student";
  startStudentId?: string;
  endStudentId?: string;
  studentDiuId?: string;
}): Promise<AdminActionResult<AdvisorRulePreview>> {
  await requireAdmin();

  if (!payload.batch.trim()) {
    return { success: false, error: "Batch is required." };
  }

  let parsed = null;
  if (payload.assignmentType === "id_range") {
    if (!payload.startStudentId?.trim() || !payload.endStudentId?.trim()) {
      return { success: false, error: "Start Student ID and End Student ID are required." };
    }
    parsed = parseStudentIdExpression(`${payload.startStudentId.trim()} to ${payload.endStudentId.trim()}`);
    if (parsed.errors.length > 0 || parsed.ranges.length === 0) {
      return { success: false, error: parsed.errors[0] || "Invalid student ID range." };
    }
  } else if (payload.assignmentType === "individual_student") {
    if (!payload.studentDiuId?.trim()) {
      return { success: false, error: "Student DIU ID is required." };
    }
    parsed = parseStudentIdExpression(payload.studentDiuId.trim());
    if (parsed.errors.length > 0) {
      return { success: false, error: parsed.errors[0] };
    }
  }

  try {
    const supabase = await getSupabaseServerClient();
    const [studentsRes, assignRes, advisorsRes] = await Promise.all([
      supabase.from("profiles").select("id, diu_id, full_name, batch").eq("role", "student"),
      supabase
        .from("advisor_assignments")
        .select("student_id, advisor_profile_id, is_active")
        .eq("semester_id", payload.semesterId)
        .eq("is_active", true),
      supabase.from("advisor_profiles").select("id, full_name"),
    ]);

    if (studentsRes.error) return { success: false, error: studentsRes.error.message };

    const advisorNameMap = new Map<string, string>();
    for (const a of (advisorsRes.data || []) as { id: string; full_name: string }[]) {
      advisorNameMap.set(a.id, a.full_name);
    }

    const existingAssignMap = new Map<string, string | null>();
    for (const asg of (assignRes.data || []) as { student_id: string; advisor_profile_id: string | null }[]) {
      existingAssignMap.set(asg.student_id, asg.advisor_profile_id);
    }

    const matchedStudents: AdvisorRulePreview["matchedStudents"] = [];
    const conflictStudents: AdvisorRulePreview["conflictStudents"] = [];

    for (const st of (studentsRes.data || []) as {
      id: string;
      diu_id: string | null;
      full_name: string;
      batch: string | null;
    }[]) {
      let matches = false;
      if (payload.assignmentType === "entire_batch") {
        matches = studentMatchesRuleBatch(st.batch, payload.batch);
      } else if (parsed) {
        matches = doesStudentIdMatchParsedExpression(st.diu_id, parsed);
      }

      if (!matches) continue;
      matchedStudents.push({
        studentId: st.id,
        diuId: st.diu_id,
        fullName: st.full_name,
        batch: st.batch,
      });

      const currentAdvId = existingAssignMap.get(st.id);
      if (currentAdvId && currentAdvId !== payload.advisorProfileId) {
        conflictStudents.push({
          studentId: st.id,
          diuId: st.diu_id,
          fullName: st.full_name,
          currentAdvisorName: advisorNameMap.get(currentAdvId) || "Another Advisor",
          currentAdvisorProfileId: currentAdvId,
        });
      }
    }

    return {
      success: true,
      data: {
        matchedCount: matchedStudents.length,
        conflictStudents,
        matchedStudents,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to preview rule impact.",
    };
  }
}

export async function saveAdvisorRuleAction(payload: {
  ruleId?: string;
  advisorProfileId: string;
  semesterId: string;
  batch: string;
  assignmentType: "id_range" | "entire_batch" | "individual_student";
  startStudentId?: string;
  endStudentId?: string;
  studentDiuId?: string;
  reason: string;
  confirmOverwriteConflicts?: boolean;
}): Promise<AdminActionResult<{ ruleId: string; assignedCount: number; skippedConflicts: number }>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Audit reason is required." };
  }

  const preview = await previewAdvisorRuleAction(payload);
  if (!preview.success || !preview.data) {
    return { success: false, error: preview.error || "Invalid rule." };
  }

  if (preview.data.conflictStudents.length > 0 && !payload.confirmOverwriteConflicts) {
    return {
      success: false,
      error: `${preview.data.conflictStudents.length} student(s) are currently assigned to another advisor. Explicitly confirm reassignment to proceed.`,
    };
  }

  let prefix: string | null = null;
  let startId: string | null = null;
  let endId: string | null = null;
  let individualStudentUuid: string | null = null;

  if (payload.assignmentType === "id_range") {
    const parsed = parseStudentIdExpression(`${payload.startStudentId!.trim()} to ${payload.endStudentId!.trim()}`);
    prefix = parsed.ranges[0]?.prefix || null;
    startId = parsed.ranges[0]?.startFull || payload.startStudentId!.trim();
    endId = parsed.ranges[0]?.endFull || payload.endStudentId!.trim();
  } else if (payload.assignmentType === "individual_student") {
    individualStudentUuid = preview.data.matchedStudents[0]?.studentId || null;
  }

  try {
    const supabase = await getSupabaseServerClient();
    const now = new Date().toISOString();
    let savedRuleId = payload.ruleId || "";

    if (payload.ruleId) {
      const { data: beforeRule } = await supabase
        .from("advisor_assignment_rules")
        .select("*")
        .eq("id", payload.ruleId)
        .maybeSingle();

      const { data: updated, error: updErr } = await (
        supabase.from("advisor_assignment_rules") as unknown as {
          update: (p: Record<string, unknown>) => {
            eq: (c: string, v: string) => { select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
          };
        }
      )
        .update({
          semester_id: payload.semesterId,
          batch: payload.batch.trim(),
          student_id_prefix: prefix,
          start_student_id: startId,
          end_student_id: endId,
          student_id: individualStudentUuid,
          assignment_type: payload.assignmentType,
          updated_by: adminUser.id,
          updated_at: now,
        })
        .eq("id", payload.ruleId)
        .select()
        .single();

      if (updErr || !updated) {
        return { success: false, error: updErr?.message || "Failed to update rule." };
      }
      savedRuleId = updated.id;

      await (
        supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
      ).insert({
        actor_id: adminUser.id,
        actor_role: adminProfile.role,
        action: "ADVISOR_RULE_UPDATED",
        entity_type: "advisor_assignment_rule",
        entity_id: savedRuleId,
        reason: payload.reason.trim(),
        before_data: beforeRule,
        after_data: payload,
      });
    } else {
      const { data: inserted, error: insErr } = await (
        supabase.from("advisor_assignment_rules") as unknown as {
          insert: (p: Record<string, unknown>) => {
            select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
          };
        }
      )
        .insert({
          advisor_profile_id: payload.advisorProfileId,
          semester_id: payload.semesterId,
          batch: payload.batch.trim(),
          student_id_prefix: prefix,
          start_student_id: startId,
          end_student_id: endId,
          student_id: individualStudentUuid,
          assignment_type: payload.assignmentType,
          is_active: true,
          source: "manual",
          created_by: adminUser.id,
          updated_by: adminUser.id,
        })
        .select()
        .single();

      if (insErr || !inserted) {
        return { success: false, error: insErr?.message || "Failed to create rule (check for duplicate)." };
      }
      savedRuleId = inserted.id;

      await (
        supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
      ).insert({
        actor_id: adminUser.id,
        actor_role: adminProfile.role,
        action: "ADVISOR_RULE_CREATED",
        entity_type: "advisor_assignment_rule",
        entity_id: savedRuleId,
        reason: payload.reason.trim(),
        after_data: payload,
      });
    }

    const conflictIds = new Set(preview.data.conflictStudents.map((c) => c.studentId));
    let assignedCount = 0;
    let skippedConflicts = 0;

    for (const st of preview.data.matchedStudents) {
      if (conflictIds.has(st.studentId) && !payload.confirmOverwriteConflicts) {
        skippedConflicts++;
        continue;
      }
      const { error: rpcErr } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>
      )("admin_assign_student_advisor", {
        p_student_id: st.studentId,
        p_advisor_profile_id: payload.advisorProfileId,
        p_semester_id: payload.semesterId,
        p_assignment_source: "manual",
        p_assignment_rule_type:
          payload.assignmentType === "entire_batch"
            ? "batch"
            : payload.assignmentType === "individual_student"
            ? "individual"
            : "range",
        p_source_range_raw: startId && endId ? `${startId} to ${endId}` : `Batch ${payload.batch}`,
        p_import_batch_id: null,
        p_reason: payload.reason.trim(),
      });
      if (!rpcErr) assignedCount++;
    }

    revalidatePath("/admin/advisors");
    revalidatePath("/admin/assignments");
    revalidatePath("/admin");

    return {
      success: true,
      data: { ruleId: savedRuleId, assignedCount, skippedConflicts },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save advisor rule.",
    };
  }
}

export async function toggleAdvisorRuleActiveAction(payload: {
  ruleId: string;
  isActive: boolean;
  reason: string;
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();
  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Audit reason is required." };
  }
  try {
    const supabase = await getSupabaseServerClient();
    const { data: beforeRow } = await supabase
      .from("advisor_assignment_rules")
      .select("is_active")
      .eq("id", payload.ruleId)
      .maybeSingle();

    const { error } = await (
      supabase.from("advisor_assignment_rules") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      }
    )
      .update({
        is_active: payload.isActive,
        updated_by: adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.ruleId);

    if (error) return { success: false, error: error.message };

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: payload.isActive ? "ADVISOR_RULE_ACTIVATED" : "ADVISOR_RULE_DEACTIVATED",
      entity_type: "advisor_assignment_rule",
      entity_id: payload.ruleId,
      reason: payload.reason.trim(),
      before_data: beforeRow,
      after_data: { is_active: payload.isActive },
    });

    revalidatePath("/admin/advisors");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle rule status.",
    };
  }
}

export async function deleteAdvisorRuleAction(payload: {
  ruleId: string;
  reason: string;
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();
  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Audit reason is required." };
  }
  try {
    const supabase = await getSupabaseServerClient();
    const { data: beforeRow } = await supabase
      .from("advisor_assignment_rules")
      .select("*")
      .eq("id", payload.ruleId)
      .maybeSingle();

    const { error } = await supabase
      .from("advisor_assignment_rules")
      .delete()
      .eq("id", payload.ruleId);

    if (error) return { success: false, error: error.message };

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "ADVISOR_RULE_REMOVED",
      entity_type: "advisor_assignment_rule",
      entity_id: payload.ruleId,
      reason: payload.reason.trim(),
      before_data: beforeRow,
    });

    revalidatePath("/admin/advisors");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove rule.",
    };
  }
}

