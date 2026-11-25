"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  parseStudentIdExpression,
  doesStudentIdMatchParsedExpression,
} from "@/lib/import/student-id-range-parser";
import type { AdminActionResult } from "@/app/admin/actions";

export interface StudentAssignmentOverviewRow {
  studentId: string;
  diuId: string | null;
  studentName: string;
  studentEmail: string;
  batch: string | null;
  departmentCode: string | null;
  assignmentId: string | null;
  advisorProfileId: string | null;
  advisorName: string | null;
  advisorEmail: string | null;
  semesterId: string;
  assignmentSource: string | null;
  assignmentRuleType: string | null;
  sourceRangeRaw: string | null;
  assignmentStatus: "assigned" | "unassigned" | "conflict";
  lastUpdated: string | null;
  updatedByName: string | null;
}

export interface StudentAssignmentHistoryItem {
  id: string;
  action: string;
  previousAdvisorName: string | null;
  newAdvisorName: string | null;
  assignmentSource: string;
  assignmentRuleType: string;
  reason: string | null;
  createdAt: string;
}

export async function getStudentAssignmentHistoryAction(
  studentId: string,
  semesterId?: string
): Promise<AdminActionResult<StudentAssignmentHistoryItem[]>> {
  await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    let query = supabase
      .from("advisor_assignment_history")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (semesterId) {
      query = query.eq("semester_id", semesterId);
    }

    const [histRes, advRes] = await Promise.all([
      query,
      supabase.from("advisor_profiles").select("id, full_name"),
    ]);

    if (histRes.error) {
      return { success: false, error: histRes.error.message };
    }

    const advMap = new Map<string, string>();
    for (const a of (advRes.data || []) as { id: string; full_name: string }[]) {
      advMap.set(a.id, a.full_name);
    }

    const items: StudentAssignmentHistoryItem[] = ((histRes.data || []) as {
      id: string;
      action: string;
      previous_advisor_profile_id: string | null;
      new_advisor_profile_id: string | null;
      assignment_source: string;
      assignment_rule_type: string;
      reason: string | null;
      created_at: string;
    }[]).map((h) => ({
      id: h.id,
      action: h.action,
      previousAdvisorName: h.previous_advisor_profile_id
        ? advMap.get(h.previous_advisor_profile_id) || "Previous Advisor"
        : null,
      newAdvisorName: h.new_advisor_profile_id
        ? advMap.get(h.new_advisor_profile_id) || "Assigned Advisor"
        : null,
      assignmentSource: h.assignment_source,
      assignmentRuleType: h.assignment_rule_type,
      reason: h.reason,
      createdAt: h.created_at,
    }));

    return { success: true, data: items };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load assignment history.",
    };
  }
}

export async function assignIndividualStudentAction(payload: {
  studentId: string;
  advisorProfileId: string;
  semesterId: string;
  reason: string;
}): Promise<AdminActionResult<{ assignmentId: string }>> {
  await requireAdmin();

  if (!payload.studentId || !payload.advisorProfileId || !payload.semesterId) {
    return { success: false, error: "Student, advisor, and semester are required." };
  }
  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Please provide a reason for this assignment." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: string | null; error: { message: string } | null }>
    )("admin_assign_student_advisor", {
      p_student_id: payload.studentId,
      p_advisor_profile_id: payload.advisorProfileId,
      p_semester_id: payload.semesterId,
      p_assignment_source: "manual",
      p_assignment_rule_type: "individual",
      p_source_range_raw: null,
      p_import_batch_id: null,
      p_reason: payload.reason.trim(),
    });

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to assign advisor." };
    }

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/advisors");
    revalidatePath("/admin");
    return { success: true, data: { assignmentId: data } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign advisor.",
    };
  }
}

export async function bulkAssignStudentsAction(payload: {
  studentIds: string[];
  advisorProfileId: string;
  semesterId: string;
  ruleType: "batch" | "range" | "individual";
  source: "batch_rule" | "range_rule" | "reassignment" | "manual";
  sourceRangeRaw?: string;
  reason: string;
  overrideExistingIndividual?: boolean;
}): Promise<AdminActionResult<{ assignedCount: number; skippedIndividualCount: number }>> {
  await requireAdmin();

  if (!payload.advisorProfileId || !payload.semesterId || payload.studentIds.length === 0) {
    return { success: false, error: "Advisor, semester, and at least one student are required." };
  }
  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Audit reason is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();

    // Precedence check: range/batch assignments must not silently override individual assignments
    const { data: existingRows } = await supabase
      .from("advisor_assignments")
      .select("student_id, assignment_rule_type, is_active")
      .eq("semester_id", payload.semesterId)
      .eq("is_active", true)
      .in("student_id", payload.studentIds);

    const individualAssignedSet = new Set(
      ((existingRows || []) as { student_id: string; assignment_rule_type: string }[])
        .filter((r) => r.assignment_rule_type === "individual")
        .map((r) => r.student_id)
    );

    let assignedCount = 0;
    let skippedIndividualCount = 0;

    for (const studentId of payload.studentIds) {
      if (
        (payload.ruleType === "batch" || payload.ruleType === "range") &&
        individualAssignedSet.has(studentId) &&
        !payload.overrideExistingIndividual
      ) {
        skippedIndividualCount++;
        continue;
      }

      const { error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>
      )("admin_assign_student_advisor", {
        p_student_id: studentId,
        p_advisor_profile_id: payload.advisorProfileId,
        p_semester_id: payload.semesterId,
        p_assignment_source: payload.source,
        p_assignment_rule_type: payload.ruleType,
        p_source_range_raw: payload.sourceRangeRaw || null,
        p_import_batch_id: null,
        p_reason: payload.reason.trim(),
      });

      if (!error) {
        assignedCount++;
      }
    }

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/advisors");
    revalidatePath("/admin");

    return {
      success: true,
      data: { assignedCount, skippedIndividualCount },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bulk assignment failed.",
    };
  }
}

export async function previewRangeMatchAction(payload: {
  rangeExpression: string;
  semesterId: string;
  batchFilter?: string;
}): Promise<
  AdminActionResult<{
    matchedStudents: {
      id: string;
      diuId: string | null;
      fullName: string;
      batch: string | null;
      hasIndividualAssignment: boolean;
    }[];
    errors: string[];
    warnings: string[];
  }>
> {
  await requireAdmin();

  const parsed = parseStudentIdExpression(payload.rangeExpression);
  if (parsed.errors.length > 0 || parsed.needsManualReview) {
    return {
      success: false,
      error: parsed.errors[0] || "Range expression requires manual review.",
    };
  }

  if (parsed.isAllInBatch) {
    return {
      success: false,
      error: '"All" is not allowed in the ID range editor. Use Batch-Wide Assignment instead.',
    };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const [studentsRes, assignRes] = await Promise.all([
      supabase.from("profiles").select("id, diu_id, full_name, batch").eq("role", "student"),
      supabase
        .from("advisor_assignments")
        .select("student_id, assignment_rule_type, is_active")
        .eq("semester_id", payload.semesterId)
        .eq("is_active", true),
    ]);

    if (studentsRes.error) {
      return { success: false, error: studentsRes.error.message };
    }

    const individualSet = new Set(
      ((assignRes.data || []) as { student_id: string; assignment_rule_type: string }[])
        .filter((a) => a.assignment_rule_type === "individual")
        .map((a) => a.student_id)
    );

    const matchedStudents = ((studentsRes.data || []) as {
      id: string;
      diu_id: string | null;
      full_name: string;
      batch: string | null;
    }[])
      .filter((st) => {
        if (payload.batchFilter && st.batch !== payload.batchFilter) return false;
        return doesStudentIdMatchParsedExpression(st.diu_id, parsed);
      })
      .map((st) => ({
        id: st.id,
        diuId: st.diu_id,
        fullName: st.full_name,
        batch: st.batch,
        hasIndividualAssignment: individualSet.has(st.id),
      }));

    return {
      success: true,
      data: {
        matchedStudents,
        errors: parsed.errors,
        warnings: parsed.warnings,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to preview range match.",
    };
  }
}
