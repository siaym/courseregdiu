"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import type { AdminActionResult } from "@/app/admin/actions";
import type { SemesterRow } from "@/lib/admin/admin-service";

const createSemesterSchema = z.object({
  name: z.string().trim().min(3, "Semester name is required").max(80),
  code: z.string().trim().min(2, "Semester code is required").max(20),
  year: z.coerce.number().int().min(2020).max(2100),
  season: z.enum(["spring", "summer", "fall"]),
  registrationStartsAt: z.string().optional().or(z.literal("")),
  registrationEndsAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(false),
});

export async function createSemesterAction(
  rawInput: z.infer<typeof createSemesterSchema>
): Promise<AdminActionResult<SemesterRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();
  const parsed = createSemesterSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid semester input." };
  }

  const d = parsed.data;
  try {
    const supabase = await getSupabaseServerClient();

    if (d.isActive) {
      await (
        supabase.from("semesters") as unknown as {
          update: (p: { is_active: boolean }) => { eq: (c: string, v: boolean) => Promise<unknown> };
        }
      )
        .update({ is_active: false })
        .eq("is_active", true);
    }

    const insertPayload = {
      name: d.name,
      code: d.code,
      year: d.year,
      season: d.season,
      is_active: d.isActive,
      is_archived: false,
      registration_starts_at: d.registrationStartsAt ? new Date(d.registrationStartsAt).toISOString() : null,
      registration_ends_at: d.registrationEndsAt ? new Date(d.registrationEndsAt).toISOString() : null,
    };

    const { data: created, error } = await (
      supabase.from("semesters") as unknown as {
        insert: (p: typeof insertPayload) => {
          select: () => { single: () => Promise<{ data: SemesterRow | null; error: { message: string } | null }> };
        };
      }
    )
      .insert(insertPayload)
      .select()
      .single();

    if (error || !created) {
      return { success: false, error: error?.message || "Failed to create semester." };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "SEMESTER_CREATED",
      entity_type: "semester",
      entity_id: created.id,
      after_data: created,
    });

    revalidatePath("/admin/semesters");
    revalidatePath("/admin");
    return { success: true, data: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error creating semester.",
    };
  }
}

export async function setActiveSemesterAction(
  semesterId: string
): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    const { data: target } = await supabase
      .from("semesters")
      .select("*")
      .eq("id", semesterId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: "Semester not found." };
    }
    if ((target as SemesterRow).is_archived) {
      return { success: false, error: "Cannot activate an archived semester." };
    }

    await (
      supabase.from("semesters") as unknown as {
        update: (p: { is_active: boolean }) => { eq: (c: string, v: boolean) => Promise<unknown> };
      }
    )
      .update({ is_active: false })
      .eq("is_active", true);

    const { error } = await (
      supabase.from("semesters") as unknown as {
        update: (p: { is_active: boolean }) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      }
    )
      .update({ is_active: true })
      .eq("id", semesterId);

    if (error) {
      return { success: false, error: error.message };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "SEMESTER_ACTIVATED",
      entity_type: "semester",
      entity_id: semesterId,
      after_data: { is_active: true },
    });

    revalidatePath("/admin/semesters");
    revalidatePath("/admin");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to activate semester.",
    };
  }
}

export async function archiveSemesterAction(
  semesterId: string
): Promise<AdminActionResult<null>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await (
      supabase.from("semesters") as unknown as {
        update: (p: { is_archived: boolean; is_active: boolean }) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .update({ is_archived: true, is_active: false })
      .eq("id", semesterId);

    if (error) {
      return { success: false, error: error.message };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as { insert: (p: unknown) => Promise<unknown> }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "SEMESTER_ARCHIVED",
      entity_type: "semester",
      entity_id: semesterId,
      after_data: { is_archived: true, is_active: false },
    });

    revalidatePath("/admin/semesters");
    revalidatePath("/admin");
    return { success: true, data: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive semester.",
    };
  }
}
