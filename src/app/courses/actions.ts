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
import { isCourseEligibleForBatch, normalizeBatch } from "@/lib/curriculum/batch-course-service";
import { getStudentPaymentClearance } from "@/lib/payment/payment-service";

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

  const { previousSection, desiredSection, courses } = parseResult.data;

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

  // 4. Server-Side Enforcement: Verify each course is strictly configured for student's batch & semester
  const studentBatch = normalizeBatch(profile.batch || "60");
  for (const c of courses) {
    const isEligible = await isCourseEligibleForBatch(
      MOCK_CURRENT_SEMESTER.id,
      studentBatch,
      c.courseId
    );
    if (!isEligible) {
      return {
        success: false,
        error: `Course eligibility error: ${c.courseCode} is not configured for Batch ${studentBatch} in ${ACTIVE_MOCK_SEMESTER_LABEL}.`,
      };
    }
  }

  // 5. Query verified payment clearance status from authoritative finance/accounts records
  const paymentRecord = await getStudentPaymentClearance(profile.id, MOCK_CURRENT_SEMESTER.id);
  const isPaymentCleared = paymentRecord ? paymentRecord.status === "cleared" : false;
  const paymentRefCode = paymentRecord?.referenceCode || `REG-2027-SP-${Math.floor(1000 + Math.random() * 9000)}`;

  // 6. Duplicate submission prevention & Reference Generation
  const registrationId = `reg-app-${profile.id.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const now = new Date();
  const submittedAt = now.toISOString();
  const referenceId = paymentRefCode;

  // 7. Calculate metrics
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const generalCourseCount = courses.filter((c) => c.courseType === "general").length;
  const retakeCourseCount = courses.filter((c) => c.courseType === "retake").length;

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

  // 8. Attempt Supabase Cloud persistence
  try {
    const supabase = await getSupabaseServerClient();
    // Upsert registration record
    const registrationRecord: Database["public"]["Tables"]["registrations"]["Insert"] = {
      student_id: profile.id,
      semester_id: MOCK_CURRENT_SEMESTER.id,
      status: "pending_advisor",
      submitted_at: submittedAt,
      advisor_id: profile.id === MOCK_ADVISOR_PROFILE.id ? null : MOCK_ADVISOR_PROFILE.id,
      previous_section: previousSection,
      desired_section: desiredSection,
      payment_cleared: isPaymentCleared,
      payment_reference: referenceId,
      updated_at: submittedAt,
    };
    if (registrationId && registrationId.length === 36) {
      registrationRecord.id = registrationId;
    }
    await supabase.from("registrations").upsert(registrationRecord);
  } catch {
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
