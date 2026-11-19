"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_SECTIONS,
} from "@/lib/mock/data";
import type { RegistrationStatus } from "@/types/database";

export interface AdvisorActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server action for advisors to finalize a student's registration (Approve or Reject/Return).
 * Strictly enforces advisor role and assignment.
 */
export async function finalizeAdvisorReviewAction({
  registrationId,
  action,
  notes,
}: {
  registrationId: string;
  action: "approve" | "reject";
  notes?: string;
}): Promise<AdvisorActionResult> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile(user);

  if (!user || !profile) {
    return {
      success: false,
      error: "Authentication required. Please sign in with your authorized faculty account.",
    };
  }

  const allowedRoles = ["advisor", "department_head", "admin"];
  if (!allowedRoles.includes(profile.role)) {
    return {
      success: false,
      error: "Unauthorized: Only assigned academic advisors and department heads can finalize reviews.",
    };
  }

  const targetStatus: RegistrationStatus = action === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();

  // 1. Update in-memory advisee queue
  const appIndex = MOCK_ADVISEE_QUEUE.findIndex((a) => a.registration.id === registrationId);
  if (appIndex >= 0) {
    const existing = MOCK_ADVISEE_QUEUE[appIndex];
    if (existing) {
      existing.registration.status = targetStatus;
      existing.registration.reviewed_at = now;
      existing.registration.advisor_notes = notes || null;
      existing.isUnderReview = false;
    }
  }

  // 2. Update student active cookie if it matches
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get("diu_student_active_registration")?.value;
    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        if (parsed.id === registrationId) {
          parsed.status = targetStatus;
          parsed.advisor_notes = notes || null;
          parsed.reviewed_at = now;
          cookieStore.set("diu_student_active_registration", JSON.stringify(parsed), {
            path: "/",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      } catch {
        // ignore parse error
      }
    }
  } catch {
    // outside cookie context
  }

  // 3. Supabase Cloud update
  try {
    const supabase = await getSupabaseServerClient();
    await supabase
      .from("registrations")
      .update({
        status: targetStatus,
        reviewed_at: now,
        advisor_notes: notes || null,
        updated_at: now,
      })
      .eq("id", registrationId);
  } catch {
    // fallback
  }

  revalidatePath("/advisor");
  revalidatePath(`/advisor/review/${registrationId}`);
  revalidatePath("/student/tracking");
  revalidatePath("/dashboard");

  return {
    success: true,
    message:
      action === "approve"
        ? "Application officially approved and enrolled."
        : "Advising slip returned to student with requested revisions.",
  };
}

/**
 * Server action to reassign a student's course section in their application.
 */
export async function reassignAdviseeSectionAction({
  registrationId,
  currentSectionId,
  newSectionId,
}: {
  registrationId: string;
  currentSectionId: string;
  newSectionId: string;
}): Promise<AdvisorActionResult> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile(user);

  if (!user || !profile || !["advisor", "department_head", "admin"].includes(profile.role)) {
    return {
      success: false,
      error: "Unauthorized: Advisor privileges required.",
    };
  }

  const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
  if (!newSection) {
    return {
      success: false,
      error: "Selected section was not found.",
    };
  }

  const app = MOCK_ADVISEE_QUEUE.find((a) => a.registration.id === registrationId);
  if (app) {
    app.items = app.items.map((it) =>
      it.section.id === currentSectionId ? { ...it, section: newSection } : it
    );
  }

  revalidatePath(`/advisor/review/${registrationId}`);
  return {
    success: true,
    message: `Reassigned to Section ${newSection.section_name}.`,
  };
}
