"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import {
  studentRegistrationSubmitSchema,
  type StudentRegistrationSubmitInput,
} from "@/lib/validations/registration";
import type { Database } from "@/types/database";
import {
  MOCK_CURRENT_SEMESTER,
  ACTIVE_MOCK_SEMESTER_LABEL,
  MOCK_ADVISOR_PROFILE,
  MOCK_ADVISEE_QUEUE,
  MOCK_SECTIONS,
  MOCK_COURSES,
  type StudentRegistrationApplication,
  type ExtendedSection,
} from "@/lib/mock/data";
import {
  isCourseEligibleForBatch,
  getBatchSemesterCourses,
  normalizeBatch,
} from "@/lib/curriculum/batch-course-service";

export async function searchEligibleStudentCoursesAction(payload: {
  query?: string;
  category?: string;
  specialization?: string;
}) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile(user);
  if (!user || !profile) {
    return { success: false, error: "Authentication required.", courses: [] };
  }

  let semesterId = MOCK_CURRENT_SEMESTER.id;
  try {
    const supabase = await getSupabaseServerClient();
    const { data: activeSem } = await supabase
      .from("semesters")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    if (activeSem) semesterId = (activeSem as { id: string }).id;
  } catch {
    // Dev fallback
  }

  const studentBatch = normalizeBatch(profile.batch || "60");
  const records = await getBatchSemesterCourses(semesterId, studentBatch);
  const q = (payload.query || "").trim().toLowerCase().replace(/[-\s]+/g, "");

  const matched = records
    .map((r) => r.course as Database["public"]["Tables"]["courses"]["Row"])
    .filter((c) => {
      if (c.is_active === false) return false;
      if (payload.category && payload.category !== "all" && (c.category || "CORE") !== payload.category) {
        return false;
      }
      if (
        payload.specialization &&
        payload.specialization !== "all" &&
        (c.specialization_group || "") !== payload.specialization
      ) {
        return false;
      }
      if (!q) return true;
      const codeNorm = c.code.toLowerCase().replace(/[-\s]+/g, "");
      const titleNorm = c.title.toLowerCase().replace(/[-\s]+/g, "");
      return codeNorm.includes(q) || titleNorm.includes(q);
    });

  return { success: true, courses: matched };
}

export interface RegistrationSubmitResult {
  success: boolean;
  registrationId?: string;
  referenceId?: string;
  submittedAt?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Server action to submit a student course registration application.
 * Enforces Zod validation, authenticated session check, duplicate prevention,
 * and persistence in both Supabase and session store.
 */
export async function submitStudentRegistration(
  input: StudentRegistrationSubmitInput
): Promise<RegistrationSubmitResult> {
  // 1. Zod schema validation
  const parseResult = studentRegistrationSubmitSchema.safeParse(input);
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
      error: "Please correct the section and course selection errors before submitting.",
      fieldErrors,
    };
  }

  const { previousSection, desiredSection, courses, isPaid } = parseResult.data;

  // 2. Server-side session verification
  const user = await getCurrentUser();
  const profile = await getCurrentProfile(user);

  if (!user || !profile) {
    return {
      success: false,
      error: "Authentication required. Please sign in with your @diu.edu.bd institutional account.",
    };
  }

  if (profile.role !== "student") {
    return {
      success: false,
      error: "Unauthorized: Only enrolled students can submit course registration applications.",
    };
  }

  // 3. Validate against duplicate courses in registration payload
  const seenCourseIds = new Set<string>();
  for (const c of courses) {
    if (seenCourseIds.has(c.courseId)) {
      return {
        success: false,
        error: `Duplicate course error: ${c.courseCode} cannot be selected multiple times in a single term.`,
      };
    }
    seenCourseIds.add(c.courseId);
  }

  // 4. Resolve active semester & verify each course against authoritative DB + batch eligibility
  let activeSemesterId = MOCK_CURRENT_SEMESTER.id;
  let activeSemesterLabel = ACTIVE_MOCK_SEMESTER_LABEL;
  let assignedAdvisorId: string | null = profile.id === MOCK_ADVISOR_PROFILE.id ? null : MOCK_ADVISOR_PROFILE.id;
  const authoritativeCourseMap = new Map<
    string,
    { id: string; code: string; title: string; credits: number; category: string; is_active?: boolean }
  >();

  const isMockCoursePayload = courses.some((c) => c.courseId.startsWith("course-"));
  if (!isMockCoursePayload || process.env.NODE_ENV === "production") {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: activeSem } = await supabase
        .from("semesters")
        .select("id, name, season, year")
        .eq("is_active", true)
        .maybeSingle();

      if (activeSem) {
        const s = activeSem as { id: string; name?: string | null; season: string; year: number };
        activeSemesterId = s.id;
        activeSemesterLabel = s.name || `${s.season.charAt(0).toUpperCase() + s.season.slice(1)} ${s.year}`;

        const { data: asg } = await supabase
          .from("advisor_assignments")
          .select("advisor_id")
          .eq("student_id", profile.id)
          .eq("semester_id", s.id)
          .eq("is_active", true)
          .maybeSingle();

        assignedAdvisorId = (asg as { advisor_id: string | null } | null)?.advisor_id ?? null;
      }

      const { data: dbCourses } = await supabase
        .from("courses")
        .select("id, code, title, credits, category, is_active")
        .in(
          "id",
          courses.map((c) => c.courseId)
        );

      for (const row of (dbCourses || []) as {
        id: string;
        code: string;
        title: string;
        credits: number;
        category?: string;
        is_active?: boolean;
      }[]) {
        authoritativeCourseMap.set(row.id, {
          id: row.id,
          code: row.code,
          title: row.title,
          credits: row.credits,
          category: row.category || "CORE",
          is_active: row.is_active,
        });
      }
    } catch {
      // Dev/test fallback
    }
  }

  const studentBatch = normalizeBatch(profile.batch || "60");
  const normalizedCourses = [];
  for (const c of courses) {
    const authCourse = authoritativeCourseMap.get(c.courseId);
    if (authCourse && authCourse.is_active === false) {
      return {
        success: false,
        error: `Course ${authCourse.code} is currently inactive and cannot be registered.`,
      };
    }

    const isEligible = await isCourseEligibleForBatch(
      activeSemesterId,
      studentBatch,
      c.courseId
    );
    if (!isEligible) {
      return {
        success: false,
        error: `Course eligibility error: ${authCourse?.code || c.courseCode} is not configured for Batch ${studentBatch} in ${activeSemesterLabel}.`,
      };
    }

    // Never trust browser-submitted course code, title, or credits when authoritative DB record exists
    normalizedCourses.push({
      ...c,
      courseCode: authCourse?.code ?? c.courseCode,
      courseTitle: authCourse?.title ?? c.courseTitle,
      credits: authCourse?.credits ?? c.credits,
      category: authCourse?.category ?? "CORE",
    });
  }

  // 5. Payment status: manually marked by the student after completing payment
  const isPaymentCleared = typeof isPaid === "boolean" ? isPaid : true;
  const referenceId = `REG-2027-SP-${Math.floor(1000 + Math.random() * 9000)}`;

  // 6. Duplicate submission prevention & Reference Generation
  const registrationId = `reg-app-${profile.id.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const now = new Date();
  const submittedAt = now.toISOString();

  // 7. Calculate authoritative credit metrics
  const totalCredits = normalizedCourses.reduce((sum, c) => sum + c.credits, 0);
  const generalCourseCount = normalizedCourses.filter((c) => c.courseType === "general").length;
  const retakeCourseCount = normalizedCourses.filter((c) => c.courseType === "retake").length;

  // 8. Build application object
  const newApplication: StudentRegistrationApplication = {
    registration: {
      id: registrationId,
      student_id: profile.id,
      semester_id: MOCK_CURRENT_SEMESTER.id,
      status: "pending_advisor",
      submitted_at: submittedAt,
      advisor_id: MOCK_ADVISOR_PROFILE.id,
      reviewed_at: null,
      advisor_notes: null,
      payment_cleared: isPaymentCleared,
      payment_reference: referenceId,
      previous_section: previousSection,
      desired_section: desiredSection,
      created_at: submittedAt,
      updated_at: submittedAt,
    },
    student: {
      ...profile,
      authorized_alternative_email: null,
    },
    semester: MOCK_CURRENT_SEMESTER,
    formattedApplicationDate: now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " • " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isUnderReview: false,
    items: courses.map((c, idx) => {
      const existingSection = MOCK_SECTIONS.find((s) => s.id === c.sectionId);
      const isLab = c.courseTitle.toLowerCase().includes("lab") || c.credits <= 1.5;
      const fallbackSection: ExtendedSection = existingSection || {
        id: c.sectionId,
        course_id: c.courseId,
        semester_id: MOCK_CURRENT_SEMESTER.id,
        section_name: c.sectionName,
        capacity: isLab ? 25 : 50,
        enrolled_count: isLab ? 18 : 36,
        room: isLab ? "CS-Lab 1" : "AB4-501",
        schedule: [
          { day: "Sunday", start_time: "08:30", end_time: "10:00", room: isLab ? "CS-Lab 1" : "AB4-501" },
          { day: "Tuesday", start_time: "08:30", end_time: "10:00", room: isLab ? "CS-Lab 1" : "AB4-501" },
        ],
        instructor_name: "Assigned Faculty",
        course_code: c.courseCode,
        course_title: c.courseTitle,
        credits: c.credits,
        created_at: submittedAt,
      };

      const existingCourse = MOCK_COURSES.find((co) => co.id === c.courseId || co.code === c.courseCode);
      const fallbackCourse = existingCourse || {
        id: c.courseId,
        code: c.courseCode,
        title: c.courseTitle,
        credits: c.credits,
        department_code: profile.department_code || "CSE",
        prerequisite_codes: [],
        syllabus_url: null,
        created_at: submittedAt,
      };

      return {
        item: {
          id: `item-${registrationId}-${idx + 1}`,
          registration_id: registrationId,
          section_id: c.sectionId,
          course_type: c.courseType,
          status: "enrolled" as const,
          created_at: submittedAt,
        },
        section: fallbackSection,
        course: fallbackCourse,
        course_type: c.courseType,
      };
    }),
    totalCredits,
    totalCourses: courses.length,
    generalCourseCount,
    retakeCourseCount,
    hasScheduleConflict: false,
    hasPrerequisiteConflict: false,
    isProbation: (profile.cgpa ?? 4.0) < 2.0,
  };

  // 6. Update in-memory advisee queue
  const existingQueueIndex = MOCK_ADVISEE_QUEUE.findIndex(
    (app) => app.registration.student_id === profile.id || app.registration.id === registrationId
  );
  if (existingQueueIndex >= 0) {
    MOCK_ADVISEE_QUEUE[existingQueueIndex] = newApplication;
  } else {
    // Put student application at top of queue
    MOCK_ADVISEE_QUEUE.unshift(newApplication);
  }

  // 7. Persist to cookie for SSR consistency across restarts/refreshes
  try {
    const cookieStore = await cookies();
    cookieStore.set("diu_student_active_registration", JSON.stringify({
      id: registrationId,
      status: "pending_advisor",
      previous_section: previousSection,
      desired_section: desiredSection,
      reference_id: referenceId,
      submitted_at: submittedAt,
      courses,
      totalCredits,
      generalCourseCount,
      retakeCourseCount,
    }), {
      path: "/",
      httpOnly: false, // accessible to client components
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Outside cookie context
  }

  // 8. Attempt Supabase Cloud persistence (with historical snapshots on registration_items)
  try {
    const supabase = await getSupabaseServerClient();
    const registrationRecord: Database["public"]["Tables"]["registrations"]["Insert"] = {
      student_id: profile.id,
      semester_id: activeSemesterId,
      status: "pending_advisor",
      submitted_at: submittedAt,
      advisor_id: assignedAdvisorId,
      previous_section: previousSection,
      desired_section: desiredSection,
      payment_cleared: isPaymentCleared,
      payment_reference: referenceId,
      updated_at: submittedAt,
    };
    if (registrationId && registrationId.length === 36) {
      registrationRecord.id = registrationId;
    }
    const { data: savedReg, error: upsertError } = await (
      supabase.from("registrations") as unknown as {
        upsert: (r: typeof registrationRecord, opts?: { onConflict?: string }) => {
          select: () => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
        };
      }
    )
      .upsert(registrationRecord)
      .select()
      .maybeSingle();

    if (upsertError && process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: `Database error: Failed to record course registration (${upsertError.message}).`,
      };
    }

    if (savedReg?.id) {
      const itemSnapshots: Database["public"]["Tables"]["registration_items"]["Insert"][] =
        normalizedCourses.map((c) => ({
          registration_id: savedReg.id,
          section_id: c.sectionId && c.sectionId.length === 36 ? c.sectionId : null,
          course_id: c.courseId && c.courseId.length === 36 ? c.courseId : null,
          course_code_snapshot: c.courseCode,
          course_title_snapshot: c.courseTitle,
          credits_snapshot: c.credits,
          category_snapshot: c.category,
          classification: c.courseType,
          course_type: c.courseType,
          status: "enrolled",
        }));

      await supabase.from("registration_items").delete().eq("registration_id", savedReg.id);
      const { error: itemsErr } = await (
        supabase.from("registration_items") as unknown as {
          insert: (rows: typeof itemSnapshots) => Promise<{ error: { message: string } | null }>;
        }
      ).insert(itemSnapshots);

      if (itemsErr && process.env.NODE_ENV === "production") {
        return {
          success: false,
          error: `Database error: Failed to persist registration items (${itemsErr.message}).`,
        };
      }
    }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "production") {
      const errMsg = err instanceof Error ? err.message : "Database write failed";
      return {
        success: false,
        error: `Database error: Failed to record course registration application (${errMsg}).`,
      };
    }
    // Safe fallback to mock store in dev
  }

  // 9. Revalidate dependent paths
  try {
    revalidatePath("/courses");
    revalidatePath("/dashboard");
    revalidatePath("/student/tracking");
    revalidatePath("/advisor");
    revalidatePath(`/advisor/review/${registrationId}`);
  } catch {
    // Outside active Next.js request context (e.g. test environment)
  }

  return {
    success: true,
    registrationId,
    referenceId,
    submittedAt,
  };
}
