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

export interface AdvisorDetailPayload {
  advisor: AdvisorProfileRow;
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

    const [assignmentsRes, historyRes, studentsRes, semestersRes] = await Promise.all([
      supabase
        .from("advisor_assignments")
        .select("id, student_id, semester_id, assignment_source, assignment_rule_type, assigned_at, advisor_profile_id, advisor_id")
        .eq("is_active", true),
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

    return {
      success: true,
      data: {
        advisor: advRow,
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
