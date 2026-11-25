"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser, resolveEmailAuthorization } from "@/lib/auth/roles";
import { MOCK_STUDENT_PROFILE } from "@/lib/mock/data";
import {
  studentOnboardingSchema,
  type StudentOnboardingInput,
} from "@/lib/validations/onboarding";
import type { Database } from "@/types/database";

export interface OnboardingActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Server-side student onboarding persistence.
 * Validates inputs, executes authoritative uniqueness checks,
 * and updates profiles setting onboarding_completed = true.
 */
export async function submitStudentOnboarding(
  input: StudentOnboardingInput
): Promise<OnboardingActionResult> {
  // 1. Server-side Zod validation
  const parseResult = studentOnboardingSchema.safeParse(input);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    const issues = parseResult.error?.issues || [];
    issues.forEach((err) => {
      const field = err.path[0];
      if (field) {
        fieldErrors[field.toString()] = err.message;
      }
    });
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors,
    };
  }

  const { fullName, diuId, batch } = parseResult.data;

  // 2. Authenticated user verification
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in with your @diu.edu.bd account.",
    };
  }

  // 3. Prevent duplicate student ID collisions (in dev fallback and DB)
  const KNOWN_EXISTING_STUDENT_IDS = [
    "211-15-456",
    "211-15-457",
    "211-15-458",
    "211-15-459",
  ];
  if (
    KNOWN_EXISTING_STUDENT_IDS.includes(diuId) &&
    user.id !== MOCK_STUDENT_PROFILE.id
  ) {
    return {
      success: false,
      error: `DIU Student ID "${diuId}" is already registered. If this is your student ID, please contact the DIU Registrar.`,
    };
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request context
  }

  try {
    const supabase = await getSupabaseServerClient();
    const authCheck = await resolveEmailAuthorization(user.email);
    const targetProfileId = authCheck.profileId || user.id;

    // 4. Authoritative database duplicate check
    const { data: duplicateProfile, error: queryError } = await supabase
      .from("profiles")
      .select("id")
      .eq("diu_id", diuId)
      .neq("id", targetProfileId)
      .maybeSingle();

    if (queryError && (process.env.NODE_ENV === "production" || isSupabaseConfigured())) {
      return {
        success: false,
        error: "Database error: Unable to verify student ID uniqueness. Please try again.",
      };
    }

    if (!queryError && duplicateProfile) {
      return {
        success: false,
        error: `DIU Student ID "${diuId}" is already registered. If this is your student ID, please contact the DIU Registrar.`,
      };
    }

    if (!queryError) {
      // 5. Ensure profile row exists, then update/insert in database
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetProfileId)
        .maybeSingle();

      const now = new Date().toISOString();
      const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
        full_name: fullName,
        diu_id: diuId,
        batch: batch,
        onboarding_completed: true,
        updated_at: now,
      };

      let writeError: { message: string } | null = null;

      if (existingProfile) {
        const { data: updatedRow, error } = await (
          supabase.from("profiles").update as unknown as (
            data: typeof profileUpdate
          ) => {
            eq: (
              col: string,
              val: string
            ) => { select: (cols: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
          }
        )(profileUpdate)
          .eq("id", targetProfileId)
          .select("id")
          .maybeSingle();

        writeError = error || (!updatedRow ? { message: "Profile update did not match any row." } : null);
      } else {
        const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
          id: targetProfileId,
          email: (user.email || "").trim().toLowerCase(),
          role: "student",
          full_name: fullName,
          diu_id: diuId,
          batch: batch,
          onboarding_completed: true,
          created_at: now,
          updated_at: now,
        };

        const { data: insertedRow, error } = await (
          supabase.from("profiles").insert as unknown as (
            data: typeof profileInsert
          ) => {
            select: (cols: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
          }
        )(profileInsert)
          .select("id")
          .maybeSingle();

        writeError = error || (!insertedRow ? { message: "Profile insert did not return a row." } : null);
      }

      if (writeError) {
        if (process.env.NODE_ENV === "production" || isSupabaseConfigured()) {
          return {
            success: false,
            error: `Database error: Failed to save onboarding profile (${writeError.message}).`,
          };
        }
        throw new Error(writeError.message);
      }
    }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "production" || isSupabaseConfigured()) {
      const errMsg = err instanceof Error ? err.message : "Database write failed";
      return {
        success: false,
        error: `Database error: Unable to complete onboarding (${errMsg}).`,
      };
    }
    // If Supabase is using placeholder credentials in local development, record server cookie
    if (cookieStore) {
      cookieStore.set(
        "diu_onboarded_student_data",
        JSON.stringify({ fullName, diuId, batch, onboardingCompleted: true }),
        { httpOnly: true, secure: false, path: "/" }
      );
    }
  }

  // Revalidate protected routes
  try {
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/onboarding");
    revalidatePath("/student/profile");
  } catch {
    // Outside request context
  }

  return { success: true };
}
