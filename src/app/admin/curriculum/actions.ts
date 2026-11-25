"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  masterCourseSchema,
  updateMasterCourseSchema,
  computeAuthoritativeCredits,
  type MasterCourseInput,
  type UpdateMasterCourseInput,
  type SPECIALIZATION_GROUPS,
} from "@/lib/validations/curriculum";
import { CSE_CURRICULUM_DATASET } from "@/lib/curriculum/cse-curriculum-dataset";
import {
  inspectCourseWorkbook,
  parseCourseWorksheet,
  type CourseColumnKey,
  type ParsedCourseImportRow,
} from "@/lib/curriculum/course-import-parser";
import type { AdminActionResult } from "@/app/admin/actions";
import type { Database } from "@/types/database";

export type MasterCourseRow = Database["public"]["Tables"]["courses"]["Row"];

export async function createMasterCourseAction(
  rawInput: MasterCourseInput
): Promise<AdminActionResult<MasterCourseRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = masterCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid course input.",
    };
  }

  const data = parsed.data;
  const creditCheck = computeAuthoritativeCredits(
    data.theoryCredits ?? null,
    data.labCredits ?? null,
    data.totalCredits ?? null
  );
  if (!creditCheck.ok) {
    return { success: false, error: creditCheck.error || "Invalid credit values." };
  }

  const normCode = data.code.trim().toUpperCase();
  const normVariant = data.variant?.trim() || null;

  try {
    const supabase = await getSupabaseServerClient();

    // Check composite uniqueness (code + variant)
    const { data: existingList, error: checkErr } = await supabase
      .from("courses")
      .select("id, code, variant, title")
      .ilike("code", normCode);

    if (checkErr) {
      return { success: false, error: `Database error: ${checkErr.message}` };
    }

    const duplicate = ((existingList || []) as { id: string; code: string; variant: string | null }[]).find(
      (c) =>
        c.code.trim().toUpperCase() === normCode &&
        (c.variant?.trim().toLowerCase() || "") === (normVariant?.toLowerCase() || "")
    );

    if (duplicate) {
      return {
        success: false,
        error: `Course "${normCode}"${normVariant ? ` (Variant: ${normVariant})` : ""} already exists in the catalog. Use a different variant or edit the existing course.`,
      };
    }

    const insertPayload: Database["public"]["Tables"]["courses"]["Insert"] = {
      code: normCode,
      title: data.title.trim(),
      credits: creditCheck.totalCredits,
      theory_credits: data.theoryCredits ?? null,
      lab_credits: data.labCredits ?? null,
      category: data.category,
      specialization_group: data.specializationGroup ?? null,
      variant: normVariant,
      description: data.description?.trim() || null,
      department_code: data.departmentCode || "CSE",
      is_active: data.isActive,
      created_by: adminUser.id,
      updated_by: adminUser.id,
    };

    const { data: created, error: insertErr } = await (
      supabase.from("courses") as unknown as {
        insert: (p: typeof insertPayload) => {
          select: () => { single: () => Promise<{ data: MasterCourseRow | null; error: { message: string } | null }> };
        };
      }
    )
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !created) {
      return {
        success: false,
        error: `Failed to create course: ${insertErr?.message || "Unknown error"}`,
      };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "COURSE_CREATED",
      entity_type: "course",
      entity_id: created.id,
      after_data: created,
    });

    revalidatePath("/admin/curriculum");
    return { success: true, data: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error creating course.",
    };
  }
}

export async function updateMasterCourseAction(
  rawInput: UpdateMasterCourseInput
): Promise<AdminActionResult<{ course: MasterCourseRow; hasHistoricalRegistrations: boolean }>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = updateMasterCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid course input." };
  }

  const data = parsed.data;
  const creditCheck = computeAuthoritativeCredits(
    data.theoryCredits ?? null,
    data.labCredits ?? null,
    data.totalCredits ?? null
  );
  if (!creditCheck.ok) {
    return { success: false, error: creditCheck.error || "Invalid credit values." };
  }

  try {
    const supabase = await getSupabaseServerClient();

    const { data: beforeRow, error: fetchErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !beforeRow) {
      return { success: false, error: fetchErr?.message || "Course not found." };
    }

    // Check if course is already referenced in registration_items
    const { data: usedRows } = await supabase
      .from("registration_items")
      .select("id")
      .eq("course_id", data.id)
      .limit(1);

    const hasHistoricalRegistrations = Boolean(usedRows && usedRows.length > 0);

    const updatePayload: Database["public"]["Tables"]["courses"]["Update"] = {
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      credits: creditCheck.totalCredits,
      theory_credits: data.theoryCredits ?? null,
      lab_credits: data.labCredits ?? null,
      category: data.category,
      specialization_group: data.specializationGroup ?? null,
      variant: data.variant?.trim() || null,
      description: data.description?.trim() || null,
      department_code: data.departmentCode || "CSE",
      is_active: data.isActive,
      updated_by: adminUser.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await (
      supabase.from("courses") as unknown as {
        update: (p: typeof updatePayload) => {
          eq: (c: string, v: string) => {
            select: () => { single: () => Promise<{ data: MasterCourseRow | null; error: { message: string } | null }> };
          };
        };
      }
    )
      .update(updatePayload)
      .eq("id", data.id)
      .select()
      .single();

    if (updErr || !updated) {
      return { success: false, error: updErr?.message || "Failed to update course." };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "COURSE_UPDATED",
      entity_type: "course",
      entity_id: updated.id,
      before_data: beforeRow,
      after_data: updated,
    });

    revalidatePath("/admin/curriculum");
    return { success: true, data: { course: updated, hasHistoricalRegistrations } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error updating course.",
    };
  }
}

export async function toggleMasterCourseActiveAction(payload: {
  id: string;
  isActive: boolean;
  reason: string;
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  if (!payload.reason || payload.reason.trim().length < 3) {
    return { success: false, error: "Audit reason is required." };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await (
      supabase.from("courses") as unknown as {
        update: (p: { is_active: boolean; updated_by: string; updated_at: string }) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .update({
        is_active: payload.isActive,
        updated_by: adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: payload.isActive ? "COURSE_ACTIVATED" : "COURSE_DEACTIVATED",
      entity_type: "course",
      entity_id: payload.id,
      reason: payload.reason.trim(),
      after_data: { is_active: payload.isActive },
    });

    revalidatePath("/admin/curriculum");
    revalidatePath("/courses");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle course status.",
    };
  }
}

export async function importOfficialCseDatasetAction(): Promise<
  AdminActionResult<{ inserted: number; skippedDuplicates: number }>
> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    const { data: existingRows, error: fetchErr } = await supabase
      .from("courses")
      .select("code, variant");

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const existingKeys = new Set(
      ((existingRows || []) as { code: string; variant?: string | null }[]).map(
        (c) => `${c.code.trim().toUpperCase()}::${(c.variant || "").trim().toLowerCase()}`
      )
    );

    const toInsert = CSE_CURRICULUM_DATASET.filter((item) => {
      const key = `${item.code.trim().toUpperCase()}::${(item.variant || "").trim().toLowerCase()}`;
      return !existingKeys.has(key);
    }).map((item) => ({
      code: item.code.trim().toUpperCase(),
      title: item.title,
      credits: item.totalCredits,
      theory_credits: item.theoryCredits,
      lab_credits: item.labCredits,
      category: item.category,
      specialization_group: item.specializationGroup,
      variant: item.variant,
      department_code: item.departmentCode,
      is_active: true,
      created_by: adminUser.id,
      updated_by: adminUser.id,
    }));

    const skippedDuplicates = CSE_CURRICULUM_DATASET.length - toInsert.length;

    if (toInsert.length > 0) {
      const { error: insErr } = await (
        supabase.from("courses") as unknown as {
          insert: (rows: typeof toInsert) => Promise<{ error: { message: string } | null }>;
        }
      ).insert(toInsert);

      if (insErr) {
        return { success: false, error: `Import failed: ${insErr.message}` };
      }
    }

    await (
      supabase.from("course_import_history") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      file_name: "DIU_CSE_Curriculum_Official_154_5_Credits.dataset",
      source_worksheet: "Official Curriculum Reference",
      imported_by: adminUser.id,
      imported_count: toInsert.length,
      failed_count: 0,
      status: "completed",
      summary: { totalSource: CSE_CURRICULUM_DATASET.length, skippedDuplicates },
    });

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "OFFICIAL_CSE_CURRICULUM_IMPORTED",
      entity_type: "course_import",
      after_data: { inserted: toInsert.length, skippedDuplicates },
    });

    revalidatePath("/admin/curriculum");
    return { success: true, data: { inserted: toInsert.length, skippedDuplicates } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to import official CSE curriculum.",
    };
  }
}

export async function inspectCourseImportAction(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".csv"))) {
    return { success: false, error: "Please upload an .xlsx or .csv file." };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const data = await inspectCourseWorkbook(buf, file.name);
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to inspect file." };
  }
}

export async function parseCourseImportAction(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  const worksheetName = (formData.get("worksheetName") as string | null) || "";
  const mappingStr = (formData.get("columnMapping") as string | null) || "";
  if (!file) return { success: false, error: "File is required." };

  let mapping: Partial<Record<CourseColumnKey, number>> | undefined;
  if (mappingStr) {
    try {
      mapping = JSON.parse(mappingStr);
    } catch {
      return { success: false, error: "Invalid column mapping." };
    }
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const data = await parseCourseWorksheet(buf, file.name, worksheetName, mapping);
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to parse worksheet." };
  }
}

export async function commitCourseImportAction(payload: {
  fileName: string;
  worksheetName: string;
  rows: ParsedCourseImportRow[];
  updateExisting: boolean;
}): Promise<AdminActionResult<{ importedCount: number; skippedCount: number }>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const activeRows = payload.rows.filter((r) => !r.excluded);
  const invalidCount = activeRows.filter((r) => r.status === "error").length;
  if (invalidCount > 0) {
    return {
      success: false,
      error: `${invalidCount} row(s) contain validation errors. Fix or exclude them before committing.`,
    };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data: existingRows } = await supabase.from("courses").select("id, code, variant");
    const existingMap = new Map<string, string>();
    for (const c of (existingRows || []) as { id: string; code: string; variant?: string | null }[]) {
      existingMap.set(
        `${c.code.trim().toUpperCase()}::${(c.variant || "").trim().toLowerCase()}`,
        c.id
      );
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const r of activeRows) {
      const key = `${r.code.trim().toUpperCase()}::${(r.variant || "").trim().toLowerCase()}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        if (!payload.updateExisting) {
          skippedCount++;
          continue;
        }
        await (
          supabase.from("courses") as unknown as {
            update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
          }
        )
          .update({
            title: r.title,
            credits: r.totalCredits,
            theory_credits: r.theoryCredits,
            lab_credits: r.labCredits,
            category: r.category,
            specialization_group: r.specializationGroup,
            description: r.description,
            updated_by: adminUser.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
        importedCount++;
      } else {
        const { error: insErr } = await (
          supabase.from("courses") as unknown as {
            insert: (p: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
          }
        ).insert({
          code: r.code.trim().toUpperCase(),
          title: r.title,
          credits: r.totalCredits,
          theory_credits: r.theoryCredits,
          lab_credits: r.labCredits,
          category: r.category,
          specialization_group: r.specializationGroup,
          variant: r.variant,
          description: r.description,
          department_code: "CSE",
          is_active: true,
          created_by: adminUser.id,
          updated_by: adminUser.id,
        });
        if (!insErr) importedCount++;
      }
    }

    await (
      supabase.from("course_import_history") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      file_name: payload.fileName,
      source_worksheet: payload.worksheetName,
      imported_by: adminUser.id,
      imported_count: importedCount,
      failed_count: 0,
      status: "completed",
      summary: { skippedCount, updateExisting: payload.updateExisting },
    });

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "COURSES_BULK_IMPORTED",
      entity_type: "course_import",
      after_data: { fileName: payload.fileName, importedCount, skippedCount },
    });

    revalidatePath("/admin/curriculum");
    return { success: true, data: { importedCount, skippedCount } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Course import commit failed.",
    };
  }
}

export async function toggleSemesterCourseAction(payload: {
  semesterId: string;
  courseId: string;
  action: "add" | "remove" | "activate" | "deactivate";
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();

    if (payload.action === "add") {
      const { error } = await (
        supabase.from("semester_courses") as unknown as {
          upsert: (p: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
        }
      ).upsert(
        {
          semester_id: payload.semesterId,
          course_id: payload.courseId,
          is_active: true,
          created_by: adminUser.id,
        },
        { onConflict: "semester_id,course_id" }
      );
      if (error) return { success: false, error: error.message };
    } else if (payload.action === "remove") {
      const { error } = await supabase
        .from("semester_courses")
        .delete()
        .eq("semester_id", payload.semesterId)
        .eq("course_id", payload.courseId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await (
        supabase.from("semester_courses") as unknown as {
          update: (p: { is_active: boolean }) => {
            eq: (c: string, v: string) => { eq: (c2: string, v2: string) => Promise<{ error: { message: string } | null }> };
          };
        }
      )
        .update({ is_active: payload.action === "activate" })
        .eq("semester_id", payload.semesterId)
        .eq("course_id", payload.courseId);
      if (error) return { success: false, error: error.message };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: `SEMESTER_COURSE_${payload.action.toUpperCase()}`,
      entity_type: "semester_course",
      entity_id: `${payload.semesterId}:${payload.courseId}`,
    });

    revalidatePath("/admin/curriculum");
    revalidatePath("/courses");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update semester course.",
    };
  }
}

export async function toggleBatchCourseAction(payload: {
  semesterId: string;
  batch: string;
  courseId: string;
  action: "add" | "remove";
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    const normBatch = payload.batch.trim();

    if (payload.action === "add") {
      const { error } = await (
        supabase.from("batch_semester_courses") as unknown as {
          upsert: (p: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
        }
      ).upsert(
        {
          semester_id: payload.semesterId,
          batch: normBatch,
          course_id: payload.courseId,
          is_active: true,
          created_by: adminUser.id,
        },
        { onConflict: "semester_id,batch,course_id" }
      );
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from("batch_semester_courses")
        .delete()
        .eq("semester_id", payload.semesterId)
        .eq("batch", normBatch)
        .eq("course_id", payload.courseId);
      if (error) return { success: false, error: error.message };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: `BATCH_COURSE_${payload.action.toUpperCase()}`,
      entity_type: "batch_semester_course",
      entity_id: `${payload.semesterId}:${normBatch}:${payload.courseId}`,
    });

    revalidatePath("/admin/curriculum");
    revalidatePath("/courses");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update batch course.",
    };
  }
}

export async function upsertSpecializationOfferingAction(payload: {
  semesterId: string;
  batch: string;
  specializationGroup: (typeof SPECIALIZATION_GROUPS)[number];
  requiredCourses: number | null;
  requiredCredits: number | null;
  isActive: boolean;
}): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await (
      supabase.from("specialization_offerings") as unknown as {
        upsert: (p: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
      }
    ).upsert(
      {
        semester_id: payload.semesterId,
        batch: payload.batch.trim(),
        specialization_group: payload.specializationGroup,
        required_courses: payload.requiredCourses,
        required_credits: payload.requiredCredits,
        is_active: payload.isActive,
        created_by: adminUser.id,
      },
      { onConflict: "semester_id,batch,specialization_group" }
    );

    if (error) return { success: false, error: error.message };

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "SPECIALIZATION_OFFERING_UPDATED",
      entity_type: "specialization_offering",
      entity_id: `${payload.semesterId}:${payload.batch}:${payload.specializationGroup}`,
      after_data: payload,
    });

    revalidatePath("/admin/curriculum");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update specialization offering.",
    };
  }
}
