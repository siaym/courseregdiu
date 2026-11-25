"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  createBatchSchema,
  updateBatchSchema,
  toggleBatchActiveSchema,
  type CreateBatchInput,
  type UpdateBatchInput,
  type ToggleBatchActiveInput,
} from "@/lib/validations/admin-panel";
import type { AdminActionResult } from "@/app/admin/actions";
import type { BatchRow } from "@/lib/admin/admin-service";

function inferBatchNumber(label: string, explicitNumber?: string): string | null {
  if (explicitNumber && explicitNumber.trim()) return explicitNumber.trim();
  const match = label.trim().match(/^(\d{1,4})(?:\s*batch)?$/i);
  return match ? match[1] : null;
}

export async function createBatchAction(
  rawInput: CreateBatchInput
): Promise<AdminActionResult<BatchRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = createBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[key.toString()] = issue.message;
    });
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const data = parsed.data;
  const batchNumber = inferBatchNumber(data.batchLabel, data.batchNumber);

  try {
    const supabase = await getSupabaseServerClient();

    const insertPayload = {
      batch_label: data.batchLabel.trim(),
      batch_number: batchNumber,
      department_code: data.departmentCode || null,
      is_active: data.isActive,
    };

    const { data: created, error: insertErr } = await (
      supabase.from("batches") as unknown as {
        insert: (p: typeof insertPayload) => {
          select: () => { single: () => Promise<{ data: BatchRow | null; error: { message: string } | null }> };
        };
      }
    )
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !created) {
      return {
        success: false,
        error: `Failed to create batch: ${insertErr?.message || "Unknown database error"}`,
      };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "BATCH_CREATED",
      entity_type: "batch",
      entity_id: created.id,
      after_data: created,
    });

    revalidatePath("/admin/batches");
    revalidatePath("/admin");
    return { success: true, data: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error creating batch.",
    };
  }
}

export async function updateBatchAction(
  rawInput: UpdateBatchInput
): Promise<AdminActionResult<BatchRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = updateBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (key) fieldErrors[key.toString()] = issue.message;
    });
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const data = parsed.data;
  const batchNumber = inferBatchNumber(data.batchLabel, data.batchNumber);

  try {
    const supabase = await getSupabaseServerClient();

    const { data: beforeRow, error: fetchErr } = await supabase
      .from("batches")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !beforeRow) {
      return { success: false, error: fetchErr?.message || "Batch not found." };
    }

    const updatePayload = {
      batch_label: data.batchLabel.trim(),
      batch_number: batchNumber,
      department_code: data.departmentCode || null,
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await (
      supabase.from("batches") as unknown as {
        update: (p: typeof updatePayload) => {
          eq: (c: string, v: string) => {
            select: () => { single: () => Promise<{ data: BatchRow | null; error: { message: string } | null }> };
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
        error: `Failed to update batch: ${updateErr?.message || "Unknown database error"}`,
      };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: "BATCH_UPDATED",
      entity_type: "batch",
      entity_id: updated.id,
      before_data: beforeRow,
      after_data: updated,
    });

    revalidatePath("/admin/batches");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error updating batch.",
    };
  }
}

export async function toggleBatchActiveAction(
  rawInput: ToggleBatchActiveInput
): Promise<AdminActionResult<BatchRow>> {
  const { user: adminUser, profile: adminProfile } = await requireAdmin();

  const parsed = toggleBatchActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid request." };
  }

  const { id, isActive, reason } = parsed.data;

  try {
    const supabase = await getSupabaseServerClient();

    const { data: beforeRow, error: fetchErr } = await supabase
      .from("batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !beforeRow) {
      return { success: false, error: fetchErr?.message || "Batch not found." };
    }

    const { data: updated, error: updateErr } = await (
      supabase.from("batches") as unknown as {
        update: (p: { is_active: boolean; updated_at: string }) => {
          eq: (c: string, v: string) => {
            select: () => { single: () => Promise<{ data: BatchRow | null; error: { message: string } | null }> };
          };
        };
      }
    )
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || "Failed to update batch status." };
    }

    await (
      supabase.from("admin_audit_logs") as unknown as {
        insert: (p: unknown) => Promise<unknown>;
      }
    ).insert({
      actor_id: adminUser.id,
      actor_role: adminProfile.role,
      action: isActive ? "BATCH_ACTIVATED" : "BATCH_DEACTIVATED",
      entity_type: "batch",
      entity_id: id,
      reason,
      before_data: { is_active: (beforeRow as BatchRow).is_active },
      after_data: { is_active: isActive },
    });

    revalidatePath("/admin/batches");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Database error updating batch status.",
    };
  }
}
